# Spec — Nhập cấu trúc và vị trí kho từ Excel/CSV

Ngày: 11/10/2026, Asia/Saigon. Trạng thái: `IMPLEMENTATION_IN_PROGRESS`.

User đã yêu cầu triển khai theo spec ngày 11/10/2026. Các API/UI bên dưới là mục tiêu; chỉ những phần ghi trong nhật ký tiến độ cuối tài liệu mới được xác nhận đã hiện thực/kiểm thử. Không cho phép migration, seed hoặc ghi DB deploy. Yêu cầu triển khai mở phạm vi các file Warehouse được liệt kê; không mở phạm vi luồng Điều chuyển/WarehouseTask.

## 1. Mục tiêu và phạm vi

Hỗ trợ hai nhu cầu trong một luồng bốn bước: **Chọn tệp → Ghép cột → Kiểm tra → Kết quả**.

1. Kho đã có cấu trúc: nhập thêm khu vực, kệ hoặc vị trí bằng một bảng XLSX/CSV.
2. Setup mới: nhập một workbook XLSX có ba bảng Khu vực / Kệ / Vị trí; tham chiếu cha từ DB hoặc cùng tệp, không phụ thuộc thứ tự sheet/dòng.

Một phiên chỉ tác động một kho, lấy từ route đang mở. Không tạo kho mới. Chỉ tạo cấu trúc mới và dùng cấu trúc đã tồn tại làm tham chiếu; không sửa, kích hoạt lại, di chuyển hay xóa cấu trúc cũ. Không nhập hàng hóa, tồn kho, giữ chỗ, phiếu điều chuyển hoặc nhiệm vụ kho.

Không nhập tọa độ sơ đồ, đồ trang trí, kích thước canvas, barcode tùy ý, vị trí hệ thống, vị trí chờ xuất hoặc cấu hình khu cách ly. Vị trí mới phải có mặt trong danh mục và dữ liệu sơ đồ như tạo thủ công. Lưu cách sắp xếp trên sơ đồ là thao tác riêng của người dùng.

Không thêm thư viện, background job hoặc import session lưu DB chỉ để xử lý tối đa 500 dòng. Không đổi các luồng import VTHH/NCC/KH/ĐVT/nhóm/nhân sự đang hoạt động.

## 2. Hiện trạng đã đối chiếu code

| Vấn đề | Hiện trạng và nguồn |
| :--- | :--- |
| Cây cấu trúc | `Warehouse → Zone → Rack → Slot`; các model trong BE `Domain/Entities/Warehouse` |
| Phạm vi mã | Unique index: Zone `(TenantId, WarehouseId, ZoneCode)`; Rack `(TenantId, ZoneId, RackCode)`; Slot `(TenantId, RackId, SlotCode)`, tại `Infrastructure/Data/Configurations/Warehouse` |
| Hai kiểu kệ | `RackLevel`: tạo một Slot nội bộ `__SYSTEM_DEFAULT__`, `IsSystemDefault=true`; `SlotLevel`: tạo các Slot riêng. `CreateRackCommandHandler` và `CreateSlotCommandHandler` |
| Sức chứa | `StorageCapacityType.None/Quantity`; Quantity cần giá trị dương và ĐVT đang hoạt động của tenant. `StorageCapacityPolicy` và các validator tạo Rack/Slot |
| Thuộc tính vật lý | Các cặp giá trị/đơn vị, precision DB `decimal(18,3)`; không thay thế chính sách sức chứa số lượng `decimal(18,6)` |
| Phân quyền | Controller cấu hình dùng `WarehousePermissions.ConfigureLayout`; handler kiểm tenant và `IWarehouseAccessPolicy.EnsureAccessAsync(..., Manage)` |
| Import sẵn có | `ISpreadsheetDocumentReader`, reader XLSX/CSV, mapping có dòng nguồn và kiểu ô; FE có `BulkImportWorkspace`, Mapping, Feedback, Result, OperationalListPanel/Pagination |
| Làm mới cấu trúc | FE `useInvalidateWarehouseStructure` làm mới layout, layoutScene, locationsAll và detail sau tạo thủ công |
| Hiển thị sơ đồ | `mapWarehouseLayoutScene` tạo geometry mặc định cho khu/kệ chưa có tọa độ; slots đi theo dữ liệu scene. Fallback hiện tại chưa bảo đảm chống chồng lấn cho lượng lớn |
| Lưu sơ đồ | `SaveWarehouseLayoutSceneCommandHandler` kiểm phiên bản sơ đồ và entitlement `FeatureCode.LayoutDesigner`; import không được gọi handler này để tự lưu bố cục |

Không kết luận chỉ invalidate cache là đủ để hoàn thành phần sơ đồ. Phải QA việc tra cứu/chọn các đối tượng mới và xử lý số lượng vượt không gian hiển thị.

## 3. Quyết định nghiệp vụ

### 3.1 Định danh và tham chiếu

- Kho lấy từ `{warehouseId}` trong route; tenant/user lấy từ context đã xác thực. Không nhận TenantId/WarehouseId tùy ý trong ô dữ liệu.
- Khóa khu: `zoneCode`; khóa kệ: tuple `(zoneCode, rackCode)`; khóa vị trí: tuple `(zoneCode, rackCode, slotCode)` trong kho hiện tại.
- Dùng tuple/ID để tra cứu, không nối chuỗi có dấu gạch ngang làm khóa vì mã người dùng có thể chứa dấu đó. Đường dẫn hiển thị dùng `K01 / A01 / O01`.
- Mã tham chiếu tra theo mã chính xác sau trim + Unicode NFC, không suy đoán theo tên/gần giống, không bỏ dấu. Giữ giá trị mã để lưu/hiển thị, không tự đổi hoa/thường.
- So trùng không phân biệt hoa/thường trong tệp. Kiểm tra collation SQL thực tế trước triển khai; DB là chốt cuối cho tên/mã bị collation coi tương đương. Không tuyên bố mặc định DB phân biệt dấu.
- Mã tối đa 50 ký tự; bắt buộc, không tự sinh để tránh tham chiếu cha thay đổi ngoài ý muốn. Tên tối đa 255; mô tả tối đa 500. Tên khu/kệ bắt buộc khi tạo mới; tên vị trí trống thì dùng mã như luồng tạo thủ công, hiển thị giá trị hiệu lực trong preview.
- Từ chối mã ô kiểu Number trong XLSX, công thức và mã dành riêng cho hệ thống. Hướng dẫn định dạng Text để giữ số 0 đầu/số dài; không nhận mã đã bị Excel làm mất chữ số. CSV giữ mã dạng chuỗi.

### 3.2 Hành động của từng dòng

| Action API | Nhãn UI | Quy tắc |
| :--- | :--- | :--- |
| `Create` | Sẽ tạo mới | Chưa tồn tại; dữ liệu và chuỗi cha hợp lệ; có thể chọn |
| `Reference` | Đã có — không tạo lại | Cùng khóa đã tồn tại và đang hoạt động; chỉ làm tham chiếu; không có checkbox tạo |
| `Invalid` | Cần sửa | Sai trường, cha thiếu/sai kiểu, trùng trong tệp, đã ngừng hoạt động hoặc khai báo mâu thuẫn |

Dòng Reference không cập nhật entity và không tạo audit Create. Chỉ đối chiếu thuộc tính được người dùng khai báo có giá trị; không áp mặc định dành cho entity mới để tạo mâu thuẫn giả với entity cũ. Ô tên/mô tả trống trên Reference nghĩa là không khai báo, không xóa dữ liệu cũ. Các giá trị `Không`, `0` là khai báo có giá trị, không được coi là trống.

Nếu tên, kiểu kệ, cấu hình sức chứa, cờ nhiều sản phẩm hoặc thông tin vật lý được khai báo khác DB: lỗi tại trường, hướng dẫn sửa tệp hoặc sửa cấu trúc qua màn hình riêng. Không tự bỏ qua mâu thuẫn. Dòng Reference sai không được dùng làm cha cho dòng con trong phiên này.

Trong cùng bảng, mỗi tuple chỉ xuất hiện một lần: đánh dấu tất cả dòng trùng, kể cả trùng hoàn toàn. Mã cha lặp lại ở nhiều dòng con là bình thường, không phải trùng entity. Kệ cùng mã thuộc hai khu khác nhau và vị trí cùng mã thuộc hai kệ khác nhau đều hợp lệ.

Khu/kệ/vị trí ngừng hoạt động hoặc bị xóa mềm không được xem là mới; không tái sử dụng mã để tạo entity khác. Không đọc entity tenant khác để giải thích lỗi; chỉ báo không tìm thấy tham chiếu trong kho hiện tại.

### 3.3 Kệ và vị trí nội bộ

