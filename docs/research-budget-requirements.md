# Rà soát code và yêu cầu nâng cấp Research Budget & Income Planner

Ngày rà soát: 08/09/2026. Phạm vi: source code tại repository hiện tại và tài liệu yêu cầu đính kèm. Đây là đặc tả triển khai, không phải xác nhận các chức năng đã được xây dựng.

## 1. Kết quả kiểm tra hiện trạng

| Thành phần | Bằng chứng trong repository | Kết luận |
| --- | --- | --- |
| Kiến trúc | `package.json`, `prisma/schema.prisma` | Next.js 14, React, TypeScript, Ant Design, Prisma/PostgreSQL; API nằm trong Next.js |
| Đăng nhập | `src/lib/auth.ts`, `src/app/api/auth/login/route.ts` | JWT cookie, bcrypt, năm vai trò; chưa có AUDITOR |
| Đề tài | `src/app/api/projects/route.ts`, `src/app/api/projects/[id]/route.ts` | Có API danh sách, chi tiết, tạo, sửa, xóa |
| Nhân sự, hạng mục, hợp đồng, thanh toán, sản phẩm | `prisma/schema.prisma` | Có model nhưng chưa có API quản trị tương ứng trong `src/app/api` |
| Chi tiết đề tài | `src/app/projects/[id]/page.tsx` | Hiển thị dữ liệu; nhiều nút thêm/sửa/xóa/upload/download chưa có handler |
| Điều hướng | `src/components/AppLayout.tsx` | Có menu users/templates/reports/settings nhưng chưa có page tương ứng |
| Nhật ký | `src/lib/audit.ts`, `src/app/api/audit-logs/route.ts` | Có before/after cho đề tài, chỉ ADMIN đọc; chưa giao dịch nguyên tử với dữ liệu |
| Planner | Schema và danh sách route hiện tại | Chưa có Content, WorkItem, RuleSet, Allocation theo kỳ, TaxPolicy, Scenario |
| Migration và kiểm thử | `prisma/`, `package.json` | Chưa có migration được Git theo dõi, chưa có script test |

Đã chạy `./node_modules/.bin/tsc --noEmit --incremental false`: đạt, mã thoát 0. Chưa kiểm thử trình duyệt, build production, kết nối DB hoặc phân quyền bằng tài khoản thật; typecheck không thay thế các kiểm tra này.

### Những lỗi cần giải quyết trước dữ liệu tài chính thật

1. **P0 — Phạm vi truy cập:** GET projects, GET project detail và dashboard chỉ kiểm tra đăng nhập, chưa giới hạn theo chủ nhiệm/thành viên. Detail trả cả hợp đồng, hạng mục, khoản thanh toán; dashboard trả danh sách toàn bộ dự án và người dùng.
2. **P0 — Bí mật xác thực:** `src/lib/auth.ts` dùng secret mặc định nếu thiếu biến môi trường. Phải từ chối vận hành khi thiếu cấu hình, xác minh loại payload/thuật toán và kiểm tra tài khoản còn hoạt động ở mỗi request. Hiện `getCurrentUser` không kiểm tra `isActive`.
3. **P0 — HTML chưa được làm sạch:** API lưu `fullText` rồi trang detail đưa vào `dangerouslySetInnerHTML`. Cần sanitizer với danh sách thẻ/thuộc tính cho phép và kiểm thử payload XSS.
4. **P0 — Tính toàn vẹn:** tạo đề tài, thêm chủ nhiệm và ghi audit là các lần ghi riêng; update/delete cũng tách audit. Lỗi giữa chừng có thể để lại dữ liệu không có nhật ký. Dùng transaction chung.
5. **P0 — Xóa dây chuyền:** Project có quan hệ cascade tới hợp đồng, thanh toán và dữ liệu khác. Thay xóa đề tài có phát sinh tài chính bằng lưu trữ; giữ chứng từ, lịch sử và khóa ngoại.
6. **P1 — Validation:** bổ sung kiểm tra kiểu, tiền âm, ngày bắt đầu/kết thúc, năm, enum, giới hạn page/pageSize, lỗi JSON và xung đột mã dự án ở DB; trả lỗi 4xx rõ ràng.
7. **P1 — Định nghĩa đã chi:** UI chỉ cộng PaymentRecord COMPLETED. PARTIAL không có số tiền đã trả riêng, nên chưa đủ để diễn giải thanh toán nhiều đợt. Cần sổ giao dịch đã ghi sổ và liên kết người nhận.

## 2. Kiến trúc điều chỉnh

Tiếp tục Next.js + TypeScript + Ant Design + Prisma/PostgreSQL trong repo này. Tách logic nghiệp vụ thành module thuần ở `src/lib/domain/{budget,rules,tax}` và lớp dịch vụ giao dịch. Chưa cần thêm FastAPI hay viết lại toàn bộ: chúng làm tăng phần phải di chuyển mà hiện chưa có yêu cầu kỹ thuật bắt buộc.

