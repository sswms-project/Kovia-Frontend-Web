# Thiết kế tồn kho đầu kỳ và nhập từ tệp

Ngày: 2026-10-15.

Trạng thái: đề xuất thiết kế dựa trên việc đọc code. Chưa triển khai, chưa chạy QA nghiệp vụ hoặc áp migration. Các thay đổi nghiệp vụ bên dưới là đề xuất, không phải mô tả khả năng đã có.

Đã có [spec triển khai chi tiết](2026-10-15-opening-stock-import-spec.md), bổ sung hợp đồng BE/FE, ngày báo cáo, lô dự kiến, precision, kiểm tập lựa chọn và Gate A/B/C. Nếu có khác biệt, dùng spec mới hơn để review.

## 1. Nền tảng đã xác minh

Hệ thống đã có tồn đầu tại `/inventory/opening-stocks`, gồm lập/sửa nháp, bằng chứng, gửi duyệt, trả lại, rút duyệt, hủy và duyệt ghi sổ.

- FE: `src/features/inventory/pages/OpeningStocksPage.tsx`, `components/OpeningStocksPage/OpeningStockDirectory.tsx`.
- BE: `CreateOpeningStockCommandHandler`, `ApproveOpeningStockCommandHandler`, `OpeningStockRecord`, `OpeningStockLine`, `OpeningStockPostedScope`.
- Khi duyệt, BE tạo chuyển động `Opening` và cập nhật trạng thái trong một giao dịch. Có kiểm phiên bản, chống khởi tạo trùng và kiểm phạm vi đã phát sinh nghiệp vụ.
- Hiện mỗi phiếu thuộc một kho, tối đa 200 dòng; chỉ nhận đơn vị cơ sở, hệ số bằng 1, số lượng lớn hơn 0 và lô đã có.
- Hiện chưa có ngày ghi nhận tồn đầu riêng; chuyển động kho lấy thời điểm duyệt.
- Bằng chứng được upload trước rồi gắn vào phiếu. Lưu tệp và giao dịch DB không phải một giao dịch vật lý chung.

Khung import dùng chung đã có:

- FE: `BulkImportPage`, `BulkImportWorkspace`, `BulkImportHeader`, `BulkImportFilePicker`, `BulkImportMapping`, `BulkImportResult`, navigation guard, `OperationalListPanel`, `OperationalPagination`.
- BE: `ISpreadsheetDocumentReader`, `SpreadsheetDocumentReader`, `SpreadsheetTableReader`, `SpreadsheetImportMapping`, các DTO tùy chọn và inspection hiện có.
- `WarehouseLocationImportPage` là ví dụ luồng nghiệp vụ riêng dùng lại các phần trình bày chung.

## 2. Mục tiêu và giới hạn

Cho phép người mới đưa số lượng đang có thực tế vào hệ thống theo kho, vị trí/kệ, sản phẩm và lô. Hỗ trợ nhập tay và nhập XLSX/CSV trên cùng nghiệp vụ tồn đầu.

Tên hiển thị thống nhất: **Tồn kho đầu kỳ**; chứng từ là **Phiếu tồn kho đầu kỳ**. Không diễn giải thành thao tác phải làm lại đầu mỗi tháng/năm. Sau khi vận hành, dùng nhập kho hoặc điều chỉnh tồn theo nghiệp vụ tương ứng.

Đợt đầu giới hạn 5 MB và 200 dòng dữ liệu/tệp để khớp giới hạn chứng từ hiện tại. Chỉ nâng lên 500 sau khi kiểm thử tạo, sửa, duyệt và ghi sổ cả phiếu.

Không đưa đơn giá, thành tiền hoặc giá trị kế toán vào luồng này khi hệ thống chưa có nghiệp vụ định giá tương ứng. Không tự tạo hàng hóa, đơn vị tính, kho hoặc vị trí từ tệp tồn đầu.

## 3. Thiết kế giao diện

Giữ design system Kovia: nền và màu từ token hiện có, panel trắng, viền rõ, nội dung gọn 13–14px, nút chính xanh. Không thêm một bộ wizard hoặc parser riêng.

### 3.1 Danh sách tồn kho đầu kỳ

