# Spec tồn kho đầu kỳ và nhập từ tệp

Ngày: 2026-10-15. Trạng thái: **DRAFT_FOR_REVIEW**, dùng để review và lập kế hoạch triển khai. Chưa có code triển khai hoặc migration được áp từ spec này.

Tài liệu này cụ thể hóa [bản thiết kế](2026-10-15-opening-stock-import-design.md). Nếu hai tài liệu khác nhau, spec này là đề xuất mới hơn. Các lựa chọn dưới đây là khuyến nghị thiết kế, không phải ghi nhận người dùng đã phê duyệt thay đổi DB.

## 1. Mục tiêu và phạm vi

Cho phép khai báo lượng hàng đang có khi bắt đầu sử dụng Kovia theo kho, vị trí/kệ, sản phẩm, lô và trạng thái hàng bằng hai cách:

1. **Tạo phiếu**: nhập tay trên luồng tồn đầu hiện có.
2. **Nhập từ tệp**: dùng khung import bốn bước, tạo một phiếu nháp từ các dòng hợp lệ đã chọn.

Cả hai cách đi chung quy trình lập phiếu → gửi duyệt → duyệt ghi sổ. Tạo nháp, inspect và preview không làm tăng tồn. Đây là khởi tạo khi đưa hệ thống vào sử dụng, không phải thủ tục nhập lại tồn mỗi tháng/năm.

Tên module: **Tồn kho đầu kỳ**. Tên chứng từ: **Phiếu tồn kho đầu kỳ**. Tên hành động: **Nhập từ tệp**, **Tạo phiếu nháp**, **Gửi duyệt**, **Duyệt và ghi nhận tồn**.

Ngoài phạm vi: giá trị kế toán/đơn giá, hàng giữ chỗ ban đầu, mở lại tồn đầu đã ghi sổ, tự tạo hàng hóa/ĐVT/nhóm/kho/vị trí, nhiều kho trong một tệp, nhiều phiếu trong một lần import, nhập qua sơ đồ, AI gợi ý số lượng tồn, sửa các luồng điều chuyển/nhập kho ngoài phụ thuộc chung thực sự cần thiết.

Giới hạn phiên bản đầu: XLSX/CSV, 5 MB, 200 dòng dữ liệu/tệp và 200 dòng/phiếu. Không hỗ trợ `.xls`, `.xlsm`, workbook mã hóa hoặc đổi đuôi tệp để vượt kiểm tra. Giữ bộ giới hạn an toàn của reader hiện có.

## 2. Những gì đã xác minh

### 2.1 Code Kovia

| Nội dung                  | Nguồn hiện có                                                                                    | Ý nghĩa khi làm                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Danh sách và form tồn đầu | FE `OpeningStocksPage`, `OpeningStockDirectory`                                                  | Mở rộng module, không làm một module tồn đầu thứ hai                      |
| Lập/sửa/gửi/duyệt phiếu   | BE `Create/Update/Submit/ApproveOpeningStock`                                                    | Dùng chung chính sách và sổ kho                                           |
| Chống ghi trùng           | `CreateCommandId`, `ApprovalCommandId`, `RowVersion`, `OpeningStockPostedScope`                  | Giữ idempotency, kiểm thêm race và phạm vi không có lô                    |
| Ghi tồn                   | `IStockLedger`, `StockLedgerService`                                                             | Không ghi thẳng InventoryStock hoặc sức chứa                              |
| Đơn vị                    | Create/Update tồn đầu chỉ nhận đơn vị cơ sở, hệ số 1                                             | Import cùng giới hạn                                                      |
| Độ chính xác              | OpeningStockLine, StockMovement, InventoryStock là `decimal(18,2)`                               | Không chấp nhận số lượng cần hơn 2 số lẻ                                  |
| Lô                        | Tồn đầu hiện chỉ có `LotId`; ProductLot có số lô, ngày SX/HSD                                    | Lô dự kiến cần trường lưu trên nháp                                       |
| Ngày                      | Approve đang dùng thời điểm duyệt cho `OccurredAt`                                               | Cần ngày ghi nhận và tương thích chứng từ cũ                              |
| Báo cáo                   | Nhập–xuất–tồn/thẻ kho dùng `OccurredAt`; StockHistoryCalculator dùng `CreatedAt`/ngày UTC        | Phải xử lý sự khác nhau khi cho nhập ngày quá khứ                         |
| Sức chứa                  | StockLedger dùng StorageCapacityPolicy, cộng dồn biến động trong request                         | Preview phải tính cả tập được chọn; duyệt kiểm lại                        |
| Khóa sức chứa             | EvaluateProjectedAsync hiện lấy khóa độc quyền theo tenant khi quản lý sức chứa                  | Preview phải dùng đường tính chỉ đọc, không gọi nguyên đường lấy khóa ghi |
| Sửa dòng phiếu            | UpdateOpeningStock hiện xóa dòng cũ rồi tạo lại, DTO dòng chưa có ID                             | Update v1 cần định danh dòng để giữ snapshot và nguồn Excel               |
| Tìm phiếu                 | GetOpeningStocksQuery hiện chưa có Search                                                        | Bổ sung tìm mã phía server trước phân trang                               |
| Bằng chứng                | InventoryEvidence + IDocumentStorageService                                                      | File ngoài DB; không gọi đó là giao dịch phân tán nguyên tử               |
| Import FE                 | BulkImportWorkspace/Header/FilePicker/Mapping/Feedback/Result và OperationalListPanel/Pagination | Tái sử dụng phần trình bày chung                                          |
| Import BE                 | SpreadsheetDocumentReader/TableReader/ImportMapping                                              | Không tạo parser riêng                                                    |

`OpeningStockPostedScopeConfiguration` hiện khai báo unique index chứa LotId nullable; model snapshot thực tế có filter `[LotId] IS NOT NULL`, chưa có unique index tương ứng cho LotId null. Gate A phải bổ sung bảo vệ phạm vi không lô và kiểm SQL/schema đích trước áp migration, không giả định DB deploy đã giống snapshot.

### 2.2 Mẫu tham khảo AMIS

Đã đọc chế độ chỉ đọc hai tệp người dùng cung cấp:

- `C:\Users\huyba\Downloads\Mau_ton_kho_vat_tu_hang_hoa_(NTXT)_(mau_co_ban).xls`.
- `C:\Users\huyba\Downloads\Mau_ton_kho_vat_tu_hang_hoa_(NTXT)_(mau_day_du).xls`.

Mẫu cơ bản có mã kho, vị trí, ngày nhập kho, số phiếu, mã hàng, ĐVT, số lượng, trạng thái chất lượng. Mẫu đầy đủ thêm giá, giá trị, số lô/HSD và quy cách. Hai mẫu có hướng dẫn về cộng gộp dòng trùng.

Kovia học cách đặt mẫu/hướng dẫn dễ thấy. Trường dữ liệu tuân theo nghiệp vụ của Kovia: kho/ngày ở form, số phiếu tự cấp, không thêm giá hoặc quy cách chưa được hỗ trợ. Phiên bản đầu báo lỗi dòng trùng, chưa có chế độ tự cộng gộp. Việc đọc mẫu không chứng nhận đã kiểm hết các nhánh ứng dụng AMIS.

## 3. Các quyết định thiết kế

| Chủ đề                  | Quyết định đề xuất                                                              |
| ----------------------- | ------------------------------------------------------------------------------- |
| Đơn vị của một lần nhập | Một kho, một ngày ghi nhận, một phiếu nháp                                      |
| Lựa chọn dòng           | Cho chọn dòng hợp lệ; không lưu dở dang trong tập đã chọn                       |
| Preview                 | Chỉ đọc, không lưu tệp, không tạo ProductLot hoặc bằng chứng                    |
| Lô mới                  | Lưu khai báo trên nháp; chỉ tạo ProductLot khi duyệt cùng giao dịch ghi tồn     |
| Ngày                    | `effectiveDate` dạng ngày, theo ngày nghiệp vụ UTC+7; ghi tồn từ đầu ngày đó    |
| Nhập tay                | Có cùng ngày và cùng cách chọn lô có sẵn/khai báo lô mới                        |
| Dòng trùng              | Báo lỗi các dòng liên quan, không tự cộng hoặc lấy dòng đầu                     |
| Tồn đã vận hành         | Không cho tồn đầu vào phạm vi đã có chuyển động, kể cả hiện tồn bằng 0          |
| Chứng từ cũ             | Giữ lịch sử; ngày mới nullable, không viết lại movement cũ                      |
| Quyền                   | Kế thừa quyền tồn đầu hiện tại; không thêm quyền/seed trong tính năng này       |
| Retry                   | Không tự retry lệnh ghi; đối chiếu bằng commandId, thử lại có chủ ý với cùng mã |

“Phạm vi” trong spec là bộ `(tenantId, warehouseId, productId, slotId, lotId, qualityStatus, eligibilityStatus)` đúng mô hình hiện tại. Đây không phải khóa toàn kho: phạm vi chưa từng phát sinh vẫn có thể khởi tạo dù phạm vi khác của kho đã vận hành. UI phải kiểm từng dòng, không hiện một nút khóa/mở tồn đầu toàn kho giả định chưa có trong model.

## 4. Quy tắc nghiệp vụ và kiểm dữ liệu

### 4.1 Nhận diện và số lượng

