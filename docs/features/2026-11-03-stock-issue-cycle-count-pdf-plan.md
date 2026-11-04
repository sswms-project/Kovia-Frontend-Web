# Kế hoạch xuất PDF phiếu xuất kho và biên bản kiểm kê

Ngày: 03/11/2026. Cập nhật 04/11/2026: đã triển khai FE; chờ kiểm tra tay và review trước khi triển khai.

## Kết quả triển khai 04/11/2026

- Hai document 02-VT (A4 dọc) và 05-VT (A4 ngang) được đối chiếu trực tiếp với trang 68 và 71 Công báo. Nút PDF nằm ở thanh hành động chi tiết, kiểm kê giữ nút Excel và chặn PDF khi có số đếm chưa lưu.
- Mỗi lần tải refetch chi tiết thành công rồi mới dựng file; lỗi hoặc phiếu hủy không xuất. Số thực xuất chỉ tính pick có issuedAt từ reader đã loại reversed; kiểm tra quy đổi và dữ liệu thực xuất của phiếu đã hoàn tất. Kiểm kê giữ null bị ẩn, không lấy tồn hiện tại hoặc giá kế toán.
- Tái sử dụng React PDF, bổ sung font Noto Sans tĩnh Regular/Bold từ font OFL đã có. Mỗi lần xuất dùng đăng ký font riêng để tránh tái sử dụng trạng thái glyph giữa file; giải phóng đăng ký sau khi kết thúc.
- 7 kiểm thử đạt: số lượng, dữ liệu mù, renderer nhiều trang, chặn xuất khi refetch lỗi và chặn bấm lặp. Đã render/xem PDF mẫu một trang hoàn tất và nhiều trang nháp; xác minh dấu nháp trên mọi trang bằng trích xuất PDF.
- TypeScript mã nguồn và scoped ESLint đạt. Next build biên dịch thành công nhưng bước TypeScript toàn workspace bị chặn bởi file QA có sẵn outputs/cycle-count-review-20261024/scanner-review.repro.tsx:163; chưa thay đổi file QA hoặc tsconfig của dự án.
- Chưa kiểm tra tay với tài khoản/thiết bị thật. Không gọi API ghi, không migration/seed, không thay BE. Các trường đơn vị pháp nhân, giá trị kế toán, hội đồng và chữ ký thiếu dữ liệu để trống; thông tin nhận diện kho không thay tên doanh nghiệp.

## 1. Mục tiêu và phạm vi

Bổ sung nút Xuất PDF trên trang chi tiết yêu cầu xuất kho và phiếu kiểm kê, theo cách người dùng đang tải PDF phiếu nhận hàng. File được dựng từ dữ liệu đã lưu, tải xuống thiết bị, không có chỉnh sửa PDF hay trình thiết kế mẫu.

| Nghiệp vụ | Biểu mẫu tham khảo                                                    | Trang đặt nút                  |
| --------- | --------------------------------------------------------------------- | ------------------------------ |
| Xuất kho  | 02-VT — Phiếu xuất kho                                                | `/stock-issue-requests/[id]`   |
| Kiểm kê   | 05-VT — Biên bản tổng hợp kiểm kê vật tư, công cụ, sản phẩm, hàng hóa | `/inventory/cycle-counts/[id]` |

Giữ nút Xuất Excel kiểm kê hiện có. Không sửa trạng thái, số tồn, phân bổ, giữ hàng, lịch sử nhập/xuất hoặc kết quả kiểm kê khi xuất file. Không thêm migration, seed, quyền mới hoặc endpoint ghi. Không tự cấp quyền cho Manager/Staff.

## 2. Căn cứ biểu mẫu

Tham khảo Phụ lục I, Thông tư 99/2025/TT-BTC ngày 27/10/2025 của Bộ Tài chính. Đây là biểu mẫu chứng từ kế toán; tính năng PDF không thay thế hóa đơn điện tử, chữ ký số hoặc phần mềm kế toán.

