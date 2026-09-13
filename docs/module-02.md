# Module 2 — Nhân sự và năng lực

Cập nhật: 13/09/2026. Phạm vi hoàn tất trong đợt này: **PEOPLE-001 / WI-009 — Quản lý hồ sơ nhân sự độc lập tài khoản đăng nhập**. Các hạng mục lương, người phụ thuộc, kỹ năng và capacity vẫn thuộc PEOPLE-002 đến PEOPLE-004.

## Đầu vào và quan hệ

- Phụ thuộc đã hoàn tất: CORE-001 và SEC-002.
- Hồ sơ nghiệp vụ `Person` tách khỏi `User`; `userId` là tùy chọn và duy nhất.
- Cộng tác viên có thể có `Person` mà không có tài khoản, mật khẩu hoặc quyền đăng nhập.
- Phân công cộng tác viên vào đề tài chưa thuộc phạm vi này vì quan hệ thành viên hiện hành vẫn dùng `User`; phần đó thuộc WORK-002.

## Thay đổi đã thực hiện

| Phần | Thay đổi | Kết quả |
| --- | --- | --- |
| Dữ liệu | Thêm model/bảng `people`, `userId` tùy chọn duy nhất, trạng thái hoạt động và audit | Migration `20260912180000_add_people_profiles` backfill hồ sơ liên kết cho mọi tài khoản có sẵn; không thay đổi ID hay quan hệ đề tài cũ |
| API Python | Thêm `GET/POST /api/people`, `GET/PUT/DELETE /api/people/{id}`, `GET /api/people/accounts` | CRUD, tìm kiếm, phân trang, liên kết một-một, ngừng hoạt động thay cho xóa và response chuẩn `{ success, data }` |
| Phân quyền | Chỉ ADMIN và MANAGER đọc/quản lý danh sách và hồ sơ | API trực tiếp từ RESEARCHER trả 403; không chỉ ẩn menu |
| Audit | CREATE, UPDATE, ngừng hoạt động ghi cùng transaction | Không chứa mật khẩu trong payload audit |
| Giao diện | Thêm trang `/people`, redirect tương thích từ `/users`, menu chỉ hiện ADMIN/MANAGER | Danh sách rõ trạng thái liên kết; form tạo/sửa cho phép để trống tài khoản cho cộng tác viên |
| Dữ liệu demo | Seed đồng bộ hồ sơ của tài khoản mẫu và một cộng tác viên chưa có tài khoản | Có thể quan sát trực tiếp trên trang Nhân sự |

## Kiểm thử và bằng chứng

- Đối chiếu schema DB demo với baseline trước khi migrate: không có khác biệt.
- Đánh dấu baseline đã tồn tại rồi áp dụng migration mới; `prisma migrate status` xác nhận schema đã cập nhật.
- `npm run typecheck`, `npm run lint`, `prisma generate` và Python compile đều đạt.
- Kiểm thử API thật qua giao diện proxy: tạo cộng tác viên không tài khoản, tìm kiếm, liên kết tài khoản, chặn liên kết trùng 409, ngừng hoạt động, kiểm tra audit và RESEARCHER bị chặn 403.
- Kiểm tra Chrome bằng `admin@khoahoc.vn`: trang `/people` hiển thị hồ sơ liên kết và `Cộng tác viên demo — chưa có tài khoản`.

## Lỗi gặp phải và cách xử lý

| Sự việc | Xử lý |
| --- | --- |
| Database demo có schema baseline nhưng chưa có lịch sử migration | Đối chiếu schema chỉ-đọc trước; chỉ dùng `migrate resolve --applied` cho baseline rồi áp dụng migration bổ sung. Không reset hoặc chạy lại `CREATE TABLE` baseline. |
| Script kiểm thử tìm kiếm lỗi vì URL chứa tiếng Việt chưa được mã hóa | Mã hóa query URL và chạy lại; API không có lỗi. |
| SQLAlchemy ghi `Role` PostgreSQL như chuỗi và thiếu timestamp khi tạo dữ liệu kiểm thử | Khai báo enum PostgreSQL và mapping `createdAt`/`updatedAt` trong model `User`; kiểm tra lại bằng bản ghi tạm thời rồi xóa. |

## Giới hạn còn lại

- Chưa chuyển các khóa ngoại ProjectMember, Contract và BudgetItem từ `User` sang `Person`; giữ tương thích dữ liệu hiện có cho đến WORK-002.
- Lịch sử lương/người phụ thuộc, kỹ năng/kinh nghiệm và capacity chưa được triển khai trong PEOPLE-001.