- Giữ route hiện tại. Header có **Tạo phiếu** và **Nhập từ tệp**, hiển thị theo capability.
- Ghi chú gọn: “Dùng để khai báo lượng hàng có sẵn khi bắt đầu sử dụng hệ thống.”
- Bộ lọc kho, trạng thái, ngày; tìm mã phiếu. Ngày lọc phải ghi rõ là ngày ghi nhận hay ngày tạo.
- Cột chính: mã phiếu, kho, ngày ghi nhận, số dòng, trạng thái, người lập, thao tác.
- Không cộng số lượng của các hàng có đơn vị khác nhau thành một tổng không có ý nghĩa.
- Dùng layout `OperationalListPanel` và `OperationalPagination`; thân bảng cuộn, footer luôn thấy được.

### 3.2 Chọn tệp

Route đề xuất: `/inventory/opening-stocks/import`.

Thứ tự trình bày:

1. **Kho nhập tồn đầu** bắt buộc, chỉ liệt kê kho được phép thao tác.
2. **Ngày ghi nhận tồn đầu** bắt buộc, một ngày cho toàn phiếu. Có chú thích ngắn “Ngày bắt đầu theo dõi lượng tồn này trên hệ thống”.
3. Vùng kéo/thả hoặc chọn tệp; ghi rõ XLSX/CSV, giới hạn dung lượng và số dòng.
4. Khối **Sử dụng tệp mẫu** ngay dưới vùng upload. Hai lựa chọn luôn nhìn thấy: **Mẫu cơ bản** và **Mẫu đầy đủ**, mỗi lựa chọn có mô tả một câu và nút tải.

Mẫu cơ bản phù hợp hàng thông thường. Mẫu đầy đủ có thêm thông tin lô và trạng thái hàng. Kho và ngày lấy từ form, không bắt người dùng lặp lại trên từng dòng Excel.

Đổi kho sau khi đã có preview phải xác nhận và kiểm tra lại. Không giữ kết quả hợp lệ của kho cũ. Dấu phân cách CSV dùng control chung. Tệp chỉ được lưu làm bằng chứng khi người dùng xác nhận tạo phiếu nháp; inspect/preview chỉ đọc.

### 3.3 Ghép cột

Dùng giao diện ghép cột chung: chọn trang tính, dòng tiêu đề, trường hệ thống, cột trong tệp, ví dụ và trạng thái ghép.

- Tất cả nhãn và lỗi bằng tiếng Việt có dấu.
- Tự ghép bằng alias tiêu đề; người dùng sửa lựa chọn trước khi kiểm tra.
- Trường bắt buộc: mã hàng, mã vị trí/kệ, số lượng.
- Đơn vị tính có thể trống để lấy đơn vị cơ sở; nếu có phải khớp đơn vị cơ sở.
- Số lô là bắt buộc có điều kiện khi sản phẩm theo dõi lô, được kiểm ở bước 3.
- Tên trang tính lấy nguyên từ tệp, có thể thêm nhãn giải thích cho alias mẫu đã biết; không tự đổi tên trang tính tùy ý.

### 3.4 Kiểm tra

Đầu trang có kho, ngày ghi nhận và ba thống kê: **Tổng số dòng**, **Hợp lệ**, **Cần sửa**. Thông báo riêng nếu có lô mới chờ tạo khi duyệt.

Toolbar của **Bản xem trước** gồm tên tệp, số dòng đã chọn, tìm mã/tên hàng/vị trí, lọc kết quả, chọn dòng hợp lệ, bỏ chọn và xuất báo cáo lỗi.

Cột luôn thấy: chọn dòng, dòng nguồn, kết quả, mã hàng, tên hàng, vị trí/kệ, số lượng, đơn vị tính. Cột kết quả đặt gần nhận diện hàng và có chiều rộng ổn định. Chuỗi dài xuống dòng, không đẩy cột khỏi màn hình.

**Thông tin bổ sung** thu gọn mặc định: số lô, ngày sản xuất, hạn sử dụng, tình trạng và điều kiện sử dụng. Lỗi của cột đang ẩn vẫn hiện trong kết quả và số lỗi trên nút mở rộng.

