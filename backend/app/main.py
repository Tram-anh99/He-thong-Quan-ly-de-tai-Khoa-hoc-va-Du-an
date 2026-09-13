"""FastAPI service for the research-management application.

The frontend keeps authentication at the Next.js boundary so the browser receives
its httpOnly cookie from its own origin. This service validates the same signed
session and owns the business APIs routed through ``PYTHON_API_URL``.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import uuid4

import bleach
import jwt
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, JSON, Numeric, String, Text, create_engine, desc, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, joinedload, mapped_column, relationship, sessionmaker


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        extra="ignore",
    )

    database_url: str = Field(alias="DATABASE_URL")
    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_expiry_hours: int = 24
    cookie_secure: bool = False


settings = Settings()
parsed_url = urlsplit(settings.database_url.replace("postgresql://", "postgresql+psycopg://", 1))
database_url = urlunsplit(
    (
        parsed_url.scheme,
        parsed_url.netloc,
        parsed_url.path,
        urlencode([(key, value) for key, value in parse_qsl(parsed_url.query) if key != "schema"]),
        parsed_url.fragment,
    )
)
engine = create_engine(database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
passwords = CryptContext(schemes=["bcrypt"])


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True)
    password: Mapped[str] = mapped_column(String)
    full_name: Mapped[str] = mapped_column("fullName", String)
    phone_number: Mapped[str | None] = mapped_column("phoneNumber", String)
    position: Mapped[str | None] = mapped_column(String)
    department: Mapped[str | None] = mapped_column(String)
    role: Mapped[str] = mapped_column(SAEnum("ADMIN", "MANAGER", "PI", "RESEARCHER", "ACCOUNTANT", name="Role", create_type=False))
    is_active: Mapped[bool] = mapped_column("isActive", Boolean)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column("updatedAt", DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Person(Base):
    __tablename__ = "people"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str | None] = mapped_column("userId", ForeignKey("users.id", ondelete="SET NULL"), unique=True)
    full_name: Mapped[str] = mapped_column("fullName", String)
    email: Mapped[str | None] = mapped_column(String, unique=True)
    phone_number: Mapped[str | None] = mapped_column("phoneNumber", String)
    position: Mapped[str | None] = mapped_column(String)
    department: Mapped[str | None] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column("isActive", Boolean)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column("updatedAt", DateTime(timezone=True))
    account: Mapped[User | None] = relationship()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    entity: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str] = mapped_column("entityId", String)
    action: Mapped[str] = mapped_column(String)
    payload: Mapped[dict | None] = mapped_column(JSON)
    user_id: Mapped[str | None] = mapped_column("userId", String)
    ip_address: Mapped[str | None] = mapped_column("ipAddress", String)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime(timezone=True))


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
    try:
        yield db
    finally:
        db.close()


def user_payload(user: User):
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.role,
        "position": user.position,
        "department": user.department,
    }


def account_payload(user: User | None):
    if not user:
        return None
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.role,
        "isActive": user.is_active,
    }


def person_payload(person: Person):
    return {
        "id": person.id,
        "userId": person.user_id,
        "fullName": person.full_name,
        "email": person.email,
        "phoneNumber": person.phone_number,
        "position": person.position,
        "department": person.department,
        "isActive": person.is_active,
        "account": account_payload(person.account),
        "createdAt": person.created_at,
        "updatedAt": person.updated_at,
    }


def person_audit_payload(person: Person):
    return {
        "id": person.id,
        "userId": person.user_id,
        "fullName": person.full_name,
        "email": person.email,
        "phoneNumber": person.phone_number,
        "position": person.position,
        "department": person.department,
        "isActive": person.is_active,
    }


def project_payload(project: Project):
    return {
        "id": project.id,
        "code": project.code,
        "title": project.title,
        "summary": project.summary,
        "fullText": bleach.clean(
            project.full_text or "",
            tags=["p", "br", "strong", "em", "ul", "ol", "li"],
            strip=True,
        ),
        "ownerId": project.owner_id,
        "owner": user_payload(project.owner),
        "totalBudget": str(project.total_budget),
        "fundingSource": project.funding_source,
        "startDate": project.start_date,
        "endDate": project.end_date,
        "year": project.year,
        "status": project.status,
        "createdAt": project.created_at,
        "updatedAt": project.updated_at,
    }


def current_user(request: Request, db: Session = Depends(db_session)):
    # The browser session is issued by the Next.js boundary.  Accept the old
    # `token` name temporarily so a direct Python API client remains usable.
    token = request.cookies.get("auth-token") or request.cookies.get("token")
    if not token:
        raise HTTPException(401, "Chưa đăng nhập")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user = db.get(User, payload["userId"])
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(401, "Phiên đăng nhập không hợp lệ")
    if not user or not user.is_active:
        raise HTTPException(401, "Tài khoản không hoạt động")
    return user


def scope(user: User):
    if user.role in {"ADMIN", "MANAGER", "ACCOUNTANT"}:
        return True
    member_projects = select(ProjectMember.project_id).where(ProjectMember.user_id == user.id)
    return (
        or_(Project.owner_id == user.id, Project.id.in_(member_projects))
        if user.role == "PI"
        else Project.id.in_(member_projects)
    )


def require_people_manager(user: User):
    if user.role not in {"ADMIN", "MANAGER"}:
        raise HTTPException(403, "Bạn không có quyền quản lý hồ sơ nhân sự")


def client_ip(request: Request):
    return (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.headers.get("x-real-ip")
        or None
    )


def audit_person(db: Session, request: Request, user: User, action: str, person: Person, before: dict | None = None):
    db.add(
        AuditLog(
            id=str(uuid4()),
            entity="Person",
            entity_id=person.id,
            action=action,
            payload={"before": before, "after": person_audit_payload(person)},
            user_id=user.id,
            ip_address=client_ip(request),
            created_at=datetime.now(timezone.utc),
        )
    )


def person_or_404(db: Session, person_id: str):
    person = db.scalar(select(Person).options(joinedload(Person.account)).where(Person.id == person_id))
    if not person:
        raise HTTPException(404, "Không tìm thấy hồ sơ nhân sự")
    return person


def assert_linkable_account(db: Session, user_id: str | None, person_id: str | None = None):
    if not user_id:
        return None
    account = db.get(User, user_id)
    if not account or not account.is_active:
        raise HTTPException(400, "Tài khoản liên kết không hợp lệ hoặc đã ngừng hoạt động")
    linked = db.scalar(select(Person).where(Person.user_id == user_id))
    if linked and linked.id != person_id:
        raise HTTPException(409, "Tài khoản này đã được liên kết với hồ sơ khác")
    return account


def assert_available_email(db: Session, email: str | None, person_id: str | None = None):
    if not email:
        return
    found = db.scalar(select(Person).where(Person.email == email))
    if found and found.id != person_id:
        raise HTTPException(409, "Email đã được sử dụng cho hồ sơ khác")


def sync_linked_account(account: User | None, person: Person):
    """Keep legacy User profile fields in sync while Person is canonical."""
    if not account:
        return
    account.full_name = person.full_name
    account.phone_number = person.phone_number
    account.position = person.position
    account.department = person.department


class Login(BaseModel):
    email: str
    password: str


class ProjectInput(BaseModel):
    code: str | None = None
    title: str | None = None
    summary: str | None = None
    fullText: str | None = None
    totalBudget: Decimal | None = Field(None, ge=0)
    fundingSource: str | None = None
    startDate: datetime | None = None
    endDate: datetime | None = None
    year: int | None = Field(None, ge=1900, le=2200)
    status: str | None = None


class PersonInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fullName: str | None = Field(None, max_length=200)
    email: str | None = Field(None, max_length=320)
    phoneNumber: str | None = Field(None, max_length=50)
    position: str | None = Field(None, max_length=200)
    department: str | None = Field(None, max_length=200)
    userId: str | None = Field(None, max_length=100)
    isActive: bool | None = None

    @field_validator("fullName", "email", "phoneNumber", "position", "department", "userId", mode="before")
    @classmethod
    def clean_strings(cls, value):
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("Trường dữ liệu phải là chuỗi")
        value = value.strip()
        return value or None

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        if value is not None and (value.count("@") != 1 or value.startswith("@") or value.endswith("@")):
            raise ValueError("Email không hợp lệ")
        return value.lower() if value else None


app = FastAPI(title="Research Management API")


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return JSONResponse({"success": False, "error": str(exc.detail)}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def request_validation_error(_: Request, __: RequestValidationError):
    return JSONResponse({"success": False, "error": "Dữ liệu không hợp lệ"}, status_code=422)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/login")
def login(data: Login, response: Response, db: Session = Depends(db_session)):
    email = data.email.strip().lower()
    email = email if "@" in email else f"{email}@khoahoc.vn"
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active or not passwords.verify(data.password, user.password):
        raise HTTPException(401, "Email hoặc mật khẩu không đúng")
    token = jwt.encode(
        {"userId": user.id, "role": user.role, "exp": datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours)},
        settings.jwt_secret,
        algorithm="HS256",
    )
    response.set_cookie("token", token, httponly=True, secure=settings.cookie_secure, samesite="lax")
    return {"success": True, "data": {"user": user_payload(user)}}


@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("token")
    return {"success": True, "data": {"message": "Đã đăng xuất"}}


@app.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return {"success": True, "data": user_payload(user)}


@app.get("/api/people")
def people(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=200),
    includeInactive: bool = False,
    db: Session = Depends(db_session),
    user: User = Depends(current_user),
):
    require_people_manager(user)
    filters = [] if includeInactive else [Person.is_active.is_(True)]
    if search and search.strip():
        term = f"%{search.strip()[:200]}%"
        filters.append(or_(Person.full_name.ilike(term), Person.email.ilike(term), Person.department.ilike(term)))
    total = db.scalar(select(func.count()).select_from(Person).where(*filters)) or 0
    rows = db.scalars(
        select(Person)
        .options(joinedload(Person.account))
        .where(*filters)
        .order_by(Person.full_name.asc(), Person.id.asc())
        .offset((page - 1) * pageSize)
        .limit(pageSize)
    ).all()
    return {
        "success": True,
        "data": [person_payload(row) for row in rows],
        "pagination": {"total": total, "page": page, "pageSize": pageSize, "totalPages": (total + pageSize - 1) // pageSize},
    }


@app.get("/api/people/accounts")
def available_accounts(
    personId: str | None = Query(None, max_length=100),
    db: Session = Depends(db_session),
    user: User = Depends(current_user),
):
    require_people_manager(user)
    linked_accounts = select(Person.user_id).where(Person.user_id.is_not(None))
    if personId:
        linked_accounts = linked_accounts.where(Person.id != personId)
    accounts = db.scalars(
        select(User)
        .where(User.is_active.is_(True), User.id.not_in(linked_accounts))
        .order_by(User.full_name.asc(), User.id.asc())
    ).all()
    return {"success": True, "data": [account_payload(account) for account in accounts]}


@app.post("/api/people", status_code=201)
def create_person(
    data: PersonInput,
    request: Request,
    db: Session = Depends(db_session),
    user: User = Depends(current_user),
):
    require_people_manager(user)
    if not data.fullName:
        raise HTTPException(400, "Họ và tên là bắt buộc")
    assert_available_email(db, data.email)
    account = assert_linkable_account(db, data.userId)
    now = datetime.now(timezone.utc)
    person = Person(
        id=str(uuid4()),
        user_id=data.userId,
        full_name=data.fullName,
        email=data.email,
        phone_number=data.phoneNumber,
        position=data.position,
        department=data.department,
        is_active=True if data.isActive is None else data.isActive,
        created_at=now,
        updated_at=now,
        account=account,
    )
    try:
        db.add(person)
        sync_linked_account(account, person)
        audit_person(db, request, user, "CREATE", person)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email hoặc tài khoản liên kết đã được sử dụng")
    person = person_or_404(db, person.id)
    return {"success": True, "data": person_payload(person)}


@app.get("/api/people/{person_id}")
def get_person(person_id: str, db: Session = Depends(db_session), user: User = Depends(current_user)):
    require_people_manager(user)
    return {"success": True, "data": person_payload(person_or_404(db, person_id))}


@app.put("/api/people/{person_id}")
def update_person(
    person_id: str,
    data: PersonInput,
    request: Request,
    db: Session = Depends(db_session),
    user: User = Depends(current_user),
):
    require_people_manager(user)
    person = person_or_404(db, person_id)
    before = person_audit_payload(person)
    changes = data.model_dump(exclude_unset=True)
    if "fullName" in changes and not changes["fullName"]:
        raise HTTPException(400, "Họ và tên là bắt buộc")
    if "email" in changes:
        assert_available_email(db, changes["email"], person.id)
    account = person.account
    if "userId" in changes:
        account = assert_linkable_account(db, changes["userId"], person.id)
        person.user_id = changes["userId"]
        person.account = account
    fields = {
        "fullName": "full_name",
        "email": "email",
        "phoneNumber": "phone_number",
        "position": "position",
        "department": "department",
        "isActive": "is_active",
    }
    for input_name, model_name in fields.items():
        if input_name in changes:
            setattr(person, model_name, changes[input_name])
    person.updated_at = datetime.now(timezone.utc)
    try:
        sync_linked_account(account, person)
        audit_person(db, request, user, "UPDATE", person, before)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email hoặc tài khoản liên kết đã được sử dụng")
    return {"success": True, "data": person_payload(person_or_404(db, person.id))}


@app.delete("/api/people/{person_id}")
def deactivate_person(
    person_id: str,
    request: Request,
    db: Session = Depends(db_session),
    user: User = Depends(current_user),
):
    require_people_manager(user)
    person = person_or_404(db, person_id)
    if person.is_active:
        before = person_audit_payload(person)
        person.is_active = False
        person.updated_at = datetime.now(timezone.utc)
        audit_person(db, request, user, "DELETE", person, before)
        db.commit()
    return {"success": True, "data": {"message": "Đã ngừng hoạt động hồ sơ nhân sự"}}


@app.get("/api/projects")
def projects(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    year: int | None = None,
    status: str | None = None,
    search: str | None = None,
    db: Session = Depends(db_session),
    user: User = Depends(current_user),
):
    query = select(Project).where(scope(user))
    if year:
        query = query.where(Project.year == year)
    if status:
        query = query.where(Project.status == status)
    if search:
        query = query.where(or_(Project.title.ilike(f"%{search[:500]}%"), Project.code.ilike(f"%{search[:500]}%")))
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = db.scalars(query.order_by(desc(Project.created_at)).offset((page - 1) * pageSize).limit(pageSize)).all()
    return {"success": True, "data": [project_payload(row) for row in rows], "meta": {"total": total, "page": page, "pageSize": pageSize}}


@app.post("/api/projects", status_code=201)
def create_project(data: ProjectInput, db: Session = Depends(db_session), user: User = Depends(current_user)):
    if user.role not in {"ADMIN", "MANAGER", "PI"}:
        raise HTTPException(403, "Bạn không có quyền tạo dự án")
    if not data.title or not data.year:
        raise HTTPException(400, "Tên và năm dự án là bắt buộc")
    if data.startDate and data.endDate and data.startDate > data.endDate:
        raise HTTPException(400, "Ngày bắt đầu phải trước ngày kết thúc")
    now = datetime.now(timezone.utc)
    project = Project(
        id=str(uuid4()),
        owner_id=user.id,
        code=data.code,
        title=data.title,
        summary=data.summary,
        full_text=bleach.clean(data.fullText or "", strip=True),
        total_budget=data.totalBudget or 0,
        funding_source=data.fundingSource,
        start_date=data.startDate,
        end_date=data.endDate,
        year=data.year,
        status=data.status or "DRAFT",
        created_at=now,
        updated_at=now,
    )
    db.add(project)
    db.add(ProjectMember(id=str(uuid4()), project_id=project.id, user_id=user.id))
    db.commit()
    db.refresh(project)
    return {"success": True, "data": project_payload(project)}


@app.get("/api/projects/{project_id}")
def project(project_id: str, db: Session = Depends(db_session), user: User = Depends(current_user)):
    found = db.scalar(select(Project).where(Project.id == project_id, scope(user)))
    if not found:
        raise HTTPException(404, "Không tìm thấy dự án")
    return {"success": True, "data": project_payload(found)}


@app.delete("/api/projects/{project_id}")
def archive(project_id: str, db: Session = Depends(db_session), user: User = Depends(current_user)):
    if user.role not in {"ADMIN", "MANAGER"}:
        raise HTTPException(403, "Bạn không có quyền lưu trữ dự án")
    found = db.get(Project, project_id)
    if not found:
        raise HTTPException(404, "Không tìm thấy dự án")
    found.status = "ARCHIVED"
    found.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True, "data": {"message": "Đã lưu trữ dự án"}}


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(db_session), user: User = Depends(current_user)):
    projects = db.scalars(select(Project).where(scope(user)).order_by(desc(Project.created_at))).all()
    users = (
        db.scalars(select(User).where(User.is_active.is_(True))).all()
        if user.role in {"ADMIN", "MANAGER", "ACCOUNTANT"}
        else [user]
    )
    data = {
        "stats": {
            "totalProjects": len(projects),
            "ongoingProjects": sum(project.status == "ONGOING" for project in projects),
            "completedProjects": sum(project.status == "COMPLETED" for project in projects),
            "totalMembers": len(users),
            "totalBudget": None if user.role == "RESEARCHER" else str(sum((project.total_budget for project in projects), Decimal(0))),
        },
        "recentProjects": [project_payload(project) for project in projects[:5]],
        "lists": {
            "allProjects": [project_payload(project) for project in projects],
            "ongoingProjects": [project_payload(project) for project in projects if project.status == "ONGOING"],
            "completedProjects": [project_payload(project) for project in projects if project.status == "COMPLETED"],
            "users": [user_payload(account) for account in users],
        },
    }
    return {"success": True, "data": data}
