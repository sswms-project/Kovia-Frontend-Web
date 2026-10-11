# Import danh mục và setup nhanh VTHH

## Trạng thái tiếp tục 2026-10-08

**READY_FOR_CODEX_REVIEW — Đợt C đã hoàn tất triển khai và tự kiểm thử cô lập.** Chưa phải phê duyệt độc lập hoặc chứng nhận triển khai production. Tiếp tục sau checkpoint BE `695d25e`, FE `ab34554`; các sửa bổ sung chưa commit/push. Những mốc bên dưới được giữ làm lịch sử.

### Kết quả chốt Đợt C — 2026-10-08

- Sửa lỗi upload thật của import ĐVT/nhóm: Axios mặc định JSON khiến FormData bị serialize sai. Inspect/preview đặt multipart như VTHH; test chạy qua Axios adapter kiểm tra tệp và mapping còn nguyên, không chỉ mock service.
- Đồng nhất giới hạn FE/BE 3.000 tham chiếu (500 nhóm + 2.500 ĐVT); kiểm tra 3.000 hợp lệ và 3.001 bị từ chối. Precision 0–6 có lỗi tiếng Việt, checkbox xác nhận dùng Controller để nhận focus, lỗi trường liên kết aria-describedby; mã không spellcheck/autofill. Panel chỉ cuộn thân, có overscroll-contain, nhãn đóng tiếng Việt; danh sách >50 mục dùng content-visibility để giảm layout/paint ngoài vùng nhìn.
- Chuẩn hóa NFC cả mã đã có khi kiểm tra trùng và tra nhóm cha, thống nhất preview/staging/import riêng/setup nhanh; test cha dùng dấu tổ hợp và mã trùng dạng dựng sẵn đạt. Không đổi quy tắc bỏ dấu hay tự ghép gần đúng.
- Test mạng chậm/upload lặp/retry đọc tệp, double-click xác nhận và kết quả lưu chưa xác định đạt. Không tự retry ghi, khóa nhập lại khi cần đối soát, giữ dữ liệu preview. Test quyền bị thu hồi, tenant, trạng thái, nhóm cha/con, selection và danh mục theo dòng chọn nằm trong bộ hồi quy.
- SQLite in-memory: thêm hai test cạnh tranh ĐVT/nhóm, một writer tạo cùng mã sau validation và trước save; unique constraint chặn writer thua và rollback các dòng khác/audit. Test trigger lỗi quy đổi tiếp tục chứng minh rollback cả danh mục/hàng hóa/quy đổi/audit. Đây là interleaving xác định, không chứng nhận mọi lịch chạy/locking/collation SQL Server.
- BE full cuối: **1.037 passed, 1 skipped / 1.038 total**, exit 0. Test skip là khóa sức chứa SQL Server cần fixture riêng, không phải test mới của import. FE full cuối: **659 passed / 119 files**, exit 0. TypeScript và targeted ESLint đạt. Tổng có các test từ công việc đồng thời; không chứng nhận sửa sau thời điểm chạy.
- Edge thực → HTTP host QA → reader/handler BE thật: import ĐVT đủ bốn bước; nhóm con đứng trước cha, bỏ chọn cha bị 400 với zero writes, chọn lại cả hai/recheck/lưu thành công; setup nhanh tạo đúng 1 nhóm/1 ĐVT/1 hàng hóa sau xác nhận cuối bằng Tab/Enter. Trước preview và re-preview số bản ghi không đổi; cuối fixture có 2 ĐVT, 3 nhóm, 1 hàng hóa, 6 audit. Host riêng D:/Kovia-QA/CatalogGateC, localhost:5399, InMemory verified, không chạy API startup/config triển khai. Fake auth và middleware QA không thay thế kiểm thử toàn bộ auth middleware production; quyền endpoint được kiểm riêng bằng test/source review.
- Edge desktop 1440×900, mobile 390×844, CSS zoom 125%/150% và reduced-motion: panel không tràn ngang, footer vẫn trong viewport, không còn animation khi reduce. Kiểm tra focus lỗi xác nhận, Space chọn checkbox, focus trả về và xác nhận cuối bằng bàn phím. Layout-only fixture 80 tham chiếu tên dài cuộn tới cuối, footer còn hiển thị; commit bị chặn. Ảnh `output/playwright/gate-c-*.png`. Không tuyên bố native browser zoom, audible screen-reader hoặc stress-render toàn bộ 3.000 mục đã được chứng nhận.
- Production FE build cuối dùng output `tmp/catalog-production`, giữ `.next` dev. Review self-check route permission, tenant filters, request compatibility, DI discovery, conflict/save nguyên tử và selected-dependent drafts; không còn finding đã biết trong phạm vi sửa. Chưa có independent approval.
- Không truy cập/ghi db71143, không migration/seed/repair, không thêm dependency/schema/quyền, không commit/push. Chỉ host/browser QA của lượt này được đóng; giữ server đang có. Console có cảnh báo realtime do chặn hubs và lỗi 400 cố ý; không tuyên bố clean console.