- Mã tra cứu được trim, Unicode Form C, không bỏ dấu. Không ghép gần đúng theo tên. So sánh phải tương thích collation và unique constraint hiện hành; nếu collation coi hai mã là trùng thì báo xung đột, không tự thay mã.
- Mã hàng bắt buộc, phải là SKU đang hoạt động cùng tenant; tên hàng chỉ lấy từ hệ thống.
- Kho phải hoạt động, người thao tác có quyền quản lý kho. Kiểm cả quyền chức năng và quyền kho ở BE.
- Mã vị trí/kệ bắt buộc. Tìm trong kho đã chọn; slot, rack và zone đều phải hoạt động.
- Kệ quản lý cấp kệ ánh xạ tới slot hệ thống của chính kệ. Chỉ kệ có chế độ quản lý phù hợp mới được ánh xạ; không tự tạo slot.
- Mã vị trí lặp giữa kệ hoặc trùng với mã kệ dẫn tới nhiều đích: báo mơ hồ. Cho tùy chọn ghép thêm **Mã khu vực** và **Mã kệ** trong mẫu đầy đủ để phân biệt, theo đúng cây kho. Không chọn đích đầu tiên từ DB.
- ĐVT trống: lấy đơn vị cơ sở. Nếu có: khớp mã trước, tên chính xác sau; tên mơ hồ thì báo lỗi. Phải là ĐVT cơ sở đang hoạt động; hệ số luôn 1.
- Số lượng > 0, nằm trong `decimal(18,2)` và không vượt độ chính xác ĐVT. Giá trị `1.2300` có 2 số lẻ có nghĩa được nhận; `1.234` bị chặn, không làm tròn.
- Không đổi schema sổ kho lên 6 số lẻ trong tính năng này. ĐVT đặt precision > 2 vẫn có thể nhập giá trị biểu diễn chính xác tới 2 số lẻ; UI giải thích giới hạn sổ kho khi cần.
- Tệp chỉ chứa số 0 hoặc dòng trống không tạo được phiếu. Dòng trống toàn bộ bỏ qua, nhưng dòng thiếu dữ liệu vẫn giữ đúng số dòng nguồn để báo lỗi.
- Số CSV dạng `1234` hoặc `1234.50`; không suy đoán dấu phân tách hàng nghìn. Ô XLSX số đọc giá trị số thô, không đọc chuỗi hiển thị có định dạng.
- Từ chối công thức/ô lỗi trong vùng sheet nhập từ dòng tiêu đề trở xuống, đúng guard SpreadsheetImportMapping hiện có; không nới reader chung để bỏ qua công thức ở cột không ghép. Mã chỉ có số phải là text trong mẫu để giữ số 0 đầu; không dựng lại số 0 đã mất từ tệp người dùng.

### 4.2 Lô

- Sản phẩm theo lô bắt buộc có lô; sản phẩm không theo lô không nhận số lô/ngày SX/HSD.
- `lotId` hiện có và khai báo `newLot` là hai lựa chọn loại trừ nhau trong API nhập tay. Import xác định lựa chọn qua SKU và số lô; không nhận ID do cột tệp tự gửi.
- Số lô tối đa 100 ký tự, không rỗng. Lô được định danh theo tenant + sản phẩm + số lô.
- Lô có sẵn: lấy ID và ngày từ DB. Ngày bỏ trống trong tệp nghĩa là dùng ngày đã có; ngày có nhập phải bằng ngày DB. Không lấp ngày trống trên lô cũ hoặc sửa lô cũ qua import tồn đầu.
- Lô mới: SX/HSD tùy chọn như model hiện tại; không suy HSD từ tên hàng hoặc thời gian bảo quản.
- Sau resolve, áp cùng điều kiện ngày cho cả lô có sẵn và lô mới: nếu có cả hai ngày thì SX ≤ HSD; nếu có SX thì SX ≤ ngày ghi nhận. Kiểm ở preview, create/update v1 và trong transaction duyệt. Không bỏ qua vì người dùng để trống cột SX mà ngày được lấy từ DB. Ví dụ lô có sẵn sản xuất 15/10 không thể ghi nhận tồn từ 01/10; trả lỗi tại trường lô/ngày ghi nhận và không ghi tồn.
- Trong cùng tệp, cùng lô mới phải có cùng khai báo ngày, kể cả khác biệt trống/có ngày. Dòng mâu thuẫn đều có lỗi; người dùng sửa tệp.
- Preview hiển thị **Lô đã có** hoặc **Tạo lô khi duyệt**. Lô mới chưa tồn tại trong danh sách ProductLot lúc lưu nháp.
- Khi duyệt: tra cứu lại; nếu lô vừa được tạo và ngày tương thích với khai báo nháp, dùng lô đó. Nếu khác ngày/trạng thái thì trả xung đột toàn phiếu, giữ phiếu chờ duyệt. Không tự sửa lô hoặc ghi một phần.
- Hàng lô hết hạn/khóa vẫn có thể cần ghi nhận thực tế, nhưng không được nhập vào `Available`. Người lập phải chọn điều kiện giữ phù hợp. Lô khóa không được kích hoạt lại; lô mới đã hết hạn mang trạng thái phù hợp theo quy tắc ProductLot hiện hành. Việc xác định còn dùng được phải dùng cùng quy tắc BE, không dùng giờ trình duyệt.
- Nếu lô chuyển sang hết hạn giữa preview và duyệt khiến dòng `Available` không còn hợp lệ, yêu cầu trả lại/sửa phiếu, không tự đổi điều kiện hàng.

### 4.3 Chất lượng và điều kiện sử dụng

Giữ hai chiều riêng của model:

| Trường            | Nhãn UI/Excel                                       | Giá trị                                           |
| ----------------- | --------------------------------------------------- | ------------------------------------------------- |
| Tình trạng hàng   | Hàng tốt; Hàng hỏng                                 | Good; Damaged                                     |
| Điều kiện sử dụng | Được sử dụng; Chờ kiểm tra; Giữ do hư hỏng; Cách ly | Available; InspectionHold; DamageHold; Quarantine |

Mặc định nếu cả hai trống: Good + Available. Nếu chỉ có Damaged và điều kiện trống, preview điền DamageHold và hiển thị giá trị đã áp dụng. Nếu người dùng nhập Damaged + Available thì báo lỗi, không sửa ngầm. Các cặp khác tuân theo quy tắc tồn hiện hành; không tạo trạng thái mới.

Tình trạng và điều kiện đều tham gia phát hiện trùng; hai dòng cùng hàng/vị trí/lô nhưng khác trạng thái hợp lệ có thể cùng tồn tại. Sức chứa tính tổng mọi trạng thái thực tế.

### 4.4 Ngày ghi nhận và lịch sử

- `effectiveDate`: `yyyy-MM-dd`, mặc định hôm nay theo ngày nghiệp vụ UTC+7; không cho ngày tương lai. Một ngày cho cả phiếu, khóa sau khi gửi duyệt trừ khi rút hoặc bị trả lại.
- `effectiveAt = đầu ngày effectiveDate tại +07:00`, chuẩn hóa sang UTC khi cần lưu. Ví dụ `2026-10-15` tương ứng `2026-10-14T17:00:00Z`.
- Với phiếu mới có effectiveDate: movement Opening dùng effectiveAt; CreatedAt và ApprovedAt là thời điểm thao tác thực. Không tạo lịch sử tồn khi phiếu chưa duyệt.
- Ngày quá khứ chỉ được nhận nếu phạm vi chưa có nghiệp vụ tại thời điểm duyệt. Không dùng backdate để vượt điều kiện cutover. Không viết lại các movement đã có.
- Legacy có effectiveDate null: duyệt vẫn dùng thời điểm duyệt như cũ. Response có ngày hiển thị suy ra và cờ `isLegacyDate`, không tự backfill ngày rồi sửa ý nghĩa lịch sử.
- Thống nhất StockHistoryCalculator dùng OccurredAt để tính baseline, lọc và phân ngày nghiệp vụ UTC+7. Áp dụng nhất quán cho endpoint người dùng và endpoint nội bộ forecasting cùng dùng calculator. Giữ shape response, ghi rõ thay đổi ý nghĩa ngày trong release note và kiểm integration consumer.
- Nhập–xuất–tồn và thẻ kho tiếp tục dùng OccurredAt. Kiểm ngày ngay trước/ngay trong/ngay sau ngày ghi nhận; snapshot hiện tại chỉ tăng sau duyệt. Forecast không được coi Opening là nhu cầu xuất kho.
- Bổ sung `effectiveDateFrom/To` cho lọc danh sách theo ngày ghi nhận, không đổi ngầm ý nghĩa DateFrom/DateTo cũ đang lọc CreatedAt. Với legacy, lọc theo ngày movement/ApprovedAt khi đã ghi sổ, CreatedAt khi chưa ghi sổ; UI gắn chú thích ngày suy ra.

### 4.5 Trùng, cutover và sức chứa