- Kiểu kệ trong tệp: `Theo kệ` → `RackLevel`, `Theo ô` → `SlotLevel`. Thiếu kiểu khi tạo kệ là lỗi, không suy đoán theo việc có dòng con.
- RackLevel không được có Slot thường. Khi tạo, BE sinh chính xác một Slot nội bộ với cấu hình giống tạo thủ công: active, vacant, occupancy=0, cờ systemDefault=true; sức chứa và nhiều sản phẩm áp vào Slot này.
- SlotLevel không tạo Slot mặc định. Sức chứa số lượng/cờ chứa nhiều sản phẩm cấu hình ở từng Slot, không áp lên cả kệ và không tự truyền xuống các Slot.
- Khu/kệ mới active; Slot mới active/vacant và occupancy=0. Không lấy các giá trị này từ tệp.
- Không đếm Slot nội bộ như một vị trí do người dùng nhập. Kết quả tạo một kệ RackLevel không hiển thị thêm một ô giả.

### 3.4 Sức chứa và thông tin vật lý

- Trường chính sách: `Không giới hạn` → None; `Theo số lượng` → Quantity. Với đối tượng chứa hàng mới, trống mặc định None và có lưu ý gộp trong preview/xác nhận, không cảnh báo lặp theo từng dòng.
- Quantity: sức chứa >0, tối đa 6 chữ số thập phân và giới hạn `decimal(18,6)`; mã ĐVT sức chứa bắt buộc, khớp `UnitCode` của ĐVT active trong tenant. Không tự tạo ĐVT trong luồng này; có liên kết hướng dẫn nhập ĐVT trước, tuân thủ guard rời trang.
- None: sức chứa và mã ĐVT sức chứa phải trống; không âm thầm bỏ số người dùng điền. Tương tự, không nhận cấu hình số lượng ở Zone/kệ SlotLevel.
- Nhiều sản phẩm: `Có/Không`; trống mặc định Có cho vị trí chứa hàng mới, đúng mặc định tạo thủ công. Với Rack SlotLevel, để trống; giá trị được nhập là lỗi vì không có chính sách chung ở cấp này.
- Tải trọng, chiều dài/rộng/cao: tùy chọn theo cặp giá trị và đơn vị; nhập một vế mà thiếu vế còn lại là lỗi. Giá trị >0, phù hợp `decimal(18,3)`. Tải trọng dùng Tấn/Kilôgam/Gam; kích thước dùng Kilômét/Mét/Đềximét/Xentimét theo enum hiện có; nhận alias rõ `t/kg/g`, `km/m/dm/cm`.
- Nhãn UI `Tải trọng (tham khảo)` ánh xạ sang `storageCapacity`; mô tả không hứa hệ thống chặn cất hàng bằng kg/kích thước. `physicalWidth/Height` khác `width/height` tọa độ canvas.
- XLSX Number: chuyển sang biểu diễn thập phân ngắn theo độ chính xác Excel trước kiểm scale để tránh lỗi nhị phân như 1.1000000000000001; không âm thầm làm tròn dữ liệu Text thật vượt scale. Tái sử dụng quy tắc đã có của import VTHH nếu đúng hợp đồng.
- CSV/Text số: dấu chấm thập phân, không dấu nhóm hàng nghìn hay scientific notation; mẫu và helper ghi ví dụ `12.5`. Không suy đoán `1,200` là 1.2 hay 1200; trả lỗi hướng dẫn. Không thêm option decimalSeparator trong bản đầu.

### 3.5 Quan hệ cha và lựa chọn

- Bảng đơn: cha phải có trong DB. Workbook đầy đủ: cha có thể từ DB hoặc một dòng Create/Reference hợp lệ trong bảng đã chọn.
- Dòng con có cha thiếu hoặc Invalid nhận lỗi tại `zoneCode/rackCode`; không tự tạo cha chỉ từ mã con.
- Dependency của dòng Create là các dòng cha Create thực sự cần tạo. Cha Reference không cần được chọn.
- Preview mặc định chọn tất cả dòng Create hợp lệ, gồm các cha mới. Reference/Invalid không chọn được.
- Nếu bỏ chọn cha đang có con được chọn: giữ ý định lựa chọn, hiện thông báo phụ thuộc và khóa Nhập; không tự bỏ con hoặc chọn cha lại. Cung cấp hai nút rõ: `Chọn lại cha cần thiết` / `Bỏ chọn các dòng phụ thuộc`.
- Chọn con khi cha Create chưa chọn có thể tạo trạng thái thiếu phụ thuộc và dùng cùng hai cách xử lý; không giấu lý do trong checkbox disabled không giải thích.
- Nút chọn toàn tệp bao gồm tất cả Create hợp lệ của các tab, không chỉ trang đang xem. Checkbox header chỉ chọn trang đang hiển thị và chỉ các dòng Create hợp lệ. Tìm kiếm/lọc/phân trang không xóa selection ẩn.
- BE kiểm dependency closure trên tập được gửi, không tự thêm cha ngoài xác nhận. Người dùng được nhập một tập hợp hợp lệ, không bắt mọi dòng lỗi khác trong tệp được sửa trước.

## 4. Mẫu tệp và mapping

### 4.1 Chế độ

| Mode API | UI | Tệp và bảng |
| :--- | :--- | :--- |
| `Slots` (mặc định) | Thêm vị trí | XLSX một bảng được chọn hoặc CSV; cha có sẵn |
| `Zones` | Thêm khu vực | XLSX một bảng hoặc CSV |
| `Racks` | Thêm kệ | XLSX một bảng hoặc CSV; khu có sẵn |
| `Structure` | Setup cấu trúc đầy đủ | XLSX; tối đa một bảng mỗi kind Zone/Rack/Slot |

Header có hai nút: `Mẫu vị trí` / `Mẫu cấu trúc đầy đủ`. Link `Mẫu loại đang chọn` ở bước 1 cho Zones/Racks; không thêm bốn nút lớn vào header. XLSX đầy đủ có sheet `Khu vực`, `Kệ`, `Vị trí`, header dòng 1; hướng dẫn ngoài vùng dữ liệu hoặc trong UI, không tạo dòng ví dụ vô tình được nhập. Mã định dạng Text; dropdown validation Excel chỉ hỗ trợ nhập liệu, không thay validation BE.

### 4.2 Cột chính

| Kind | Field → tiêu đề | Bắt buộc |
| :--- | :--- | :--- |
| Zone | `zoneCode` → Mã khu vực; `zoneName` → Tên khu vực | Mã và tên khi tạo mới |
| Rack | `zoneCode` → Mã khu vực; `rackCode` → Mã kệ; `rackName` → Tên kệ; `storageMode` → Kiểu quản lý | Mã cha/mã kệ; tên và kiểu khi tạo mới |
| Slot | `zoneCode` → Mã khu vực; `rackCode` → Mã kệ; `slotCode` → Mã vị trí; `slotName` → Tên vị trí | Ba mã; tên tùy chọn |

Schema mapping yêu cầu ghép cột tên/kiểu cho bảng có dòng Create; template luôn có chúng. Không yêu cầu ô tên/kiểu trên dòng Reference nếu để trống. Preview phải xử lý được workbook chỉ khai báo mã cha Reference; mapping thiếu tên/kiểu chỉ thành lỗi Create ở dòng cần tạo, không chặn cả bảng chỉ chứa Reference.

Rack/Slot có thêm `capacityType` → Chính sách sức chứa, `capacity` → Sức chứa tối đa, `capacityUnitCode` → Mã ĐVT sức chứa, `allowsMixedProducts` → Chứa nhiều sản phẩm. Zone không có các trường này. Bản Slots/Racks có sẵn các cột này, kể cả khi không sử dụng.

Các kind có thông tin bổ sung: `description`; `storageCapacity/storageCapacityUnit`; `physicalLength/physicalLengthUnit`; `physicalWidth/physicalWidthUnit`; `physicalHeight/physicalHeightUnit`. Hiển thị tên tiếng Việt có dấu, enum alias được schema cung cấp.

### 4.3 Chọn sheet và dữ liệu không nhập

- Nhận diện gợi ý từ header/alias, không phụ thuộc tên sheet `HangHoa`, `KhuVuc` hoặc thứ tự ZIP. Dropdown hiển thị nguyên tên sheet; không sửa tên thật để giả định format.
- Structure: chọn riêng sheet và dòng tiêu đề cho từng kind; không dùng một sheet cho hai kind. Có thể không chọn một kind nếu mọi cha đã có trong DB; không cho cả ba bảng trống.
- Sheet có dữ liệu không được chọn và cột có dữ liệu không được ghép phải được liệt kê trong khối `Dữ liệu không nhập`; cần checkbox xác nhận rõ trước commit. Không tick sẵn, không bỏ qua âm thầm.
- Bảng đơn XLSX vẫn phải xác nhận các sheet có dữ liệu còn lại. CSV không hiển thị selector quy đổi hay lựa chọn workbook đầy đủ.
- Đổi file/mode/sheet/header/mapping/delimiter làm preview cũ hết hiệu lực; không nhập từ preview không khớp cấu hình mới. Giữ cấu hình không liên quan khi an toàn, nhưng reset selection khi cấu trúc dòng thay đổi.

### 4.4 Giới hạn và an toàn reader