### Lịch sử kết quả trước lượt chốt C

- Giới hạn setup nhanh: tối đa 500 nhóm và 2.500 ĐVT (500 đơn vị chính + 2.000 quy đổi), tổng 3.000 tham chiếu; import riêng vẫn tối đa 500 dòng.
- Mã inactive không tự fallback sang tên danh mục active khác. Người dùng phải chủ động chọn; ô trống, inactive và mơ hồ không được đề nghị tự tạo mới.
- Cha trong cùng tệp phải có mã tường minh; phát hiện cây DB thiếu tổ tiên. Đổi mã cha chuẩn hóa Unicode NFC trước khi cập nhật tham chiếu con. Xóa mã đã chỉnh bị từ chối, không âm thầm cấp lại.
- FE cô lập mã chỉnh theo tài khoản/tenant/mapping; đổi tệp/mapping không mang mã cũ sang. Sửa mã khóa nhập đến khi kiểm tra lại. Panel giữ phương án đã áp dụng khi recheck lỗi và mở lại.
- Nhóm có sẵn trả đường dẫn tổ tiên theo tenant; dropdown danh mục và nhóm cha hiển thị mã + đường dẫn, giữ ID/code payload. API cũ không có đường dẫn vẫn dùng tên.
- Bổ sung aria-invalid cho trường lỗi và liên kết lỗi checkbox xác nhận. SQLite in-memory có trigger lỗi quy đổi chứng minh rollback cả ĐVT/nhóm mới, sản phẩm, quy đổi và audit; không ghi DB triển khai.
- BE full cuối: **1.030 passed, 1 skipped, 1.031 total**, exit 0; riêng CatalogSetupWorkflowTests **22 passed**. Thêm roundtrip mẫu XLSX và CSV của cả hai danh mục, tên/trang tiếng Việt, dòng nguồn 2/4, lỗi name, tệp rỗng/quá 5 MB/XLS và bảng rỗng/501 dòng. Cây có test Transfer từ phiên khác, tổng bao gồm chúng. FE full: **643 passed / 115 files**; targeted **64 passed / 2 files**. TypeScript và targeted ESLint đạt tại thời điểm chạy; phiên Transfer tiếp tục sửa sau đó, không chứng nhận các sửa chưa kiểm của phiên khác.
- Production FE build cuối đã đạt **68 trang static, exit 0**, gồm TypeScript và các route import mới; output `tmp/catalog-production`, không đè `.next` dev. Include Next tự thêm được gỡ riêng sau build.
- Edge mock: ĐVT đủ 4 bước, sửa mã → khóa nhập → recheck → xác nhận → kết quả; nhóm đủ 4 bước; VTHH thiếu 1 nhóm/1 ĐVT → panel xác nhận → preview hợp lệ/badge → xác nhận đúng số danh mục → kết quả. POST import được intercept, không chạy handler thật hoặc ghi DB deploy.
- Ảnh desktop 1440×900 và panel mobile 390×844 tại `output/playwright/catalog-*.png`; mobile cuộn nội dung riêng, footer ngoài vùng cuộn. Bật emulation reduced-motion; chưa chứng nhận đầy đủ animation/screen reader. Focus xác nhận ở nút quay lại, bước kết quả nhận focus. SignalR lỗi dự kiến do chặn hubs; không tuyên bố console sạch. Đã đóng browser QA riêng, giữ server của phiên khác.