Di chuyển DB theo hướng bổ sung: baseline schema hiện hành, thử migration trên bản sao, backfill, đối soát rồi mới chuyển luồng ghi. Giữ ID và dữ liệu Project/BudgetItem/Contract/PaymentRecord. Không tự suy diễn hạng mục cũ thành ngày công hoặc gán người nhận khi thiếu thông tin; đưa vào danh sách cần đối soát.

## 3. Mô hình dữ liệu đích

| Nhóm | Bổ sung và quy tắc |
| --- | --- |
| Person | Hồ sơ nghiệp vụ riêng; userId tùy chọn và duy nhất, để cộng tác viên không cần tài khoản. Ngừng hoạt động thay vì xóa lịch sử |
| SalaryHistory | personId, hệ số, lương cơ sở/cấu phần cần thiết, khoảng hiệu lực; không chồng lấn cùng cấu phần. Hệ số lương không tự đồng nghĩa lương thực trả |
| DependentHistory | personId, người phụ thuộc, khoảng đủ điều kiện, hồ sơ xác minh; quyền đọc riêng |
| Competency | Kỹ năng theo thang có thứ tự, kinh nghiệm với ngày tham chiếu và minh chứng |
| Project → Content → WorkItem | Nội dung có trần ngân sách; công việc có thời gian, đơn vị, điều kiện kỹ năng/kinh nghiệm và loại định mức |
| RuleSet/RuleVersion | Số văn bản, điều khoản, nguồn, phạm vi, hiệu lực, phiên bản, trạng thái draft/published/retired; phiên bản đã dùng không sửa trực tiếp |
| Allocation | WorkItem × Person × kỳ tháng; ngày dự kiến/thực tế, allowedAmount, allocatedAmount, ruleVersionId, snapshot đầu vào và giải thích kết quả |
| Payment/PaymentLine | Chứng từ, người nhận, allocation, ngày thực trả, grossPaid, taxWithheld, netPaid, trạng thái; mỗi đợt thực trả là giao dịch riêng |
| IncomeEntry/TaxLedger | Tách thu nhập lương/nguồn khác với tiền dự án để tránh đếm hai lần; lưu taxableIncome, deduction, tax estimate và khấu trừ thực tế |
| TaxPolicy | Phiên bản, khoảng hiệu lực, loại thu nhập/đối tượng, bậc thuế, giảm trừ, khấu trừ, làm tròn, nguồn và người phê duyệt |
| CapacityCalendar | Sức chứa theo người/tháng, nghỉ phép/ngày nghỉ và quy tắc tính; không cố định mọi tháng là 22 ngày |
| Scenario | Bản sao kế hoạch với baselineRevision và owner; không sinh Payment/TaxLedger thật |
| AuditLog | Actor, thời điểm, thực thể, before/after, lý do, requestId; ghi trong transaction, tài khoản ứng dụng không sửa/xóa nhật ký |

Tiền dùng Decimal, API truyền chuỗi thập phân; chỉ làm tròn theo policy đã khai báo. Ngày công hỗ trợ số lẻ. Kỳ kế hoạch dùng năm/tháng và múi giờ Asia/Ho_Chi_Minh; thời điểm audit lưu UTC. Ràng buộc DB bảo đảm WorkItem, Allocation và Payment thuộc cùng dự án. Ghi đồng thời phải dùng khóa/transaction hoặc optimistic version để không vượt trần vì hai người lưu cùng lúc.

## 4. Định nghĩa các con số

- Approved budget: kinh phí đã được phê duyệt ở đúng phạm vi dự án/nội dung; dự án nháp không được gắn nhãn đã duyệt.
- Allowed amount: kết quả định mức theo đầu vào, điều kiện, phiên bản và giới hạn; không suy ra từ số đã trả.
- Allocated amount: số chủ nhiệm phân bổ đã được duyệt. Bản nháp/kịch bản tách riêng.
- Paid amount: tổng giao dịch đã ghi sổ, tính cả điều chỉnh/hoàn trả theo quy ước dấu; giao dịch pending không tính đã chi.
- Taxable income: khoản thu nhập được phân loại theo policy, không mặc định bằng allowed/allocated/paid.
- Remaining to allocate = approved − allocated. Remaining cash budget = approved − paid. Pending allocated payment = allocated − paid được đối chiếu trên cùng phạm vi. Không cộng allocated + paid như hai khoản sử dụng ngân sách độc lập.
- Cam kết hợp đồng theo dõi riêng và liên kết allocation để tránh đếm trùng.
- Net paid = gross paid − khấu trừ thực tế − khoản khấu trừ khác được ghi nhận. Net dự kiến là chỉ tiêu khác.

Thuế theo năm chỉ hiện là ước tính khi chưa đủ dữ liệu các nguồn thu, cư trú và giảm trừ. Chênh lệch quyết toán dự kiến = nghĩa vụ năm ước tính − khấu trừ năm đã ghi nhận, với chú giải số dương/âm. Không nhân thuế một tháng bất thường với 12 để kết luận nghĩa vụ năm.