- 5 MiB file, tổng tối đa 500 dòng dữ liệu không trống trên tất cả bảng được nhập, gồm Create/Reference/Invalid; không phải 500 mỗi sheet. Không cắt file âm thầm.
- Giữ guard reader: tối đa 10 sheet, 128 ZIP entry, 20 MiB giải nén và tỷ lệ nén 100; header 1–50, mapping tối đa 100 cột theo cơ chế hiện tại.
- Chỉ XLSX/CSV UTF-8, hỗ trợ BOM; không XLS/XLSM, encrypted workbook, macro hoặc external relationship được thực thi. Không tự tải liên kết ngoài.
- Không nhận công thức trong vùng dữ liệu của bảng đã chọn, kể cả công thức có cached value. Trả lỗi cấp tệp/bảng trước commit; không thực thi công thức.
- Dòng trống không sinh entity, nhưng số dòng Excel/CSV phải giữ đúng nguồn, kể cả CSV có quoted newline. Không thay source number bằng chỉ số mảng sau lọc.
- Reject ô Error/Boolean dùng sai loại; giới hạn kiểm tra raw input và payload để chống vượt bộ nhớ. Export báo cáo escape CSV và chống spreadsheet formula injection, không sửa rawValue của dữ liệu nguồn.

## 5. Hợp đồng BE → FE

### 5.1 Endpoint đề xuất

Base: `/api/warehouses/{warehouseId:guid}/locations/import`.

| Method/path | Input | Output và side effect |
| :--- | :--- | :--- |
| GET `/template?mode=Slots\|Zones\|Racks\|Structure` | Mode hợp lệ | XLSX; không ghi DB |
| POST `/inspect` | Multipart `file`, `mode`, `csvDelimiter=auto` | Schema theo kind, sheets/header candidates/sample; không ghi DB |
| POST `/preview` | Multipart `file`, `options` JSON | Dòng, lỗi, tham chiếu, dependency, thống kê và fingerprint; không ghi DB |
| POST `/commit` | Multipart `file`, `options`, `selection` JSON | Kết quả lưu atomic; đây là endpoint duy nhất ghi |

Giữ envelope `ApiResponse<T>` hiện tại; template trả file. Controller inject ISender, đặt HasPermission bằng constant và XML summary tiếng Việt. Không nhận row DTO tùy ý thay file ở commit: BE tự parse lại source, không tin số liệu/ID/phân loại của FE.

### 5.2 Options và selection

```json
{
  "schemaVersion": 1,
  "mode": "Structure",
  "csvDelimiter": "auto",
  "tables": [
    {
      "kind": "Zone",
      "sheetId": "1",
      "headerRowNumber": 1,
      "columnMapping": [
        { "field": "zoneCode", "columnIndex": 0 },
        { "field": "zoneName", "columnIndex": 1 }
      ]
    }
  ]
}
```

Ví dụ chỉ minh họa một bảng; Structure thực tế thêm bảng Rack/Slot nếu cần. `kind` là enum Zone/Rack/Slot; sheetId lấy từ inspect, không hard-code. Mỗi field/cột chỉ được ghép một lần trong bảng; lỗi mapping không phải lỗi dữ liệu dòng.

```json
{
  "expectedPreviewFingerprint": "sha256:...",
  "selectedRowKeys": ["Zone:1:2", "Rack:2:2", "Slot:3:2"],
  "acknowledgeIgnoredData": true
}
```

`rowKey` định danh nguồn `(kind, sheetId, physicalRowNumber)`, không phải code/ID entity. Tạo key theo serialization không mơ hồ. Mọi selected key phải duy nhất và thuộc Create hợp lệ trong file/cấu hình đang gửi; giới hạn số key và reject tập rỗng. `acknowledgeIgnoredData` chỉ bắt buộc true khi có dữ liệu bỏ qua.

### 5.3 Preview DTO

`WarehouseLocationImportPreviewResponse` gồm:

- `schemaVersion`, `warehouseId`, `warehouseCode`, `warehouseName`, `fileName`, `previewFingerprint`.
- `capabilities`: `canImport`, `canViewLayout`, `canEditLayout` phản ánh quyền hiệu lực, phạm vi kho và entitlement; không dùng tên role trong component.
- `rows`, `ignoredSheets`, `ignoredColumns`, `fileWarnings`, `summary` theo kind và toàn tệp.
- `summary`: totalRows/createRows/referenceRows/invalidRows; FE tính riêng số selected theo kind. Không trộn Reference vào số tạo mới.

Mỗi `WarehouseLocationImportRowResponse`:

- `rowKey`, `kind`, `source {sheetId, sheetName, rowNumber}`, `action`, `canSelect`.
- `values`: các field hiệu lực đúng kind; `sourceValues` giữ giá trị nguồn để người dùng thấy lỗi. Không trả danh mục tenant khác.
- `existingEntityId` và `existingRowVersion` chỉ cho Reference đã được kiểm quyền; `parent {kind, rowKey?, entityId?, displayPath}` và `requiredParentRowKeys` cho cha mới.
- `fieldErrors` keyed bằng field API; `issues[] {code, severity, field?, message, source}`. Message tiếng Việt, code ổn định cho FE, không parse chuỗi tiếng Anh để đoán field.
- `warnings` gộp đúng ý nghĩa; defaults không tạo hàng chục thông báo giống nhau trong dialog.

Issue tối thiểu: REQUIRED, INVALID_VALUE, TOO_LONG, DUPLICATE_SOURCE, PARENT_NOT_FOUND, PARENT_INVALID, INACTIVE_REFERENCE, EXISTING_CONFLICT, INVALID_RACK_MODE, INVALID_CAPACITY, UNIT_NOT_FOUND, NUMERIC_CODE. Thiếu quyền trả 403; không giấu dưới issue nghiệp vụ.

### 5.4 Fingerprint và dữ liệu thay đổi

- Fingerprint deterministic SHA-256 của file hash, options chuẩn hóa, tenant/kho, kết quả phân loại và snapshot thuộc tính cấu trúc/ĐVT được tham chiếu. Không gồm tên hiển thị file, clock hoặc occupancy biến động không liên quan.
- Bao gồm ID/rowVersion và thuộc tính dùng xác định tên, mode, trạng thái, policy/cha. RowVersion có thể làm phải preview lại khi entity được chỉnh; không fingerprint mọi tồn kho trong kho.
- BE tạo lại preview trên commit và so fingerprint. Nếu Create nay đã có, Reference bị đổi/đổi cha/ngừng hoạt động hoặc unit không còn hợp lệ: 409, không tự chuyển Create thành Reference, không lưu một phần.
- Fingerprint là phát hiện stale preview, không phải chứng thực/giữ chỗ/idempotency token. Client có thể thay nó nhưng không thể bỏ authorization/validation BE; không xem fingerprint là hàng rào bảo mật.
- Snapshot giới hạn ở dữ liệu tệp có liên quan; bản đầu có thể yêu cầu preview lại nếu một Reference không được chọn thay đổi, cần ghi rõ trong UI. Không bắt sự thay đổi unrelated entity làm mất phiên.
- Structured error khi commit: `errorCode`, `requiresRepreview`, `rowIssues`, `selectionIssues` qua cơ chế ApiResponse/middleware đã có. Nếu envelope chưa hỗ trợ, bổ sung tương thích với client cũ và duyệt file chung trước; không thêm một middleware riêng.

### 5.5 Kết quả commit và lỗi mạng

- Success chỉ sau transaction commit: `createdCounts {zones,racks,slots}`, `created[] {rowKey,kind,id,code,displayPath}`, `referenceCounts`, `unselectedCounts`, `layoutNeedsArrangement` (true nếu tạo Zone/Rack chưa có geometry).
- Không trả “thành công một phần”: những dòng được chọn cùng thành công hoặc cùng rollback. Invalid/unselected vẫn có trong báo cáo kết quả dưới nhãn `Không nhập`, không nhầm với lỗi lưu.
- 400: file/mapping/payload hoặc selection sai; 403: thiếu quyền/phạm vi; 404: kho không được truy cập/không tồn tại theo convention hiện có; 409: snapshot/race/unique conflict. Lỗi validation preview bình thường trả 200 + issues để FE xem từng dòng.
- FE không retry commit tự động. Timeout/network disconnect/5xx không chứng minh transaction thất bại: trạng thái `Chưa xác định kết quả lưu`, khóa bấm Nhập lại, cho mở danh mục và Kiểm tra lại.
- Preview lại sau kết quả chưa xác định có thể thấy entity thành Reference, nhưng không được khẳng định chính request trước đã tạo nếu không có bằng chứng audit. Bản đầu không hứa exactly-once/durable replay nếu chưa triển khai cơ chế receipt riêng.

## 6. BE: tổ chức, validation và lưu

### 6.1 Ranh giới kiến trúc