- Dòng trùng cùng phạm vi trong tệp đều bị đánh lỗi. Khi lô chưa tạo, dùng định danh số lô chuẩn hóa thay LotId để phát hiện. Không chỉ group LotId null làm tất cả lô mới bị trùng nhau.
- Phiếu nháp khác không giữ chỗ phạm vi. Preview có thể cảnh báo đang có phiếu khác chờ duyệt; duyệt trước hợp lệ sẽ thắng.
- Đã có OpeningStockPostedScope hoặc bất kỳ StockMovement trong phạm vi: không khởi tạo tiếp, dù số lượng hiện tại là 0. Cho hướng dẫn dùng nhập kho/điều chỉnh.
- Kiểm thêm InventoryStock trong đúng phạm vi, độc lập với hai nguồn trên. Có QuantityOnHand > 0 hoặc ReservedQuantity > 0 thì không được tạo tồn đầu cộng thêm, kể cả chưa có movement. Trường hợp có tồn nhưng thiếu nhật ký báo lỗi dữ liệu cần đối chiếu, không gợi ý import thêm để sửa và không tự seed/ghi movement bù. Ví dụ snapshot đang có 100 mà thiếu nhật ký phải bị chặn khi khai tồn đầu 100, không thành 200.
- Dòng InventoryStock rỗng (QuantityOnHand = 0 và ReservedQuantity = 0), không có movement/posted scope, tự nó không chứng minh đã vận hành; có thể khởi tạo nếu mọi điều kiện khác hợp lệ. Kiểm snapshot này ở preview, kiểm lại khi commit nháp và trong cùng transaction/khóa phạm vi lúc duyệt để tránh race.
- Preview trả lỗi riêng từng dòng. Sau khi chọn tập dòng, cần kiểm lại tổng sức chứa và quy tắc trộn hàng cho đúng tập được chọn; không cộng dòng bị bỏ chọn.
- Không dùng kết quả sức chứa của từng dòng độc lập để kết luận cả tập hợp lệ. API preview nhận tùy chọn selectedRowKeys; mặc định chọn mọi dòng không có lỗi riêng. Lỗi tổng đánh trên các dòng xung đột, người dùng bỏ bớt rồi **Kiểm tra lại lựa chọn**.
- Mọi thay đổi selection làm stale kết quả kiểm tổng; khóa tạo phiếu cho tới khi đã kiểm đúng selection, trừ thao tác chỉ đổi trang/tìm kiếm/thu gọn.
- Duyệt luôn kiểm tổng sức chứa bằng policy và sổ kho hiện có. Thiếu quy đổi sức chứa là lỗi cấu hình sản phẩm/vị trí, không thông báo như lỗi phiên bản; người dùng được hướng dẫn chỉnh cấu hình rồi thử lại.
- Preview dùng phép đánh giá sức chứa chỉ đọc theo mục 7.3. Không gọi trực tiếp EvaluateProjectedAsync hiện có vì phương thức đó có thể lấy khóa độc quyền toàn tenant. Kết quả preview là snapshot để người dùng quyết định, không giữ chỗ hoặc khóa kho đến khi duyệt.

## 5. BE: dữ liệu và migration

### 5.1 Bổ sung model

| Entity             | Trường đề xuất                                         | Cách dùng                                                                      |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| OpeningStockRecord | EffectiveDate: DateOnly?                               | Null là chứng từ legacy; phiếu mới FE gửi ngày rõ ràng                         |
| OpeningStockRecord | ImportFileHash: string? (64)                           | SHA-256 tệp nguồn; null cho nhập tay/legacy                                    |
| OpeningStockRecord | ImportMappingJson: string? (giới hạn 16 KB)            | Snapshot schema, sheet, header, mapping, delimiter; không chứa tệp hoặc secret |
| OpeningStockLine   | LotNumberSnapshot: string? (100)                       | Số lô được người lập xác nhận                                                  |
| OpeningStockLine   | ManufacturedDateSnapshot/ExpiryDateSnapshot: DateOnly? | Ngày đã xác nhận, không thay theo chỉnh sửa danh mục sau đó                    |
| OpeningStockLine   | SourceSheetName: string?; SourceRowNumber: int?        | Truy vết dòng tệp; null cho nhập tay                                           |

Lô dự kiến được nhận diện bởi sản phẩm theo lô, LotId null và LotNumberSnapshot có dữ liệu. Khi duyệt resolve LotId, giữ snapshot. Hàng không theo lô có LotId và snapshot đều null. Không thêm bảng ProductLot tạm, bảng job import hoặc workflow trạng thái mới.

Đọc chứng từ cũ có snapshot null vẫn trả dữ liệu lô từ DB để hiển thị; không viết sửa lịch sử. Update v1 dùng ID dòng theo mục 6.2 để bảo toàn snapshot và nguồn; không tiếp tục xóa toàn bộ rồi tạo lại các dòng đang được giữ. Các field SourceSheetName/SourceRowNumber chỉ do BE gắn khi import, không nhận từ payload nhập tay.

Giữ enum trạng thái hiện có đúng tên Domain: Draft, PendingApproval, Returned, Rejected, Posted, Cancelled. Không tự đổi tên enum để đồng nhất nhãn.

### 5.2 Migration dự kiến

Tên dự kiến, EF tự sinh timestamp: **AddOpeningStockImportMetadata**.

- Thêm các cột nullable nêu trên, cấu hình độ dài/kiểu date và check constraint phù hợp.
- Bổ sung unique scope không lô, vì snapshot đã xác minh chỉ có index lọc LotId khác null. Dùng hai filtered unique index như pattern InventoryStock, giữ bảo vệ có lô; đối chiếu SQL/schema đích để không tạo index thừa.
- Trước tạo unique index mới, kiểm trùng bằng truy vấn chỉ đọc. Có dữ liệu trùng thì dừng phần migration và báo phạm vi/ảnh hưởng; không tự xóa hoặc gộp.
- Không đổi precision sổ kho, không sửa trạng thái hoặc movement lịch sử, không seed quyền.
- Tạo/review SQL và model drift ở bản sao kiểm thử; không sửa migration đã merge. Kiểm origin/dev và migration mới nhất trước khi sinh để tránh migration trùng từ phiên khác.

Spec cho phép lập kế hoạch/tạo migration khi được giao code, không cho phép áp lên db71143. Trước áp phải báo tên, SQL và ảnh hưởng rồi chờ lệnh cụ thể của người dùng.

## 6. BE: API và hợp đồng

### 6.1 Endpoint import

Controller riêng, inject ISender, route `/api/inventory/opening-stocks/import`. Response DTO đặt trong Contract/Models/Inventory; command/query/validator đặt theo CQRS trong Application/Features/Inventory.

| Method/path                         | Input                               | Kết quả                                                            |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| GET `/template?variant=basic\|full` | Variant                             | File XLSX có hướng dẫn, tiêu đề và tên sheet tiếng Việt            |
| POST `/inspect`                     | multipart file + csvDelimiter       | SpreadsheetImportInspectResponse, thêm giới hạn/capability nếu cần |
| POST `/preview`                     | multipart file + JSON options       | OpeningStockImportPreviewResponse, không ghi DB/storage            |
| POST `/commit`                      | multipart file + JSON commitOptions | ApiResponse<Guid>: ID phiếu nháp                                   |
| GET `/operations/{commandId}`       | commandId                           | Query đối chiếu phiếu đã tạo: Completed hoặc Unknown, không ghi    |

Thêm query GET `/api/inventory/opening-stocks/{id}` để mở/đọc một phiếu độc lập theo quyền kho; không tải cả danh sách chỉ để tìm phiếu mới. Dùng DTO OpeningStockResponse mở rộng cộng thêm thông tin ngày/snapshot/source. Route `/import` không bị route GUID bắt nhầm.

Mở rộng GET `/api/inventory/opening-stocks` bằng `search` tùy chọn (trim, tối đa 100 ký tự) để tìm một phần mã phiếu; kết hợp với kho, trạng thái, ngày tạo cũ và effectiveDateFrom/To mới. Kiểm tenant/quyền kho và áp toàn bộ filter trước Count/Skip/Take, sắp xếp CreatedAt giảm dần rồi Id giảm dần để phân trang ổn định. TotalCount là tổng đã lọc, không phải tổng của trang. FE không lọc tìm kiếm chỉ trên dữ liệu trang đang có.

Options preview:

```json
{
  "warehouseId": "uuid",
  "effectiveDate": "2026-10-15",
  "spreadsheet": {
    "sheetId": "sheet-id",
    "headerRowNumber": 8,
    "columnMapping": [
      { "field": "sku", "columnIndex": 0 },
      { "field": "locationCode", "columnIndex": 1 },
      { "field": "quantity", "columnIndex": 2 }
    ],
    "csvDelimiter": "auto",
    "schemaVersion": 1
  },
  "selectedRowKeys": null
}
```

ColumnIndex giữ convention reader dùng chung; ví dụ thể hiện chỉ số bắt đầu từ 0. `selectedRowKeys: null` là lần đầu tự chọn ứng viên không lỗi riêng; `[]` là bỏ chọn hết, không đồng nghĩa chọn tất cả.

Tên field mapping cố định: `sku`, `locationCode`, `quantity`, `unit`, `zoneCode`, `rackCode`, `lotNumber`, `manufacturedDate`, `expiryDate`, `qualityStatus`, `eligibilityStatus`. Trong đó ba field đầu bắt buộc; field còn lại tùy chọn theo quy tắc mục 4. Không dùng tên hiển thị tiếng Việt làm key JSON.

Mỗi row response có rowKey (sheetId + số dòng vật lý), rowNumber/sheetName, rawValues để tra lỗi, resolved IDs/codes/names, số lượng/ĐVT, snapshot lô, lotResolution, quality/eligibility, fieldErrors, warnings và validationFingerprint. Không lộ dữ liệu tenant/kho không được phép.