Các số thuế 2026 trong tài liệu gốc chưa được xác minh trong đợt rà soát code này. Không seed chúng thành quy định đang có hiệu lực trước khi đối chiếu văn bản chính thức và phạm vi áp dụng. Thiếu policy hợp lệ phải báo chưa thể tính, không trả 0 hay dùng ngầm phiên bản mới nhất.

## 5. Phạm vi sản phẩm và nghiệm thu

### MVP quản lý ngân sách

1. **People:** danh sách, tạo/sửa hồ sơ, kỹ năng, lịch sử hệ số, capacity; dữ liệu riêng tư chỉ trả cho vai trò được phép.
2. **Projects:** kế thừa đề tài hiện có; CRUD nội dung/công việc, phân công chủ nhiệm, thành viên, chọn RuleSet có hiệu lực.
3. **Work/Budget Allocation:** chọn người và kỳ, nhập ngày công, xem định mức được phép và giải thích, nhập tiền phân bổ, cảnh báo năng lực, chặn vượt trần cứng, lưu lý do thay đổi.
4. **Person × Month Matrix:** 12 tháng, tổng quý/năm, bộ lọc năm/dự án/người; mode tiền phân bổ và ngày công. Drawer hiển thị từng dự án/công việc, ngày, định mức, tiền và capacity. Tổng ô = tổng dòng drawer.
5. **Dashboard:** approved/allocated/paid, hai loại remaining, cảnh báo vượt công, heatmap workload và ngân sách; tất cả dùng đúng phạm vi vai trò.

MVP có ghi nhận thanh toán nhiều đợt, quyền truy cập, audit và đối soát cơ bản ngay từ đầu. Bổ sung lịch thực hiện, lịch tạm ứng/thanh toán hợp đồng, checklist hồ sơ bản mềm/bản ký và nhắc trong ứng dụng/email theo đặc tả bên dưới. Mode thuế/net chỉ mở khi module thuế đã nghiệm thu; không hiển thị số giả để lấp giao diện.

Tiêu chí xuyên suốt: truy cập API trực tiếp vẫn bị chặn; thành viên không đọc thu nhập người khác từ response, drawer, export hoặc audit; tiền/ngày/phiên bản truy ngược được; lưu thất bại không tạo dữ liệu dở dang; hai request đồng thời không vượt ngân sách; dữ liệu cũ đối soát được sau migration.

### Sau MVP

Thu nhập và thuế tháng/quý/năm; heatmap thu nhập; dashboard riêng kế toán/thành viên; Scenario Planner với so sánh baseline, mức tải và thuế ước tính; xuất Excel và hồ sơ/chứng từ; kiểm toán chỉ đọc. Áp dụng scenario phải qua duyệt, kiểm tra baseline còn mới và chạy lại toàn bộ validator trong transaction.

### Phân quyền đề xuất

| Vai trò | Phạm vi |
| --- | --- |
| ADMIN | Quản trị toàn hệ thống, cấu hình và cấp quyền; thay đổi tài chính vẫn audit |
| MANAGER | Tổng ngân sách và thuế tổng hợp, duyệt trong phạm vi được giao; không đọc hồ sơ người phụ thuộc |
| ACCOUNTANT | Thanh toán và hồ sơ thuế cần thiết; không tự sửa RuleSet/phân bổ đã duyệt |
| PI | Đề tài sở hữu, công việc và thu nhập dự án cần thiết; không xem lương ngoài dự án/thuế cá nhân thành viên |
| RESEARCHER | Công việc, phân bổ, thu nhập và thuế của chính mình |
| AUDITOR | Chỉ đọc trong phạm vi kiểm toán được cấp; không mặc định toàn bộ hồ sơ riêng tư |

Thực thi bằng service authorization và projection trường dữ liệu ở mọi API. Nếu thêm PostgreSQL RLS, dùng transaction-local identity cho connection pool, tài khoản runtime không có BYPASSRLS và kiểm thử chính sách DB; không coi ẩn menu là phân quyền.

## 6. Backlog triển khai theo phụ thuộc

P0: chặn an toàn/tính đúng. P1: thiết yếu MVP. P2: mở rộng sau MVP. Cycle là thứ tự dự kiến, chưa gán ngày hay cam kết thời lượng.