- Command/query/validator dưới `Application/Features/Warehouse/...LocationImport...`; DTO trong `Contract/Models/Warehouse`, không nhét vào Product để lách giới hạn đường dẫn.
- Dùng `ISpreadsheetDocumentReader` và Infrastructure reader hiện tại; XML/ZIP không chuyển lên Application. Mapping/parsing dùng lại phần thực sự generic, không gọi ProductImport handler như một adapter Warehouse.
- Warehouse import rules là hàm riêng theo nghiệp vụ, dùng chung giữa preview/commit. Reuse validator tạo Zone/Rack/Slot và `WarehousePhysicalDetailsValidation`; explicit message required/length tiếng Việt, không chỉ gắn WithMessage cuối chuỗi.
- Không gọi ISender.CreateZone/CreateRack/CreateSlot tuần tự cho từng dòng: các handler đó save riêng và có thể lưu dở dang. Reuse/factor phần lập entity và policy cần thiết, giữ một transaction cho batch và tests luồng tạo thủ công.
- Đọc kho/khu/kệ/vị trí/ĐVT liên quan theo batch tenant+warehouse filter; tránh request/query mỗi dòng. Repository/IUnitOfWork và query reader theo convention; Application không tham chiếu Infrastructure.
- Không cần schema mới dự kiến: các entity/index đã đủ. Nếu việc hiện thực cần schema/seed, dừng và xin duyệt riêng; không tự chạy startup migration.

### 6.2 Quyền

- Mọi endpoint kiểm `WarehousePermissions.ConfigureLayout` và phạm vi kho Manage, xác định kho thuộc tenant và active. UI/route còn kiểm View để load dữ liệu màn hình; không coi prefix/role guard là nguồn quyền import.
- Commit kiểm lại effective permission, warehouse assignment, trạng thái và mọi tham chiếu; quyền bị thu hồi sau preview không được ghi.
- Không thêm `warehouses:import` hoặc seed quyền trong bản đầu. Không cho người chỉ View tạo qua payload; TenantOwner đi qua policy tập trung hiện có, không hard-code bypass trong import handler.
- Import cấu trúc không tự cấp feature LayoutDesigner. `Mở sơ đồ kho` theo quyền xem; `Sắp xếp sơ đồ` chỉ khi capability chỉnh + entitlement hiện tại cho phép. Nếu không, vẫn xem danh mục, không chặn import vì thiếu quyền lưu sơ đồ.

### 6.3 Giao dịch và race condition

1. Kiểm file/payload và quyền trước; parse/map/validate không ghi DB.
2. Bắt đầu transaction và đọc lại snapshot liên quan ở isolation đủ giữ nhất quán tới commit; recompute fingerprint/selection/dependency.
3. Tạo ID trước; add Zone, rồi Rack, rồi Slot, cùng Slot nội bộ của RackLevel; parent ID chỉ từ DB đã kiểm hoặc tập được chọn.
4. Cấu hình Quantity qua StorageCapacityPolicy hoặc logic tương đương được tái sử dụng; giữ capacity lock theo convention. Không thay CurrentOccupancy của entity đã có.
5. Audit cho entity mới (và dấu vết Slot nội bộ theo quy tắc audit đã thống nhất), cùng UnitOfWork; không emit external success event trước commit.
6. Save một lần với conflict handling, commit transaction; exception phải rollback và không tái sử dụng tracked entity của batch thất bại.

`BeginTransactionAsync` hiện tại dùng isolation mặc định; **unique index một mình không bảo vệ việc cha bị đổi mode/ngừng hoạt động giữa validate và save**. Gate BE phải hiện thực chứng minh nhất quán: đề xuất transaction Serializable cho batch với overload tùy chọn giữ các caller cũ không đổi; đọc index theo phạm vi cụ thể và thứ tự ổn định. Đây là thay đổi shared IUnitOfWork/Infrastructure cần duyệt phạm vi trước, không đã có sẵn. Test race trên SQL Server cô lập; provider in-memory không chứng minh locking.

Khi deadlock/transient failure, rollback và trả trạng thái theo convention; không tự chạy lại thao tác ghi phía FE. Các chính sách cất hàng/tồn và lifecycle sau khi import vẫn hoạt động như entity tạo thủ công.

## 7. UI/UX chi tiết

### 7.1 Điểm vào, header và bố cục

- Nút có icon `Nhập từ tệp` tại Danh mục vị trí trong kho, cạnh bộ lọc; chỉ hiện với capability import.
- Route đề xuất `/warehouses/{warehouseId}/locations/import`; không bị route dynamic nhận thành locationId. Header: back icon có label, `Kho: HUE-01 · Ngũ Kim`, tiêu đề `Nhập vị trí kho`; action tải hai mẫu.
- Hiển thị kho cố định, không dropdown đổi kho trong phiên. Muốn đổi kho: rời phiên có xác nhận rồi mở từ kho khác.
- Thiết kế Kovia: background token tương ứng #F1FBEC, surface trắng, primary xanh đậm, border token; nội dung 13–14px, dấu * đậm kèm mô tả accessible required. Không logo/framework/marketing card hoặc helper dài.
- Tái sử dụng BulkImportWorkspace/Steps/Mapping/ReviewHeader/Feedback/Result và primitives Field/Alert/Sheet/AlertDialog/Tabs/Button/Checkbox; không thêm primitive hay bộ xử lý API chung khổng lồ.

### 7.2 Bước 1 — Chọn tệp

- NativeSelect `Bạn muốn nhập gì?`: Thêm vị trí / Thêm khu vực / Thêm kệ / Setup cấu trúc đầy đủ. Mặc định Thêm vị trí; đổi mode khi đã có file phải xác nhận kiểm tra lại cấu hình.
- Helper một câu theo mode: `Khu vực và kệ cần có sẵn.` hoặc `Tạo khu vực, kệ và vị trí trong cùng một lần nhập.`
- Vùng upload chung, click và drop có cùng handler; accept XLSX/CSV, 5 MB, 500 dòng. CSV hiện Dấu phân cách với auto mặc định; Structure không nhận CSV, nói rõ ngay vùng chọn file.
- Gợi ý setup gọn: `Chưa có đơn vị sức chứa? Nhập đơn vị tính trước.` Không tự mở trang khác và không seed danh mục.
- Inspect: `Đang tải và đọc tệp…`, spinner/live region; khóa handler ngay để chống double click/drop, không chỉ disabled button. Lỗi tệp dùng Alert trong vùng upload + toast phù hợp, không native alert/confirm.

### 7.3 Bước 2 — Ghép cột

- Dùng bố cục ghép cột của các import hiện tại: Thông tin Kovia / Cột trong tệp / Dữ liệu mẫu / Trạng thái. Dấu * rõ; sample text chỉ đọc, không icon sort vô nghĩa.
- Bảng đơn: sheet + dòng tiêu đề chung một hàng khi rộng. Structure: tab Khu vực/Kệ/Vị trí; mỗi tab có sheet + header và mapping riêng; hiển thị Không nhập bảng này khi không dùng.
- Gợi ý header theo inspect, người dùng chọn lại được; không tự ghép cùng một cột cho nhiều field. Nếu alias mơ hồ, yêu cầu chọn, không lấy match đầu tiên.
- Sample hiển thị hai dòng ngắn; mở đầy đủ chỉ khi có nội dung khác/bị cắt. Không sửa tên sheet thật hoặc tách chữ giả bằng normalize business code.
- Nút `Kiểm tra dữ liệu`; lỗi mapping ở Field/Alert tương ứng. Không reset mapping của tab khác khi đổi tab. CSV đổi delimiter đọc lại tệp bằng handler chung và hủy preview cũ.

### 7.4 Bước 3 — Kiểm tra

Wireframe desktop:

```text
[Tổng dòng] [Sẽ tạo mới] [Đã có] [Cần sửa]
Tạo 2 khu · 5 kệ · 40 vị trí                  [Thiếu chọn cha: xem xử lý]
[Khu vực] [Kệ] [Vị trí]
┌ Bản xem trước · file.xlsx · đã chọn 47 mục     [Mở rộng] [Tìm…] [Lọc]
│ [Chọn cả tệp] [Bỏ chọn cả tệp] [Xuất báo cáo]
│ [] Dòng | Kết quả | Khu/Kệ | Mã | Tên | Sức chứa | ĐVT | Nhiều SP
│ … đủ số dòng/trang đang chọn …
└ Tổng số: x                          Số dòng/trang [20]   Điều hướng
                         [Quay lại ghép cột] [Nhập 47 mục]
```