Preview cấp cao gồm schemaVersion, fileName/fileHash, warehouseId/effectiveDate, rows, counts, selectedRowKeys, selectedSetFingerprint, previewFingerprint, checkedAt, selectionErrors, ignoredSheets/Columns, capabilities.

CommitOptions gồm options preview đã chuẩn hóa, selectedRowKeys không rỗng, row validation fingerprints của dòng chọn, selectedSetFingerprint, previewFingerprint, `acceptedIgnoredData`, `acknowledgePendingLots`, `commandId` và `formVersion: 1`. Không nhận IDs/quantity từ FE để thay thế kết quả đọc lại tệp.

Fingerprint là SHA-256 nội dung chuẩn hóa: tệp gốc, tenant, user, kho/ngày, schema/mapping, delimiter; row fingerprint gồm các tham chiếu/trạng thái/ngày/ĐVT có ảnh hưởng; set fingerprint gồm tập lựa chọn và kết quả kiểm tổng. Không dùng hash runtime hoặc số thập phân theo culture. Đây là phát hiện stale, không thay kiểm quyền/validation và không phải mã đã giữ chỗ.

Commit luôn đọc lại tệp, resolve và kiểm lại. Chỉ cần đối chiếu dependency của dòng chọn; thay đổi không liên quan ở dòng bỏ chọn không tự chặn. Nếu dependency liên quan đổi, trả mã yêu cầu preview lại. Không tự đổi vị trí, lô hoặc ngày theo dữ liệu mới mà không đối chiếu.

Tra cứu danh mục/lô/vị trí/phạm vi bằng các truy vấn theo tập và dictionary cho tối đa 200 dòng; không tạo N truy vấn cho N dòng nếu cùng dữ liệu có thể tải một lần. Ghi thời gian inspect/preview/commit/approve trong QA bằng số đo thực, không đặt phần trăm tiến trình giả.

### 6.2 Nhập tay và tương thích

Mở rộng Create/UpdateOpeningStock bằng field tùy chọn `effectiveDate`, `formVersion`, `acknowledgePendingLots` và mỗi dòng có `newLot` (`lotNumber`, `manufacturedDate`, `expiryDate`) thay thế LotId. Có newLot thì phải xác nhận acknowledgePendingLots, kể cả nhập tay. Validator BE và Zod dùng tên/casing/giới hạn giống nhau.

Update v1 có DTO dòng riêng với `id` nullable, ngoài các field nghiệp vụ; Create không nhận ID dòng do client đặt. Quy tắc cập nhật:

- `id` có giá trị: bắt buộc là dòng thuộc chính phiếu/tenant đang sửa, không lặp trong request. Cập nhật dòng đó, giữ ID và nguồn sheet/dòng do BE lưu. Không cho mượn ID dòng của phiếu khác hoặc tự sửa nguồn.
- `id` null: thêm dòng nhập tay, BE cấp ID và để nguồn null, dù request còn gửi nguyên tệp bằng chứng cũ. Dòng cũ không còn trong tập cập nhật được bỏ khỏi phiếu nháp trong cùng transaction và được ghi audit.
- Giữ snapshot lô nếu người dùng không đổi lựa chọn lô; không tự thay snapshot theo danh mục đã bị chỉnh sau khi lập phiếu. Khi đổi lô/khai báo lô, BE resolve và validate lại, tạo snapshot mới theo lựa chọn đã xác nhận. Mâu thuẫn dữ liệu lô trả lỗi rõ, không ghi đè âm thầm.
- Nguồn Excel là nguồn gốc, không khẳng định giá trị hiện tại chưa từng sửa. Audit ghi phần thay đổi trước/sau và dòng thêm/bỏ; tệp gốc cùng mapping vẫn giữ để đối chiếu. Response chi tiết trả ID, snapshot và nguồn cho FE gửi lại đúng dòng khi sửa, kể cả sau khi phiếu bị trả lại.
- Không thay dòng hoặc sửa dữ liệu trên phiếu đã ghi sổ. Legacy request chỉ được dùng cách cập nhật cũ với phiếu thực sự legacy; phiếu mới bắt buộc đi đường cập nhật v1 nêu trên.

Response có `requiresV1Client` do BE suy ra từ dữ liệu đã lưu: có EffectiveDate, có ImportFileHash hoặc có dòng lô dự kiến (LotId null và LotNumberSnapshot có giá trị). Client không được tự đặt cờ này để chọn chế độ cho chứng từ.

- Request v1 phải có effectiveDate. Nhập tay mới và import đều tạo chứng từ có ngày rõ ràng.
- Request không khai formVersion hoặc formVersion 0 chỉ được dùng hợp đồng legacy; không được kèm effectiveDate/newLot hoặc các field chỉ có ở v1. Hybrid request bị từ chối, không âm thầm hạ về luồng cũ. FormVersion không phải quyền hạn.
- FE cũ không gửi các field mới vẫn tạo/sửa phiếu legacy theo hợp đồng cũ.
- Với requiresV1Client = true, cả cập nhật và duyệt đều yêu cầu formVersion 1. ApproveOpeningStockCommand thêm field formVersion tùy chọn, mặc định 0 cho client cũ. BE dựa vào chứng từ để yêu cầu phiên bản, không chỉ kiểm request tự khai gì.
- FE mới mở phần xác nhận duyệt có kho, ngày ghi nhận, số dòng, tình trạng hàng và các lô dự kiến/ngày lô. Gửi formVersion 1 cùng ExpectedVersion đúng phiên bản đã hiển thị; mọi sửa ngày/dòng/snapshot phải làm đổi RowVersion của phiếu. Phiên bản thay đổi thì đối chiếu lại trước duyệt. Không duyệt phiếu mới từ một nút cũ chưa trình bày đủ nội dung.
- Client cũ thiếu formVersion 1 khi duyệt phiếu mới nhận OPENING_STOCK_CLIENT_UPGRADE_REQUIRED trước tạo lô/ghi tồn. Client cũ vẫn duyệt chứng từ legacy như trước; quyền tự duyệt và xác nhận hiện tại giữ nguyên. Giao diện tải lại phải giữ liên kết tới đúng phiếu.
- FE cũ trên endpoint list chỉ bỏ qua field thêm; triển khai BE trước, FE sau khi migration đã được phép áp và được xác nhận sẵn sàng.
- Không đổi ý nghĩa lọc ngày cũ. FE mới sử dụng bộ lọc ngày ghi nhận được thêm riêng.

### 6.3 Quyền

- Xem danh sách/chi tiết/đối chiếu kết quả: InventoryPermissions.View và phạm vi kho.
- Tất cả endpoint import (template/inspect/preview/commit) yêu cầu đồng thời InventoryPermissions.View và InventoryPermissions.Reserve; khi có warehouseId còn cần Manage kho. Route/capability/nút FE mới dùng cùng tổ hợp. Inspect/template không được tạo trạng thái server.
- Tạo/sửa/gửi v1: View + Reserve + Manage kho, đồng thời kiểm người lập/người gửi như hiện có. Duyệt v1: View + StockAdjustmentPermissions.Approve + Manage kho; self-approve dùng chính sách hiện hành. Endpoint legacy giữ tổ hợp quyền cũ khi thao tác trên chứng từ legacy; không dùng legacy request để tác động chứng từ requiresV1Client.
- Việc thêm View vào luồng mới dùng permission đã có, không sinh seed/quyền mới. Người chỉ có Reserve mà thiếu View bị chặn trước upload/commit, không được tạo xong rồi mới phát hiện không có quyền xem kết quả.
- Tạo ProductLot là hệ quả của duyệt tồn đầu đã khai báo, trong cùng quyền duyệt; không cấp một API tạo lô không kiểm soát cho người import.
- Query operations giới hạn tenant + người tạo + quyền kho; không trả thông tin phiếu của người khác chỉ từ commandId. Unknown không cho biết command đang chạy hay chưa từng tồn tại.
- Operations chỉ cần View + quyền View kho, không cần giữ Reserve sau khi đã tạo. Nếu quyền ghi bị thu hồi, người còn quyền đọc vẫn đối chiếu được kết quả đã thành công. Nếu cả quyền đọc/quyền kho bị thu hồi, trả 403 và khóa thử ghi lại; không gợi ý đổi commandId để né tình trạng chưa rõ.

### 6.4 Mã lỗi và phản ứng FE

Mã theo cấu trúc error hiện có, message tiếng Việt. Row error là dữ liệu preview, không ném exception cho cả tệp nếu còn đọc được.

| Mã đề xuất                                    | HTTP | Phản ứng                                                        |
| --------------------------------------------- | ---- | --------------------------------------------------------------- |
| OPENING_STOCK_PREVIEW_CHANGED                 | 409  | Giữ selection còn tồn tại, yêu cầu kiểm tra lại                 |
| OPENING_STOCK_VERSION_CHANGED                 | 409  | Tải lại phiên bản, giữ phần nhập chưa lưu để đối chiếu          |
| OPENING_STOCK_SCOPE_ALREADY_USED              | 409  | Nêu dòng/phạm vi cần sửa, không chỉ yêu cầu tải lại             |
| OPENING_STOCK_EXISTING_BALANCE_WITHOUT_LEDGER | 409  | Chặn khai tồn đầu, hướng dẫn quản lý đối chiếu dữ liệu hiện hữu |
| OPENING_STOCK_LOT_CHANGED                     | 409  | Nêu lô mâu thuẫn, yêu cầu kiểm tra/trả lại phiếu                |
| OPENING_STOCK_CLIENT_UPGRADE_REQUIRED         | 409  | Yêu cầu tải giao diện mới trước khi sửa hoặc duyệt              |
| OPENING_STOCK_CAPACITY_CONFIGURATION_INVALID  | 400  | Hướng dẫn bổ sung quy đổi/cấu hình, giữ dữ liệu                 |
| OPENING_STOCK_CAPACITY_EXCEEDED               | 400  | Lỗi tập lựa chọn/dòng, sửa số lượng/vị trí                      |
| OPENING_STOCK_COMMAND_CONTENT_MISMATCH        | 409  | Không tái dùng commandId với nội dung khác                      |