### Mục còn lại ở checkpoint trước (đã đối chiếu trong kết quả chốt C)

1. Đã hoàn tất production build cuối; giữ kiểm thử tách khỏi output server dev ở các lượt tiếp theo.
2. Browser với dữ liệu cha/con và selection xuyên suốt. Ma trận XLSX/CSV/template/dòng lỗi/giới hạn đã được kiểm bằng parser thật và fixture; browser hiện dùng response giả lập, chưa nối cùng fixture BE qua HTTP.
3. Mạng chậm/double-click/unknown-save của luồng mới, cạnh tranh đồng thời bằng relational fixture; SQLite rollback không phải chứng nhận race SQL Server.
4. Edge zoom thực 125–150%, keyboard đầy đủ, lỗi/focus panel và nhiều tham chiếu; reduced-motion mới emulation, chưa kiểm trọn ma trận.
5. Review diff cuối theo spec/quyền/tenant. Đã self-review; giới hạn chứng nhận production được ghi rõ ở kết quả chốt C.

## Phạm vi đã duyệt

Hai cách setup: (1) import Đơn vị tính và Nhóm VTHH trước, sau đó import hàng hóa; (2) nhập hàng hóa ngay, chủ động chọn danh mục có sẵn hoặc xác nhận tạo mới tại bước Kiểm tra. Giữ bốn bước Chọn tệp → Ghép cột → Kiểm tra → Kết quả. Không thay nghiệp vụ NCC, khách hàng, nhân sự. Không thêm thư viện, schema DB, quyền hay seed.

### Đợt A — Import danh mục

- Endpoint `GET import/template`, `POST import/inspect`, `POST import/preview`, `POST import` dưới `/api/units` và `/api/categories`.
- FE `/units/import`, `/categories/import`; chỉ hiện nút khi có quyền manage tương ứng.
- ĐVT: Mã ĐVT, Tên ĐVT, Ký hiệu, Số chữ số thập phân (0–6, mặc định 0), Mô tả.
- Nhóm: Mã nhóm, Tên nhóm, Mã nhóm cha, Mô tả; cha trong DB hoặc cùng tệp, có thể đứng sau con; không vòng lặp, tối đa 5 cấp. Cha được tham chiếu trong tệp cần mã rõ ràng.
- Mã trống được gợi ý trong preview và chỉnh trước khi nhập. Chỉnh mã phải kiểm tra lại; đổi mã cha tường minh cập nhật tham chiếu con trong preview. Chọn con mà bỏ cha phải bị từ chối khi lưu, không lưu một phần.
- Chỉ tạo mới; không tự cập nhật hoặc kích hoạt lại. XLSX/CSV 5 MB, 500 dòng; dùng reader/mapping an toàn hiện có. Số dòng nguồn không đổi.
- Tên bắt buộc, mã/tên trùng, danh mục inactive, dữ liệu khác tenant đều phải kiểm tra ở BE. Lưu tập được chọn và audit trong một SaveChanges nguyên tử.

### Đợt B — Setup nhanh