- Bốn thống kê thấp gọn, border không bị wrapper che. Không lặp tổng bên dưới tiêu đề danh sách; selected count là thông tin khác tổng pagination.
- Header, tên file, selected count và toolbar cùng hàng khi đủ chỗ; responsive wrap, không dính nội dung sát border. Bỏ chọn có outline/background nhìn rõ như nút phụ hiện tại.
- Kết quả ngay cạnh Dòng, trước các cột nghiệp vụ. Dòng nguồn hiển thị `Kệ · dòng 8`, tooltip tên sheet thật; không `Sheet:8` hoặc raw tiếng Anh.
- Zone: Mã khu vực / Tên khu vực. Rack: Khu vực / Mã kệ / Tên kệ / Kiểu quản lý / Chính sách / Sức chứa / ĐVT. Slot: Khu vực / Kệ / Mã vị trí / Tên vị trí / Chính sách / Sức chứa / ĐVT / Nhiều sản phẩm.
- Cột sức chứa và ĐVT hiện mặc định; không có cấu hình thì hiển thị Không giới hạn và `—`, không 0 giả. Tên dài/code dài wrap hoặc tooltip full text, không đẩy Kết quả ra xa.
- Thông tin bổ sung thu gọn mặc định: mô tả, tải trọng, kích thước và đơn vị đo. Toggle có số lỗi đang ẩn; Result vẫn đọc đủ mọi lỗi. Không animate độ rộng bảng; icon/nội dung fade nhẹ, reduced motion.
- Tất cả ô dữ liệu chỉ đọc. Sửa tệp nguồn và tải lại, hoặc quay lại mapping; không có input chỉnh mã/name ngay trong preview.
- Result dùng badge + lỗi đầu tiên gần field; các lỗi khác vào details `Xem chi tiết`; không `1 lỗi · 0 cảnh báo`, không lặp warnings identical. Reference có giải thích không tạo lại, không bị tô đỏ.
- Mỗi tab có search/filter/page/pageSize riêng, mặc định 20 dòng; 10/20/30/50. Tổng footer là số dòng của tab theo tập đang lọc; thống kê toàn tệp không đổi. Search có cả đường dẫn, mã, tên và message lỗi.
- Bảng dùng OperationalListPanel/Pagination nhưng **ngoại lệ import đã được người dùng yêu cầu**: chiều cao tự nhiên theo rows/page, không max-height hay internal vertical scrollbar. Workspace import sở hữu scroll dọc, table chỉ cuộn ngang. Pagination sau bảng, không cuộn bên trong tbody; không ép footer luôn nổi bằng lớp che nội dung.
- Selection toàn workbook giữ khi đổi tab/page/filter/toggle. Không chọn Reference/Invalid; có aria-describedby lý do. Phụ thuộc chưa đủ hiện Alert thấp với thao tác rõ; button Nhập disabled + lý do đọc được.
- Nhập không chọn gì thì disabled. Xác nhận bằng AlertDialog: `Tạo 2 khu vực, 5 kệ và 40 vị trí tại kho HUE-01?`; note số Reference/Invalid/unselected không nhập và số nơi chứa hàng không giới hạn. Không sinh warning list một dòng cho mỗi ô áp mặc định.

### 7.5 Bước 4 — Kết quả

- Title `Đã nhập thành công`; số tạo riêng từng kind. Bảng nguồn → đường dẫn/mã/tên → kết quả, fixed column layout/wrapping để chuỗi dài không đẩy cột cuối khỏi màn hình.
- Reference hiển thị `Đã có — không tạo lại`, unselected `Không được chọn`, Invalid `Không nhập — cần sửa tệp`. Success không ghi `đã tạo` cho Reference.
- Actions: `Mở sơ đồ kho`, `Về danh mục vị trí`, `Nhập tệp khác`, `Xuất báo cáo`. Dùng Link có href hợp lệ; mở sơ đồ không tạo lại dữ liệu.
- Khi tạo Zone/Rack: note gọn `Cấu trúc đã được tạo. Mở sơ đồ để kiểm tra và lưu cách sắp xếp.` Chỉ Slots: `Vị trí đã được thêm vào kệ tương ứng.`
- Báo cáo toàn tệp có source, kind, path, action, selected, result và errors; không chỉ xuất trang đang xem, không lấy file name hay raw cell làm HTML.

### 7.6 Loading, navigation và accessibility

- Skeleton chỉ lúc chờ quyền/kho/schema ban đầu; kiểm tra lại giữ preview cũ có aria-busy và khóa Nhập tới khi kết quả mới hợp lệ. Spinner: Đang tải và đọc tệp… / Đang kiểm tra dữ liệu… / Đang nhập dữ liệu… / Đang tải mẫu…; không phần trăm giả.
- Handler mutex/session guard cho upload/preview/commit; late response file cũ không được ghi state file mới. Commit retry=false; query reads theo cơ chế hiện có.
- Dùng NextTopLoader sẵn có cho route; xác nhận rời phiên rồi mới bắt đầu progress. Cancel không navigation và không progress treo. Không animation route remount, không window.confirm/alert; unload trình duyệt chỉ dùng guard chuẩn khi cần.
- Back/Forward/route khác có guard khi chưa nhập; giữ focus hoặc đưa focus tới title bước mới/field mapping đầu lỗi. File/payload không lưu localStorage hay URL; selection trong phiên không hứa sống sau full reload.
- Form control có label, status live region polite, aria-busy, result/checkbox liên kết error; Sheet/Dialog có Title, focus trap/return focus. Badge không chỉ phân biệt bằng màu. Có thể chọn/lọc/phân trang bằng bàn phím.
- Mobile 390px/zoom 125–150–200%: toolbar wrap, không document horizontal overflow; chỉ table scroll ngang. Scroll rail dùng CSS chung mảnh 6px, không arrow hay duplicate scrollbar. Overlay/footer không che nút focus.

## 8. Đồng bộ danh mục và sơ đồ

### 8.1 Sau commit

- FE invalidate bằng pattern hiện có: `warehouses.layout(warehouseId)`, `layoutScene`, `locationsAll`, `detail`; chỉ sau response đã commit, không sau preview hoặc khi kết quả lưu chưa xác định.
- Nếu lưu thành công nhưng refresh bị lỗi, vẫn giữ Success và có `Tải lại danh mục`; không biến thành lỗi import hoặc cho gửi lại batch.
- API scene phải trả Zone/Rack/Slot mới với ID ổn định và đúng quan hệ như tạo thủ công. Click kệ/vị trí dùng editor/detail hiện tại, không một cấu trúc shadow riêng của import.
- SlotLevel: vị trí mới có mặt trong nội dung của kệ cha và mở được thông tin theo luồng hiện tại. Không yêu cầu mỗi Slot tự có một hình độc lập trên canvas nếu luồng thủ công không làm vậy.
- RackLevel: người dùng thấy kệ chứa hàng trực tiếp, không lộ `__SYSTEM_DEFAULT__`; tạo/in nhãn sau import theo quyền barcode và quy tắc hiện có.

### 8.2 Geometry và số lượng lớn

- Import ghi geometry Zone/Rack mới là chưa sắp xếp, không tọa độ giả, không gọi SaveLayoutScene. Giữ nguyên geometry/color/rotation/canvas của entity cũ.
- Tái sử dụng mapper hiện có cho gợi ý nhỏ; fallback không được xem là đã lưu hoặc bảo đảm không overlap. Chỉnh geometry là state editor, chỉ ghi khi người dùng nhấn Lưu sơ đồ và có feature/quyền.
- Bắt buộc có cách tìm/chọn mọi khu/kệ mới ngay cả khi không đủ chỗ: danh sách `Chưa sắp xếp`/cấu trúc bên sơ đồ, count và focus đối tượng. Không clamp hàng trăm đối tượng về một góc rồi coi đạt.
- Nếu bổ sung cơ chế gợi ý tránh overlap: chỉ áp đối tượng thiếu geometry, không dịch entity cũ, không tự phóng canvas/lưu. Khi không có chỗ, cho đặt thủ công từ danh sách. Khả năng này thuộc Gate C và cần duyệt đường dẫn Warehouse designer/mapper.
- Nút Mở sơ đồ mở viewer có quyền xem; từ đó chuyển chỉnh theo capability. Import không nâng cấp entitlement. Khi không có quyền chỉnh, không hứa người đó có thể Lưu sơ đồ.
- QA stale editor đang mở trước import: save cũ không được xóa entity mới/ghi đè geometry mới của người khác. **User đã duyệt ngày 11/10/2026:** tăng `WarehouseLayoutSettings.Version` trong cùng giao dịch import; nếu chưa có settings thì tạo version 1 với cấu hình mặc định hiện có. Không đổi geometry/canvas hoặc gọi SaveLayoutScene. Lần lưu từ editor mang version cũ phải trả conflict, yêu cầu tải lại.

## 9. Phạm vi file và phối hợp AI

Ban đầu tài liệu chỉ được phép viết spec. Yêu cầu triển khai tiếp theo của user đã cho phép hiện thực các đường dẫn Warehouse dưới đây; vẫn phải giữ nguyên thay đổi của các phiên khác và báo trước thay đổi shared có rủi ro cao.

Whitelist người dùng trước đó: `components/operations/BulkImport*`, `features/*/ProductImport*`, `Application/Features/Product/*Import*`, `Infrastructure/ExternalServices/Documents`; không đủ triển khai Warehouse import đúng kiến trúc.

Trước Gate A phải xin duyệt thêm các đường dẫn tối thiểu:

- BE: `Application/Features/Warehouse/*LocationImport*`, `Contract/Models/Warehouse/*Import*`, controller import chuyên biệt dưới `API/Controllers/Warehouse`; test tương ứng.
- FE: route `/warehouses/[warehouseId]/locations/import`, page/components/hooks/services/types/schema import dưới `features/warehouse`, entry button tại WarehouseLocationDirectory; tests.
- Shared additive only: route constants, query-keys nếu thực sự thiếu (ưu tiên reuse), api-endpoints. Không cần Program.cs trừ khi DI convention yêu cầu và có duyệt.
- Concurrency: optional Serializable transaction overload trong `Application/Interfaces/IUnitOfWork.cs` và Infrastructure implementation/tests, sau duyệt riêng.
- Sơ đồ: designer/mapper/cấu trúc chọn đối tượng mới chỉ khi Gate C xác nhận cần thay; phải xin duyệt trước.