403 xử lý thiếu quyền, 404 tài nguyên không thấy được, 400 sai định dạng/tệp/lựa chọn; dùng cơ chế AppException hiện có. Tránh FE nhận diện theo regex message hoặc gom mọi 409 thành lỗi phiên bản.

## 7. BE: giao dịch, idempotency và tệp bằng chứng

Quyết định cập nhật 2026-10-16: tạo tồn đầu thủ công không bắt buộc tài liệu đính kèm. FE chỉ upload khi người dùng chọn tệp; nếu không có thì gửi `evidenceIds: []`. BE vẫn kiểm tối đa 10 tệp, ID, quyền sở hữu, tenant/kho và tình trạng sử dụng nếu có tệp. Trên form ghi “Tài liệu đính kèm (không bắt buộc)” — “Biên bản kiểm đếm hoặc ảnh đối chiếu, nếu có.” Ngày ghi nhận, người lập, audit và quy trình gửi duyệt/duyệt không đổi. Quyết định này không bỏ việc lưu nguyên tệp nguồn của luồng import ở mục 7.1.

### 7.1 Commit import tạo nháp

1. Kiểm quyền và shape tệp/options/selection, tính hash request và đối chiếu commandId trước upload hoặc semantic validation phụ thuộc trạng thái DB. Replay thành công trả phiếu cũ sau kiểm quyền đọc, không thất bại chỉ vì danh mục thay đổi sau lần tạo trước. Nếu chưa có kết quả, tiếp tục đọc/resolve/kiểm toàn bộ dữ liệu.
2. Hash nghiệp vụ gồm fileHash, mapping, kho/ngày, tập dòng và các xác nhận. Dùng CreateCommandId/CreateContentHash của OpeningStockRecord để chống lặp; không đưa evidenceId ngẫu nhiên vào hash import.
3. Cùng commandId + cùng nội dung đã thành công: trả ID cũ. Cùng commandId + nội dung khác: từ chối. Request đồng thời phải dựa thêm unique constraint, không chỉ check trước insert.
4. Upload nguyên tệp làm bằng chứng qua IDocumentStorageService; chỉ làm ở commit, tên file đã làm sạch. Không tạo file sao trong repo hoặc thư mục QA mỗi request.
5. Trong DB transaction: kiểm lại quyền/trạng thái phụ thuộc, tạo InventoryEvidence, OpeningStockRecord Draft, lines/snapshot/source, liên kết bằng chứng và audit; lưu/commit cùng nhau. Không tạo ProductLot, InventoryStock hoặc StockMovement.
6. Commit thành công trả ID. Nếu kết quả DB chưa xác định, tra cứu bằng commandId bằng context mới; không xóa tệp có thể đã được gắn vào phiếu.

Storage và DB không nguyên tử chung. Nếu chắc chắn rollback, chỉ xóa đúng storageKey mới được request này tạo và không thuộc phiếu thành công; deletion dùng timeout riêng, không dùng token client đã hủy. Nếu không chứng minh được kết quả, giữ tệp và ghi structured log cho đối chiếu. Không thêm cleanup rộng hoặc tự xóa bằng chứng của phiếu đã hủy.

Upload lỗi trước DB: không tạo phiếu. Một lệnh thành công bị mất response: GET operations trả phiếu cũ. Unknown có thể là request chưa commit: cho thử lại có chủ ý với **cùng commandId và nội dung**, không đổi sang mã mới. Unique key bảo đảm không có hai phiếu từ cùng thao tác.

### 7.2 Duyệt và ghi tồn

Toàn bộ phải trong một transaction: quyền/phiên bản form và phiếu/trạng thái → khóa sức chứa khi policy yêu cầu → resolve và kiểm ngày/trạng thái lô, tạo lô cần thiết để có ID → khóa và kiểm phạm vi, nhật ký và snapshot tồn/giữ chỗ → kiểm điều kiện hàng/sức chứa → ghi posted scopes, movements, tồn/sức chứa qua StockLedger → trạng thái/audit → commit. Chế độ legacy không bỏ qua bảo vệ snapshot tồn; chỉ giữ hợp đồng/ngày lịch sử cũ. Lô vừa tạo vẫn thuộc cùng transaction và phải rollback nếu bất kỳ bước sau thất bại.

- Khởi tạo transaction trước các kiểm tra có ảnh hưởng cutover; kiểm ngoài transaction hiện có không đủ cho luồng mới.
- Dùng SQL Server Serializable cho kiểm dải phạm vi lịch sử, với index có prefix tenant/kho/sản phẩm/vị trí/lô như StockMovements hiện có; truy cập nhiều phạm vi theo thứ tự cố định để giảm deadlock.
- Tuân theo thứ tự khóa sức chứa hiện hành bằng AcquireStorageCapacityLockAsync trong transaction trước đọc/đánh giá vị trí, khi policy hiện tại yêu cầu. Không thêm khóa in-memory thay cho đồng bộ SQL Server.
- Mục tiêu: nếu nghiệp vụ cùng phạm vi commit trước, duyệt từ chối; nếu duyệt giữ kiểm dải trước, nghiệp vụ kia chờ đến sau khởi tạo rồi áp quy tắc tồn thông thường. Không yêu cầu sửa mọi handler nhập/xuất để chỉ khởi tạo tồn đầu mới có bảo vệ.
- RowVersion phiếu + unique command/scope + token tồn/vị trí tiếp tục là lớp bảo vệ riêng. Unique scope phải bao phủ cả LotId null.
- Kiểm và khóa đọc cả InventoryStock cho phạm vi đang xét, kể cả chưa có StockMovement, trước ghi tăng. Snapshot khác 0/đang giữ chỗ mà thiếu nhật ký phải trả lỗi riêng, không để StockLedger cộng tồn đầu vào snapshot đó. Lô dự kiến cần resolve ID trong transaction trước kiểm chính xác phạm vi; mọi insert lô vẫn rollback nếu bất kỳ kiểm tra nào thất bại.
- Sau khi tạo lô mới trong transaction, StockLedger phải nhìn thấy chính lô đó trong cùng DbContext. Nếu cần flush để có thể query, flush vẫn nằm trong transaction, không commit giữa lô và tồn.
- N dòng đều thành công hoặc đều rollback; không để lô mới, movement hoặc occupancy còn lại sau lỗi.
- Xung đột RowVersion, unique key hoặc deadlock không tự retry ghi sổ bằng FE. Map lỗi có kiểm soát, rollback và hướng dẫn thử lại theo commandId/phiên bản phù hợp. Không map mọi lỗi DB thành “đã nhập trùng”.
- SQL Server race tests phải xác nhận khóa có hiệu lực giữa hai handler thật và với nghiệp vụ thường; nếu giải pháp index/Serializable không đạt thì Gate A chưa đóng, phải điều chỉnh trong tầng Infrastructure trước khi phát hành.

### 7.3 Đánh giá sức chứa chỉ đọc cho preview

Đường preview tải snapshot vị trí, tồn, sản phẩm, ĐVT và quy đổi bằng truy vấn chỉ đọc, rồi dùng cùng công thức chuẩn hóa/đánh giá như policy ghi. Tách phần tính dùng chung tối thiểu trong policy hiện có, không thêm một bộ công thức độc lập hoặc một service CRUD mới.

- Không gọi AcquireStorageCapacityLockAsync, EvaluateProjectedAsync đang có nhánh lấy khóa, ConfigureAsync, Apply, StockLedger hoặc SaveChanges từ preview. Không tự mở transaction ghi hoặc sp_getapplock; không cập nhật occupancy/status.
- Cộng toàn bộ dòng được chọn theo vị trí/sản phẩm, đánh giá sức chứa và trộn hàng trên snapshot đó. Kết quả có checkedAt và không giữ chỗ; dữ liệu đổi đồng thời được phát hiện/kiểm lại ở commit và duyệt.
- Đường ghi tiếp tục lấy khóa và kiểm policy trong transaction như mục 7.2. Sửa chia sẻ công thức phải có hồi quy sức chứa của nhập kho/điều chuyển; không nới validation ở các luồng đó.
- Test preview xác nhận không có save/mutation/applock và không thay tracking state của entity. SQL Server QA chạy preview trong lúc một thao tác ghi khác đang giữ khóa sức chứa để chứng minh preview không tranh khóa ghi toàn tenant; không coi mọi khóa đọc SQL thông thường là side effect ghi.

## 8. FE và UI/UX

### 8.1 Cấu trúc và tái sử dụng

Route mới `/inventory/opening-stocks/import`; chi tiết mở bằng route `/inventory/opening-stocks/{id}` và query một phiếu. Danh sách hiện tại tiếp tục là điểm vào. Tái sử dụng phần hiển thị chi tiết/form cũ trong route mới, tránh hai bản logic chỉnh cùng một phiếu.