- Hướng dẫn gọn tại bước chọn tệp, liên kết import danh mục tuân thủ xác nhận rời phiên. Mặc định mở nếu danh mục đang thiếu và có dữ liệu đọc được theo quyền view; người không có quyền đọc không được gọi API danh mục trái quyền.
- Bước 3: thanh “Danh mục cần xử lý · …” và nút “Xem và xử lý”. Sheet bên phải, toàn chiều ngang trên mobile. Phần nhóm/ĐVT chỉ hiện khi có dữ liệu liên quan.
- Gộp giá trị trim + Unicode NFC + không phân biệt hoa/thường; không bỏ dấu hay ghép gần đúng. Mã trước rồi tên; không tạo mới cho ô trống, inactive hoặc mơ hồ.
- Mỗi mục chọn chưa xử lý/dùng có sẵn/tạo mới. Tạo mới có mã gợi ý NHOM-/DVT-, tên, cha tùy chọn hoặc ký hiệu/precision. Checkbox xác nhận mặc định chưa chọn; Áp dụng và kiểm tra lại chỉ đọc, không ghi DB.
- Preview trả missingReferences, active catalogs, newCatalogs và capability tạo. Dòng đủ điều kiện có badge Sẽ tạo danh mục; lỗi độc lập còn nguyên.
- Commit chỉ gửi danh mục dùng bởi hàng hóa được chọn (kể cả đơn vị quy đổi). Xác nhận cuối nêu số hàng hóa/nhóm/ĐVT. Kiểm tra lại quyền products:import và manage theo loại, trạng thái/tenant/trùng, không tự đổi lựa chọn. Danh mục, hàng hóa, quy đổi, audit cùng một giao dịch. Payload ID cũ vẫn hoạt động.
- Không tự retry thao tác ghi; kết quả lưu chưa xác định cần đối soát. Giữ locks, aria-busy, live region, focus, reduced motion và footer ngoài thân bảng cuộn. Không window.alert/confirm.

## Đã triển khai trong cây làm việc

- BE: DTO, handler inspect/preview/template/import riêng cho danh mục; validator/rules cho mã/tên/precision/cây nhóm; mẫu tiếng Việt; endpoint manage; đọc/ghi theo tenant; một lần save; hỗ trợ codeOverrides chỉ ở preview.
- BE: mở rộng preview VTHH bằng lựa chọn tham chiếu + draft danh mục; kiểm quyền tạo; stage danh mục cùng hàng hóa/quy đổi/audit. Tăng giới hạn options preview lên 1 MiB có giới hạn multipart tương ứng.
- FE: hai route import, nút từ trang danh mục, reuse BulkImportPage/OperationalListPanel/Pagination; mã editable buộc recheck; panel setup nhanh, checkbox, badge, chọn lọc payload, invalidation danh mục sau lưu; hướng dẫn setup có capability.
- Build BE dùng `--artifacts-path D:\Kovia-QA\catalog-setup-build -p:EnableDefaultContentItems=false`, tránh DLL của API đang chạy và content glob API/tmp cũ.
- FE thêm `KOVIA_ISOLATED_BUILD=true` để build vào `tmp/catalog-production` trên ổ D, không ghi đè `.next` dev. Next tự sửa tsconfig include; đã bỏ các include output QA và format lại về cấu hình có trước sau khi build kết thúc.

## Lịch sử kiểm thử trước checkpoint

- BE full Application.Tests: **1008 passed, 1 skipped, 1009 total**. Fixture mới in và xác nhận provider InMemory/server in-process/database tên ngẫu nhiên trước khi ghi.
- BE filter import/catalog: **110 passed**. Bao gồm gộp Unicode, preview không Add/Save, xác nhận/quyền theo loại, thu hồi quyền import/manage, inactive/tenant, cha sau con/bỏ chọn cha và lưu danh mục+hàng hóa+audit.
- FE trước hai test mới nhất: **78 passed / 3 files** (ProductImportPage, BulkImportPage, party-import-pages). Lần TypeScript trước test mới đạt; test mới thiếu ba trường nullable đã sửa, chưa có kết quả TypeScript cuối.
- **Production FE build hoàn tất, exit 0**, gồm TypeScript và 68 trang static; hai route mới xuất hiện trong bảng route. Output riêng, không đè server dev.
- Full FE Vitest: **605 passed, 2 failed / 607 tests, 105 passed + 1 failed / 106 files**. Hai lỗi là timeout 5000 ms trong BulkImportPage.test.tsx (“keeps hidden field errors…” và “distinguishes selecting…”). Trước đó cả hai đạt trong suite targeted. Chạy đồng thời build/full tests có thể ảnh hưởng tài nguyên, nhưng **chưa xác minh nguyên nhân**; cần chạy lại tách riêng và điều tra nếu tái diễn, không tự tăng timeout để che lỗi.
- Targeted ESLint đã kết thúc không báo lỗi; lệnh cùng phiên TypeScript từng báo thiếu nullable test và lỗi đó đã được sửa.
- Edge session `catalog-setup` đã mở localhost nhưng **chưa chạy mock/interact/screenshot QA**. Không xác nhận QA desktop/mobile/zoom/reduced motion đã đạt.