Không sửa `features/transfer`, `Application/Features/Transfer`, WarehouseTask hoặc agent metadata đang dirty. Check git status trước mỗi file chung; không ghi đè sửa của AI khác. GitNexus impact trước symbol edit, detect-changes trước commit; chỉ stage explicit path và kiểm staged stat. Không commit/push tự động.

Build/test chỉ trong bản sao riêng trên ổ D, bao gồm snapshot đúng thay đổi task cần test. Không chạy dotnet build/test ở repo nguồn, không dotnet clean/pnpm install/stash/reset/checkout hoặc format cả folder. BE 7080, FE 3001; không chiếm cổng phiên Điều chuyển. Hook commit không được tự stash/format file ngoài task.

Không ghi/seed/migration/xóa `db71143`. QA ghi chỉ fixture cô lập đã chứng minh effective provider/server/database; nếu không có môi trường an toàn, dùng mock và ghi rõ giới hạn. Nếu mở BE với deployment config để chỉ đọc, bắt buộc `Database__ApplyMigrationsOnStartup=false`; nhưng kế hoạch này không yêu cầu khởi động BE deploy để kiểm import.

**Ngoại lệ QA đã được user duyệt ngày 11/10/2026:** do không có SQL Server local, được seed kho QA mới và kiểm thử ghi trên `db71143` sau khi xác nhận đích hiệu lực; tuyệt đối không xóa/reset/cleanup DB, không sửa dữ liệu kho có sẵn, không chạy migration/seed quyền hoặc hosted jobs. Đây không phải quyền dọn dữ liệu sau QA. Đích và dữ liệu giữ lại được ghi ở mục 14.

## 10. Gate triển khai và tiêu chí nghiệm thu

### Gate A — Contract, reader và nghiệp vụ BE

- Duyệt phạm vi file; template bốn mode, inspect/schema/mapping, preview, phân loại Reference/Invalid/Create và dependency.
- Test pure rules + fixture file: source rows, Text code, units/capacity, parent order và scope.
- Commit atomic và stale fingerprint, quyền/assignment, conflict/rollback; test Serializable race trên SQL Server cô lập. Không đổi schema/seed.
- Chưa cho FE hiển thị hoàn thành import nếu atomic/race chưa chứng minh.

### Gate B — FE bốn bước

- Entry và route guard, mode/templates, multi-table mapping, preview tabs/selection/dependencies, field errors, xác nhận, kết quả và export.
- Reuse visual components, không ép single-table BulkImportPage thành orchestrator workbook với boolean props tràn lan; có thể compose phần trình bày sẵn có dưới WarehouseImportView riêng.
- Mạng chậm/lỗi và late response, double click/drop, refresh failure sau success, unknown commit result. Không request ghi trùng hoặc native confirm.

### Gate C — Sơ đồ và QA xuyên suốt

- Sau cả XLSX/CSV import, entity xuất hiện trong danh mục/scene; viewer click xem được như tạo thủ công; Slots ở đúng rack, RackLevel không lộ internal slot.
- Nhiều Zone/Rack vượt canvas vẫn tìm/chọn/sắp xếp được; geometry cũ không đổi, preview/import không save layout; save thủ công có quyền/feature/version.
- Browser Edge desktop/mobile, bàn phím, reduced motion và zoom; kiểm Footer/long names/scroll. Bản sao riêng và fixture, không DB deploy.
- TypeScript, lint, test FE/BE và production build ở output tách dev. Ghi số test thực chạy, failures, giới hạn; không claim build/mock tests là QA SQL concurrency.
- Cập nhật spec + AI_REVIEW khi được phép sửa handoff file, phân biệt self-verification với independent approval.

### Ma trận test tối thiểu

| Nhóm | Trường hợp bắt buộc |
| :--- | :--- |
| Tệp | XLSX bốn mode, CSV ba mode; rỗng/hỏng/5 MiB+/501 dòng tổng; OPC/Text/số dài/formula; BOM, quoted CSV newline; header/sheet đổi thứ tự |
| Mã | Leading zero, Unicode NFC, hoa/thường, collation thực, mã trùng trong file/DB, cùng mã kệ khác khu, cùng mã Slot khác rack; hệ thống reserved code |
| Cha | DB/cùng file, cha sau con, thiếu cha, cha invalid/inactive, cross-tenant/cross-warehouse; bỏ chọn cha, chỉ chọn con, reference không cần checkbox |
| Kệ | RackLevel với/không dòng con; chính xác một internal slot; SlotLevel nhiều ô, cờ/capacity sai cấp; default không truyền sai |
| Sức chứa | None/Quantity, 0/âm/scale/overflow, unit thiếu/inactive/tenant khác; XLSX binary artifact và Text quá scale; từng cặp thông tin vật lý |
| Reference | Chỉ mã; tên trống; khai báo giống/khác; default không tạo mâu thuẫn giả; không cập nhật/audit Create/occupancy cũ |
| Quyền | View-only, configure+assigned, thiếu assignment, kho inactive, quyền bị thu hồi, đổi kho URL/payload; feature sơ đồ riêng |
| Atomic/race | Unique race; parent deactivate/mode change giữa preview/commit và trong transaction; unit inactive; save/audit fail rollback, invalid selected keys/fingerprint |
| UI | Read-only ô, 10/20/30/50 rows height tự nhiên; lỗi hidden columns, tên dài, selection đổi tab/page/filter; phụ thuộc thiếu; Reference không select |
| Mạng | Drop liên tiếp, double-click, stale response, preview retry, commit timeout/5xx không tự retry; invalidate lỗi sau success; route cancel/Back/Forward |
| Sơ đồ | Scene/list có IDs mới, view/click đúng cha, bố cục cũ nguyên vẹn; 500 dòng không làm đối tượng không tìm được; save/version/feature và stale editor |

## 11. Definition of done

- Hai cách setup chạy xuyên suốt; cùng tệp có thể chứa cha đã có và cha mới, không cập nhật cấu trúc cũ.
- Preview không ghi; import chỉ ghi tập đã xác nhận có đủ dependency, nguyên tử và có audit/quyền đúng.
- Người dùng thấy lỗi tiếng Việt ở đúng trường/dòng; không phải scroll tới cuối bảng mới tìm Kết quả; selection không mất khi đổi tab/page/toggle.
- Entity mới hiển thị và mở được trên sơ đồ như tạo thủ công; chưa sắp xếp được nói rõ, mọi entity đều có cách tìm/chọn; không ghi đè bố cục cũ.
- Đã chứng minh rollback/concurrency ở fixture an toàn và hoàn tất QA UI; nếu chưa có SQL fixture, gate concurrency vẫn chưa đạt, không gọi tính năng chuẩn production.
- Không cần migration/seed dự kiến; bất kỳ nhu cầu mới phải xin duyệt riêng. Không commit/push hoặc ghi db71143 theo spec này.

## 12. Ghi chú thiết kế và duyệt

Ponytail định hướng reuse reader/primitives và không tạo job/session framework; React/shadcn định hướng tách server state và component trình bày, semantic fields/dialog/table; UI được đối chiếu [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) ở mức yêu cầu thiết kế, không phải đã audit UI chạy thật.

Quyết định bổ sung cần duyệt trước code: cơ chế transaction Serializable, hành vi list Chưa sắp xếp cho sơ đồ lớn, và mở rộng whitelist Warehouse. Spec không hứa tự sắp xếp/lưu sơ đồ, exactly-once network replay hay sửa cấu trúc đang có.

## 13. Nhật ký triển khai — 11/10/2026

Đây là checkpoint ban đầu, được cập nhật bởi mục 14 bên dưới. Các mục chưa làm tại checkpoint này không mô tả trạng thái mới nhất. Đây là self-verification của người triển khai, chưa phải independent review hoặc xác nhận hoàn thành production.