| ID | Module | Cycle | Ưu tiên | Công việc / tiêu chí nghiệm thu | Phụ thuộc |
| --- | --- | --- | --- | --- | --- |
| SEC-001 | M09 Auth | C01 | P0 | Bỏ secret mặc định, validate token, từ chối user đã khóa; token sai/hết hạn nhận 401 | — |
| SEC-002 | M09 Auth | C01 | P0 | Lọc project/list/detail/dashboard theo vai trò; test truy cập chéo và trường riêng tư | SEC-001 |
| SEC-003 | M09 Auth | C01 | P0 | Làm sạch fullText; script và event handler không thực thi | — |
| CORE-001 | M01 Database | C01 | P0 | Baseline migration, backup/restore thử trên bản sao; giữ số bản ghi và tổng tiền | — |
| AUD-001 | M10 Audit | C01 | P0 | Mutation và audit cùng transaction; lỗi audit rollback mutation | CORE-001 |
| CORE-002 | M01 Database | C01 | P0 | Lưu trữ đề tài có phát sinh thay xóa cascade; chứng từ vẫn truy vấn được | AUD-001 |
| CORE-003 | M01 Database | C01 | P1 | Validate payload/filter/pagination, tiền Decimal; dữ liệu sai trả 4xx | — |
| QA-001 | M01 Database | C01 | P1 | Lệnh test/typecheck/lint không tương tác và CI; có test phân quyền thất bại | SEC-002 |
| PEOPLE-001 | M02 People | C02 | P1 | Person tách User, CRUD và link account; cộng tác viên không cần login | CORE-001, SEC-002 |
| PEOPLE-002 | M02 People | C02 | P1 | SalaryHistory/DependentHistory có hiệu lực; chặn chồng lấn và đọc trái quyền | PEOPLE-001 |
| PEOPLE-003 | M02 People | C02 | P1 | Competency và kinh nghiệm theo thời điểm; sửa hồ sơ có audit | PEOPLE-001, AUD-001 |
| PEOPLE-004 | M02 People | C02 | P1 | Capacity theo người/tháng; tháng thiếu capacity báo chưa cấu hình | PEOPLE-001 |
| WORK-001 | M03 Projects | C03 | P1 | Content/WorkItem CRUD; chặn liên kết chéo dự án và ngày ngoài khoảng cho phép | CORE-003, SEC-002 |
| WORK-002 | M03 Projects | C03 | P1 | API thành viên, nối nút UI; chủ nhiệm chỉ phân công trong dự án của mình | PEOPLE-001, WORK-001 |
| WORK-003 | M03 Projects | C03 | P1 | Mapping BudgetItem cũ; khoản chưa đủ thông tin xuất danh sách đối soát | WORK-001 |
| RULE-001 | M04 Rules | C04 | P1 | RuleSet/version và nguồn văn bản; draft chưa được áp dụng chính thức | CORE-001 |
| RULE-002 | M04 Rules | C04 | P1 | Đơn giá/đơn vị, điều kiện vai trò/kỹ năng/kinh nghiệm; kiểm tra tại ngày thực hiện | RULE-001, PEOPLE-003 |
| RULE-003 | M04 Rules | C04 | P1 | Công thức có whitelist, không eval; lưu giải thích, kiểm thử ngưỡng và hiệu lực | RULE-002 |
| RULE-004 | M04 Rules | C04 | P1 | Trần công/tiền/công việc/nội dung; phiên bản đã dùng bất biến | RULE-003, WORK-001 |
| ALLOC-001 | M05 Budget | C05 | P1 | Allocation người × công việc × tháng; tách allowed/allocated, CRUD có lý do | RULE-004, WORK-002, AUD-001 |
| ALLOC-002 | M05 Budget | C05 | P0 | Kiểm tra trần trong transaction; test hai request cạnh tranh chỉ một được vượt đến giới hạn | ALLOC-001 |
| ALLOC-003 | M05 Budget | C05 | P1 | Cộng workload nhiều dự án, planned/actual riêng; cảnh báo đúng ngưỡng capacity | ALLOC-001, PEOPLE-004 |
| PAY-001 | M05 Budget | C05 | P1 | Giao dịch thanh toán từng đợt, người nhận, chứng từ; pending không cộng paid | ALLOC-002 |
| PAY-002 | M05 Budget | C05 | P0 | Idempotency, điều chỉnh có liên kết, khóa kỳ; gửi lại không ghi trùng | PAY-001, AUD-001 |
| VIEW-001 | M08 Analytics | C05 | P1 | Matrix tiền/ngày, tổng quý/năm và drawer; tổng ô khớp chi tiết | ALLOC-003 |
| VIEW-002 | M08 Analytics | C05 | P1 | Dashboard/heatmap workload và budget; số tổng đúng quyền và hai loại remaining | VIEW-001, PAY-002 |
| MVP-001 | M10 Reports | C05 | P1 | UAT với quản lý/kế toán/PI/member, migration diễn tập và đối soát tiền; không còn lỗi P0, quan hệ backlog và nhắc hạn/hồ sơ đạt nghiệm thu | QA-001, WORK-003, VIEW-002, LINK-002, DOC-003, NOTICE-003, PAY-004 |
| TAX-001 | M06 Tax | C06 | P2 | Xác minh văn bản chính thức, TaxPolicy version và duyệt cấu hình; thiếu policy không tính | PEOPLE-002 |
| TAX-002 | M06 Tax | C06 | P2 | Sổ thu nhập lương/nguồn khác, phân loại khoản chi; không đếm trùng Payment | TAX-001, PAY-002 |
| TAX-003 | M06 Tax | C06 | P2 | Engine giảm trừ/biểu thuế/khấu trừ/làm tròn; test sát mọi ngưỡng, đổi năm và hiệu lực | TAX-002 |
| TAX-004 | M06 Tax | C06 | P2 | Ledger tháng và ước tính quyết toán năm; tách dự kiến/khấu trừ thật và đánh dấu thiếu dữ liệu | TAX-003 |
| SCEN-001 | M07 Scenario | C07 | P2 | Snapshot baseline và sửa allocation kịch bản; không ghi Payment/ledger thật | ALLOC-002 |
| SCEN-002 | M07 Scenario | C07 | P2 | So sánh ngân sách/công/thuế; duyệt áp dụng chặn baseline cũ và chạy lại validator | SCEN-001, TAX-004 |
| VIEW-003 | M08 Analytics | C08 | P2 | Heatmap income, mode tax/net, dashboard vai trò; drilldown đúng tổng và quyền | TAX-004, VIEW-002 |
| SEC-004 | M09 Auth | C09 | P2 | AUDITOR phạm vi được cấp, RLS nếu áp dụng; test connection pool không rò identity | SEC-002, TAX-004 |
| REPORT-001 | M10 Reports | C10 | P2 | Excel thu nhập/ngân sách, bộ lọc và tổng đối soát; chống formula injection và lọc quyền | VIEW-003 |
| REPORT-002 | M10 Reports | C10 | P2 | Xuất gói hồ sơ chứng từ và mục lục phiên bản; gói xuất chỉ chứa tài liệu được phép đọc, truy vết được người xuất | DOC-003, SEC-002 |
| OPS-001 | M01 Database | C10 | P2 | Docker/deploy, healthcheck, restore và giám sát; kiểm thử phục hồi dữ liệu trên staging | MVP-001, REPORT-001 |