- Preview chỉ đọc. Sửa tệp rồi tải lại; không biến bảng thành form chỉnh dữ liệu hàng loạt.
- Dòng lỗi không được chọn. Có thể tạo phiếu từ các dòng hợp lệ đã chọn.
- Lỗi chỉ rõ dòng và cách sửa, ví dụ “Dòng 8: không tìm thấy mã hàng SP001” hoặc “Dòng 12: sản phẩm này cần số lô”.
- Khi kiểm tra lại, giữ dữ liệu hiện tại và hiển thị trạng thái đang kiểm tra. Nếu thay đổi đầu vào, khóa tạo phiếu cho đến khi có preview mới hợp lệ.
- Mobile dùng thẻ có mã/tên hàng, vị trí, số lượng và kết quả; mở chi tiết để xem trường bổ sung. Không buộc vuốt ngang để tìm lỗi.

Nút chính: **Tạo phiếu nháp (N dòng)**. Dialog xác nhận nêu kho, ngày, số dòng và số lô mới chờ tạo; nhắc “Tồn kho chỉ cập nhật sau khi phiếu được duyệt”.

### 3.5 Kết quả và duyệt

- Thông báo **Đã tạo phiếu nháp [mã phiếu]** cùng số dòng đã đưa vào và số dòng bỏ qua.
- Nút **Mở phiếu** và **Về danh sách**. Không tạo thêm nút import trực tiếp vào tồn.
- Trên phiếu, giữ quy trình gửi duyệt và duyệt hiện có. Thông tin lô chờ tạo phải được người duyệt nhìn thấy.
- Phiếu đã ghi sổ hiển thị thời điểm duyệt và ngày ghi nhận riêng. Không sửa/xóa lịch sử đã ghi sổ.

Các trạng thái xử lý dùng nhãn chung, khóa double-click/drop lặp tại handler, có `aria-busy` và live region. Lỗi mạng không tự retry lệnh tạo/duyệt. Trạng thái lưu chưa xác định phải tra cứu kết quả bằng mã thao tác trước khi thử lại.

## 4. Dữ liệu và quy tắc nghiệp vụ đề xuất

### 4.1 Tệp mẫu

Mẫu cơ bản: **Mã hàng**, **Mã vị trí/kệ**, **Số lượng**, **Đơn vị tính**.

Mẫu đầy đủ thêm: **Số lô**, **Ngày sản xuất**, **Hạn sử dụng**, **Tình trạng hàng**, **Điều kiện sử dụng**.

- Để trống tình trạng/điều kiện: hàng tốt, được sử dụng. UI dùng nhãn tiếng Việt, API ánh xạ enum hiện có.
- Hàng hỏng phải có điều kiện giữ do hư hỏng. Không tự biến giá trị mâu thuẫn thành hợp lệ.
- Mã hàng tra cứu chính xác SKU trong tenant, không ghép gần đúng theo tên.
- Vị trí phải đang hoạt động và thuộc kho đã chọn. Nếu nhập mã kệ quản lý cấp kệ, tra cứu vị trí hệ thống của kệ; giao diện hiển thị tên kệ, không lộ mã kỹ thuật `__SYSTEM_DEFAULT__`.
- Nếu mã vị trí và mã kệ dẫn tới nhiều đích khác nhau, báo mơ hồ và yêu cầu chọn mã rõ ràng; không ưu tiên ngầm.
- Đơn vị chỉ hỗ trợ đơn vị cơ sở trong đợt đầu, đúng hợp đồng tồn đầu hiện tại. Không suy đoán hệ số quy đổi.
- Số lượng dương và đúng số chữ số thập phân của đơn vị. Số 0 không tạo dòng; báo rõ để người dùng bỏ dòng khỏi tệp.
- Ngày chấp nhận ô ngày Excel hoặc định dạng được công bố trong mẫu; từ chối ngày văn bản mơ hồ.
- Trùng phạm vi hàng/vị trí/lô/tình trạng/điều kiện trong tệp: báo lỗi các dòng liên quan. Chưa thêm tùy chọn cộng gộp tự động trong đợt đầu.
- Kiểm tra phạm vi đã khởi tạo hoặc đã phát sinh nghiệp vụ cả ở preview lẫn khi duyệt. Lùi ngày không làm bỏ qua điều kiện này.

### 4.2 Lô khi khởi tạo hệ thống

Luồng hiện tại chỉ chọn lô có sẵn, chưa đủ thuận tiện cho khởi tạo hàng theo lô. Đề xuất:

