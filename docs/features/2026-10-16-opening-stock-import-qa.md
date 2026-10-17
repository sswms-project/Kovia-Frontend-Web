# Tồn kho đầu kỳ và import — biên bản triển khai 15–16/10/2026

Vai trò: người triển khai, tự rà soát; chưa có review độc lập. Nhánh FE `screen/huytv`, BE `feat/huytv`. Chưa commit/push/PR. Spec: `docs/superpowers/plans/2026-10-15-opening-stock-import-spec.md`.

## Phạm vi đã có trong code

- API mẫu/inspect/preview/commit/operations, một phiếu theo kho/ngày; XLSX/CSV 5 MB, 200 dòng. Tệp gốc chỉ lưu khi tạo nháp, không tạo lô/tồn trong preview hay commit nháp.
- Dùng reader/mapping/capacity hiện có. Reader bổ sung metadata hệ ngày Excel 1904; không thêm thư viện. Preview không lấy khóa sức chứa, không save hay thay tracking state.
- Resolve SKU, đơn vị cơ sở, vị trí/kệ cấp kệ, lô cũ/mới, ngày, precision; chặn phạm vi đã có nghiệp vụ/tồn/giữ chỗ khác 0. Kiểm tổng sức chứa và trộn hàng của tập chọn. Tệp không tạo thêm danh mục sản phẩm/đơn vị/vị trí.
- Ngày ghi nhận/snapshot lô/nguồn dòng; giữ ID và nguồn khi sửa. Duyệt v1 có guard client, quyền và RowVersion. Lô mới chỉ tạo cùng transaction duyệt/ledger/audit; unique scope bao phủ LotId null.
- Hash và command ID giữ nguyên khi thử lại; reconcile bằng request operations mới (DbContext mới). Không tự retry ghi. Tệp bù chỉ xóa đúng key của request đã chứng minh rollback trước commit; commit chưa rõ giữ tệp và log.
- FE tái sử dụng workspace, mapping, feedback, result, pagination, navigation guard và DatePickerField. Mẫu cơ bản/đầy đủ ở bước 1; bước 3 chỉ đọc, chọn/bỏ dòng làm stale và bắt kiểm lại; xác nhận lô gắn với tập lô/ngày thực tế. Kết quả nói rõ phiếu nháp, có link mở phiếu và báo cáo toàn tệp.
- Form nhập tay có ngày/lô mới, search phía server cho hàng/vị trí/lô; không giới hạn người dùng vào 100/200 kết quả đầu. Dùng endpoint warehouse-options của inventory, không đòi thêm quyền xem danh mục kho/nhập hàng. Form-options mới kiểm Inventory View + Reserve và phạm vi kho.
- Nhập tay cũng giữ command/evidence khi mất phản hồi, khóa chỉnh sửa và đối chiếu trước khi retry cùng thao tác. Duyệt giữ command theo phiếu/RowVersion khi retry.

## Điều chỉnh triển khai có chủ ý

- `/inventory/opening-stocks/form-options`: lookup có giới hạn 50 kết quả mỗi loại, tìm trên server, trả tổng; dùng quyền inventory thay vì phụ thuộc quyền danh mục/nhập kho.
- Operations chỉ trả phiếu thuộc tenant/người lập và kho được phép đọc; dùng chung đối chiếu cả tạo nháp nhập tay, không chỉ import.
- Dưới 1024px dùng thẻ vì thử 768px thấy bảng quá hẹp. Từ 1024px dùng bảng cố định, cột kết quả gần đầu; chuỗi dài xuống dòng.
- Shared BulkImportResult/Summary/Workspace chỉ thêm nhãn tùy chọn; mặc định các import cũ không đổi.
- Build cô lập dùng `KOVIA_ISOLATED_BUILD=true`, `tmp/catalog-production`, `tsconfig.production.json`; không ghi đè `.next` dev. `tsc` ban đầu gặp file type sinh tự động bị lỗi cú pháp ở `.next/dev`; kiểm toàn bộ `src` bằng config production riêng, không bỏ qua lỗi type của source.

## Kiểm chứng đã chạy

| Kiểm tra                                                                                    | Kết quả                                                                                    |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| BE Release compile qua `dotnet test -c Release` trong bản sao QA                            | Không lỗi biên dịch; còn NU1902/NU1903 từ System.Security.Cryptography.Pkcs 10.0.0 hiện có |
| BE focused OpeningStockImport/StorageCapacityPolicy/SpreadsheetImportReviewFix/StockHistory | 85 đạt, 0 lỗi                                                                              |
| BE toàn bộ Application.Tests                                                                | 1.487 đạt, 6 lỗi, 5 bỏ qua; không coi suite là xanh                                        |
| FE `tsc --noEmit -p tsconfig.production.json`                                               | Đạt                                                                                        |
| FE ESLint inventory + shared import/config đã sửa                                           | Đạt                                                                                        |
| FE toàn repo Vitest `--maxWorkers=2`                                                        | 207 file, 1.218 ca đạt                                                                     |
| FE inventory/shared import sau chỉnh cuối                                                   | 23 file, 129 ca đạt                                                                        |
| FE production build output cô lập                                                           | Đạt, có route import và chi tiết phiếu                                                     |
| EF `has-pending-model-changes`, design-time offline                                         | Không có model drift                                                                       |
| Git diff whitespace                                                                         | Sạch                                                                                       |