Modules M01–M10 giữ theo tài liệu gốc; thêm M11 Notifications. Phân quyền và audit bắt đầu C01, không đợi C09/C10. MVP kết thúc C05 chỉ khi đạt toàn bộ cổng nghiệm thu, không chỉ vì đủ năm màn hình. Phạm vi bổ sung làm tăng khối lượng C03–C05; cần ước lượng lại trước khi gán ngày cycle.

### Backlog bổ sung: quan hệ, hợp đồng, hồ sơ và nhắc hạn

Trong bảng này cột Tên Work Item chính là title khi xuất; mã ID, module, cycle, tiêu chí nghiệm thu và phụ thuộc là các trường riêng.

| ID | Module | Cycle | Ưu tiên | Tên Work Item | Tiêu chí nghiệm thu | Phụ thuộc |
| --- | --- | --- | --- | --- | --- | --- |
| LINK-001 | M01 Database | C01 | P1 | Liên kết Work Item với Module và Cycle | Mỗi item có module chính và cycle dự kiến; mọi ID tham chiếu tồn tại, dependency không tạo vòng | — |
| LINK-002 | M01 Database | C03 | P1 | Lưu ánh xạ và quan hệ backlog khi đồng bộ Plane và GitHub | Lưu ID từ xa riêng theo hệ thống; chạy lại không nhân đôi; tạo item trước rồi gắn quan hệ; báo rõ quan hệ chưa đồng bộ | LINK-001 |
| SEC-005 | M09 Auth | C03 | P0 | Phân quyền xử lý hợp đồng và hồ sơ thanh toán | Kiểm tra vai trò, phạm vi dự án, người nhận và trạng thái; test API/file/mail không lộ dữ liệu chéo, người lập không tự duyệt | SEC-002, AUD-001 |
| CONTRACT-001 | M03 Projects | C03 | P1 | Liên kết hợp đồng với công việc và người thực hiện | Một hợp đồng có nhiều dòng công việc; dòng tham chiếu đúng người/phân bổ/dự án, tổng không vượt giá trị hợp đồng | WORK-002, SEC-005 |
| WORK-004 | M03 Projects | C03 | P1 | Theo dõi thời gian thực hiện và hạn bàn giao công việc | Lưu ngày bắt đầu, kết thúc, bàn giao, người phụ trách; đổi hạn có lý do và revision, hoàn thành có thời điểm thực tế | WORK-002, AUD-001 |
| PAY-003 | M05 Budget | C05 | P1 | Lập lịch tạm ứng và thanh toán hợp đồng theo đợt | Mỗi đợt có hạn, loại, số tiền, người nhận và điều kiện; tách lịch dự kiến với giao dịch thực trả | CONTRACT-001, PAY-001 |
| PAY-004 | M05 Budget | C05 | P0 | Đối soát tạm ứng và số tiền còn phải thanh toán | Liên kết cấn trừ/hoàn ứng; chặn cấn trừ trùng/vượt số dư; thu hồi tạm ứng không tạo lần chi mới | PAY-003, PAY-002 |
| DOC-001 | M10 Reports | C03 | P1 | Cấu hình checklist hồ sơ theo loại đợt thanh toán | Template có phiên bản, điều kiện bắt buộc, yêu cầu bản mềm/bản ký, người nộp/kiểm tra; snapshot theo đợt | CONTRACT-001 |
| DOC-002 | M10 Reports | C04 | P1 | Quản lý bản mềm và bản ký hoàn chỉnh của hồ sơ | Lưu hai loại file riêng, phiên bản/hash/người tải lên; kiểm soát download, loại/kích thước file; không ghi đè bản đã duyệt | DOC-001, SEC-005 |
| DOC-003 | M10 Reports | C05 | P1 | Kiểm tra bộ hồ sơ trước khi duyệt thanh toán | Chỉ rõ thiếu bản nào và người xử lý; chặn duyệt khi hồ sơ bắt buộc chưa hợp lệ; trả bổ sung có lý do và audit | DOC-002, PAY-003 |
| NOTICE-001 | M11 Notifications | C04 | P1 | Cấu hình người nhận và lịch nhắc công việc, tạm ứng, thanh toán | Chọn người theo vai trò và dự án, mốc trước/đúng/sau hạn, kênh app/email, giờ gửi và múi giờ; xem trước người nhận | WORK-004, SEC-005 |
| NOTICE-002 | M11 Notifications | C05 | P1 | Gửi thông báo trong ứng dụng và email nhắc hạn | Outbox lưu bền vững, worker retry, khóa chống trùng; kiểm tra quyền lúc gửi, ghi trạng thái gửi/lỗi; test với hộp thư thử | NOTICE-001, PAY-003, DOC-003 |
| NOTICE-003 | M11 Notifications | C05 | P1 | Theo dõi quá hạn và dừng nhắc khi công việc đã hoàn tất | Đổi hạn hủy job cũ; khoản trả một phần vẫn nhắc phần còn lại; dừng khi hoàn tất/hủy; người bị thu quyền không nhận thư đang chờ | NOTICE-002, PAY-004 |

