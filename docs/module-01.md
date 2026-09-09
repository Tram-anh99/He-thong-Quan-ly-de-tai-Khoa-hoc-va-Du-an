# Module 1 — Nền tảng và cơ sở dữ liệu

Cập nhật: 09/09/2026. Phạm vi đợt này: công việc M01/C01 và các điều kiện tiên quyết SEC-001/002/003, AUD-001. Các kết quả dưới đây là kiểm thử trên mã nguồn và cơ sở dữ liệu thử nghiệm riêng; chưa triển khai lên hệ thống đang sử dụng.

## Nhật ký triển khai theo Work Item

| ID | Nội dung đã thực hiện | Bằng chứng / trạng thái |
| --- | --- | --- |
| CORE-001 | Baseline đủ 10 bảng hiện hành; migration lock PostgreSQL; script diễn tập pg_dump/pg_restore đối soát ID, nội dung, số bản ghi và Decimal | Migration chạy đạt trên DB trống; restore fixture khớp 10 bảng. Chưa chạy trên bản sao dữ liệu production |
| CORE-002 | DELETE đề tài chuyển thành ARCHIVED; giữ nguyên quan hệ, chứng từ, hợp đồng, thanh toán; UI đổi nhãn Lưu trữ | Test lưu trữ lặp không thêm audit trùng, giữ số tiền và hợp đồng; lỗi audit rollback trạng thái |
| CORE-003 | Validation JSON, enum, năm, phân trang, độ dài, tiền Decimal và ngày; cập nhật đối chiếu ngày hiện có; lỗi trùng mã 409 | Unit test biên tiền/ngày/JSON; integration test payload sai, trùng mã, cập nhật ngày không hợp lệ |
| QA-001 | Lệnh lint/typecheck/test không tương tác; CI PostgreSQL, migration, test, build và kiểm tra backlog | Typecheck, lint, build và bộ test local đạt; trạng thái CI từ xa được theo dõi trên PR |
| LINK-001 | 51 work items, 11 module, 10 cycle, 80 dependency; kiểm tra ID, vòng dependency/parent, thứ tự cycle | 5 test Python; mapping/progress lưu riêng ở backlog-state.json, tái xuất không mất dữ liệu |
| LINK-002 | Chuẩn bị mapping, đồng bộ issue bằng mã ổn định và vùng nội dung được quản lý; module/cycle liên kết tương đương ở GitHub | Theo dõi kết quả thực tế trong backlog-state.json; tích hợp tự động Plane chưa nghiệm thu |
| OPS-001 | Giữ ở C10 sau MVP và báo cáo | Chưa triển khai; không đánh dấu hoàn tất khi điều kiện tiên quyết chưa xong |
| SEC-001 | Bỏ secret mặc định, HS256, kiểm tra payload/expiry và user còn hoạt động; cookie httpOnly; không trả token trong JSON login | Unit test token sai/hết hạn/thiếu cấu hình; integration user bị khóa nhận 401 |
| SEC-002 | Lọc dự án/list/search/dashboard theo vai trò; chỉ trả tài chính cá nhân được xác định; hồ sơ/chi legacy chưa rõ người nhận không trả cho member | API test 401/403/404, truy cập chéo, search không thay scope, kế toán không sửa đề tài |
| SEC-003 | Làm sạch HTML tại ghi và đọc, kể cả dữ liệu cũ; giữ thẻ định dạng cho phép | Test loại script, event handler, javascript URL, SVG/image không được phép |
| AUD-001 | Project + membership + audit cùng transaction; update/archive mức Serializable | Chủ động làm DB từ chối audit và xác minh cả create/update/archive rollback |

## Cách chạy kiểm tra

```sh
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run test:backlog
npm run backlog:check
npm run build
```

Kiểm thử tích hợp yêu cầu `TEST_DATABASE_URL` trỏ database tên bắt đầu bằng `research_m01_test`; script từ chối thiếu biến hoặc tên DB khác. Đặt `DATABASE_URL` cho database thử nghiệm trước `npm run db:deploy`, rồi chạy `npm run test:integration`. Không lấy URL production để chạy test.