- Lô đã có: khớp theo sản phẩm và quy tắc số lô hiện hành; ngày trong tệp phải tương thích, không sửa lô đang có.
- Lô chưa có: preview ghi **Lô mới, tạo khi duyệt**. Lưu số lô/ngày dự kiến trên dòng nháp, chưa tạo ProductLot trong inspect/preview hoặc khi lập nháp.
- Khi duyệt, tạo/giải quyết lô, kiểm điều kiện và ghi tồn trong cùng giao dịch. Nếu lô vừa được người khác tạo, kiểm lại ngày và tham chiếu; không tạo lô trùng hoặc âm thầm đổi thông tin.
- Nếu nhiều dòng cùng lô nhưng ngày khác nhau, báo lỗi cả nhóm dòng liên quan.
- Sản phẩm không theo lô không được mang thông tin lô.
- Hết hạn sử dụng: không tự coi là hàng khả dụng. Cần đối chiếu quy tắc lô hiện hành trước khi chốt lỗi chặn hay điều kiện giữ tương ứng.

Việc bổ sung thông tin lô dự kiến cần thiết kế model/migration. Không giả định chỉ mở rộng FE là đủ.

### 4.3 Ngày ghi nhận

Đề xuất có ngày ghi nhận riêng, không cho ngày tương lai. Người dùng chọn ngày theo múi giờ nghiệp vụ của hệ thống; BE chuyển sang thời điểm nghiệp vụ theo quy ước thống nhất khi ghi sổ.

Ngày ghi nhận phải được lưu trên chứng từ, đi vào `OccurredAt` của chuyển động tồn đầu; `CreatedAt`/`ApprovedAt` tiếp tục ghi thời điểm thao tác thực tế. Chứng từ cũ đã ghi sổ phải giữ nguyên lịch sử chuyển động.

Trước triển khai cần rà báo cáo theo thời điểm và quy tắc cutover để chốt cách xử lý ngày quá khứ. Nếu chưa bảo đảm báo cáo lịch sử, không đưa control ngày vào UI rồi chỉ lưu hình thức.

## 5. Thiết kế BE

Endpoint đề xuất dưới `/api/inventory/opening-stocks/import`:

| Endpoint                            | Chức năng                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `GET /template?variant=basic\|full` | Mẫu XLSX và hướng dẫn tiếng Việt                                                          |
| `POST /inspect`                     | Đọc tệp, trang tính, tiêu đề, gợi ý ghép cột; không ghi dữ liệu                           |
| `POST /preview`                     | Tra cứu, kiểm dữ liệu theo kho/ngày; trả từng dòng, lỗi và fingerprint; không ghi dữ liệu |
| `POST /commit`                      | Kiểm lại tệp và dòng đã chọn; lưu bằng chứng và tạo một phiếu nháp                        |

Commit nhận tệp gốc, tùy chọn mapping, kho/ngày, khóa dòng nguồn đã chọn, fingerprint và commandId. BE đọc và kiểm lại; không nhận preview từ FE làm dữ liệu tin cậy. CommandId giữ nguyên khi đối chiếu kết quả sau lỗi mạng.

Tái sử dụng reader/mapping dùng chung. Tách validator của import khỏi transport, dùng lại quy tắc tạo/sửa/duyệt tồn đầu. Không gọi tuần tự API tạo từng dòng hoặc tự gọi API ghi sổ từ FE.

Phiếu nháp, dòng, liên kết bằng chứng và audit phải lưu nguyên tử trong DB. Lưu object/file không nằm trong DB transaction: cần kiểm cơ chế storage hiện hành và cơ chế xử lý tệp chưa gắn an toàn; không thêm job xóa hàng loạt vào phạm vi thiết kế này. Retry phải đối chiếu phiếu đã tạo trước khi upload lại.

Tiếp tục dùng kiểm quyền và quyền kho như luồng tồn đầu. Quyền tạo hiện dùng `inventory:reserve`, quyền duyệt dùng `stock-adjustments:approve`, tự duyệt cần quyền riêng. Cần ghi rõ sự kế thừa này; nếu đổi sang quyền tồn đầu chuyên biệt thì làm như thay đổi RBAC riêng, có tương thích và phê duyệt seed.

Khi duyệt, kiểm lại quyền, trạng thái, phiên bản, sản phẩm, đơn vị, vị trí/kệ, lô, phạm vi và điều kiện ghi sổ. Kiểm tra chống trùng/đã phát sinh nghiệp vụ cần được bảo vệ trong giao dịch trước tranh chấp với luồng nhập/xuất/điều chỉnh; không chỉ dựa vào kiểm trước giao dịch như code hiện tại.