## 7. Quan hệ Module, Cycle và Work Item

“Circle” trong trao đổi được chuẩn hóa thành **Cycle**, “work idea” thành **Work Item**. Phân biệt Work Item phát triển phần mềm trong backlog với WorkItem nghiệp vụ thuộc đề tài; chúng có ID riêng, không dùng chung bản ghi.

- Module là nhóm chức năng; Cycle là giai đoạn triển khai. Hai khái niệm không tạo cây cha–con: một module có thể có công việc ở nhiều cycle, một cycle chứa công việc của nhiều module.
- Mỗi backlog item có một `primaryModuleId`, một `cycleId` dự kiến (có thể chưa xếp ở backlog tương lai), `title`, `description`, `priority`, `acceptanceCriteria`, `dependsOnIds`; hỗ trợ `parentId` cho việc con và `relatedIds` cho liên quan.
- Quan hệ phụ thuộc có hướng: A.dependsOnIds chứa B nghĩa là B chặn A. Không chấp nhận tự tham chiếu hay vòng phụ thuộc/cha–con. Việc con có module/cycle tường minh, không suy ra chỉ từ cha.
- Đổi cycle giữ ID và lịch sử di chuyển. Tên cycle không thay thế deadline công việc hoặc hạn thanh toán hợp đồng.
- Tên item mô tả hành động và nội dung chính, ví dụ **“Lập lịch tạm ứng và thanh toán hợp đồng theo đợt”**; không đặt title chỉ là `PAY-003`, `M05` hay “Công việc 1”. Mã nằm ở `id`, tiêu chí nghiệm thu nằm trong nội dung.
- File `backlog.json` bên cạnh tài liệu chứa các thực thể và khóa tham chiếu để chuẩn bị đồng bộ. Đây là định dạng trung gian nội bộ, không khẳng định là định dạng import trực tiếp của Plane/GitHub.
- Khi triển khai adapter: kiểm tra khả năng của từng đích; tạo module/cycle hoặc trường tương đương, tạo item, lưu mapping ID, rồi gắn module/cycle, parent và dependency. Nếu đích không hỗ trợ quan hệ gốc, lưu liên kết và metadata rõ ràng, báo trạng thái thay vì báo thành công giả. Retry dùng local ID/mapping, không dò trùng bằng title.

## 8. Hợp đồng, lịch thanh toán và hồ sơ

### Quan hệ nghiệp vụ

`Project → Content → WorkItem → Allocation`; `Project → Contract → ContractLine → Allocation`. Một ContractLine trỏ một Allocation; một hợp đồng có nhiều dòng. Mỗi dòng có phần giá trị cam kết để kiểm tra không vượt allocation/hợp đồng, cho phép phụ lục điều chỉnh có lịch sử.

`Contract → PaymentMilestone → MilestoneLine → ContractLine`; mỗi mốc có nhiều dòng để xác định công việc, người nhận và số tiền. `PaymentMilestone → PaymentApplication → PaymentTransaction` cho phép hồ sơ trả bổ sung và thanh toán nhiều lần. Một giao dịch thực trả gắn một mốc; nếu chi gộp, dùng batch với các giao dịch con, không nhân đôi tổng tiền.

PaymentMilestone lưu loại ADVANCE/INSTALLMENT/FINAL/ADVANCE_SETTLEMENT, hạn dự kiến, hạn hoàn ứng nếu có, số tiền, người phụ trách, trạng thái và revision. Hạn hợp đồng cụ thể độc lập cycle phát triển phần mềm. Tách ba trạng thái: tiến độ công việc, mức đầy đủ hồ sơ và mức thực trả; đã đủ hồ sơ không đồng nghĩa đã chi.