- **Gate A — đã hiện thực phần BE:** bốn endpoint template/inspect/preview/commit; reader/mapping chung; bốn mode; phân loại Create/Reference/Invalid; kiểm tên/mã, số, kiểu kệ, đơn vị sức chứa và cặp thông tin vật lý; cha trước/sau con; dependency selection; ignored-data acknowledgement; stale fingerprint. Commit parse lại tệp, kiểm quyền/phạm vi kho, tạo theo thứ tự cha-con, audit và một lần Save trong transaction Serializable, rollback khi lỗi.
- `IUnitOfWork`/Infrastructure chỉ thêm overload isolation; giữ nguyên phương thức giao dịch cũ. GitNexus báo Critical cho phương thức transaction dùng chung trước sửa; đã thông báo user. API dùng cùng quyền ConfigureLayout, không có permission/seed/schema mới.
- **Gate B — mới có nền tảng:** schema Zod, types BE→FE, service multipart và test schema. Chưa có hook/orchestrator, route, entry button hoặc giao diện bốn bước; không xem là đã làm xong FE.
- **Gate C — chưa thực hiện:** integration UI/sơ đồ, placement list, browser/mobile/zoom/accessibility, full production build FE và concurrency/rollback SQL Server.
- QA trong `D:/Kovia-QA/WarehouseLocationImport-20261011`: BE API build đạt 0 warning/error. 21 test mới đạt trong harness cô lập; bộ hồi quy Warehouse/Spreadsheet trong Application.Tests đạt 287/287. SQLite in-memory test xác nhận provider/target trước mở transaction; mock/SQLite không chứng minh SQL Server locking.
- Lần chạy test BE với `--no-restore` đầu tiên lỗi ClosedXML do assets copy cũ; restore trong bản sao khắc phục, không sửa luồng báo cáo. Không có SQL Server local trên máy; chưa chạy kiểm thử SQL Server race. Không seed/migration/startup/write vào db71143.
- GitNexus index-only refresh hai repo đã hoàn tất, không sửa guidance. MCP detect-changes chưa bao quát các file mới untracked; không dùng số Low của scan làm bằng chứng review toàn feature. Kiểm tra source/test/diff bổ sung là bắt buộc.
- Không commit/push. Metadata/WarehouseTask đang dirty từ trước giữ nguyên.

Còn phải làm: UI/hooks/navigation/cache invalidation; kiểm thử commit chứa RackLevel + internal slot và nhóm cha-con bằng fixture relational; race trên SQL Server cô lập; viewer/designer hiển thị/chọn đủ entity mới mà không thay geometry cũ; QA FE xuyên suốt và cập nhật kết quả thật trước đóng gates.

## 14. Checkpoint BE, FE, sơ đồ và SQL Server — 11/10/2026

### Phần đã hiện thực

- Gate A: endpoint/contract/schema/mapping/template/preview/commit cho bốn mode. Mã đường dẫn được kiểm đúng tenant/kho; Reference không cập nhật; cha cùng tệp được chọn rõ; tạo RackLevel có đúng một internal slot, không tính thành ô người dùng. Commit reparse, recheck quyền, lock capacity, Serializable, kiểm fingerprint và tập chọn, lưu entity/audit/version trong cùng giao dịch.
- Gate B: entry `Nhập từ tệp`, route `/warehouses/[warehouseId]/locations/import`, hook/service/schema và giao diện bốn bước. Dùng workspace, mapping table, feedback, list panel, pagination, file picker và xác nhận rời phiên dùng chung; không thêm thư viện/animation route. Quyền hiệu lực được kiểm cả BE và FE; không dùng Owner bypass cho import.
- Bước 3: tabs khu vực/kệ/vị trí, đọc-only, tìm/lọc, chọn trang/cả tệp, giữ lựa chọn qua đổi trang/lọc/mở cột, chiều cao theo số dòng/trang. Kết quả ở cạnh dòng nguồn; lỗi thuộc cột ẩn vẫn hiện. Bỏ chọn cha chặn nhập con và yêu cầu chọn lại cha hoặc bỏ các dòng phụ thuộc. Dữ liệu không nhập phải được xác nhận rõ.
- Trạng thái upload/preview/template/commit, synchronous lock chống thao tác lặp, không retry ghi. Kết quả lưu chưa xác định giữ khóa ghi ngay cả sau preview lại. Lỗi làm mới cache không biến commit đã thành công thành lỗi nhập. Bước 4/export vẫn giữ lý do các dòng không nhập.
- Sơ đồ: mapper thêm metadata UI `placementPending`, không đưa flag vào payload lưu. Danh sách `Chưa sắp xếp` dùng Sheet/list/search/pagination để tìm/chọn tất cả khu/kệ mới, kể cả 500 mục. Chọn real ID theo luồng viewer/designer; không gọi API lưu bố cục. Import bump version đã được user duyệt; editor version cũ bị conflict trước sửa geometry.

### Kiểm thử thực chạy

- Tất cả build/test ở bản sao trên D: `D:/Kovia-QA/WarehouseLocationImport-20261011`; không chạy build trong repo nguồn. BE API build: 0 warnings/errors. **28 test WarehouseLocationImportTests đạt**, gồm scope/permission, parent/dependency, numeric/Text precision, template tiếng Việt, selection, transaction overload, real ID/internal slot và stale editor. Bộ Warehouse/Spreadsheet ở checkpoint trước: 287 đạt.
- Full BE snapshot: **1.196 đạt / 14 lỗi / 1 bỏ qua (1.211 tổng)**, trước năm test scope/selection bổ sung cuối. Cả 14 lỗi tái hiện trên baseline HEAD riêng: GetInventoryQueryHandlerTests (9), InboundOperationalEditingTests (4), TenantRolePermissionTests cache inactive user (1). Không sửa các luồng ngoài task.
- FE: **23 test focused / 7 file đạt** (bao gồm các mapper regression có sẵn); TypeScript và scoped ESLint đạt. Production build Next 16.2.7 Turbopack đạt, route mới xuất hiện. Full FE snapshot trước hai test dependency/ack cuối: **845 đạt / 1 lỗi (846 tổng)**; ReceiptTables.test kỳ vọng `Kệ KE-01` khác nhãn có `(không chia ô)`, tái hiện trên baseline HEAD (1 lỗi/5 đạt). Không sửa phiếu nhận hàng.
- Edge headless production UI, API fixture chặn toàn bộ request API/hub, không dùng tài khoản thật: upload qua file chooser → mapping → preview 500 dòng → xác nhận bằng bàn phím → kết quả. Kiểm lỗi cột mô tả đang ẩn/mở, tên dài không đẩy Kết quả, chọn 498 mục vẫn giữ sau lọc/mở cột, dialog hủy rời trang giữ phiên. Desktop 1440×900, mobile 390×844: document width đúng viewport, table scroll trong container (mobile 364px/900px); reduced-motion được bật. Focus vào heading bước kết quả. Screenshot: `output/playwright/import-mobile.png` và `.playwright-cli/page-2026-10-11T07-15-05-939Z.png` dưới QA root. Realtime console errors do chủ động chặn hubs, không phải bằng chứng import lỗi.

### QA SQL Server đã được phép, không migration hoặc cleanup

- Đọc đúng khóa `SqlServerConnection`; resolve DbContext bằng cấu hình ứng dụng, kiểm provider và connection thực tế trước ghi: **Microsoft.EntityFrameworkCore.SqlServer / db71143.public.databaseasp.net / db71143**; `SELECT DB_NAME()` xác nhận. `Database__ApplyMigrationsOnStartup=false`; read-only pending migration check không có migration chờ.
- Không start host/Quartz/PayOS/migration/seed quyền. Private console harness gọi reader, access policy, preview/commit, EF UnitOfWork và audit logger thật; permission service dùng fixture Owner, **không phải kiểm thử HTTP JWT/controller authorization**.
- Tạo đúng một kho QA: **QA-LI-20261011070247**, ID **120da76e-81f8-4fa8-a6b9-5cb2c6685cfa**. Preview không tạo dòng; nhập khu/kệ/vị trí CSV, RackLevel internal slot, mã kệ giống nhau khác khu, capacity gắn đơn vị có sẵn, occupancy 0 và Vacant đều đạt.
- Hai commit cùng source/fingerprint chạy đồng thời: một lưu, một stale conflict; đúng một dòng RACE. Inject lỗi sau SaveChanges SQL thật nhưng trước transaction commit: không giữ Zone/audit dở dang. Đây là rollback của **giao dịch tạo mới của task**, không rollback migration/destructive operation trên DB.
- Dữ liệu giữ lại: **3 khu, 2 kệ, 3 ô (1 internal), 7 import audit**, layout version 4. Không xóa/cleanup, không đổi kho có sẵn, không tạo tồn kho hoặc cấp quyền. Không tự chạy lại harness `--qa` (sẽ tạo thêm kho).

### Chưa nghiệm thu hết Gate C

- Chưa chạy toàn bộ journey browser → HTTP BE thật → danh mục/sơ đồ → lưu bố cục trên kho QA. Mapper/list 500 mục và stale-save handler đã test, chưa có browser nghiệm thu tất cả viewer/designer/click/placement cases.
- SQL Server đã chứng minh unique race và rollback, chưa ép hết race cha deactivate/đổi storageMode, unit inactive và quyền thu hồi **trong** transaction. Các kiểm quyền/phạm vi/stale state hiện có là handler/fixture tests, không thay thế HTTP authorization matrix.
- Chưa nghiệm thu zoom trình duyệt thật 125–150%, đọc bằng screen reader, Back/Forward đầy đủ và toàn bộ bộ XLSX/CSV xấu ở mọi mode. Shared reader có regression tests nhưng không được coi là ma trận riêng của tính năng đã đủ.
- GitNexus index-only refresh đã chạy; impact shared transaction Critical và DesignerToolbox High đã được báo trước sửa. Final unstaged scan chứa cả thay đổi của phiên Điều chuyển, báo Critical; không diễn giải thành review riêng import. File mới untracked chưa được scan bao quát; phải review trực tiếp source/contract/test.
- Ponytail giữ reuse reader/components/concurrency token, không thêm dependency hoặc speculative framework. Đây là implementation/self-verification, **chưa đóng toàn bộ Definition of done, chưa independent approval**. Không stage/commit/push; giữ nguyên sửa của phiên Điều chuyển/WarehouseTask và metadata.

