"""Python API replacing the Next.js Route Handlers.

The service deliberately uses the existing PostgreSQL schema, so no data migration
is required when switching the frontend proxy to this backend.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import uuid4

import bleach
import jwt
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, create_engine, desc, func, or_, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[2] / ".env", extra="ignore")
    database_url: str = Field(alias="DATABASE_URL")
    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_expiry_hours: int = 24
    cookie_secure: bool = False


settings = Settings()
parsed_url = urlsplit(settings.database_url.replace("postgresql://", "postgresql+psycopg://", 1))
database_url = urlunsplit((parsed_url.scheme, parsed_url.netloc, parsed_url.path, urlencode([(key, value) for key, value in parse_qsl(parsed_url.query) if key != "schema"]), parsed_url.fragment))
engine = create_engine(database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
passwords = CryptContext(schemes=["bcrypt"])


class Base(DeclarativeBase): pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True)
    password: Mapped[str] = mapped_column(String)
    full_name: Mapped[str] = mapped_column("fullName", String)
    role: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column("isActive", Boolean)
    position: Mapped[str | None] = mapped_column(String)
    department: Mapped[str | None] = mapped_column(String)


class ProjectMember(Base):
    __tablename__ = "project_members"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = mapped_column("projectId", ForeignKey("projects.id"))
    user_id: Mapped[str] = mapped_column("userId", ForeignKey("users.id"))


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str | None] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    summary: Mapped[str | None] = mapped_column(String)
    full_text: Mapped[str | None] = mapped_column("fullText", Text)
    owner_id: Mapped[str] = mapped_column("ownerId", ForeignKey("users.id"))
    total_budget: Mapped[Decimal] = mapped_column("totalBudget", Numeric(20, 2))
    funding_source: Mapped[str | None] = mapped_column("fundingSource", String)
    start_date: Mapped[datetime | None] = mapped_column("startDate", DateTime(timezone=True))
    end_date: Mapped[datetime | None] = mapped_column("endDate", DateTime(timezone=True))
    year: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column("updatedAt", DateTime(timezone=True))
    owner: Mapped[User] = relationship()


def db_session():
    db = SessionLocal()
    try: yield db
    finally: db.close()


def user_payload(user: User):
    return {"id": user.id, "email": user.email, "fullName": user.full_name, "role": user.role, "position": user.position, "department": user.department}


def project_payload(p: Project):
    return {"id": p.id, "code": p.code, "title": p.title, "summary": p.summary, "fullText": bleach.clean(p.full_text or "", tags=["p", "br", "strong", "em", "ul", "ol", "li"], strip=True), "ownerId": p.owner_id, "owner": user_payload(p.owner), "totalBudget": str(p.total_budget), "fundingSource": p.funding_source, "startDate": p.start_date, "endDate": p.end_date, "year": p.year, "status": p.status, "createdAt": p.created_at, "updatedAt": p.updated_at}


def current_user(request: Request, db: Session = Depends(db_session)):
    # The browser session is issued by the Next.js boundary.  Accept the old
    # `token` name temporarily so a direct Python API client remains usable.
    token = request.cookies.get("auth-token") or request.cookies.get("token")
    if not token: raise HTTPException(401, "Chưa đăng nhập")
    try: payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"]); user = db.get(User, payload["userId"])
    except (jwt.PyJWTError, KeyError): raise HTTPException(401, "Phiên đăng nhập không hợp lệ")
    if not user or not user.is_active: raise HTTPException(401, "Tài khoản không hoạt động")
    return user


def scope(user: User):
    if user.role in {"ADMIN", "MANAGER", "ACCOUNTANT"}: return True
    member_projects = select(ProjectMember.project_id).where(ProjectMember.user_id == user.id)
    return or_(Project.owner_id == user.id, Project.id.in_(member_projects)) if user.role == "PI" else Project.id.in_(member_projects)


class Login(BaseModel): email: str; password: str
class ProjectInput(BaseModel):
    code: str | None = None; title: str | None = None; summary: str | None = None; fullText: str | None = None
    totalBudget: Decimal | None = Field(None, ge=0); fundingSource: str | None = None
    startDate: datetime | None = None; endDate: datetime | None = None; year: int | None = Field(None, ge=1900, le=2200); status: str | None = None


app = FastAPI(title="Research Management API")

@app.get("/health")
def health(): return {"status": "ok"}

@app.post("/api/auth/login")
def login(data: Login, response: Response, db: Session = Depends(db_session)):
    email = data.email.strip().lower(); email = email if "@" in email else f"{email}@khoahoc.vn"
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active or not passwords.verify(data.password, user.password): raise HTTPException(401, "Email hoặc mật khẩu không đúng")
    token = jwt.encode({"userId": user.id, "role": user.role, "exp": datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours)}, settings.jwt_secret, algorithm="HS256")
    response.set_cookie("token", token, httponly=True, secure=settings.cookie_secure, samesite="lax")
    return {"success": True, "data": {"user": user_payload(user)}}

@app.post("/api/auth/logout")
def logout(response: Response): response.delete_cookie("token"); return {"success": True, "data": {"message": "Đã đăng xuất"}}

@app.get("/api/auth/me")
def me(user: User = Depends(current_user)): return {"success": True, "data": user_payload(user)}

@app.get("/api/projects")
def projects(page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100), year: int | None = None, status: str | None = None, search: str | None = None, db: Session = Depends(db_session), user: User = Depends(current_user)):
    q = select(Project).where(scope(user))
    if year: q = q.where(Project.year == year)
    if status: q = q.where(Project.status == status)
    if search: q = q.where(or_(Project.title.ilike(f"%{search[:500]}%"), Project.code.ilike(f"%{search[:500]}%")))
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    rows = db.scalars(q.order_by(desc(Project.created_at)).offset((page - 1) * pageSize).limit(pageSize)).all()
    return {"success": True, "data": [project_payload(x) for x in rows], "meta": {"total": total, "page": page, "pageSize": pageSize}}

@app.post("/api/projects", status_code=201)
def create_project(data: ProjectInput, db: Session = Depends(db_session), user: User = Depends(current_user)):
    if user.role not in {"ADMIN", "MANAGER", "PI"}: raise HTTPException(403, "Bạn không có quyền tạo dự án")
    if not data.title or not data.year: raise HTTPException(400, "Tên và năm dự án là bắt buộc")
    if data.startDate and data.endDate and data.startDate > data.endDate: raise HTTPException(400, "Ngày bắt đầu phải trước ngày kết thúc")
    now = datetime.now(timezone.utc); p = Project(id=str(uuid4()), owner_id=user.id, code=data.code, title=data.title, summary=data.summary, full_text=bleach.clean(data.fullText or "", strip=True), total_budget=data.totalBudget or 0, funding_source=data.fundingSource, start_date=data.startDate, end_date=data.endDate, year=data.year, status=data.status or "DRAFT", created_at=now, updated_at=now)
    db.add(p); db.add(ProjectMember(id=str(uuid4()), project_id=p.id, user_id=user.id)); db.commit(); db.refresh(p)
    return {"success": True, "data": project_payload(p)}

@app.get("/api/projects/{project_id}")
def project(project_id: str, db: Session = Depends(db_session), user: User = Depends(current_user)):
    p = db.scalar(select(Project).where(Project.id == project_id, scope(user)))
    if not p: raise HTTPException(404, "Không tìm thấy dự án")
    return {"success": True, "data": project_payload(p)}

@app.delete("/api/projects/{project_id}")
def archive(project_id: str, db: Session = Depends(db_session), user: User = Depends(current_user)):
    if user.role not in {"ADMIN", "MANAGER"}: raise HTTPException(403, "Bạn không có quyền lưu trữ dự án")
    p = db.get(Project, project_id)
    if not p: raise HTTPException(404, "Không tìm thấy dự án")
    p.status = "ARCHIVED"; p.updated_at = datetime.now(timezone.utc); db.commit()
    return {"success": True, "data": {"message": "Đã lưu trữ dự án"}}

@app.get("/api/dashboard")
def dashboard(db: Session = Depends(db_session), user: User = Depends(current_user)):
    projects = db.scalars(select(Project).where(scope(user)).order_by(desc(Project.created_at))).all()
    users = db.scalars(select(User).where(User.is_active == True)).all() if user.role in {"ADMIN", "MANAGER", "ACCOUNTANT"} else [user]
    data = {"stats": {"totalProjects": len(projects), "ongoingProjects": sum(p.status == "ONGOING" for p in projects), "completedProjects": sum(p.status == "COMPLETED" for p in projects), "totalMembers": len(users), "totalBudget": None if user.role == "RESEARCHER" else str(sum((p.total_budget for p in projects), Decimal(0)))}, "recentProjects": [project_payload(p) for p in projects[:5]], "lists": {"allProjects": [project_payload(p) for p in projects], "ongoingProjects": [project_payload(p) for p in projects if p.status == "ONGOING"], "completedProjects": [project_payload(p) for p in projects if p.status == "COMPLETED"], "users": [user_payload(u) for u in users]}}
    return {"success": True, "data": data}