Tạm ứng, chi bổ sung, cấn trừ và hoàn trả là các sự kiện riêng. Ví dụ hợp đồng 100 triệu, đã tạm ứng 30 triệu, quyết toán giá trị 100 triệu và cấn trừ 30 triệu thì còn chi thêm 70 triệu; tổng tiền đã chuyển là 100 triệu, không phải 130 triệu. Phân loại thuế của tạm ứng theo policy đã xác minh, không tự coi mọi tạm ứng là thu nhập chịu thuế.

### Checklist hồ sơ

Template hồ sơ theo loại hợp đồng/nguồn kinh phí/đợt chi, có phiên bản và người phê duyệt. Danh sách dưới là gợi ý cấu hình nghiệp vụ để kế toán xác nhận, không phải danh mục pháp lý áp dụng cho mọi hợp đồng.

| Nhóm đợt | Hồ sơ gợi ý |
| --- | --- |
| Tạm ứng | Hợp đồng/phụ lục đã ký; dự toán hoặc giao việc đã duyệt; đề nghị tạm ứng; thông tin người thụ hưởng |
| Thanh toán theo đợt | Đề nghị thanh toán; hợp đồng/phụ lục; biên bản nghiệm thu/xác nhận khối lượng; báo cáo/sản phẩm/bảng công theo loại công việc; hóa đơn/chứng từ nếu áp dụng |
| Quyết toán/hoàn ứng | Bộ hồ sơ thanh toán; bảng đối chiếu tạm ứng và cấn trừ; chứng từ hoàn trả nếu có; biên bản thanh lý nếu được yêu cầu |
| Sau khi chi | Chứng từ chuyển tiền; chứng từ khấu trừ khi áp dụng; xác nhận đối soát |

Mỗi ChecklistItem có tên, giai đoạn PRE_APPROVAL/POST_PAYMENT, điều kiện áp dụng, bắt buộc hay tùy chọn, `requiresEditableCopy`, `requiresSignedCopy`, hạn nộp, người chuẩn bị và người kiểm tra. Hồ sơ phát sinh sau chi không được dùng làm điều kiện bất khả thi để chặn chi trước đó.

DocumentVersion lưu loại EDITABLE/SIGNED, file riêng, phiên bản, hash, người và thời gian tải lên; bản ký có ngày ký và trạng thái kiểm tra chữ ký/bên ký cần thiết. File PDF không tự được coi là đã ký hoàn chỉnh; scan bản ký và ký điện tử được phân biệt, không tuyên bố xác thực chữ ký số nếu chưa có bộ kiểm chứng.

Luồng: thiếu → đã nộp → đang kiểm tra → hợp lệ hoặc yêu cầu bổ sung. Checklist cần cả hai loại file chỉ hoàn tất khi cả hai được kiểm tra; loại không cần ký được cấu hình rõ. Thay file đã duyệt tạo version mới và yêu cầu kiểm tra lại, giữ bản gắn với đợt chi trước. Miễn mục bắt buộc chỉ khi template cho phép, người có quyền duyệt và ghi lý do.

Màn hình đợt chi hiển thị checklist, trạng thái riêng bản mềm/bản ký, bản đang áp dụng, người phụ trách, hạn nộp và lý do trả bổ sung. File nằm trong storage riêng; tải xuống kiểm tra quyền, link ngắn hạn nếu dùng, không công khai đường dẫn storage.

## 9. Phân quyền xử lý và thông báo nhắc hạn

| Thao tác | Thành viên | Chủ nhiệm | Kế toán được phân công | Quản lý/người duyệt |
| --- | --- | --- | --- | --- |
| Xem lịch và khoản chi | Công việc/khoản của mình | Trong đề tài mình phụ trách | Dự án được giao | Phạm vi được cấp |
| Nộp hồ sơ | Phần được giao | Trong đề tài | Hồ sơ kế toán | Theo quyền cụ thể |
| Xác nhận hoàn thành công việc | Gửi đề nghị xác nhận | Xác nhận trong đề tài | Xem kết quả cần thiết | Theo ủy quyền |
| Kiểm tra hồ sơ tài chính/ghi nhận chi | Không | Không mặc định | Có, theo trạng thái và quyền | Không mặc định |
| Duyệt đề nghị chi/miễn hồ sơ | Không | Nếu được cấp và không là người lập | Nếu được cấp và không là người lập | Theo hạn mức/quy trình |
| Cấu hình nhắc | Kênh/giờ nhận cá nhân trong giới hạn tổ chức | Nhắc trong đề tài | Nhắc hồ sơ/chi trong phạm vi | Chính sách phạm vi được cấp |

ADMIN quản trị quyền nhưng không bỏ qua quy trình duyệt và audit. AUDITOR chỉ đọc theo phạm vi. Người có nhiều vai trò vẫn không tự duyệt đề nghị do mình lập. Thông báo, API và file dùng cùng chính sách; việc là người nhận email không cấp thêm quyền xem tài liệu.