`scripts/verify_restore.py` chỉ làm việc với container riêng `research-m01-db`, user `research_test` và database fixture `research_m01_test`. Script tạo database khôi phục mới, không reset/xóa DB nguồn; giữ DB khôi phục để xem lại. Báo cáo tại [module-01-restore-evidence.json](module-01-restore-evidence.json). Đây là dữ liệu giả, không phải đối soát dữ liệu thật của tổ chức.

## Quy trình baseline cơ sở dữ liệu hiện có

1. Sao lưu bằng pg_dump và khôi phục vào DB staging riêng. Đối soát dữ liệu với nguồn trước khi chuyển đổi.
2. Đối chiếu schema staging với `prisma/schema.prisma` bằng Prisma migrate diff; nếu có khác biệt, dừng và lập migration/mapping bổ sung. Không dùng reset hoặc db push để ép schema production.
3. Chỉ khi schema hiện có khớp baseline, đánh dấu `00000000000000_baseline` đã áp dụng bằng `prisma migrate resolve --applied 00000000000000_baseline` trên staging. Không chạy CREATE TABLE baseline vào DB đã có bảng.
4. Kiểm tra migrate status, API theo vai trò và đối soát trước/sau. Ghi bằng chứng, kế hoạch phục hồi và thời điểm chuyển đổi.
5. Thực hiện chuyển đổi production theo quy trình vận hành đã duyệt; đợt này chưa thực hiện bước đó.

## Quan hệ công việc và cách cập nhật tiến độ

`docs/research-budget-requirements.md` là nguồn yêu cầu. `docs/backlog-state.json` lưu tiến độ/mapping, `scripts/export_backlog.py` tạo `docs/backlog.json`. Không chỉnh tay file xuất rồi mong giữ trạng thái khi tái tạo.

GitHub: Module được biểu diễn bằng issue tổng hợp và label; Cycle bằng milestone; dependency bằng liên kết issue trong nội dung. Work item title chỉ chứa nội dung công việc, không chứa mã. Các ID và quan hệ nằm trong body. Đây là mapping tường minh, không tuyên bố đã tạo dependency native khi chưa có bằng chứng.

Plane: gắn Module/Cycle trực tiếp khi UI hỗ trợ; mỗi Work Item có mục mục tiêu, thay đổi, kiểm thử, phần còn lại và liên kết GitHub/Page. Không gán ngày giả khi chưa có lịch được chốt. Mọi cập nhật chỉ đóng việc khi đạt tiêu chí, không đóng OPS-001 hay LINK-002 chỉ để module hiển thị 100%.

## Giới hạn và rủi ro còn lại

- Tiền giữ chính xác tại validation/DB/API; một số phép tổng và định dạng UI cũ vẫn dùng JavaScript Number, cần hoàn thiện trong M05 trước nghiệp vụ tính tiền chính thức.
- Chưa có đầy đủ luồng phê duyệt tài chính, hồ sơ hai phiên bản, nhắc hạn/email, RLS hoặc phân quyền kiểm toán; các phần này có backlog riêng.
- API dashboard còn nạp toàn bộ dự án trong phạm vi được phép; quy mô lớn cần phân trang/aggregate ở DB.
- Kiểm tra dependency hiện tại còn cảnh báo bảo mật ở Next.js/next-auth và các thư viện cũ. Không thực hiện nâng cấp major tự động; ghi riêng trong issue để xử lý trước triển khai production. Module này không chứng nhận toàn bộ hệ thống an toàn production.
- Browser plugin bị lỗi module runtime. Plane được thao tác bằng Computer Use với phiên đã đăng nhập; kết quả đồng bộ chỉ ghi khi đã đọc xác nhận.

Nguồn kỹ thuật cho cấu hình làm sạch HTML: [tài liệu sanitize-html của nhà phát triển](https://github.com/apostrophecms/apostrophe/tree/main/packages/sanitize-html).
