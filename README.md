# Hệ thống Quản lý đề tài Khoa học và Dự án

Next.js + TypeScript + Ant Design + Prisma/PostgreSQL.

- [Yêu cầu và lộ trình nâng cấp](docs/research-budget-requirements.md)
- [Module 1: thay đổi, kiểm thử và phần còn lại](docs/module-01.md)
- [Module 2: hồ sơ nhân sự và kiểm thử](docs/module-02.md)
- [Backlog có quan hệ module/cycle/dependency](docs/backlog.json)
- [Tiến độ và ánh xạ Plane/GitHub](docs/backlog-state.json)

## Phát triển

Cài Node.js 22 và PostgreSQL 16. Chép `.env.example` thành `.env`, cấu hình database riêng và JWT secret ngẫu nhiên tối thiểu 32 byte.

```sh
npm ci
npm run db:generate
npm run db:deploy
npm run dev
```

`db:deploy` áp dụng baseline trực tiếp cho database trống. Database đã có dữ liệu phải làm theo [quy trình baseline](docs/module-01.md#quy-trình-baseline-cơ-sở-dữ-liệu-hiện-có); không reset hoặc chạy baseline CREATE TABLE vào DB đang dùng.

## Kiểm tra

```sh
npm run typecheck
npm run lint
npm test
npm run test:backlog
npm run backlog:check
npm run build
```

Kiểm thử tích hợp: đặt `TEST_DATABASE_URL` cho DB riêng tên bắt đầu bằng `research_m01_test`, áp dụng migration rồi chạy `npm run test:integration`. Test sử dụng dữ liệu giả và giữ fixture phục vụ kiểm tra restore.

## Cập nhật backlog

Sửa yêu cầu trong Markdown và tiến độ/mapping trong `docs/backlog-state.json`, rồi chạy `npm run backlog:export`. Script kiểm tra tham chiếu và vòng phụ thuộc. `python3 scripts/sync_github_module01.py` chỉ xem trước; thêm `--apply` để cập nhật issue/milestone thực trên repo đã cấu hình, bảo toàn nội dung ngoài vùng do script quản lý. Đồng bộ Plane hiện được xác nhận thủ công qua giao diện.