Page sở hữu React Query/useForm, component nhận props/callback. Schema → types → service → hook → component theo contract BE. Session key bao gồm tenant/user/kho để tránh giữ state khi đổi ngữ cảnh.

Tái sử dụng BulkImportWorkspace/Header/FilePicker/Mapping/Feedback/Result, navigation guard, OperationalListPanel và OperationalPagination. Cách ghép giống WarehouseLocationImport; không buộc nghiệp vụ tệp bằng chứng/fingerprint vào BulkImportPage chỉ có onImport(rows).

Component feature dự kiến: OpeningStockImportSetup, OpeningStockImportReview, OpeningStockImportResult; mở rộng dialog/form nhập tay hiện có. Chỉ tách thêm khi đủ lớn, không tạo “import engine” hoặc wrapper cho từng nút. API endpoint/query key/route permission khai báo tập trung; không copy permission string vào component.

### 8.2 Danh sách và chi tiết phiếu

- Header “Tồn kho đầu kỳ”, mô tả một dòng, nút Tạo phiếu và Nhập từ tệp.
- Toolbar: tìm mã phiếu, kho, trạng thái, ngày ghi nhận. Reset page khi đổi lọc.
- Tìm kiếm gửi search tới API danh sách, không lọc trang hiện tại ở client. Debounce theo pattern hệ thống, giữ filter khi đổi trang, bỏ qua response của bộ lọc cũ; tổng/phân trang lấy từ kết quả server đã lọc.
- Cột: mã phiếu, kho, ngày ghi nhận, số dòng, trạng thái, người lập, thao tác. Không cộng số lượng khác SKU/ĐVT vào một KPI.
- Chi tiết hiển thị bằng chứng, ngày ghi nhận/thời điểm tạo/thời điểm duyệt riêng, dòng hàng và lô dự kiến. Nhãn người dùng rõ nghĩa, trạng thái/API dùng giá trị thật.
- Phiếu requiresV1Client chỉ cho sửa/duyệt bằng form mới; dialog duyệt hiển thị ngày và chi tiết lô, gửi ExpectedVersion của nội dung đang thấy. Form sửa giữ ID dòng và nguồn trả từ BE; dòng thêm tay phân biệt rõ với dòng có nguồn Excel, không tự đặt nguồn cho dòng mới.
- Form nhập tay chọn sản phẩm/vị trí qua search phía server, không chỉ nạp 100 hàng/200 vị trí đầu. Có chọn trực tiếp kệ quản lý cấp kệ bằng resolver chung; địa điểm hiển thị đường dẫn khu/kệ/vị trí.
- Form cho chọn lô có sẵn hoặc khai báo mới; không tự ghi ProductLot khi bấm lưu nháp. Giữ quy trình gửi/duyệt/trả lại/rút/hủy hiện có.

### 8.3 Bước 1: Chọn tệp

Thứ tự trên xuống: kho bắt buộc + ngày ghi nhận → drop zone → “Sử dụng tệp mẫu”.

Hai mẫu hiển thị thành hai hàng/card thấp, có tên, mô tả và icon tải: **Mẫu cơ bản** (hàng không theo lô) và **Mẫu đầy đủ** (lô, ngày, trạng thái, phân biệt vị trí). Mẫu đầy đủ vẫn nhận hàng không theo lô nếu bỏ trống phần lô. Không giấu nút tải trong menu.

Mẫu có sheet dữ liệu tiêu đề rõ, các cột mã định dạng text và số/ngày đúng kiểu; hướng dẫn/ví dụ đặt ở sheet riêng. Không đặt các dòng hàng ví dụ vào vùng dữ liệu để người mới vô tình nhập chúng. Inspect ưu tiên sheet dữ liệu, vẫn cho người dùng chọn lại; sheet hướng dẫn bỏ qua được thể hiện đúng cơ chế xác nhận chung.

Ghi rõ “XLSX hoặc CSV, tối đa 5 MB và 200 dòng”. Không hướng dẫn đổi đuôi `.xls`; cần lưu thành XLSX hoặc CSV. Chọn kho/ngày trước khi đọc preview. Đổi kho/ngày khi có dữ liệu dùng dialog, giữ file nhưng đánh dấu cần kiểm tra lại và xóa selection không còn hợp lệ.

CSV delimiter ở bước 1, đổi delimiter đọc lại tệp. Tên sheet nguồn giữ nguyên; template Kovia dùng tiếng Việt có dấu. Ngày trên form dùng DatePickerField chung, kích thước đồng nhất input, popover theo chiều cao Radix thực tế.

### 8.4 Bước 2: Ghép cột

Dùng layout chung, không làm bảng mapping mới. Hiện sheet, dòng tiêu đề, tìm/lọc trường, cột file, ví dụ và trạng thái. Auto-map alias, không tự chuyển dữ liệu hoặc ghi DB. Cột chưa dùng và sheet bỏ qua phải được người dùng thấy/xác nhận theo pattern import chung.

Mẫu cơ bản: **Mã hàng (\*)**, **Mã vị trí/kệ (\*)**, **Số lượng (\*)**, **Đơn vị tính**.

Mẫu đầy đủ thêm **Mã khu vực**, **Mã kệ**, **Số lô**, **Ngày sản xuất**, **Hạn sử dụng**, **Tình trạng hàng**, **Điều kiện sử dụng**. Hướng dẫn giải thích cột phân biệt chỉ cần khi mã địa điểm mơ hồ.

Ngày trong Excel hỗ trợ date serial theo đúng date system 1900/1904 của workbook; reader hiện chưa công bố metadata này, phải bổ sung tương thích vào SpreadsheetDocument và test hồi quy. Không dùng một parser XLSX thứ hai. Từ chối serial 60 trong hệ 1900 vì không có ngày thật (serial 60 hệ 1904 vẫn là ngày hợp lệ), và số có phần giờ khi trường chỉ nhận ngày. CSV/text chỉ nhận `dd/MM/yyyy` hoặc `yyyy-MM-dd`; không nhận năm 2 số/chuỗi mơ hồ. Ô XLSX kiểu ISO date được nhận khi biểu diễn một ngày hợp lệ hoặc thời gian bằng 00:00:00, không dùng timezone của máy người nhập.

### 8.5 Bước 3: Kiểm tra

Trên cùng: kho/ngày dưới dạng tóm tắt và link quay lại. Ba box thấp **Tổng số dòng**, **Hợp lệ**, **Cần sửa** tính trên cả tệp. Trạng thái kiểm tập lựa chọn tách riêng, không tráo “hợp lệ” với “đã chọn”.

Toolbar cùng một hàng khi đủ rộng: **Bản xem trước**, tên tệp, “Đã chọn X dòng”, tìm mã/tên/vị trí, lọc, thông tin bổ sung, chọn tất cả dòng hợp lệ, bỏ chọn và xuất báo cáo. Mobile wrap có trật tự, không đẩy control ra ngoài viewport.

Bảng desktop: checkbox, dòng nguồn, kết quả, mã hàng, tên hàng, vị trí/kệ, số lượng, ĐVT. Mã/tên/vị trí xuống dòng trong cột có giới hạn; kết quả ở gần đầu bảng. Các giá trị dài không đẩy kết quả ra xa.

Thu gọn mặc định: số lô/ngày/tình trạng/điều kiện. Nút ghi số lỗi thuộc phần đang ẩn. Mọi lỗi vẫn hiện trong cột Kết quả. Row result dùng component feedback chung, không lặp cùng cảnh báo hàng chục lần trong dialog xác nhận.

Preview chỉ đọc. Dòng lỗi không được chọn. Header checkbox chọn trang hiện tại; nút có nhãn rõ “Chọn tất cả dòng hợp lệ trong tệp” tác động cả tệp. Đổi lọc/phân trang/thu gọn không làm mất selection.

“Dòng lỗi” ở đây là lỗi riêng như thiếu SKU/lô/vị trí. Lỗi tổng sức chứa của tập lựa chọn là selectionErrors: cho phép người dùng bỏ chọn dòng đang chọn để sửa tập, không khóa checkbox khiến họ không thoát được lỗi tổng.

Chọn/bỏ dòng làm đổi kiểm tổng: khóa CTA, hiện “Cần kiểm tra lại lựa chọn” và nút **Kiểm tra lại lựa chọn**. Giữ dữ liệu preview khi request đang chạy. Nếu tập quá sức chứa, giữ selection cho sửa, hiển thị selectionErrors và dấu lỗi trên dòng; không âm thầm bỏ bớt dòng.

Nếu có lô dự kiến của dòng chọn, hiện khối gọn “X lô sẽ được tạo khi duyệt phiếu” và checkbox **Tôi xác nhận khai báo các lô mới này trong phiếu tồn kho đầu kỳ**. Checkbox có hiệu lực thật lên CTA và BE kiểm lại. Bỏ chọn toàn bộ dòng dùng lô mới thì không yêu cầu xác nhận lô.

Xác nhận lô gắn với tập khai báo lô thực tế đã hiển thị. Đổi tệp, mapping hoặc lựa chọn làm tập lô/ngày lô thay đổi thì bỏ tick và yêu cầu xác nhận lại; chỉ đổi trang/lọc/thu gọn không làm mất tick.

