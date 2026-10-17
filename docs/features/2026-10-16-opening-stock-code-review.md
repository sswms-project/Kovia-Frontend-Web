# Tồn kho đầu kỳ — tự review BE → FE → UI/UX, 16/10/2026

Vai trò: chính người triển khai tự review, không phải review độc lập. Phạm vi là luồng hiện tại, gồm cả các điểm kế thừa từ form cũ; không khẳng định mọi finding đều mới phát sinh trong diff. Đã đọc lại AGENTS.md và .rules hai repo. Không sửa mã ứng dụng, áp migration, khởi động API, ghi DB deploy, commit hoặc push.

## Finding cần xử lý

### OS-R1 — Medium — Dòng đang nhập bị bỏ qua khi đã có dòng trong bảng

FE `src/features/inventory/components/OpeningStocksPage/OpeningStockDirectory.tsx:284`.

Thêm dòng A bằng “Thêm dòng và nhập tiếp”, điền đầy đủ dòng B rồi bấm tạo nháp: `saveDraft` chỉ gửi `draftLines`, không kiểm tra hay cảnh báo dòng B đang nằm trong form. Hộp thoại đóng sau lưu và B bị mất. Nhánh sửa phiếu cũng chỉ gửi `draftLines`. Test cô lập mong hai dòng nhưng callback nhận một dòng. Cần chặn lưu và nhắc xử lý dòng chưa thêm, hoặc validate và thêm dòng đó một cách nhất quán; không âm thầm bỏ qua.

### OS-R2 — Medium — Dropdown mất lựa chọn hiển thị nhưng RHF vẫn giữ ID

FE `src/features/inventory/hooks/use-opening-stock-options.ts:7`, `src/features/inventory/components/OpeningStocksPage/OpeningStockDirectory.tsx:803`.

Chọn sản phẩm làm đổi query key vì ProductId cũng là tham số lookup lô. Query mới chưa có data nên options bị thay bằng mảng rỗng. NativeSelect dùng register không có value điều khiển; khi options trở lại, dropdown ở placeholder nhưng RHF vẫn giữ ID sản phẩm cũ. Test đã xác nhận DOM value rỗng trong khi `getValues('productId')` vẫn có ID. Không được để dữ liệu sẽ gửi khác lựa chọn người dùng đang thấy. Cần giữ/pin option đang chọn, điều khiển value và tách kết quả lookup phù hợp, không chỉ thêm disabled.

### OS-R3 — Medium — CSV có thể bị làm tròn trước khi kiểm precision

BE `Application/Features/Inventory/OpeningStockImport/OpeningStockImportPreview.cs:91`.

`decimal.TryParse` có thể làm tròn đầu vào vượt số chữ số biểu diễn được của decimal. Với CSV `1.00000000000000000000000000000000001`, preview chấp nhận số 1 vì PrepareLine chỉ còn kiểm giá trị đã parse. Test mong dòng lỗi nhưng nhận IsValid=true. Vi phạm yêu cầu không làm tròn âm thầm. Kiểm phần số lẻ có nghĩa từ chuỗi gốc trước parse, vẫn nhận trailing zeros như 1.2300; kiểm lại các đường JSON nhập tay nếu cũng cần bảo toàn biểu diễn gốc.

### OS-R4 — Medium — Không sửa được ngày khai báo của lô dự kiến

BE `Application/Features/Inventory/UpdateOpeningStock/UpdateOpeningStockCommandHandler.cs:39`.

Với dòng LotId=null, lô chưa tồn tại, người dùng giữ ID dòng và chủ động sửa ngày trong newLot hợp lệ: guard so snapshot vẫn trả OPENING_STOCK_LOT_CHANGED. Test đổi NSX 01/01 thành 02/01 của lô dự kiến đã tái hiện 409. Đây không phải danh mục ProductLot đã bị đổi ngoài phiếu. Cần phân biệt bảo vệ snapshot lô đã tồn tại với sửa khai báo lô dự kiến, giữ kiểm ngày/ack/audit và nguồn dòng; không buộc xóa rồi thêm dòng để né guard.

### OS-R5 — Medium — Thông báo lỗi BE bị thay bằng câu chung

FE `src/features/inventory/pages/OpeningStocksPage.tsx:138` (cả nhánh update dòng 171 và action dòng 234).

Axios interceptor trả ApiErrorResponse là object thường, không phải instance Error. Các catch dùng `error instanceof Error` nên mất message cụ thể của BE như thiếu quy đổi sức chứa, lô hết hạn hoặc phạm vi đã phát sinh nghiệp vụ. Người nhập tay không biết dòng/nguyên nhân cần sửa. Dùng bộ lấy message hỗ trợ ApiErrorResponse sẵn có và gắn field errors khi có thể; không chỉ đọc Error.message. Finding này xác nhận bằng đối chiếu trực tiếp interceptor và catch, chưa có browser/API thật.