## 6. Thiết kế FE và tái sử dụng

Tạo page/hook/service/schema trong feature inventory theo cấu trúc hiện có. Page sở hữu API state, component nhận dữ liệu/callback.

Tái sử dụng trực tiếp `BulkImportWorkspace`, header, file picker, mapping, feedback, result, navigation guard, panel và pagination. Dùng phiên import riêng như WarehouseLocationImport vì có kho/ngày, tệp bằng chứng, fingerprint và một chứng từ đầu ra.

Không đưa nghiệp vụ tồn đầu vào component import chung. Chỉ mở rộng component chung khi thật sự cần, ví dụ action tải hai mẫu hoặc placeholder tìm kiếm phù hợp. Chạy GitNexus impact trước khi sửa symbol dùng chung, kiểm hồi quy các trang import đang dùng.

Skeleton chỉ dùng lúc chờ quyền/dữ liệu ban đầu. Tải một phần không khiến cả form remount. Thao tác rời phiên có thay đổi dùng cơ chế xác nhận chung. Focus, bàn phím, nội dung dài và reduced motion theo design system hiện có.

## 7. Thứ tự thực hiện và bằng chứng hoàn thành

1. Chốt hợp đồng ngày ghi nhận/lô mới sau khi đối chiếu báo cáo và quy tắc lô. Thiết kế migration cho ngày và metadata lô nháp nếu cần; báo tên và tác động trước khi xin áp DB.
2. BE inspect/preview/commit, validation, bằng chứng, idempotency; đồng thời bổ sung kiểm tra duyệt theo dữ liệu mới.
3. FE trang import bốn bước và điểm vào từ danh sách; cập nhật form nhập tay để thể hiện cùng ngày và quy tắc lô.
4. QA xuyên suốt: tạo nháp, mở/sửa, gửi duyệt, trả lại, duyệt và kiểm sổ tồn.

Ca bắt buộc: XLSX/CSV đúng/sai/rỗng/vượt giới hạn, tên dài, Unicode, đơn vị sai, khác tenant, vị trí ngừng hoạt động, quản lý cấp kệ, trùng dòng, phạm vi đã khởi tạo, đã có giao dịch, lô mới/cũ/mâu thuẫn ngày, số lẻ, hàng hỏng, thiếu quyền và quyền đổi sau preview.

Kiểm thử tranh chấp: hai phiếu cùng phạm vi; nghiệp vụ kho phát sinh giữa preview và duyệt; hai người duyệt; tạo lô đồng thời; lỗi giữa ghi sổ phải rollback toàn phiếu. Test race dùng DB cô lập, không reset hoặc dọn db71143.

FE kiểm double-click/drop, lỗi mạng và kết quả chưa xác định; 360/768/1280px, zoom 200%, bàn phím, footer, nội dung dài và reduced motion. Kiểm hồi quy import danh mục/NCC/khách hàng/vị trí nếu sửa thành phần chung.

Chỉ đóng khi có bằng chứng tạo nháp không tăng tồn, duyệt tăng đúng một lần, mọi dòng được lưu/rollback cùng nhau và chứng từ cũ vẫn hoạt động. Cập nhật spec triển khai và `docs/AI_REVIEW.md` bằng kết quả thật.

## 8. Những gì chưa được xác minh

- Đã đọc cấu trúc tiêu đề, hướng dẫn và các dòng mẫu của hai tệp `.xls` người dùng tải ở chế độ chỉ đọc; kết quả đối chiếu nằm trong spec. Chưa chứng nhận đã thao tác hết mọi nhánh AMIS. Thiết kế trường dựa vào hợp đồng Kovia, không khẳng định sao chép nguyên mẫu AMIS.
- Chưa chạy test/build/QA cho đề xuất này. Không có source code nghiệp vụ nào được sửa trong lượt thiết kế.
- Cần rà quy tắc báo cáo hồi tố, xử lý lô hết hạn, locking cutover và cơ chế storage trước khi chuyển tài liệu này thành spec triển khai đã chốt.
- Không tự commit/push, chạy migration, seed hay ghi dữ liệu QA trong lượt này.