## Danh sách tại điểm dừng cũ (đối chiếu cập nhật phía trên)

1. Chạy lại full FE test tách khỏi build, điều tra 2 timeout BulkImportPage; TypeScript trong production build đã đạt, nhưng chạy lại lint/TypeScript sau formatting cuối. Đã dọn tsconfig do build tự thêm.
2. Rà giới hạn 500 danh mục mỗi loại trong setup nhanh so với 500 sản phẩm/2000 quy đổi; hiện rules dùng chung chặn quá 500 mỗi loại, cần thông báo hoặc chốt rõ giới hạn thay vì lỗi chung.
3. Rà ưu tiên mã inactive so với tên active khác; không cho tự fallback làm mất ý nghĩa tham chiếu inactive. Kiểm dữ liệu thay đổi sau preview và lỗi commit phải yêu cầu recheck.
4. Rà mã gợi ý trống khi người dùng xóa, cache edit qua mapping/file/session và đổi mã cha; thêm test UI import ĐVT/nhóm, selection cha/con và lỗi tại ô. Mã không được coi là giữ chỗ.
5. Rà hướng dẫn setup mặc định mở/thu gọn, quản lý quyền capability, Sheet focus/lỗi trường/checkbox/live region, các tên nhóm trùng khác cha và đường dẫn đủ phân biệt.
6. Bổ sung QA/test: XLSX/CSV thật đúng/sai/rỗng/quá giới hạn, Unicode/case/trùng/inactive/tenant; vòng lặp/vượt5/cha blank; đơn vị dùng main+conversion; dòng bỏ chọn không tạo danh mục; concurrency và rollback **cả danh mục mới** với relational fixture (test rollback cũ chỉ sản phẩm/quy đổi/audit).
7. Test double-click/drop, chậm/lỗi/unknown-save, thu hồi quyền sau preview, xác nhận cuối đúng số danh mục. Không tự retry ghi.
8. Dùng Edge với mock/fixture (chặn write API thật) kiểm desktop/mobile, zoom125–150%, keyboard, reduced motion, footer. Chưa có mock browser cho tính năng mới.
9. Review diff/security/DI/template/hierarchy, cập nhật AI_REVIEW cả hai repo theo kết quả thật. Không gọi hoàn tất trước khi hai cách setup xuyên suốt.

## Bảo toàn và an toàn

- Không startup BE, không migration/seed/SQL/direct QA write/db71143 trong lượt này. API local PID36808 thuộc phiên khác, không dừng. Lần test đầu bị DLL lock, đã đổi artifacts output.
- `.playwright-cli`, skills-lock.json và các sửa UI import có trước cần giữ nguyên. Chưa commit/push.
- Khi chạy BE về sau phải tắt Database\_\_ApplyMigrationsOnStartup; mọi QA ghi dùng fixture cô lập đã xác nhận target, không deploy DB.

## Skill đã áp dụng

Ponytail: tái sử dụng reader/components và một lần save, không thêm dependency. shadcn + React best practices: composition, trạng thái xử lý và giữ dữ liệu preview. Web Interface Guidelines: đang rà accessibility/responsive, chưa có kết luận pass cuối. Playwright: chuẩn bị Edge QA, chưa thực hiện ma trận kiểm thử.