### OS-R6 — Medium — Đếm trùng lô mới giữa FE và BE

FE `src/features/inventory/components/OpeningStockImportSession.tsx:55`.

FE gộp pendingLots bằng số lô nguyên dạng, còn BE trim + NFC + uppercase. Hai dòng cùng sản phẩm, khác vị trí, số lô L-01/l-01 và cùng ngày là hai dòng hợp lệ nhưng chỉ tạo một ProductLot. UI và xác nhận hiện hai lô. Cần gộp theo cùng quy tắc chuẩn hóa của BE, giữ nguyên dấu và không ghép gần đúng. Xác nhận bằng đối chiếu code, chưa chạy xuyên API.

### OS-R7 — Medium — Chi tiết phiếu nhiều dòng không có vùng cuộn

FE `src/features/inventory/components/OpeningStocksPage/OpeningStockDirectory.tsx:635`.

Dialog chi tiết render tất cả dòng nhưng chỉ đặt max-width; không có max-height/overflow-y-auto. Primitive Dialog cũng không cung cấp giới hạn này. Phiếu 50–200 dòng có thể đẩy đầu/cuối và nút Đóng ra ngoài viewport, nhất là mobile; modal khóa cuộn trang nền. Cần giới hạn chiều cao và vùng cuộn nội dung ở component nghiệp vụ, giữ footer dễ tiếp cận. Finding từ kiểm mã/layout; chưa đo lại dialog này trên browser.

### OS-R8 — Medium — Audit trước/sau thiếu trạng thái tồn trước sửa

BE `Application/Features/Inventory/UpdateOpeningStock/UpdateOpeningStockCommandHandler.cs:26`.

Before snapshot không chứa QualityStatus/EligibilityStatus, trong khi handler cho cập nhật hai trường đó và after chứa payload mới. Không truy ra trạng thái cũ từ audit của lần sửa, đặc biệt khi đổi Available sang hold hoặc Good sang Damaged. Cần serialize cùng tập trường nghiệp vụ đã chuẩn bị cho before/after, kèm ID/nguồn dòng; giữ payload audit ngoài cột Reason ngắn. Xác nhận bằng kiểm code, chưa thêm test riêng cho finding này.

## Kiểm chứng trong lượt review

- FE hiện có: `pnpm exec vitest run src/features/inventory src/components/operations --maxWorkers=2`: 23 file, 129 ca đạt.
- Hai ca tái hiện FE OS-R1/R2: đều thất bại đúng assertion hành vi, không phải lỗi setup test. Fixture nhỏ tại `tmp/opening-stock-ui/review-repro.fixture.tsx`; đổi hậu tố test chỉ khi chạy riêng. Đã bỏ hậu tố .test.tsx sau tái hiện để không đưa test chẩn đoán cố ý đỏ vào suite thường.
- BE chạy trên bản sao QA hiện có, hash hai handler liên quan khớp source repo. `dotnet test Application.Tests/Application.Tests.csproj -c Release --no-restore --filter FullyQualifiedName~OpeningStockImportTests`: 39 ca hiện có đạt; 2 ca mới tái hiện OS-R3/R4 thất bại. Build thành công; còn NU1902/NU1903 Pkcs như báo cáo triển khai.
- TRX: `D:/Kovia-QA/OpeningStock-20261015/results/opening-stock-review-repro.trx`. Hai ca chẩn đoán chỉ thêm trong bản sao QA, không sửa bộ test source của BE ở lượt review.
- Git diff --check hai repo sạch. Không chạy lại full suite/build production ở lượt review; kết quả full suite cũ giữ riêng trong biên bản triển khai.
- Ponytail ưu tiên sửa tại luồng/utility hiện có, không đề xuất framework/layer mới. GitNexus context dùng đối chiếu phụ thuộc; graph không bao phủ các file untracked mới nên review thủ công là bắt buộc. UI rà theo guideline React/shadcn và Web Interface Guidelines; không coi jsdom là bằng chứng responsive trên Edge.

## Giới hạn và trạng thái

Tất cả finding trên đang mở; chưa có bản sửa hoặc final approval. Chưa chứng minh Blocker/High mới trong phần đã kiểm, nhưng không suy ra luồng an toàn production: QA FE–API/storage thật, schema đích và race hai handler trên SQL Server còn thiếu. Chưa áp `20261015151230_AddOpeningStockImportMetadata`, đúng yêu cầu người dùng tạm hoãn migration. Gate A/C tiếp tục mở. Không tạo bản sao repo mới; dùng lại một thư mục QA và một fixture nhỏ.

## Bản sửa theo yêu cầu — 2026-10-16

Các ghi nhận phía trên là lịch sử của lượt review. OS-R1–R8 đã được sửa trong working tree, trạng thái **READY_FOR_FINAL_REVIEW**, chưa có phê duyệt độc lập hoặc chứng nhận phát hành.