## 15. Sửa ba finding từ self-review — 11/10/2026

- Theo yêu cầu user: sửa lưu tọa độ tạm, chọn vị trí chưa sắp xếp không đưa khung nhìn tới đối tượng, và bộ lọc/phân trang dùng chung giữa tabs. Không sửa BE/API/schema hoặc ghi DB.
- Khu/kệ chưa có geometry tiếp tục là **Chưa sắp xếp**. Tọa độ fallback chỉ dùng hiển thị, không tự tạo thay đổi cần lưu và không được gửi trong payload. Chỉ thao tác đặt/di chuyển/đổi hình học rõ ràng của từng entity mới xóa cờ pending của entity đó; Undo/Redo và refetch giữ đúng trạng thái. Kích thước canvas không tự xác nhận placement. Đổi màu khu/kệ pending bị chặn và hướng dẫn đặt vị trí trước, tránh mất thay đổi màu khi lưu; khu/kệ đã đặt vẫn đổi màu bình thường. Save vẫn gửi geometry đang có của các entity đã được đặt, không làm mất khu cha chưa sắp xếp khi chỉ đặt một kệ con.
- Chọn từ danh sách chờ panel đóng rồi chọn real ID, đưa vùng nhìn tới bounds đã tính rotation và đưa focus bàn phím về canvas. Desktop/mobile, viewer/designer dùng cùng thao tác canvas; không sửa tọa độ, tự lưu hoặc đổi hành vi click thường trên sơ đồ. Không thêm timer/dependency/animation chuyển trang.
- Mỗi tab khu/kệ/vị trí lưu riêng tìm kiếm, lọc hành động, trang, số dòng/trang và mở rộng cột. Lựa chọn hàng vẫn thuộc toàn workbook.
- QA bản sao trên D: **131 test Warehouse / 26 file đạt**, TypeScript, lint và production build Turbopack đạt. Regression 500 kệ → chỉ đặt một → payload/save/reload giữ 499 mục pending; có kiểm Undo/Redo, refetch, khu cha, canvas/color và bộ lọc tabs.
- Edge production với API fixture chặn toàn bộ traffic API/hub: viewer/designer desktop 1440×900, mobile 390×844, non-fit zoom, đóng panel/focus, reduced-motion desktop và save một kệ giữ 499 pending đều đạt. Save chỉ tới interceptor giả lập, **không phải nghiệm thu lưu vào BE/SQL thật**. Artifacts ở `D:/Kovia-QA/WarehouseLocationImport-20261011/output/playwright`; cổng QA/browser của lượt này đã dừng.
- Ba finding đã xử lý ở mức implementation/self-verification. Chưa đóng Gate C toàn bộ: journey HTTP/BE thật, ma trận phân quyền/race còn lại, native zoom/Back–Forward và audible screen reader vẫn cần nghiệm thu riêng. Không commit/push, không migration/seed/cleanup.

## 16. Commit và kiểm thử Gate C bổ sung — 11/10/2026

- User yêu cầu commit trước, rồi kiểm thử. Đã commit BE `0c1b4b3f` và FE `3e6f129`; không push. Chỉ stage file import/tích hợp sơ đồ và tài liệu; không stage AGENTS/CLAUDE hoặc Điều chuyển/WarehouseTask. Viewer picker đã nằm trong commit của phiên Điều chuyển trước đó, không đưa lại vào commit import. Hook FE được tắt đúng lượt commit vì lint-staged có thể tự stash; kiểm tra riêng đã chạy, không stash/reset/format toàn repo.
- Snapshot HEAD được xuất sang bản sao D. FE production build với API QA 7080 đạt; scoped ESLint toàn bộ file TypeScript trong commit đạt; **134 test Warehouse / 27 file đạt** (bao gồm test đã được phiên khác commit). BE focused suite **28 đạt**; thêm **16 check riêng trên D**: XLSX bốn mode, CSV ba mode/BOM/newline/dòng nguồn, đúng 500/vượt 500/rỗng/hỏng/quá dung lượng, đổi trạng thái cha/kiểu kệ/ĐVT trước hoặc trong transaction, thu hồi quyền/phân công tại lần kiểm trong transaction. Tổng harness BE **44 đạt**. Các check stale-state dùng repository/permission mocks, không phải race SQL đồng thời. Harness ở `Checks/GateCFileMatrixTests.cs` và `Checks/GateCStaleStateTests.cs`; fixture được mở quyền truy cập chỉ ở bản sao QA, không sửa source test.
- HTTP QA host riêng dùng controller, JWT/session validation, permission service, MediatR pipeline, reader/handler/EF/audit thật. Tắt toàn bộ IHostedService/Quartz, không gọi startup migration/seed/PayOS webhook. Có allowlist ghi: login/refresh và import/lưu layout của duy nhất kho QA `120da76e-81f8-4fa8-a6b9-5cb2c6685cfa`. Trước ghi đã xác nhận DI-resolved provider **Microsoft.EntityFrameworkCore.SqlServer**, server **db71143.public.databaseasp.net**, database **db71143**; DB_NAME() đúng, pending migrations rỗng. Đây là ngoại lệ QA đã duyệt, không phải cho phép chạy job, repair hoặc cleanup.
- HTTP thật đạt: anonymous bị 401 ở bốn endpoint; Staff bị 403 do thiếu quyền; Manager bị 403 với thông báo chưa được phân công kho QA; Owner preview được và scene/version không đổi. Template cả bốn mode tải/inspect được. Rỗng/hỏng/quá 5 MiB/CSV Structure/501 dòng/selection key lạ/thiếu cha bị từ chối. Kho không tồn tại trả 404; chèn tenantId vào options bị 400. Không sửa quyền tài khoản để ép ma trận.
- CSV tạo một khu; XLSX Structure với sheet con trước cha tạo một khu, hai kiểu kệ và một vị trí thường bằng giao dịch thật. Scene có đúng ID/quan hệ cha; internal slot không lộ như ô thường. Import giữ nguyên geometry/canvas cũ, bump version mỗi lần. Lưu layout với version trước import trả 409; lưu thủ công đúng version cho khu CSV, tải lại tọa độ x=20 và hai kệ nhập chưa đặt vẫn x=null. Read-only EF xác nhận kệ CQA-D có đúng một internal slot.
- Giữ nguyên kho QA: trước lượt này 3 khu/2 kệ/3 slot (1 internal), version 4; sau **5 khu/4 kệ/5 slot (2 internal), version 7**. Lượt này thêm 2 khu, 2 kệ, 1 slot thường, 1 internal; không cleanup/xóa hoặc sửa kho có sẵn. Đã lưu geometry chỉ cho khu QA mới CQA-HTTP-1791708592851, ID `01a12a27-e4bd-7600-bb85-db7c561b6d5d`; khu CQA-Z `01a12a28-e755-78bb-a053-ffacb82c565d`; kệ CQA-D `01a12a28-e755-7466-a809-53772ef7513a`, CQA-R `01a12a28-e755-7144-a6ba-5a21409ea4c9` còn chưa đặt. Login đúng credential tạo LastLogin/audit phiên theo ứng dụng bình thường; không seed/đổi permission.
- Artifacts: `D:/Kovia-QA/WarehouseLocationImport-20261011/output/playwright/http-gate-c.mjs`, hai phase result JSON, `http-gate-c-boundaries.mjs` và result; `HttpChecks/Program.cs`; `SqlChecks/Program.cs --http-evidence` chỉ đọc. QA script ban đầu nhầm tên field sheet và version; đã sửa theo DTO và tiếp tục riêng phase Structure, không nhập lại khu CSV. Probe capability trong boundary artifact dùng sai literal dấu gạch dưới; giá trị configure=false đó không dùng làm assertion và không phải bằng chứng Manager thiếu quyền; thông báo scope 403 thật được giữ nguyên. Không ghi token/mật khẩu vào evidence JSON. Không tự chạy lại script tạo dữ liệu; dữ liệu đã tồn tại sẽ là Reference.
- **Gate C vẫn mở:** FE QA `next start -p 3001` bị execution policy từ chối. Không thử cách khác để vượt chặn; vì vậy chưa chạy browser → FE → HTTP BE thật, click/chọn/đặt bằng browser trong lượt này. UI Edge/mock từ checkpoint trước là bằng chứng riêng, không ghép thành journey thật. Chưa nghiệm thu native zoom 125–150%, Back/Forward/screen reader, full HTTP assigned/view-only/revocation/cross-tenant matrix và race SQL parent/mode/unit trong transaction. Các check mock mới không thay thế các phần đó. Không phát hiện lỗi feature mới trong những check đã chạy, không gọi toàn bộ DoD hoàn thành.
- Cổng BE QA 7080 của lượt này đã dừng; FE QA không mở được. Không commit tự động phần kết quả QA sau hai commit đã yêu cầu. Không sửa source/API/schema mới, không migration/seed quyền, không chạm thay đổi migration/Điều chuyển/WarehouseTask của phiên khác.