Các ca mới gồm ngày serial 1900/1904 và serial 60, metadata workbook thật, precision, lô dự kiến không ghi, expired/hold, số dư/giữ chỗ không nhật ký, snapshot 0, RackLevel, duplicate scope, chọn lại sức chứa, quyền thu hồi, idempotency, bù tệp/commit chưa rõ, nguồn dòng và ngày lịch sử. Test transaction/rollback một phần dùng mock/InMemory: chỉ chứng minh giao thức gọi, **không chứng nhận rollback/lock SQL Server**.

Sáu lỗi suite BE: bốn biến thể `InboundOperationalEditingTests.EditsPreserveSnapshotsUnlessTheUserChangesTheLine`, `TenantRolePermissionTests.Inactive_user_cannot_reuse_a_cached_permission_set`, `AuthenticationWorkflowAlignmentTests.Registration_creates_pending_owner_and_tenant_without_a_subscription`. File handler/test tương ứng không bị sửa trong task này; chưa chạy một bản baseline sạch riêng nên không tuyên bố đã chứng minh không hồi quy bằng so sánh baseline.

## QA giao diện bằng fixture (không API/DB)

Chạy riêng Vite tại 127.0.0.1:3107 bằng dependency sẵn có, fixture 50 dòng (45 hợp lệ, 5 lỗi), có tên dài 280 ký tự liên tục. Không cài package mới và không mở BE.

- Chromium in-app browser: document không tràn ngang tại 360, 768, 1280px; 768px dùng thẻ, 1280px dùng bảng.
- Bỏ chọn cả tệp làm CTA disabled; lọc tên dài giữ selection và không tràn ngang. Nút toolbar chính cao 44px.
- Mở DatePicker bằng Enter ở 360×640: popover trong viewport (top 337, bottom khoảng 594), nội dung có thể cuộn, thấy điều hướng tháng.
- Dùng Web Interface Guidelines rà nhãn, focus, live status, xuống dòng và reduced-motion classes. Chưa chứng nhận Edge, NVDA, reduced motion thực tế hoặc zoom trình duyệt 200%.

Minh chứng ngoài Git: `D:/Kovia-QA/OpeningStock-20261015/results/opening-stock-focused.trx`, `opening-stock-all.trx`, thư mục `evidence/` (ảnh có hậu tố fixture). Chỉ dùng lại một bản sao BE `D:/Kovia-QA/OpeningStock-20261015/Backend`; harness FE nhỏ trong `tmp/opening-stock-ui`, output production dùng thư mục cô lập sẵn có. Không tạo nhiều `bt_copy`.

## Migration và giới hạn còn lại — chưa đủ điều kiện phát hành

Migration **20261015151230_AddOpeningStockImportMetadata** đã tạo, chưa áp DB. SQL forward/idempotent sinh để review; không chạy SQL. Thêm cột nullable ngày ghi nhận, hash/mapping tệp, snapshot ngày/lô/nguồn; thêm unique index scope không lô. Có preflight dừng nếu lịch sử trùng; không tự sửa/xóa dữ liệu. Không chạy Down hoặc rollback trên db71143.

1. Cần người dùng cho phép chính xác migration trên target db71143, sau khi kiểm provider/server/database thực tế và preflight chỉ đọc; startup phải `Database__ApplyMigrationsOnStartup=false`. Nên áp schema additive có kiểm soát trước khi khởi chạy API mới; không dùng startup để áp.
2. Chưa QA end-to-end qua API thật, cloud evidence, quyền theo tài khoản thật, Back/Forward/đóng tab trong phiên import thật, lỗi mạng xuyên FE–BE và tạo/gửi/duyệt phiếu trên DB đã migrate.
3. Chưa có bằng chứng race hai handler thật trên SQL Server cô lập cho cùng phiếu/cùng scope/cùng lô, hoặc preview song song tenant lock. Các test SQL Server opt-in hiện có vẫn bỏ qua do chưa có kết nối cô lập. Gate A/C chưa đóng; không dùng db71143 cho destructive rollback/race QA.
4. Còn 6 lỗi suite ngoài phạm vi và advisory NuGet nêu trên; cần review riêng trước release. Không đổi phiên bản dependency hay sửa các luồng đó trong task này.

**Release note hợp đồng:** StockHistoryCalculator nay nhóm/lọc theo OccurredAt và ngày UTC+7, không theo CreatedAt/UTC. Consumer forecasting/WMS-Model và báo cáo cần được thông báo, so sánh dữ liệu lịch sử trước rollout. Không backfill hay sửa ledger lịch sử.

## Bổ sung sau review OS-R1–R8 — 2026-10-16

Đã sửa tám finding ở working tree; xem bản đối chiếu và kết quả trong [biên bản review](2026-10-16-opening-stock-code-review.md). Số liệu mới: FE 210 file / 1229 ca đạt, TypeScript/scoped lint/production build cô lập đạt; BE Release focused 93/93, full 1495 đạt / 6 lỗi / 5 bỏ qua. Sáu lỗi khớp tên lượt trước; không có clean baseline mới. Dialog chi tiết 200 dòng đã đo trên fixture 360/768/1280px, footer trong viewport và body cuộn riêng. Ảnh detail-_-review-fixes-fixture.png và TRX opening-stock-review-fixes_.trx nằm trong thư mục QA cũ. Không tạo repo copy mới, không ghi DB/chạy API/áp migration/commit. READY_FOR_FINAL_REVIEW chỉ là trạng thái bản sửa; các giới hạn migration, Gate A/C và release phía trên vẫn giữ nguyên.