### Sự kiện và người nhận

| Sự kiện | Người nhận chính | Người phối hợp |
| --- | --- | --- |
| Sắp bắt đầu, sắp hết hạn, quá hạn công việc | Thành viên được giao | Chủ nhiệm |
| Sắp đến hạn tạm ứng/thanh toán | Kế toán được phân công | Chủ nhiệm và người thụ hưởng đối với khoản của họ |
| Hồ sơ thiếu/bị trả bổ sung | Người chuẩn bị mục hồ sơ | Kế toán kiểm tra, chủ nhiệm khi cần xử lý |
| Sắp đến hạn hoàn ứng | Người nhận tạm ứng | Kế toán và chủ nhiệm |
| Hồ sơ được duyệt, đã thanh toán, đổi hạn | Người liên quan có quyền hiện tại | Theo cấu hình dự án |

Mốc mặc định đề xuất: trước 7/3/1 ngày, đúng hạn, quá hạn nhắc mỗi 3 ngày; cấu hình lại theo loại sự kiện và dự án. Giờ mặc định 08:00 Asia/Ho_Chi_Minh, có giờ yên lặng và giới hạn tần suất/gộp thư. Đây là ngày lịch; nếu chọn ngày làm việc phải dùng calendar cấu hình. Mốc quá khứ khi mới tạo lịch được gộp thành thông báo hiện tại, không gửi dồn toàn bộ lịch cũ.

NotificationRule lưu sự kiện, khoảng nhắc, kênh, nhóm vai trò, escalation và phiên bản. RecipientResolver chọn người thật từ phân công dự án/công việc tại thời điểm gửi, bỏ người mất quyền/ngừng hoạt động và gộp người có nhiều vai trò. Không có kế toán/email hợp lệ thì hiển thị lỗi phân công để xử lý; không tự gửi đến mọi kế toán trong hệ thống.

InAppNotification theo từng người có readAt và liên kết đến công việc/đợt chi. Email gồm tên công việc, hợp đồng, loại mốc, hạn, việc cần làm và link đăng nhập; không đính kèm hồ sơ ký, thông tin ngân hàng, thuế hoặc thu nhập người khác. Mẫu tiêu đề: `[Nhắc thanh toán] Khảo sát hiện trạng khu vực A — hạn 20/10/2026` (ví dụ minh họa).

Outbox được ghi cùng transaction thay đổi nghiệp vụ; worker nền gửi độc lập với request web. Delivery lưu người nhận/kênh/lần nhắc/revision, trạng thái queued/sent/failed/cancelled, số retry và lỗi đã loại bỏ bí mật. Khóa duy nhất chống xếp trùng; dùng idempotency phía nhà cung cấp khi có. Trường hợp nhà cung cấp đã nhận nhưng timeout phải đối soát trạng thái trước retry khi có thể; không cam kết email exactly-once khi nhà cung cấp không hỗ trợ.

Đổi hạn hủy lịch revision cũ và lên lịch mới; kiểm tra lại deadline/trạng thái/quyền ngay trước gửi. Hoàn thành công việc dừng nhắc công việc, không tự dừng khoản chi chưa trả. Trả một phần tiếp tục nhắc số dư; thanh toán đủ/hủy mốc dừng nhắc chi, hồ sơ sau chi và hoàn ứng vẫn có lịch riêng. Đọc thông báo không đồng nghĩa hoàn thành công việc. Người bị thu quyền không xem được thông báo cũ chứa chi tiết nhạy cảm qua API.

Nghiệm thu với đồng hồ giả lập và hộp thư thử: chạy worker lặp không xếp trùng, đúng múi giờ, retry lỗi, đổi hạn, hủy, hoàn thành, trả một phần, thiếu email, đổi người phụ trách và thu quyền. Màn hình vận hành cho biết lần gửi gần nhất, lần tiếp theo và lỗi; ghi log gửi không chứa nội dung hồ sơ nhạy cảm. Tính năng email được cấu hình/kiểm thử trước khi bật gửi thực tế.

## 10. Các quyết định cần bổ sung trong quá trình triển khai

- Văn bản định mức và thuế thực tế được tổ chức áp dụng, phạm vi loại thu nhập/đối tượng và người duyệt cấu hình.
- Quy trình duyệt ngân sách/thanh toán, phân tách người lập/người duyệt, điều kiện khóa kỳ/mở lại kỳ.
- Cách tính capacity, nghỉ phép và ngưỡng cảnh báo; cơ sở ghi nhận khoản tạm ứng/hoàn ứng.
- Nguồn dữ liệu lương/thu nhập ngoài dự án và trách nhiệm xác nhận tính đầy đủ cho ước tính năm.
- Cách ánh xạ dữ liệu cũ thiếu người nhận/kỳ/công việc; chỉ chuyển chính thức sau đối soát.

Backlog trên là đặc tả nội bộ trong Git. Chưa tạo issue, module, cycle hay đồng bộ lên Plane/GitHub trong đợt rà soát này.