CTA **Tạo phiếu nháp (N dòng)** chỉ bật khi có dòng chọn, không có lỗi tổng, preview đúng selection/options, đủ xác nhận, đủ quyền và không đang xử lý/kết quả chưa rõ. Dialog nêu kho/ngày/số dòng/số lô chờ tạo và câu “Tồn kho chỉ cập nhật sau khi phiếu được duyệt”.

Mobile dưới breakpoint dự án dùng thẻ cùng dữ liệu và selection, không render hai bộ form cùng có thể submit. Tên/mã, vị trí, số lượng, kết quả hiện ngay; trường bổ sung mở chi tiết. Vùng danh sách thẻ dùng operational-list-body như bảng.

### 8.6 Bước 4: Kết quả

Thông báo **Đã tạo phiếu nháp [mã]**; số dòng đã chọn/lưu và số dòng không đưa vào phiếu. Không ghi “Nhập tồn thành công” vì chưa ghi sổ. CTA **Mở phiếu** và **Về danh sách**.

Kết quả một thao tác chỉ có một phiếu. Có bảng nguồn để đối chiếu nếu cần; chuỗi dài wrap, không kéo cột kết quả. Xuất báo cáo dùng format an toàn có escape công thức CSV như pattern hệ thống. Không tự submit hoặc duyệt phiếu sau import.

### 8.7 Loading, layout và accessibility

- Dùng NextTopLoader hiện có cho điều hướng; không thêm page transition gây remount.
- Skeleton chỉ khi chờ quyền/kho/dữ liệu ban đầu. Kiểm lại giữ bảng hiện tại, đặt aria-busy và status live region riêng.
- Nhãn xử lý: “Đang tải và đọc tệp…”, “Đang kiểm tra dữ liệu…”, “Đang tạo phiếu nháp…”, “Đang tải mẫu…”. Guard đồng bộ tại handler ngăn double-click/drop.
- Dùng layout import chung và OperationalListPanel/Pagination. Chỉ thân bảng/thẻ cuộn; không đặt max-height tùy ý làm 10 dòng chỉ thấy 2 dòng; số dòng theo pagination, cuộn khi vượt không gian viewport thực tế. Footer cách mép dưới theo token chung, không chèn một spacer lớn.
- Scrollbar dùng style chung sát mép phải, không thêm thanh cuộn đồng bộ riêng. Summary giữ đủ viền hai đầu.
- Focus chuyển tới tiêu đề bước; lỗi form có liên kết tới trường, checkbox/nút có tên truy cập rõ. Live region không đọc lại toàn bộ bảng theo mỗi ký tự.
- Nút chính/touch target mobile tối thiểu 44px; input desktop vẫn theo kích thước design system. Zoom 200% không che CTA, dialog/popover giới hạn theo chỗ trống.
- Dialog/dropdown/sheet dùng animation primitive hiện có và reduced motion; mở rộng không animate chiều rộng cột.

## 9. Kế hoạch triển khai

### Gate A: BE, hợp đồng, dữ liệu và an toàn ghi sổ

**A1. Chốt nền và migration:** kiểm origin/dev, model snapshot, index nullable, cấu hình quyền/scope, storage; tạo migration duy nhất và SQL review. Chốt DTO, schemaVersion/formVersion và error codes. Chưa áp migration deploy.

**A2. Tồn đầu chung:** ngày/snapshot lô cho create/update/read/submit/approve, update theo ID để giữ nguồn, chặn client cũ sửa/duyệt phiếu mới, kiểm ngày lô cũ/mới, precision và cutover kể cả snapshot thiếu nhật ký. Tạo GET một phiếu, search danh sách trước phân trang, tổ hợp quyền View/Reserve/Approve và kiểm giao dịch.

**A3. Ngày báo cáo:** sửa calculator liên quan, kiểm UTC+7/OccurredAt, baseline và integration endpoint nội bộ. Ghi release note về thay đổi ngày lịch sử, không rewrite movement.

**A4. Import:** template/inspect/preview/commit/operations; resolver, validation tập lựa chọn, đường đánh giá sức chứa chỉ đọc không lấy applock, bằng chứng, fingerprint, idempotency và xử lý kết quả chưa rõ. Mở rộng metadata date system trong reader dùng chung có kiểm hồi quy.

Đóng Gate A khi build/test hợp lệ và có bằng chứng SQL Server cho các tranh chấp ở mục 10. Nếu chưa có DB cô lập, ghi rõ test chưa chạy và Gate A còn mở; không lấy SQLite/in-memory làm bằng chứng thay thế SQL Server.

### Gate B: FE và UI/UX

**B1. Danh sách/nhập tay/chi tiết:** nhãn, ngày, bộ lọc/search server, lô dự kiến, giữ ID/nguồn khi sửa, xác nhận duyệt v1, lookup server-side, route và capability theo đúng tổ hợp quyền.

**B2. Import bốn bước:** tái sử dụng khung, hai mẫu rõ, mapping, preview đọc, kiểm selection, xác nhận lô, create draft và result.

**B3. Trạng thái:** điều hướng, lỗi mã hóa, busy/double-click, operations reconciliation, quyền bị thu hồi, mobile/keyboard/reduced motion.

Chỉ nối API thật khi migration đã được phép áp và BE sẵn sàng. Trước đó dùng fixture/mock cho UI, không thêm fallback ngầm tạo phiếu legacy thiếu ngày.

### Gate C: QA tích hợp và bàn giao

QA cả nhập tay và import từ tạo nháp đến duyệt, báo cáo và sổ kho. Chạy các ca mục 10; ghi giờ, mã phiếu, môi trường, expected/actual, bằng chứng và giới hạn.

Cập nhật spec và docs/AI_REVIEW.md bằng kết quả thật, giữ lịch sử review. Phân biệt code hoàn thành, kiểm thử tự động, QA trình duyệt và SQL Server race đã chạy. Không đóng gate bằng câu “build xanh” khi nghiệp vụ chưa kiểm.

## 10. Ma trận kiểm thử và điều kiện chấp nhận

| Nhóm                   | Ca bắt buộc                                                                                                          | Kết quả mong đợi                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Tệp                    | XLSX, CSV, empty, chỉ header, hỏng ZIP/XML, giả đuôi, formula, 1900/1904, >5 MB, 200/201 dòng                        | Đọc đúng hoặc báo lỗi rõ; không ghi gì khi inspect/preview                                         |
| Mapping                | Sheet khác, header dòng 8, tên có dấu, alias, cột/sheet bỏ qua, delimiter đổi                                        | Giữ số dòng gốc, cần xác nhận bỏ qua, không stale preview                                          |
| Lookup                 | SKU sai/inactive, ĐVT sai/ambiguous, tenant khác, vị trí trùng mã, kệ cấp kệ, zone/rack inactive                     | Row error đúng; không lấy đích ngẫu nhiên hoặc lộ tenant khác                                      |
| Số lượng               | 0/âm, số lớn, 1.2300, 1.234, precision ĐVT 0/1/2/6, CSV locale mơ hồ                                                 | Không làm tròn âm thầm; chỉ nhận số biểu diễn chính xác                                            |
| Lô                     | Có sẵn, mới, thiếu bắt buộc, hàng không theo lô có dữ liệu lô, khác ngày, expired/blocked                            | Snapshot đúng; mới chỉ tạo khi duyệt, không tái kích hoạt lô                                       |
| Ngày sản xuất          | Lô cũ/mới có SX sau ngày ghi nhận; lô cũ để trống SX trong tệp; ngày lô đổi trước duyệt                              | Cùng điều kiện ngày cho mọi lô, không ghi tồn trước ngày sản xuất                                  |
| Sửa phiếu import       | Giữ/sửa/bỏ dòng theo ID, thêm tay, ID dòng khác phiếu/tenant, ID lặp, phiếu bị trả lại, snapshot lô đổi              | Giữ nguồn/snapshot đúng dòng, nguồn chỉ do BE gắn; audit thay đổi, thêm tay nguồn null             |
| Chất lượng             | Good/Available, Damaged thiếu điều kiện, Damaged/Available, Quarantine                                               | Default hiển thị rõ, mâu thuẫn báo lỗi, hàng giữ không khả dụng                                    |
| Selection              | Một phần, bỏ hết, đổi trang/lọc, đổi selection sau preview, dòng bỏ chọn có lô mới                                   | Chỉ lưu đúng dòng chọn; kiểm tổng đúng, xác nhận lô chỉ khi liên quan                              |
| Sức chứa               | 2 dòng riêng hợp lệ nhưng tổng vượt, mixed product, thiếu đổi ĐVT sức chứa, occupancy đổi                            | Preview/approve chặn đúng tập; lỗi cấu hình không giả thành stale version                          |
| Preview chỉ đọc        | Đánh giá 200 dòng, có ghi kho đồng thời/đang giữ capacity applock; theo dõi SaveChanges/tracking/mutation            | Không lấy khóa ghi tenant, không lưu hoặc đổi occupancy; dùng cùng công thức với đường ghi         |
| Tồn đầu                | Cùng phạm vi có/không lô, tồn đã về 0, khác trạng thái, nháp trùng nhau                                              | Đúng định danh, không khởi tạo lại phạm vi đã vận hành                                             |
| Snapshot thiếu nhật ký | Tồn/giữ chỗ có sẵn nhưng không có movement/posted scope; dòng snapshot rỗng; snapshot thay đổi trước duyệt           | Tồn khác 0 bị chặn riêng, không cộng đôi hoặc sửa DB bù; snapshot rỗng xử lý theo mục 4.5          |
| Ngày                   | Quá khứ, hôm nay, tương lai, quanh 00h +7, trước/trong/sau kỳ, legacy                                                | Lịch sử và nhập–xuất–tồn cùng nghĩa ngày; hiện tại tăng sau duyệt                                  |
| Quyền                  | Thiếu view/create/approve, khác kho, đổi tenant, thu hồi quyền sau preview, tự duyệt                                 | BE chặn đủ; hidden button không là lớp bảo vệ duy nhất                                             |
| Tổ hợp quyền           | Chỉ Reserve thiếu View; đủ View+Reserve; thu hồi Reserve sau tạo; thu hồi cả View/quyền kho                          | Chặn trước upload nếu thiếu quyền; còn View thì đối chiếu được kết quả, không sinh mã thao tác mới |
| Idempotency            | Double-click, cùng command đồng thời, khác nội dung cùng mã, mất response, operations Unknown                        | Một phiếu/command, không tự retry mã mới, không upload lặp khi đã biết thành công                  |
| Storage                | Upload fail, DB rollback, timeout DB, delete tệp bù fail                                                             | Không phiếu dở; không xóa nhầm bằng chứng đã commit; log key chính xác                             |
| Approve race           | Hai handler duyệt cùng phiếu; hai phiếu cùng scope có/null lô; nhập kho xen duyệt; tạo lô cùng lúc                   | Không double Opening, không lô/tồn/occupancy/audit dở; thắng/thua đúng giao dịch                   |
| Tương thích            | Legacy create/update/approve, v1 bằng FE cũ, list JSON cũ, bộ lọc cũ, lịch sử forecasting                            | Không mất metadata; lỗi nâng cấp rõ; không đổi ngầm filter cũ                                      |
| Duyệt v1               | FE cũ duyệt phiếu v1; FE mới duyệt legacy/v1; ngày/lô/dòng đổi sau mở xác nhận; hybrid payload                       | BE chặn trước mọi tạo lô/ghi tồn khi thiếu phiên bản; ExpectedVersion gắn đúng nội dung đã thấy    |
| Search danh sách       | Mã phiếu ở trang khác, search cùng kho/trạng thái/ngày, search rỗng/quá dài, nhiều phiếu cùng CreatedAt, khác tenant | Filter trước count/phân trang, tổng đúng và thứ tự ổn định; không chỉ tìm trong trang hiện tại     |
| UI                     | 360/768/1280px, zoom 200%, keyboard, reduced motion, chuỗi dài, scroll/footer                                        | Đọc được lỗi và CTA, không cột kết quả bị đẩy xa, không thanh cuộn lồng bất hợp lý                 |
| Hồi quy                | Import danh mục/NCC/KH/vị trí, ledger/capacity, reporting/forecasting                                                | Không đổi hành vi ngoài phụ thuộc đã mô tả                                                         |