- [Văn bản và danh sách tệp chính thức trên Công báo](https://congbao.chinhphu.vn/tai-ve-van-ban-so-99-2025-tt-btc-46529-59631).
- [Phụ lục biểu mẫu trên CDN Công báo](https://congbao.cdnchinhphu.vn/CongBaoCP/VanBan/2025/10/46529/59631-1-20251563-156499-2025-tt-btc.pdf).

Trước khi dựng từng mẫu, xem trực tiếp trang biểu mẫu gốc để đối chiếu tên cột, vùng ký, ghi chú; không chỉ sao chép giao diện phiếu nhập. Không tuyên bố file đáp ứng đầy đủ chứng từ kế toán khi dữ liệu pháp lý/kế toán còn thiếu.

## 3. Hiện trạng đã đối chiếu code

### 3.1. Phần dùng lại

- `src/features/inbound/components/ReceiptDetailPage/ReceiptPdfDocument.tsx`: dùng `@react-pdf/renderer`, font Noto Sans trong assets và A4.
- `ReceiptDetail.tsx`: lazy import khi bấm Xuất PDF, dựng Blob, tải file bằng object URL.
- Dùng lại thư viện và font, không thêm dependency. Không sao chép nguyên cách gán người ký của nhập kho: người tạo/người duyệt trên hệ thống không mặc nhiên là kế toán trưởng, thủ kho hoặc giám đốc.

### 3.2. Hợp đồng xuất kho

- FE: `src/features/stock-issue/types/stock-issue.types.ts`.
- BE: `../SSWMS-Backend/Contract/Models/StockIssue/StockIssueRequestResponse.cs`.
- BE xử lý xuất: `../SSWMS-Backend/Application/Features/StockIssue/ConfirmStockDispatch/ConfirmStockDispatchCommandHandler.cs`.
- Dòng hàng có `quantity`, `pickedQuantity` theo đơn vị cơ sở; `enteredQuantity`, `enteredUnitName`, `conversionFactor` theo đơn vị yêu cầu.
- `pickDetails` có `pickedQuantity`, `issuedAt` và thông tin lô/vị trí. DTO chưa có trường tổng thực xuất riêng cho từng dòng.
- Có `createdAt`, `issueDate`, `issueTime`, `dispatchedAt`, `dispatchAuthorizedAt`; `createdBy` và người cho phép xuất hiện là ID, chưa có đủ tên/chức danh để tự điền các vùng ký.

### 3.3. Hợp đồng kiểm kê

- FE: `src/features/cycle-count/types/cycle-count.types.ts`.
- BE: `../SSWMS-Backend/Contract/Models/CycleCount/CycleCountResponse.cs`.
- BE bảo vệ kiểm kê mù: `../SSWMS-Backend/Application/Features/CycleCount/GetCycleCount/GetCycleCountQueryHandler.cs` trả `systemQuantity`, `difference` và tồn lịch sử là null cho người được giao đang đếm mù.
- Có mã phiếu, kho/khu, trạng thái, lịch, vòng đếm, tên người tạo/gửi/chốt; từng dòng có sản phẩm, vị trí, lô/HSD, đơn vị, tồn snapshot, số đếm, hỏng, chênh lệch và ghi chú.
- Kiểm kê đã có Xuất Excel. Endpoint Excel hiện dùng `CycleCountPermissions.View`, không phải mặc định yêu cầu `lists:export`.
- Trạng thái chốt là `Completed`; chốt kiểm kê không đồng nghĩa mọi phiếu điều chỉnh tồn đã được phê duyệt/ghi sổ.

## 4. Quy tắc PDF xuất kho 02-VT

### 4.1. Nội dung và ánh xạ

| Vùng PDF                 | Dữ liệu và nguyên tắc                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đơn vị                   | Tên doanh nghiệp từ nguồn đã được cấp quyền nếu có; không lấy tên kho thay tên pháp nhân. Chưa có thì để trống                                     |
| Số phiếu/tham chiếu      | Mã yêu cầu xuất hiện có; ghi thêm mã chứng từ tham chiếu nếu có. Không tạo thêm mã phiếu hoặc chứng từ tồn                                         |
| Ngày lập                 | `createdAt`, hiển thị giờ Việt Nam                                                                                                                 |
| Ngày xuất                | `dispatchedAt` khi có; `issueDate`/`issueTime` chỉ là lịch dự kiến, không thay ngày xuất thực tế                                                   |
| Người/đơn vị nhận        | `recipientName`, `stockRecipientName`, địa chỉ có trong chi tiết; thiếu thì để trống                                                               |
| Lý do, kho xuất          | `purpose`, `warehouseName`                                                                                                                         |
| Mã/tên hàng              | `sku`, `productName`                                                                                                                               |
| Đơn vị                   | `enteredUnitName`; cả yêu cầu và thực xuất phải quy về cùng đơn vị này                                                                             |
| Số lượng yêu cầu         | `enteredQuantity`; kiểm tra hợp đồng với `quantity / conversionFactor`                                                                             |
| Thực xuất                | Tổng `pickDetails[].pickedQuantity` có `issuedAt != null`, chia `conversionFactor`. Xác minh reader chỉ trả chi tiết có hiệu lực trước khi áp dụng |
| Đơn giá/thành tiền/Nợ/Có | Để trống vì DTO chưa có dữ liệu kế toán tương ứng; không dùng giá bán hoặc tự tính giá vốn                                                         |
| Người ký                 | Giữ vùng ký theo mẫu; chỉ điền tên nếu dữ liệu xác định đúng trách nhiệm. Không in GUID hoặc suy chức danh từ role                                 |

Không dùng `pickedQuantity` tổng của dòng hay số yêu cầu làm thực xuất. Không lấy `returnableQuantity` thay thực xuất; hàng trả lại sau đó không làm thay đổi số đã xuất của chứng từ gốc. Nếu dữ liệu legacy thiếu chi tiết issued dù trạng thái Dispatched, không tự suy ra: báo chưa đủ dữ liệu để xuất chính thức, cần đối chiếu BE.

Không cộng số lượng các đơn vị khác nhau thành một tổng (ví dụ Thùng + Cái). Tổng theo nhóm đơn vị nếu cần, hoặc chỉ ghi số dòng; vùng tổng tiền chưa có dữ liệu để trống. Giữ số thập phân hợp lệ, không ép mọi đơn vị thành số nguyên, không làm tròn âm thầm để che sai quy đổi. Conversion factor không hợp lệ phải chặn xuất và báo lỗi dữ liệu.

### 4.2. Trạng thái

| Trạng thái                                                          | Hành vi                                                                                                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Pending, ReleasedForPicking, Picking, Picked, AuthorizedForDispatch | Có thể tải bản nháp, đánh dấu rõ BẢN NHÁP/CHƯA HOÀN TẤT trên mọi trang; chỉ in thực xuất có bằng chứng, không in số đã lấy vào cột thực xuất |
| Dispatched                                                          | Xuất phiếu hoàn tất từ dữ liệu thực xuất, không watermark nháp                                                                               |
| Cancelled                                                           | Không cho xuất phiếu đang có hiệu lực; ẩn/khóa nút kèm lý do, chưa triển khai bản lưu trữ phiếu hủy                                          |

Nếu có giao từng phần đã issued nhưng phiếu chưa kết thúc, bản nháp ghi rõ số đã xuất tính đến thời điểm tải; không gộp thành một đợt giao mới hay khẳng định toàn phiếu đã xuất.

## 5. Quy tắc PDF kiểm kê 05-VT

### 5.1. Nội dung

- Đơn vị, kho/khu vực kiểm kê, mã phiếu, mục đích, thời gian và vòng kiểm kê.
- Phân biệt ngày lập, lịch dự kiến, ngày đếm thực tế và ngày chốt. Không lấy lịch dự kiến làm thời điểm toàn bộ hàng được kiểm đếm.
- Bảng chính theo bố cục gốc 05-VT: mã/tên hàng, đơn vị, số sổ sách, thực kiểm, thừa/thiếu, phẩm chất và thông tin giá trị nếu có.
- Khu → kệ → vị trí, lô và HSD trình bày dưới tên hàng hoặc phụ lục để đọc được khi một SKU có nhiều dòng. Dùng formatter vị trí chung, không lộ `__SYSTEM_DEFAULT__`.
- Mỗi dòng phản ánh đúng tổ hợp sản phẩm/vị trí/lô/chất lượng. Không gộp chỉ theo SKU làm mất khác biệt đơn vị, lô hoặc chất lượng.
- Số sổ sách dùng snapshot BE trả về, không lấy tồn khả dụng hiện tại. PDF không tự truy vấn tồn mới để thay số snapshot.
- Ưu tiên `difference` BE; tách thừa/thiếu theo dấu. Null là chưa đếm/đã ẩn, không đổi thành 0 hoặc tự tính lại khi dữ liệu bị ẩn.
- `countedDamagedQuantity` là phần hỏng trong số kiểm; xác minh ý nghĩa với validator hiện có và không cộng thêm lần nữa vào `countedQuantity`.
- Chưa có giá trị kế toán thì để trống cột đơn giá/thành tiền; không điền 0 gây hiểu nhầm. Không tính tổng lượng khác đơn vị.
- Giữ các vùng ký đúng mẫu. Chỉ điền người tạo, đếm, chốt vào đúng vai trò có bằng chứng; hội đồng kiểm kê/kế toán trưởng/giám đốc chưa có dữ liệu thì để trống.
- Ghi chú rõ việc hoàn tất kiểm kê không xác nhận các điều chỉnh tồn đã ghi sổ. Không tự tạo/duyệt điều chỉnh khi tải PDF.

### 5.2. Trạng thái và kiểm kê mù

| Trạng thái                   | Hành vi                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| Scheduled, Counting, Recount | Bản nháp, không đại diện kết quả chốt; ô chưa đếm để trống                             |
| Submitted                    | Bản kết quả CHỜ CHỐT, vẫn có watermark nháp                                            |
| Completed                    | Biên bản kết quả đã chốt, ngày chốt lấy `finalizedAt`/`completedAt` theo ngữ nghĩa DTO |
| Cancelled                    | Không xuất biên bản đang có hiệu lực; chưa làm bản lưu trữ phiếu hủy                   |

Kiểm kê mù: dùng duy nhất dữ liệu được phép từ endpoint chi tiết; các ô BE che phải ghi “Đã ẩn”, không hiện số sổ sách hoặc chênh lệch từ cache/lịch sử/endpoint khác. Không dùng null thành 0. Không đưa dữ liệu nháp chưa lưu của form vào PDF. Nếu form đang bẩn/đang lưu, yêu cầu lưu hoặc bỏ thay đổi trước, không tự lưu kết quả kiểm kê để xuất.

## 6. UX và quyền truy cập

- Nút Xuất PDF đặt trong thanh hành động trang chi tiết, cạnh Xuất Excel của kiểm kê; giữ nút và luồng cũ. Mobile cho phép xuống hàng, không đè tên phiếu và thao tác nghiệp vụ chính.
- Loading riêng: “Đang xuất PDF…”, spinner, chặn bấm trùng. Tải file không thay trạng thái chứng từ và không khiến nút nghiệp vụ báo thành công.
- Dùng quyền xem nghiệp vụ và phạm vi tenant/kho đang có; không mặc nhiên thêm `lists:export` vì PDF nhập và Excel kiểm kê hiện không dùng quyền này. Nếu muốn kiểm soát riêng việc tải tài liệu thì là quyết định phạm vi riêng, cần cập nhật đồng bộ cả ba luồng.
- Trước lúc xuất, Page/hook kiểm tra trạng thái hiện tại bằng refetch query chi tiết có scope. Chỉ dùng response thành công của lần kiểm tra này; 403/404 hoặc lỗi mạng thì dừng xuất, không xuất dữ liệu cache cũ. Không gọi service trực tiếp từ UI component.
- Loading/error không xuất file rỗng, không coi lỗi là không có hàng. Cảnh báo nháp rõ trước khi tải, đồng thời watermark lặp mỗi trang.
- Một owner xử lý lỗi: logger + toast phù hợp; giữ dữ liệu người dùng. Xóa object URL sau khi trình duyệt nhận tải và có cleanup; không revoke quá sớm.
- Tên file tiếng Việt có dấu: `Phiếu xuất kho - <mã>.pdf`, `Biên bản kiểm kê - <mã>.pdf`; thêm hậu tố ` - Bản nháp` cho bản chưa chốt. Không dùng ID ngẫu nhiên làm mã chứng từ. Ký tự không hợp lệ trong tên file được thay bằng dấu gạch ngang qua bộ tải dùng chung.
- Nút có tên rõ, hỗ trợ bàn phím, icon trang trí aria-hidden. Tôn trọng reduced motion của UI chung.

## 7. Thiết kế kỹ thuật dự kiến

1. Tạo hai document component thuần nhận view-model: `StockIssuePdfDocument.tsx` trong thư mục chi tiết xuất kho và `CycleCountPdfDocument.tsx` trong thư mục chi tiết kiểm kê. Không API hooks, toast, mutation hoặc navigation trong document.
2. Mapper thuần trong `utils/` của từng feature chịu trách nhiệm trạng thái, đơn vị, thực xuất, kiểm kê mù và dữ liệu null. Lấy constants status/formatter hiện có, không hard-code lại role hoặc permission keys.
3. Page hoặc hook được Page gọi điều phối refetch, snapshot, loading và download. Bảng lọc, tab, pagination hiện tại không được cắt bớt dòng PDF: xuất toàn bộ items của chứng từ từ response chi tiết.
4. Lazy import `@react-pdf/renderer` và document chỉ khi cần; không tải thư viện PDF vào bundle đầu của hai trang. Đăng ký font Noto Sans ổn định, kiểm tra tiếng Việt và xuống dòng.
5. Nếu phần font/download lặp giữa ba nơi, trích đúng phần dùng chung nhỏ trong cấu trúc hiện có sau khi xem caller; không tạo framework/template engine. Không refactor toàn bộ PDF nhập ngoài phần reuse tối thiểu cần thiết.
6. Dùng ngày nghiệp vụ/múi giờ `Asia/Ho_Chi_Minh` của dự án; không dùng getDate/getMonth theo múi giờ máy như cách PDF nhập hiện tại. DateOnly không được chuyển UTC làm lệch ngày.
7. Trước sửa symbol: GitNexus impact; trước commit: detect_changes. Giữ nguyên cấu hình local và thay đổi ngoài phạm vi.

Ưu tiên chỉ thay FE. Nếu kiểm tra mapper/reader phát hiện không thể chứng minh thực xuất hợp lệ từ DTO hoặc thiếu trường bắt buộc, dừng phần ánh xạ đó và báo chính xác cần bổ sung read-only DTO nào. Không tự suy dữ liệu hoặc thêm migration để hoàn thiện hình thức biểu mẫu.

## 8. Trình tự thực hiện

1. Đọc lại .rules, AGENTS.md, tài liệu FE về data flow/design và trang mẫu chính thức. Kiểm tra scope/phân quyền và các caller cần sửa.
2. Chốt ánh xạ bằng fixtures thực tế từ DTO, đặc biệt chi tiết issued/returned/reversed, quy đổi, trạng thái partially dispatched, kiểm kê mù và hàng hỏng. Không gọi API ghi/đếm/xác nhận xuất thay người dùng.
3. Làm mapper + focused tests cho hai mẫu trước khi dựng layout.
4. Dựng PDF A4 và nút export qua luồng loading/error/download chung; giữ Excel và thao tác hiện tại.
5. Render PDF mẫu, kiểm tra hình ảnh từng trang và sửa lỗi cắt dòng, tràn bảng, font, vùng ký và watermark.
6. Kiểm tra responsive nút trên điện thoại/desktop, quyền, stale response, lỗi tải, bấm nhiều lần và form dirty.
7. Cập nhật spec/handoff với kết quả thực tế. Báo rõ phần chưa đủ dữ liệu; chỉ commit/push/PR khi người dùng yêu cầu.

## 9. Kiểm thử và tiêu chí nghiệm thu

### Dữ liệu và nghiệp vụ

- Xuất kho: không có pick; có pick chưa issued; có một phần issued; Dispatched; Cancelled; nhiều lô/vị trí; đã có hàng trả; dữ liệu legacy thiếu issued; conversionFactor không hợp lệ.
- Ví dụ bắt buộc: yêu cầu 2 Hộp, factor 10, đã lấy 20 Cái nhưng chỉ 10 Cái có issuedAt → yêu cầu 2 Hộp, thực xuất 1 Hộp, trạng thái vẫn nháp nếu chưa kết thúc. Sau trả khách không giảm số thực xuất lịch sử.
- Kiểm kê: chưa đếm/null; 0 thật; chênh lệch dương/âm/0; đếm lại; cùng SKU khác vị trí/lô; hỏng là phần trong thực kiểm; Completed còn điều chỉnh chưa duyệt; blind assigned user không thấy số bị ẩn cả trong PDF.
- Không cộng chung Thùng/Cái; giá trị chưa có để trống; không in NaN/undefined/GUID ở vùng chữ ký hoặc system default ở vị trí.
- Thời gian: timestamp gần nửa đêm UTC, múi giờ thiết bị khác Việt Nam, DateOnly, ngày xuất thực tế khác lịch dự kiến.

### UI, tải file và tài liệu

- Quyền chỉ xem phù hợp scope vẫn xuất được dữ liệu hợp lệ; không đủ quyền/403/404 không xuất cache. Chọn mẫu quyền/permission administration không bị thay đổi.
- Nút export không chạy mutation; pending chặn bấm trùng, lỗi font/render/refetch có thông báo và khôi phục nút; không làm mất draft.
- Xuất toàn chứng từ, không chỉ tab/bộ lọc/trang đang thấy. Không dùng draft chưa lưu.
- PDF render 1 dòng, nhiều dòng qua nhiều trang, tên dài, tiếng Việt đầy đủ. Header bảng lặp trên trang mới, dòng không cắt khó đọc, vùng ký không tách vô nghĩa. Draft marker xuất hiện ở mọi trang nháp.
- Kiểm tra thao tác trên viewport khoảng 360/390px và desktop; nút không che thao tác nghiệp vụ, không cuộn ngang do toolbar.
- TypeScript, scoped ESLint, tests mapper/workflow và build phù hợp đạt; render-and-inspect PDF là bắt buộc, không chỉ kiểm tra Blob có byte.
- Không migration/seed/ghi DB; không tự merge. PDF không tự sửa tài liệu gốc hoặc ghi nhận tồn.

## 10. Ngoài phạm vi

Sửa PDF sau khi xuất, tải PDF sửa lên, mẫu tùy biến theo tenant, chữ ký số, hóa đơn điện tử, hạch toán giá vốn/Nợ/Có, mã phiếu mới, chia đợt xuất mới, lưu trữ bất biến PDF đã ký trên BE và sửa toàn bộ PDF nhập hiện có.

PDF giai đoạn này phản ánh dữ liệu hiện có tại thời điểm tải; chưa phải kho lưu trữ chứng từ đã ký/bất biến để tái hiện nguyên trạng mọi phiên bản lịch sử.