| Finding | Bản sửa và hồi quy                                                                                                                                                                                  |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OS-R1   | Chặn lưu nếu còn dòng đang nhập chưa được thêm, focus về trường và hướng dẫn thêm dòng; giữ nguyên dữ liệu ở cả tạo và sửa phiếu. Test thêm A, điền B, lưu, thêm B rồi lưu đúng hai dòng.           |
| OS-R2   | NativeSelect điều khiển theo giá trị RHF; pin lựa chọn và metadata khi lookup tải lại/lọc; placeholder chỉ dùng lại trong cùng kho. Test DOM/RHF, metadata gửi đi và chuyển kho không lộ vị trí cũ. |
| OS-R3   | Kiểm số lẻ có nghĩa từ chuỗi gốc trước decimal.TryParse; vẫn nhận trailing zeros. Ba ca reject và hai ca accept. Phạm vi kiểm chuỗi là reader XLSX/CSV, không bổ sung JSON decimal converter.       |
| OS-R4   | Chỉ áp guard thay đổi snapshot ngày cho lô đã tồn tại; khai báo lô dự kiến được sửa ngày với cùng ID/nguồn, vẫn cần xác nhận và không tạo ProductLot. Test cả pending lot và drift lô có sẵn.       |
| OS-R5   | Dùng bộ đọc lỗi API hiện có tại helper nghiệp vụ; giữ message/field errors, không đưa code/errorCode kỹ thuật vào toast. Không sửa helper dùng chung có 97 direct callers.                          |
| OS-R6   | Gộp lô dự kiến theo product + trim/NFC/uppercase, giữ dấu; chỉ tính dòng được chọn. Test case/Unicode, khác sản phẩm và không bỏ dấu để ghép nhầm.                                                  |
| OS-R7   | Dialog max-height 90dvh, header/footer không co, body cuộn riêng và nhận focus bàn phím. Test 200 dòng; fixture Chromium 360×640, 768×1024, 1280×800: dialog trong viewport, footer thấy được.      |
| OS-R8   | Audit before/after dùng cùng snapshot thực thể, có quality/eligibility, ID, đơn vị, số lượng, lô/ngày và nguồn dòng. Test giữ ID/nguồn, đổi trạng thái, thêm/xóa dòng.                              |

### Kết quả kiểm thử sau sửa

- FE toàn bộ Vitest: **210 file / 1229 ca đạt** (`pnpm exec vitest run --maxWorkers=2`), thêm 11 ca trong ba file hồi quy.
- FE TypeScript (`pnpm exec tsc --noEmit -p tsconfig.production.json`) và scoped ESLint: exit 0. Production build `KOVIA_ISOLATED_BUILD=true pnpm exec next build`: đạt, output `tmp/catalog-production`, không ghi đè `.next` của dev.
- BE trên bản sao QA duy nhất đang có: Release build qua targeted test, **93/93** ca tập trung đạt. Toàn suite **1495 đạt / 6 lỗi / 5 bỏ qua**; sáu tên lỗi khớp lượt triển khai trước (4 InboundOperationalEditing, TenantRolePermission, AuthenticationWorkflowAlignment), không có lỗi trong bộ tồn đầu kỳ. Chưa xây lại clean upstream baseline; không diễn giải thành bằng chứng tuyệt đối không hồi quy toàn repo. NU1902/NU1903 Pkcs vẫn còn.
- TRX: `D:/Kovia-QA/OpeningStock-20261015/results/opening-stock-review-fixes.trx` và `opening-stock-review-fixes-all.trx`.
- Fixture ảnh: `D:/Kovia-QA/OpeningStock-20261015/evidence/detail-{360,768,1280}-review-fixes-fixture.png`. Mobile dialog top 32/bottom 608 trên viewport cao 640; nội dung 15718px cuộn trong body 437px, nút Đóng top 560/bottom 592. Bàn phím End tới cuối body và nút Đóng thao tác được. Đây là fixture không API, không thay thế QA Edge/NVDA/zoom 200%/reduced motion thật.
- Git diff --check hai repo sạch (chỉ cảnh báo LF/CRLF). GitNexus impact kết hợp manual callers vì file mới chưa được index; detect-changes toàn working tree vẫn báo BE critical do toàn bộ triển khai đang chưa commit, FE medium. Không dùng mức này để suy luận riêng bản sửa an toàn tuyệt đối. Không sửa shared error helper, shadcn primitives, transfer source hoặc dependency manifest.
- Không chạy BE, không kết nối/ghi DB deploy, không áp/thêm migration, không seed, không stage/commit/push. Giữ nguyên các thay đổi khác; không tạo repo copy mới. Gate A/C và migration vẫn chờ điều kiện/cho phép đã nêu trước đó.