Kiểm thử tự động dùng fixture cô lập. Race phải chạy SQL Server thật bằng hai handler và các DbContext/transaction độc lập; kiểm cả mất dữ liệu và dữ liệu thừa sau rollback, không chỉ check exception.

BE chạy Release build + test liên quan, sau đó suite theo quy tắc repo. FE chạy TypeScript, ESLint file liên quan, Vitest và production build tách output dev. Không cần build/test ở lượt viết spec.

Không tự tạo nhiều bản sao repo: dùng lại một thư mục QA còn hợp lệ hoặc cơ chế output cô lập hiện có, kiểm dung lượng trước. Cổng chạy theo phiên đang được người dùng chỉ định, không dừng tiến trình phiên khác. Không pnpm install, dotnet clean hoặc format toàn repo để chuẩn bị QA.

## 11. Điều kiện triển khai và an toàn môi trường

- Đọc AGENTS.md/.rules hai repo và hướng dẫn layout/code trước code. Dùng Ponytail để tái sử dụng; GitNexus impact trước sửa symbol, detect-changes trước commit.
- Stage từng file liên quan; không git add ., commit -a, stash/reset hoặc đưa metadata GitNexus/AGENTS/CLAUDE vào commit. Không tự commit/push/PR khi chưa có lệnh.
- Không tự áp migration hoặc startup seed db71143. Khi chạy app phải đặt Database\_\_ApplyMigrationsOnStartup=false và kiểm provider/server/database hiệu lực, che secret.
- QA ghi trên db71143 chỉ khi có cho phép theo luồng ứng dụng. Direct SQL seed/repair/cleanup cần lệnh riêng; không drop/reset/truncate hoặc dọn hàng loạt. Race/rollback dùng DB cô lập, không dùng db71143.
- Nếu phát hiện thiếu index/metadata hoặc dữ liệu trùng cần xử lý trước migration: báo chính xác, giữ nguyên dữ liệu, không tự sửa DB để tiếp tục.

## 12. Trạng thái review và việc tiếp theo

Đã phân tích và chọn phương án cho ngày, lô, precision, selection, storage, fingerprint và tương thích. Đây là đề xuất để review trước khi giao thực hiện.

Gate A/B/C đều **chưa bắt đầu triển khai**. Các kiểm chứng bắt buộc khi vào Gate A: SQL index thực tế cho LotId null, khả năng khóa phạm vi/snapshot với SQL Server, preview không lấy capacity applock, bảo toàn dòng/nguồn, guard duyệt v1, quyền đọc/ghi nhất quán, khả năng parser mang date system, ảnh hưởng StockHistoryCalculator tới consumer và readiness migration.

Nếu một kiểm chứng không đạt, ghi finding và sửa spec/giải pháp trước khi đóng gate. Không tự gọi spec “đã được QA”, không chứng nhận race khi chưa có kết quả và không coi việc phê duyệt spec là lệnh áp migration deploy.

## 13. Đối chiếu review ngày 2026-10-15

Đã sửa tài liệu theo 7 finding. Trạng thái dưới đây chỉ xác nhận spec đã bổ sung yêu cầu, chưa xác nhận đã sửa hoặc kiểm thử code.

| Finding                                         | Mức    | Điều chỉnh spec                                                                                        | Trạng thái           |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ | -------------------- |
| FE cũ vẫn duyệt phiếu mới                       | High   | requiresV1Client từ dữ liệu, formVersion khi approve, xác nhận nội dung + ExpectedVersion; mục 6.2/8.2 | Đã cập nhật tài liệu |
| Snapshot có tồn nhưng thiếu nhật ký bị cộng đôi | High   | Guard InventoryStock/ReservedQuantity cùng transaction, mã lỗi riêng; mục 4.5/7.2                      | Đã cập nhật tài liệu |
| Ngày sản xuất của lô cũ chưa bị ràng buộc       | Medium | Kiểm ngày sau resolve cho lô cũ/mới và tại duyệt; mục 4.2                                              | Đã cập nhật tài liệu |
| Sửa phiếu làm mất nguồn/snapshot dòng           | Medium | Update DTO có ID dòng, giữ nguồn phía BE, phân biệt thêm tay và audit; mục 5.1/6.2                     | Đã cập nhật tài liệu |
| Preview có thể lấy khóa ghi toàn tenant         | Medium | Tách công thức dùng chung khỏi nhánh lấy khóa ghi; mục 4.5/7.3                                         | Đã cập nhật tài liệu |
| Quyền tạo và đối chiếu kết quả không thống nhất | Medium | Luồng mới cần View + quyền ghi; operations chỉ cần quyền đọc còn hiệu lực; mục 6.3                     | Đã cập nhật tài liệu |
| Thiếu Search trong API danh sách                | Medium | Search mã phía server trước count/phân trang, sort ổn định; mục 6.1/8.2                                | Đã cập nhật tài liệu |

Gate A/B và ma trận kiểm thử đã được cập nhật tương ứng. Chưa chạy build/test vì lượt này chỉ chỉnh spec; chưa commit hoặc áp migration.

## 14. Tiến độ triển khai 15–16/10/2026

Các ghi nhận mục 12–13 là lịch sử lượt viết/review spec, không phải trạng thái code hiện tại.

- Đã triển khai BE và FE cho nhập tay/import theo các mục nghiệp vụ; chi tiết, thay đổi triển khai có chủ ý và kết quả kiểm thử tại `docs/features/2026-10-16-opening-stock-import-qa.md`.
- Gate A: có code, migration/script forward offline và 85 focused tests đạt; **chưa đóng** vì chưa kiểm schema/index thực tế và race hai handler trên SQL Server cô lập. Không dùng mock/InMemory làm bằng chứng khóa/rollback SQL.
- Gate B: có giao diện/draft-only import, ngày/lô/nguồn/guard duyệt và kiểm thử FE; full suite 1.218 ca đạt, typecheck/lint/build production output cô lập đạt. QA fixture mobile/tablet/desktop không thay thế QA API thật.
- Gate C: **chưa đóng**. Cần cho phép áp migration chính xác rồi QA xuyên FE–BE/storage, quyền thật, Edge/zoom/keyboard/screen reader/reduced motion và race SQL Server. Sáu lỗi suite BE ngoài phần đang sửa cùng advisory Pkcs đã ghi riêng, không gọi suite xanh hay sẵn sàng phát hành.
- Migration `20261015151230_AddOpeningStockImportMetadata` chưa áp `db71143`; không có seed/SQL ghi/cleanup/reset. Chưa commit/push/PR.
