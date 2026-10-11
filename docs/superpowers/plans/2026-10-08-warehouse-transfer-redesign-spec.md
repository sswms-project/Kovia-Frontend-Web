# Kovia — Thiết kế lại luồng Điều chuyển kho

Ngày: **2026-10-08**  
Trạng thái: **Spec để duyệt; chưa triển khai chức năng.**  
Phạm vi: **Backend → Frontend logic → UI/UX**, kèm cập nhật UC 82–88 trong checklist.  
Nhánh làm việc: BE `feat/huytv`, FE `screen/huytv`. Không tự tạo nhánh khác.

## 1. Mục tiêu và quyết định đã chốt

Điều chuyển là việc **chủ doanh nghiệp (Owner) yêu cầu chuyển hàng giữa hai kho**; **Manager** của kho theo dõi, chia đợt và giao việc; **Staff** lấy hàng, xuất, nhận và cất hàng bằng quét mã. Mọi thay đổi được cập nhật **realtime** cho người liên quan.

| Nội dung                 | Quyết định                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Người tạo yêu cầu        | Owner; Manager tạo được khi Owner cấp quyền `transfers:create` (kiểm quyền hiệu lực, không theo tên vai trò)                          |
| Nháp                     | Có. “Lưu nháp” không giữ chỗ, Manager chưa thấy; mở lại để soạn tiếp hoặc xóa nháp                                                    |
| Gửi yêu cầu              | “Tạo yêu cầu” kiểm tồn khả dụng và **giữ chỗ ngay**; thiếu tồn → chặn, hiển thị tồn còn lại                                           |
| Phân bổ vị trí/lô        | Hệ thống tự phân bổ khi gửi: FEFO (lô có hạn), FIFO (không hạn). Owner không chọn vị trí/lô                                           |
| Tiếp nhận                | **Không có bước tiếp nhận.** Manager kho xuất thấy phiếu ngay và có nút **Phản hồi** (báo vấn đề + lý do), không chặn phiếu           |
| Đợt xuất                 | **Nhiều đợt** từ bản đầu. Manager kho xuất tạo đợt và giao task lấy hàng                                                              |
| Lấy hàng                 | Quét vị trí → quét hàng → **SL tự điền** bằng SL cần lấy → Staff đối chiếu, xác nhận                                                  |
| Đổi vị trí/lô khi lấy    | Staff **tự đổi** khi vấn đề đơn giản (bắt buộc lý do); vượt khả năng → **Báo Manager** quyết định                                     |
| Lô không theo FEFO       | Được, bắt buộc lý do, hệ thống cảnh báo                                                                                               |
| Hàng hỏng tại vị trí lấy | Staff chỉ báo lý do “Hàng hỏng” và đổi vị trí; **không tự chuyển** trạng thái chất lượng; hệ thống gợi ý Manager kiểm kê/điều chỉnh   |
| Nhận hàng                | Quét vị trí đến, SL tự điền bằng SL đã xuất của đợt, Staff sửa nếu lệch; kiểm sức chứa; **mỗi đợt nhận một lần**                      |
| Chênh lệch               | Gồm **SL hỏng** (nhập kho đích dạng Damaged) và **SL thiếu**, kèm nguyên nhân; Manager kho nhập xử lý                                 |
| Sửa phiếu                | Owner sửa (tăng/giảm/thêm dòng) **mọi phần hàng còn trong kho**; phần đã xuất không sửa                                               |
| Hủy / dừng               | “Hủy phiếu” khi chưa xuất đợt nào; “Dừng phần còn lại” khi đã xuất ít nhất một đợt                                                    |
| Hoàn tất                 | Tự động khi mọi dòng khớp; không có nút đóng phiếu                                                                                    |
| Realtime                 | Mọi thao tác phát sự kiện realtime; màn hình tự cập nhật; server là nguồn đúng                                                        |
| Ngoài phạm vi            | Điều chuyển nội bộ vị trí trong một kho (đã có task Relocation), điều chuyển nhiều kho một phiếu, lệnh điều động/phương tiện bắt buộc |

**Không có chế độ ghi đè/xóa dữ liệu.** Việc duyệt hoặc triển khai spec này không cho phép xóa, reset hay recreate `db71143`.

## 2. Căn cứ và hiện trạng đã kiểm tra

### 2.1. AMIS (khảo sát 2026-10-07, chỉ xem, không lưu)

- Có ba tab: Yêu cầu điều chuyển, Điều chuyển, Điều chuyển nhiều kho.
- Yêu cầu: ngày yêu cầu, hạn giao hàng, lý do, kho xuất/kho nhập, người/bộ phận yêu cầu; dòng hàng có SL yêu cầu → SL điều chuyển → SL thực nhận.
- Phiếu điều chuyển “Lập từ yêu cầu điều chuyển”; dòng có vị trí đi, vị trí đến, ĐVT + tỷ lệ chuyển đổi, SL theo ĐVT chính, SL thực nhận, chênh lệch, tình trạng xử lý chênh lệch, nguyên nhân chênh lệch, đánh dấu đủ, lô, hạn sử dụng.
- Tình trạng thực hiện là nhãn hệ thống tự cập nhật (ví dụ “Chờ nhập kho”).
- Kovia **gộp yêu cầu và phiếu thành một chứng từ** vì quan hệ 1–1; nhiều lần thực hiện được biểu diễn bằng **đợt xuất**.

### 2.2. Backend hiện có

- `StockTransfer` / `StockTransferItem`; status lưu dạng **string** (`HasConversion<string>`), có `RowVersion` làm concurrency token.
- Trạng thái hiện có: `PendingSourceApproval`, `Approved`, `InTransit`, `Completed`, `ReceivedWithVariance`, `Rejected`, `Cancelled` (Cancelled chưa có API dùng).
- API hiện có: `GET /api/transfers`, `GET /{id}`, `GET source-warehouses`, `GET source-inventory`, `POST`, `POST /{id}/approve|reject|dispatch|receive`.
- Create: chọn sẵn vị trí nguồn **và vị trí đích**, kiểm tồn khả dụng và sức chứa, chưa giữ chỗ.
- Approve: chặn người tạo tự duyệt (kể cả Owner), giữ chỗ qua `InventoryReservation` (ReferenceType `StockTransfer`, ReferenceId = item).
- Dispatch: xuất toàn bộ một lần, `TransferOut` từ vị trí nguồn, tiêu thụ reservation.
- Receive: nhận một lần, `TransferIn` thẳng vào vị trí đích; hỏng/thiếu tạo `StockAdjustment` Pending với `QuantityChange = 0`; **không có lối đưa `ReceivedWithVariance` về Completed**.
- Quyền: `transfers:view|create|approve|dispatch|receive` (`Application/Permissions/Transfer/TransferPermissions.cs`).
- Tái sử dụng được:
  - `WarehouseTask` (giao việc, bắt đầu, tạm dừng, hoàn tất, hủy; có `RowVersion`), hiện chỉ loại `Relocation`, **chưa có trường tham chiếu chứng từ**.
  - Mẫu lấy hàng xuất kho: `StockIssuePickDetail` + vị trí `Slot.IsOutboundStaging` + `MovementType.Pick`.
  - Cất hàng nhập kho: `PutAwayStock`.
  - `Slot.BarcodeValue`, barcode sản phẩm; hiện **chưa có bước quét để xác nhận**.
  - `QualityStatus.Good|Damaged|Quarantine`; luồng `StockAdjustment` có duyệt; `CycleCount`; luồng hàng hỏng `DecideDamageCaseDisposition`.
  - Realtime: `NotificationHub` (`/hubs/notifications`), publisher gửi theo user; **chưa có nhóm theo chứng từ**.

### 2.3. Frontend hiện có

- `src/features/transfer/` có `TransferPage`, `TransferCreatePage`, `TransferDirectory`, `TransferDetailSheet`, dialog Approve/Reject/Dispatch/Receive, `TransferStatusBadge`.
- Route `/transfers`, `/transfers/new`; quyền `P.TRANSFERS_*` trong `src/config/permissionCodes.ts`.
- `src/features/warehouse-task/` cho task kho; `notification-realtime.service.ts` dùng `@microsoft/signalr`.

### 2.4. Hướng dẫn áp dụng

- Đọc `AGENTS.md` workspace và hai repo, `.rules` hai repo, FE `docs/CODING_GUIDELINES.md`, `DESIGN_SYSTEM.md`, `LIST_TABLE_DESIGN_GUIDELINES.md`, `AI_WORKFLOW.md`, `src/app/index.css`.
- GitNexus impact trước khi sửa symbol, detect changes trước commit được ủy quyền.
- Ưu tiên mở rộng code sẵn có; không dựng workflow engine/generic document framework.

## 3. Vai trò, quyền và phạm vi kho

| Hành động                                                                   | Mặc định thực hiện                        | Quyền                                         | Phạm vi kho                           |
| --------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------- | ------------------------------------- |
| Tạo/sửa nháp, gửi yêu cầu                                                   | Owner (Manager nếu được cấp)              | `transfers:create`                            | Có quyền với kho xuất **và** kho nhập |
| Sửa yêu cầu đã gửi                                                          | Owner: mọi phiếu; Manager: phiếu mình tạo | `transfers:create`                            | Như trên                              |
| Hủy phiếu / Dừng phần còn lại                                               | Người tạo, Owner                          | `transfers:cancel` (mới)                      | Như trên                              |
| Xem                                                                         | Owner, Manager, Staff                     | `transfers:view`                              | Kho xuất hoặc kho nhập                |
| Phản hồi / báo vấn đề                                                       | Manager kho xuất (cả kho nhập)            | `transfers:dispatch` hoặc `transfers:receive` | Kho tương ứng                         |
| Tạo đợt, giao task lấy hàng, xử lý báo cáo lấy hàng                         | Manager kho xuất                          | `transfers:dispatch`                          | Kho xuất (Manage)                     |
| Lấy hàng, đổi vị trí/lô, báo Manager, trả hàng về vị trí, xác nhận xuất đợt | Staff kho xuất                            | `transfers:pick` (mới)                        | Task được giao tại kho xuất           |
| Giao task nhận hàng                                                         | Manager kho nhập                          | `transfers:receive`                           | Kho nhập (Manage)                     |
| Nhận và cất hàng                                                            | Staff kho nhập                            | `transfers:receive`                           | Task được giao tại kho nhập           |
| Xử lý chênh lệch                                                            | Manager kho nhập                          | `transfers:resolve` (mới)                     | Kho nhập                              |

- `transfers:approve` không còn dùng trong luồng mới; giữ hằng số để không vỡ phân quyền đã gán, đánh dấu deprecated, gỡ khỏi UI.
- Manager tạo/thao tác được thay Staff khi có quyền tương ứng (Owner giữ toàn quyền tenant theo BR-07).
- Duyệt `StockAdjustment` phát sinh từ chênh lệch **theo luồng duyệt điều chỉnh hiện có** (BR-61/BR-104); xử lý chênh lệch không tự cấp quyền duyệt điều chỉnh.
- Mọi API kiểm tenant từ `IUserContext`, quyền hiệu lực và phạm vi kho phía BE; FE chỉ điều khiển hiển thị.

## 4. Mô hình dữ liệu

Tên bảng/cột là **đề xuất**; Gate A chốt sau khi rà mapping EF. Mọi entity mới có `TenantId`, `RowVersion` nếu có cập nhật đồng thời.

### 4.1. Phiếu — `StockTransfer` (mở rộng)

Thêm: `Reason`, `RequiredBy` (hạn cần hàng), `Note`, `SubmittedAt`, `SubmittedBy`, `CancelledAt/By`, `CancellationReason`, `StoppedAt/By`, `StopReason`, `CompletedAt`, `HasOpenFeedback` (cờ cần Owner xử lý). Giữ các cột cũ để đọc dữ liệu lịch sử.

### 4.2. Dòng hàng — `StockTransferItem` (mở rộng)

| Trường                                                               | Ý nghĩa                                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `UnitId`, `ConversionFactor`                                         | ĐVT người tạo chọn và tỷ lệ chụp lại lúc gửi                         |
| `RequestedQuantity`                                                  | SL yêu cầu theo ĐVT đã chọn                                          |
| `RequestedBaseQuantity`                                              | SL yêu cầu theo ĐVT chính (mọi tính toán tồn dùng số này)            |
| `BatchedQuantity`                                                    | Tổng SL đã đưa vào các đợt chưa hủy                                  |
| `PickedQuantity`                                                     | Tổng SL đã lấy ra staging, chưa xuất                                 |
| `DispatchedQuantity`                                                 | Tổng SL đã xuất khỏi kho                                             |
| `ReceivedGoodQuantity`, `ReceivedDamagedQuantity`, `MissingQuantity` | Tổng nhận tốt / nhận hỏng / thiếu                                    |
| `ResolvedMissingQuantity`                                            | SL thiếu đã xử lý (nhận bổ sung hoặc ghi nhận thất thoát được duyệt) |
| `StoppedQuantity`                                                    | SL bị dừng/hủy, không chuyển nữa                                     |

`SourceSlotId`, `DestinationSlotId`, `LotId` trên dòng chuyển sang **nullable/không dùng cho luồng mới**; vị trí/lô thực tế nằm ở phân bổ, chi tiết lấy hàng và chi tiết nhận.

**Bất biến mỗi dòng (theo ĐVT chính), kiểm ở BE trước mọi SaveChanges:**

```
RequestedBase = Unbatched + Batched + Stopped
Batched       = (đang chờ lấy) + Picked + Dispatched           // của các đợt chưa hủy
Dispatched    = InTransit + ReceivedGood + ReceivedDamaged + Missing
Reserved      = Unbatched + (đang chờ lấy)                      // Picked đã nằm ở staging
Completed khi: Unbatched = 0, không còn đợt mở, Missing = ResolvedMissing, không còn báo cáo mở
```

### 4.3. Bảng mới

| Bảng                         | Mục đích                                      | Trường chính                                                                                                                                                                                      |
| ---------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StockTransferAllocation`    | Phân bổ giữ chỗ theo vị trí/lô                | ItemId, InventoryStockId, InventoryReservationId, AllocatedQuantity, IsFefoOrder, CreatedAt                                                                                                       |
| `StockTransferShipment`      | Đợt xuất                                      | TransferId, ShipmentNumber, Status, PickTaskId, ReceiveTaskId, DispatchedAt/By, ReceivedAt/By, CancelledAt/By/Reason                                                                              |
| `StockTransferShipmentLine`  | SL của dòng trong đợt                         | ShipmentId, ItemId, PlannedQuantity, PickedQuantity, DispatchedQuantity, LineStatus                                                                                                               |
| `StockTransferPickDetail`    | Mỗi lần lấy hàng (mẫu `StockIssuePickDetail`) | ShipmentLineId, AllocationId, InventoryStockId, StagingInventoryStockId, LotId, PickedQuantity, PickedBy/At, ScannedSlotCode, ScannedProductCode, ReturnedQuantity, ReturnedAt/By                 |
| `StockTransferPickException` | Đổi vị trí/lô, lấy thiếu, báo Manager         | ShipmentLineId, Type (SwitchLocation/SwitchLot/ShortPick/Escalate), ReasonCode, Note, FromAllocationId, ToInventoryStockId, Quantity, Status (Resolved/PendingManager), ResolvedBy/At, Resolution |
| `StockTransferReceiptLine`   | Nhận hàng của đợt                             | ShipmentLineId, DestinationSlotId, GoodQuantity, DamagedQuantity, MissingQuantity, ReasonCode, Note, ReceivedBy/At, ScannedSlotCode                                                               |
| `StockTransferDiscrepancy`   | Chênh lệch cần xử lý                          | ItemId, ShipmentId, Type (Damaged/Missing), Quantity, ReasonCode, Status (Open/Resolved), Resolution (LateReceipt/LossAdjustment/DamageCase), LinkedStockAdjustmentId?, ResolvedBy/At             |
| `StockTransferFeedback`      | Phản hồi Manager ↔ Owner                      | TransferId, ItemId?, AuthorId, ReasonCode, Message, Status (Open/Answered/Closed), CreatedAt                                                                                                      |
| `StockTransferRevision`      | Lịch sử sửa phiếu                             | TransferId, ItemId?, Field, OldValue, NewValue, ChangedBy/At                                                                                                                                      |

`WarehouseTask` mở rộng: `ReferenceType`, `ReferenceId` (nullable, có index), thêm `WarehouseTaskType.TransferPick`, `TransferReceive`, `TransferReturn` (trả hàng về vị trí). Cột `TaskType` là string(30) nên thêm giá trị không đổi kiểu cột.

### 4.4. Migration (cần duyệt riêng)

- Thêm cột/bảng/index ở 4.1–4.3; cho phép null các cột vị trí cũ.
- **Dữ liệu cũ:** ánh xạ trạng thái cũ sang mô hình mới theo bảng dưới. Trước khi viết migration dữ liệu, chạy **truy vấn đọc** đếm số phiếu theo trạng thái và báo người dùng. Không xóa, không sửa hàng loạt ngoài ánh xạ đã duyệt.

| Cũ                    | Mới (đề xuất)                                        | Ghi chú                                                                   |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| PendingSourceApproval | Draft                                                | Chưa có giữ chỗ; Owner gửi lại để giữ chỗ                                 |
| Approved              | InProgress                                           | Tạo `StockTransferAllocation` từ reservation hiện có (ReferenceId = item) |
| InTransit             | InProgress + 1 đợt `InTransit`                       | Đợt mang SL `DispatchedQuantity` cũ                                       |
| Completed             | Completed + 1 đợt `Received`                         |                                                                           |
| ReceivedWithVariance  | AwaitingResolution + 1 đợt `ReceivedWithDiscrepancy` | Tạo `StockTransferDiscrepancy` Open từ Damaged/Missing cũ                 |
| Rejected              | Cancelled                                            | Giữ `RejectionReason` làm lý do hủy                                       |
| Cancelled             | Cancelled                                            |                                                                           |

- Theo `AGENTS.md`: khi tới bước migration, **dừng**, báo tên migration và tác động, chờ cho phép rồi mới chạy trên `db71143`. Chạy BE local luôn đặt `Database__ApplyMigrationsOnStartup=false`.

## 5. Trạng thái

### 5.1. Trạng thái phiếu

```
Draft ──gửi──► InProgress ──────────────► Completed
  │               │  └──► AwaitingResolution ──► Completed
  └──xóa nháp     └──► Cancelled  (chỉ khi chưa xuất đợt nào)
```

| Mã                 | Nhãn                 | Ý nghĩa                                                |
| ------------------ | -------------------- | ------------------------------------------------------ |
| Draft              | Nháp                 | Chưa giữ chỗ, chỉ người tạo thấy                       |
| InProgress         | Đang thực hiện       | Đã giữ chỗ; có thể đang chia đợt, lấy, xuất, nhận      |
| AwaitingResolution | Chờ xử lý chênh lệch | Toàn bộ đã xuất hết/dừng và đã nhận, còn chênh lệch mở |
| Completed          | Hoàn tất             | Bất biến hoàn tất ở 4.2 thỏa mãn                       |
| Cancelled          | Đã hủy               | Hủy trước khi xuất đợt nào; mọi giữ chỗ đã nhả         |

“Dừng phần còn lại” **không** là trạng thái riêng: nó chuyển SL chưa xuất sang `StoppedQuantity`, phiếu tiếp tục cho tới khi các đợt đã xuất được nhận và xử lý xong.

### 5.2. Tiến độ (hệ thống tự tính, hiển thị như “Tình trạng thực hiện”)

| Cột             | Giá trị                                |
| --------------- | -------------------------------------- |
| Tình trạng xuất | Chưa xuất · Xuất một phần · Đã xuất đủ |
| Tình trạng nhận | Chưa nhận · Nhận một phần · Đã nhận đủ |
| Cờ phản hồi     | Không · **Cần Owner xử lý**            |
| Cờ lấy hàng     | Không · **Có dòng chờ Manager xử lý**  |

### 5.3. Trạng thái đợt xuất

```
Picking ──xác nhận xuất──► InTransit ──bắt đầu nhận──► Receiving ──► Received
   │                                                         └──► ReceivedWithDiscrepancy
   └──hủy đợt──► Cancelled  (hàng đã lấy phải trả về vị trí trước)
```

Trạng thái dòng trong đợt: `Pending` → `Picking` → `Picked` | `PendingManager` → `Dispatched`.

## 6. Luồng chi tiết và quy tắc

### 6.1. Tạo, nháp, gửi

1. Người tạo chọn kho xuất, kho nhập (khác nhau, đang hoạt động, cùng tenant), lý do, hạn cần hàng, ghi chú.
2. Thêm dòng: hàng hóa, ĐVT (ĐVT chính hoặc quy đổi đang hoạt động của hàng đó), SL. Hiển thị **tồn khả dụng tại kho xuất** quy theo ĐVT đang chọn. Không trùng hàng trong một phiếu (gộp SL nếu cần).
3. **Lưu nháp:** chỉ validate cấu trúc; không kiểm tồn, không giữ chỗ, không thông báo.
4. **Tạo yêu cầu:** trong một transaction:
   - Kiểm lại toàn bộ dữ liệu, chụp `ConversionFactor`, tính `RequestedBaseQuantity`.
   - Tự phân bổ: lấy `InventoryStock` Good tại kho xuất, vị trí hoạt động, **không phải staging**, lô còn hạn dùng được; sắp FEFO (hạn sớm trước), lô không hạn FIFO (nhập trước); phân bổ trải nhiều vị trí nếu cần.
   - Tạo `InventoryReservation` + `StockTransferAllocation` cho từng phần; tăng `ReservedQuantity`.
   - Thiếu tồn bất kỳ dòng nào → từ chối toàn bộ, trả tồn khả dụng hiện tại từng dòng.
   - Chuyển `InProgress`, audit, thông báo Manager kho xuất, phát realtime.
5. Nháp quá cũ khi gửi có thể không còn đủ hàng; thông báo rõ từng dòng thiếu.

### 6.2. Manager kho xuất thấy phiếu và phản hồi

- Phiếu `InProgress` hiện ngay trong danh sách “Cần xử lý” của Manager kho xuất; không có nút tiếp nhận.
- **Phản hồi:** chọn lý do (Không đủ hàng thực tế · Hàng hỏng · Không kịp hạn · Khác) + nội dung, có thể gắn dòng hàng. Tạo `StockTransferFeedback` Open, bật `HasOpenFeedback`, thông báo Owner/người tạo.
- Owner trả lời và/hoặc **sửa phiếu** (6.3), **dừng phần còn lại**, hoặc **hủy phiếu**; đóng phản hồi khi xong. Phản hồi không chặn Manager tiếp tục chia đợt phần còn làm được.

### 6.3. Sửa phiếu đã gửi

Nguyên tắc: **hàng còn trong kho thì yêu cầu của chủ luôn có hiệu lực.**

| Phần SL của dòng             | Tăng                                                                             | Giảm                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chưa vào đợt                 | Phân bổ + giữ chỗ thêm                                                           | Nhả giữ chỗ (ưu tiên nhả phân bổ trái FEFO trước)                                                                                                  |
| Trong đợt, chưa lấy          | Cộng vào SL kế hoạch của đợt, task cập nhật                                      | Trừ khỏi đợt, nhả giữ chỗ                                                                                                                          |
| Đang lấy / đã lấy, chưa xuất | Cộng vào đợt đang lấy; task hiện SL cần lấy thêm; phải lấy bổ sung mới xuất được | Phần đã lấy dư phải **trả về vị trí** (task `TransferReturn` hoặc bước trả trong task lấy, quét xác nhận); đợt chưa xuất được cho tới khi trả xong |
| Đã xuất                      | ❌                                                                               | ❌                                                                                                                                                 |

- Thêm dòng mới: được khi phiếu `InProgress`; phân bổ + giữ chỗ như 6.1.
- Bỏ dòng: tương đương giảm về SL đã xuất của dòng.
- Đổi kho xuất/kho nhập: chỉ khi **chưa có đợt nào**; nhả toàn bộ giữ chỗ cũ và phân bổ lại.
- Lý do, hạn cần hàng, ghi chú: sửa được tới khi hoàn tất/hủy.
- Tăng mà thiếu tồn → từ chối cả lần sửa, hiển thị tồn khả dụng.
- Gửi kèm `RowVersion`; lệch phiên bản → 409 “Phiếu vừa thay đổi, vui lòng tải lại”, không ghi đè.
- Lưu nguyên tử: SL, phân bổ, giữ chỗ, đợt, task và `StockTransferRevision` trong một lần lưu.
- Thông báo + realtime cho Manager kho xuất và Staff đang giữ task bị ảnh hưởng.

### 6.4. Tạo đợt và giao task lấy hàng

- Manager kho xuất chọn dòng và SL cho đợt từ phần **chưa vào đợt** (mặc định điền toàn bộ còn lại); tạo `StockTransferShipment` `Picking` và các `ShipmentLine` gắn phân bổ tương ứng.
- Tạo `WarehouseTask` `TransferPick` (ReferenceType `StockTransferShipment`), ưu tiên/hạn theo `RequiredBy`; giao Staff qua cơ chế Assign hiện có (hoặc để Queued cho Staff nhận).
- Có thể có nhiều đợt mở cùng lúc; một phân bổ chỉ thuộc một đợt mở tại một thời điểm (tách phân bổ nếu chia SL).
- Hủy đợt: nếu chưa lấy gì → SL quay về “chưa vào đợt”, giữ chỗ giữ nguyên; nếu đã lấy → phải trả hàng về vị trí trước (6.5.5).

### 6.5. Lấy hàng (Staff kho xuất)

#### 6.5.1. Luồng chuẩn

1. Mở task lấy hàng → danh sách dòng: vị trí gợi ý · hàng · lô · SL cần lấy (ĐVT chính và ĐVT đã chọn).
2. **Quét mã vị trí** → **quét mã hàng** (và lô nếu có nhãn; không có thì chọn từ danh sách lô của vị trí).
3. Hệ thống **tự điền SL = SL cần lấy** của phân bổ tại vị trí đó.
4. Khớp thực tế → **Xác nhận lấy** (một chạm): hàng chuyển từ vị trí sang **staging xuất** của kho (`MovementType.Pick`, mẫu `StockIssuePickDetail`), giữ chỗ tương ứng được tiêu thụ.
5. Không được nhập **vượt** SL cần lấy. Giảm SL → bắt buộc chọn cách xử lý phần thiếu (6.5.2/6.5.3).
6. Quét sai vị trí → báo lỗi; nếu vị trí vừa quét có đúng hàng, Good, còn tồn khả dụng chưa giữ chỗ → hỏi “Lấy ở vị trí này thay?” (lối tắt đổi vị trí 6.5.2).

#### 6.5.2. Staff tự đổi vị trí/lô hoặc lấy tách

Lý do bắt buộc: Không đủ hàng tại vị trí · Không có hàng · Hàng hỏng · Vị trí bị chặn/khó lấy · Lô đã hết/sai lô · Lô không theo FEFO · Khác (ghi chú bắt buộc).

Điều kiện tự đổi: cùng hàng, cùng kho xuất, `QualityStatus.Good`, vị trí đang hoạt động, không phải staging, lô còn hạn dùng được, **tồn khả dụng chưa giữ chỗ ≥ SL cần chuyển**. Hệ thống gợi ý danh sách vị trí/lô hợp lệ theo FEFO.

Khi đổi, trong một transaction:

- Nhả giữ chỗ ở phân bổ cũ (phần chuyển), tạo phân bổ + giữ chỗ mới ở vị trí/lô mới; không lúc nào hàng bị giữ ở cả hai hoặc không được giữ.
- Ghi `StockTransferPickException` (Resolved) gồm vị trí/lô cũ → mới, lý do, người, thời gian; audit.
- Chọn lô không theo FEFO → cảnh báo, lý do bắt buộc.
- Lý do “Không đủ/Không có hàng/Hàng hỏng” → thông báo Manager kho xuất và **gợi ý kiểm kê** vị trí cũ (tạo đề xuất cycle count nếu luồng hiện có hỗ trợ); **không tự điều chỉnh tồn**, **không tự chuyển trạng thái chất lượng**.
- Lấy tách: một dòng lấy ở nhiều vị trí, mỗi phần là một `PickDetail`.

#### 6.5.3. Báo Manager

- Dòng chuyển `PendingManager`, ghi `StockTransferPickException` (Escalate, PendingManager), thông báo + realtime cho Manager kho xuất.
- Staff **tiếp tục các dòng khác**; task không bị dừng toàn bộ.
- Manager chọn:
  1. Chỉ định vị trí/lô khác (cả khi không thỏa điều kiện tự đổi của Staff nhưng Manager có quyền), giữ chỗ chuyển như 6.5.2.
  2. Giảm SL của đợt; phần giảm quay về “chưa vào đợt”, vẫn giữ chỗ cho đợt sau.
  3. Dừng phần còn lại của dòng; nhả giữ chỗ; thông báo Owner.
- Sau quyết định, dòng quay về `Picking` hoặc được đánh dấu xử lý xong; realtime cập nhật task của Staff.

#### 6.5.4. Xác nhận xuất đợt

- Chỉ khi mọi dòng của đợt `Picked` hoặc đã được Manager xử lý, không còn hàng dư chờ trả.
- Trong một transaction: `TransferOut` từ staging theo SL đã lấy, cập nhật `DispatchedQuantity`, đợt → `InTransit`, task lấy hàng → Completed, audit; thông báo Manager kho nhập và người tạo; realtime.
- Lệch phiên bản (ví dụ Owner vừa sửa) → 409, màn hình tải lại SL mới.

#### 6.5.5. Trả hàng về vị trí

- Phát sinh khi Owner giảm SL đang lấy, Manager giảm/hủy đợt sau khi đã lấy.
- Staff quét vị trí trả (mặc định vị trí đã lấy; được chọn vị trí hợp lệ khác cùng hàng), xác nhận SL; hàng từ staging về vị trí (`MovementType.Relocation` hoặc movement phù hợp — chốt ở Gate A), tạo lại giữ chỗ nếu SL đó vẫn thuộc phiếu.

### 6.6. Nhận hàng (kho nhập)

1. Đợt `InTransit` hiện ở danh sách Manager kho nhập; Manager giao task `TransferReceive` cho Staff.
2. Staff mở task, bắt đầu nhận → đợt `Receiving`.
3. Mỗi dòng: **quét vị trí đến** (vị trí hoạt động thuộc kho nhập, không phải staging xuất) → quét hàng → **SL tự điền = SL đã xuất của dòng trong đợt**.
4. Staff sửa nếu lệch, chia thành **SL nhận tốt / SL hỏng / SL thiếu**; tổng phải bằng SL đã xuất; có hỏng hoặc thiếu → **nguyên nhân bắt buộc** (Vỡ khi vận chuyển · Thất lạc · Xuất nhầm · Khác + ghi chú).
5. Một dòng có thể cất vào nhiều vị trí đến (chia SL nhận tốt).
6. Kiểm **sức chứa** vị trí đến bằng `StorageCapacityPolicy` hiện có trước khi xác nhận.
7. Xác nhận nhận đợt (một lần), trong một transaction:
   - SL tốt: `TransferIn` vào vị trí đến, `QualityStatus.Good`.
   - SL hỏng: `TransferIn` vào kho nhập với `QualityStatus.Damaged` (vị trí do Staff quét; xác minh ở Gate A ledger hỗ trợ ghi trực tiếp Damaged, nếu không thì Good rồi reclassify trong cùng transaction).
   - SL thiếu: không vào tồn kho nào; tạo `StockTransferDiscrepancy` Missing Open.
   - Hỏng: tạo `StockTransferDiscrepancy` Damaged Open.
   - Đợt → `Received` hoặc `ReceivedWithDiscrepancy`; task → Completed; audit; thông báo + realtime.
8. Mỗi đợt nhận một lần; hàng thiếu đến sau xử lý bằng “Nhận bổ sung” (6.7).

### 6.7. Xử lý chênh lệch (Manager kho nhập)

| Loại                       | Cách xử lý                                                                                                           | Kết quả                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thiếu, hàng đến sau        | **Nhận bổ sung**: quét vị trí đến, nhập SL đến sau                                                                   | `TransferIn`, tăng `ResolvedMissingQuantity`                                                                                                                                                 |
| Thiếu, xác nhận thất thoát | **Ghi nhận thất thoát** có lý do + bằng chứng                                                                        | Tạo chứng từ thất thoát gắn phiếu chờ duyệt theo luồng điều chỉnh hiện có; được duyệt → tăng `ResolvedMissingQuantity`. Gate A chốt cách biểu diễn vì hàng thiếu không nằm trong tồn kho nào |
| Hỏng                       | **Chuyển xử lý hàng hỏng**: đưa vào luồng hàng hỏng hiện có (`DecideDamageCaseDisposition`) hoặc điều chỉnh có duyệt | Discrepancy Resolved khi đã chuyển hồ sơ hợp lệ                                                                                                                                              |

- Không tự xóa sổ, không sửa trực tiếp phiếu nhận đã xác nhận.
- Người xử lý không tự duyệt điều chỉnh của mình trừ khi được phân quyền theo BR-61/BR-104.
- Discrepancy cuối cùng Resolved và bất biến hoàn tất thỏa → phiếu `Completed` tự động.

### 6.8. Hủy phiếu và Dừng phần còn lại

UI chỉ hiện **một nút** theo ngữ cảnh:

| Điều kiện         | Nút                                    | Kết quả                                                                                                                            |
| ----------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Chưa xuất đợt nào | **Hủy phiếu** (lý do bắt buộc)         | Hủy các đợt đang lấy (trả hàng về vị trí trước), nhả toàn bộ giữ chỗ, phiếu `Cancelled`                                            |
| Đã xuất ≥ 1 đợt   | **Dừng phần còn lại** (lý do bắt buộc) | Phần chưa xuất (chưa vào đợt + đang lấy sau khi trả hàng) → `StoppedQuantity`, nhả giữ chỗ; các đợt đã xuất tiếp tục nhận và xử lý |

### 6.9. Hoàn tất tự động

Đánh giá lại sau mỗi lần nhận, nhận bổ sung, xử lý chênh lệch, dừng: nếu bất biến hoàn tất (4.2) thỏa → `Completed`, `CompletedAt`, audit, thông báo người tạo; còn chênh lệch mở → `AwaitingResolution`.

## 7. Realtime và thông báo

### 7.1. Hạ tầng

- Dùng lại `NotificationHub` (`/hubs/notifications`) và client `notification-realtime.service.ts`.
- Thêm **nhóm theo phiếu**: hub method `JoinTransfer(transferId)` / `LeaveTransfer(transferId)`; khi join, BE **kiểm tenant, quyền `transfers:view` và phạm vi kho** trước khi thêm connection vào group `transfer:{tenantId}:{transferId}`.
- Thêm nhóm theo kho cho danh sách/task: `warehouse-transfers:{tenantId}:{warehouseId}` (join theo phạm vi kho của người dùng).
- Sự kiện chỉ mang **tín hiệu tối thiểu**: `{ type, transferId, shipmentId?, version, occurredAt }`; không mang SL, tên hàng hay dữ liệu nghiệp vụ.
- Phát **sau khi commit thành công** (giống `PublishCreatedAsync` hiện có); lỗi phát realtime không làm hỏng giao dịch đã commit, được log.

### 7.2. Sự kiện

| Sự kiện                           | Người nhận thông báo (chuông)                | Nhóm realtime   |
| --------------------------------- | -------------------------------------------- | --------------- |
| Tạo yêu cầu                       | Manager kho xuất                             | phiếu, kho xuất |
| Sửa phiếu                         | Manager kho xuất, Staff có task bị ảnh hưởng | phiếu, kho xuất |
| Phản hồi / trả lời phản hồi       | Owner + người tạo / Manager đã phản hồi      | phiếu           |
| Tạo đợt, giao task lấy            | Staff được giao                              | phiếu, kho xuất |
| Lấy hàng, đổi vị trí/lô, lấy tách | Manager kho xuất (khi lý do thiếu/hỏng)      | phiếu, task     |
| Báo Manager / Manager xử lý       | Manager kho xuất / Staff                     | phiếu, task     |
| Xác nhận xuất đợt                 | Manager kho nhập, người tạo                  | phiếu, hai kho  |
| Giao task nhận                    | Staff được giao                              | phiếu, kho nhập |
| Nhận đợt, có chênh lệch           | Owner, người tạo, Manager kho nhập           | phiếu, kho nhập |
| Xử lý chênh lệch, nhận bổ sung    | Người tạo                                    | phiếu           |
| Dừng / hủy                        | Manager hai kho, Staff có task               | phiếu, hai kho  |
| Hoàn tất                          | Người tạo                                    | phiếu           |

### 7.3. Hành vi FE

- Nhận sự kiện → `invalidateQueries` các key liên quan (danh sách, chi tiết phiếu, đợt, task); **tải lại từ API**, không ghép dữ liệu từ payload.
- Mở chi tiết phiếu/task → join group; rời trang → leave.
- Kết nối lại sau mất mạng → tự join lại và refetch.
- Màn có thao tác dở (Staff đang nhập SL, Owner đang sửa) → hiện banner “Dữ liệu vừa thay đổi” với nút tải lại; **không xóa ngang** dữ liệu đang nhập; lần lưu tiếp theo vẫn bị kiểm `RowVersion`.
- Thông báo chuông dùng cơ chế notification hiện có (lưu, xem lại được); sự kiện làm mới màn hình không lưu.

## 8. API dự kiến

Contract dự kiến; Gate A chốt và kiểm thử trước Gate B. Mọi lệnh ghi nhận `rowVersion` của phiếu (hoặc đợt) và trả 409 khi lệch.

| API                                                                                                   | Mục đích                                                             | Quyền                   |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------- |
| `GET /api/transfers`                                                                                  | Danh sách + lọc trạng thái, tiến độ, kho, cờ, người tạo, khoảng ngày | view                    |
| `GET /api/transfers/{id}`                                                                             | Chi tiết: dòng, phân bổ, đợt, chênh lệch, phản hồi, lịch sử          | view                    |
| `GET /api/transfers/availability?warehouseId&productIds`                                              | Tồn khả dụng theo hàng/ĐVT tại kho xuất                              | create                  |
| `POST /api/transfers/drafts` · `PUT /api/transfers/drafts/{id}` · `DELETE /api/transfers/drafts/{id}` | Lưu/sửa/xóa nháp (xóa chỉ áp dụng nháp, không xóa chứng từ đã gửi)   | create                  |
| `POST /api/transfers` / `POST /api/transfers/drafts/{id}/submit`                                      | Tạo yêu cầu (giữ chỗ)                                                | create                  |
| `PUT /api/transfers/{id}`                                                                             | Sửa yêu cầu đã gửi (6.3)                                             | create                  |
| `POST /api/transfers/{id}/cancel` · `/stop-remaining`                                                 | Hủy / dừng phần còn lại                                              | cancel                  |
| `POST /api/transfers/{id}/feedback` · `/feedback/{fid}/reply` · `/close`                              | Phản hồi                                                             | dispatch/receive/create |
| `POST /api/transfers/{id}/shipments` · `DELETE …/shipments/{sid}` (hủy đợt, không xóa dữ liệu)        | Tạo/hủy đợt                                                          | dispatch                |
| `POST …/shipments/{sid}/pick-task` (tạo + giao)                                                       | Giao task lấy                                                        | dispatch                |
| `GET …/shipments/{sid}/pick-sheet`                                                                    | Dòng cần lấy cho task                                                | pick                    |
| `POST …/shipments/{sid}/picks`                                                                        | Xác nhận lấy (kèm mã đã quét)                                        | pick                    |
| `POST …/shipments/{sid}/lines/{lid}/switch`                                                           | Tự đổi vị trí/lô                                                     | pick                    |
| `POST …/shipments/{sid}/lines/{lid}/escalate` · `/resolve-escalation`                                 | Báo Manager / Manager xử lý                                          | pick / dispatch         |
| `POST …/shipments/{sid}/returns`                                                                      | Trả hàng về vị trí                                                   | pick                    |
| `POST …/shipments/{sid}/dispatch`                                                                     | Xác nhận xuất đợt                                                    | pick                    |
| `POST …/shipments/{sid}/receive-task`                                                                 | Giao task nhận                                                       | receive                 |
| `POST …/shipments/{sid}/receipt`                                                                      | Xác nhận nhận đợt                                                    | receive                 |
| `POST /api/transfers/{id}/discrepancies/{did}/late-receipt` · `/loss` · `/damage-case`                | Xử lý chênh lệch                                                     | resolve                 |

- API cũ `approve`/`reject`/`dispatch` (toàn phiếu)/`receive` (toàn phiếu) **ngừng dùng** sau khi FE chuyển xong; giữ tới khi xác nhận không còn caller, trả 410/thông báo rõ thay vì xử lý sai mô hình mới.
- Lỗi trả `ApiResponse` hiện hành, message tiếng Việt, không lộ dữ liệu tenant khác, không stack/SQL.
- Mã quét được kiểm phía BE (khớp `Slot.BarcodeValue`/`SlotCode`, barcode/SKU hàng); FE không tự quyết định đúng/sai.

## 9. Frontend và UI/UX

### 9.1. Màn hình

| Màn                   | Route đề xuất                            | Người dùng chính       | Nội dung                                                                                                                                                                                                               |
| --------------------- | ---------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Danh sách điều chuyển | `/transfers`                             | Tất cả                 | Tab: Nháp · Đang thực hiện · Chờ xử lý chênh lệch · Hoàn tất · Đã hủy; cột: mã, ngày, kho xuất → kho nhập, hạn cần hàng, tình trạng xuất, tình trạng nhận, cờ phản hồi/lấy hàng, người tạo                             |
| Tạo / sửa yêu cầu     | `/transfers/new`, `/transfers/{id}/edit` | Owner/Manager có quyền | Thông tin chung; bảng dòng: hàng, ĐVT, tỷ lệ, SL, SL theo ĐVT chính, tồn khả dụng; nút Lưu nháp / Tạo yêu cầu; khi sửa phiếu đã gửi hiển thị phần SL không sửa được                                                    |
| Chi tiết phiếu        | `/transfers/{id}`                        | Tất cả                 | Header + tiến độ; tab **Hàng hóa** (SL yêu cầu, đã vào đợt, đã lấy, đã xuất, nhận tốt, hỏng, thiếu, dừng, chênh lệch, tình trạng xử lý), **Đợt xuất**, **Chênh lệch**, **Phản hồi**, **Lịch sử**; hành động theo quyền |
| Task lấy hàng         | trong module task kho                    | Staff kho xuất         | Mobile-first; danh sách dòng; ô quét; SL tự điền; nút Xác nhận lấy / Đổi vị trí / Báo Manager; nút Xác nhận xuất đợt                                                                                                   |
| Task nhận hàng        | trong module task kho                    | Staff kho nhập         | Ô quét vị trí đến; SL tự điền; tách tốt/hỏng/thiếu + nguyên nhân; Xác nhận nhận                                                                                                                                        |
| Task trả hàng         | trong module task kho                    | Staff kho xuất         | Quét vị trí trả, xác nhận SL                                                                                                                                                                                           |

### 9.2. Quy tắc giao diện

- Theo `DESIGN_SYSTEM.md`, tokens trong `src/app/index.css`, shadcn/ui có sẵn; danh sách dùng `OperationalListPanel` + `OperationalPagination`.
- Hành động trên phiếu render từ **capability flags** do page tính từ quyền hiệu lực + trạng thái; component không so tên vai trò hay chuỗi quyền.
- Quét mã: ô nhập nhận **máy quét dạng bàn phím** (keyboard wedge) và nhập tay; tự focus, Enter để xác nhận. Không thêm thư viện quét camera nếu chưa được duyệt.
- SL hiển thị kèm ĐVT; số căn phải; mã monospace.
- Trạng thái/tiến độ dùng icon + text, không chỉ màu.
- Dialog xác nhận cho: Tạo yêu cầu, Xác nhận xuất đợt, Xác nhận nhận, Hủy, Dừng; nêu rõ số lượng bị ảnh hưởng.
- Staff task: nút lớn, thao tác một tay, không cần cuộn ngang ở 360px.

### 9.3. Dữ liệu và state

- Server state bằng TanStack Query; không đưa dữ liệu phiếu vào Zustand/localStorage.
- Form tạo/sửa: React Hook Form + Zod, khớp validator BE.
- Mutation `retry: false`; 409 → hiển thị lý do + tải lại; mất kết nối khi ghi → trạng thái “chưa xác định kết quả”, yêu cầu tải lại trước khi thao tác lại.
- Đợt/phiếu/task invalidate qua realtime (7.3).

## 10. Cập nhật checklist UC 82–88

| UC  | Tên mới                                                            | Tác nhân chính                                    | Thay đổi                                                                      |
| --- | ------------------------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| 82  | Tạo, lưu nháp và gửi yêu cầu điều chuyển                           | **Owner** (Manager khi được cấp)                  | Gửi = giữ chỗ ngay; phân bổ FEFO/FIFO tự động; có Nháp                        |
| 83  | Xem điều chuyển                                                    | Owner/Manager/Staff                               | Thêm tiến độ xuất/nhận, cờ, cập nhật realtime                                 |
| 84  | **Theo dõi và phản hồi yêu cầu điều chuyển** (thay Approve/Reject) | Manager kho xuất                                  | Không có bước duyệt/tiếp nhận; Phản hồi kèm lý do; Owner sửa/dừng/hủy         |
| 85  | **Chia đợt, lấy hàng và xác nhận xuất đợt**                        | Manager kho xuất (chia, giao) / Staff (lấy, xuất) | Nhiều đợt; quét mã; SL tự điền; đổi vị trí/lô có lý do; báo Manager           |
| 86  | **Nhận và cất hàng theo đợt**                                      | Manager kho nhập (giao) / Staff (nhận)            | Quét vị trí đến; tốt/hỏng/thiếu + nguyên nhân; sức chứa                       |
| 87  | Xử lý chênh lệch điều chuyển                                       | Manager kho nhập                                  | Nhận bổ sung / thất thoát có duyệt / chuyển xử lý hàng hỏng; hoàn tất tự động |
| 88  | **Hủy phiếu hoặc Dừng phần còn lại**                               | Owner / người tạo                                 | Hủy khi chưa xuất; Dừng khi đã xuất; trả hàng đã lấy về vị trí                |
| mới | Sửa yêu cầu điều chuyển đã gửi                                     | Owner / người tạo                                 | Tăng/giảm/thêm dòng với phần còn trong kho                                    |
| 72  | Assign/Reassign Warehouse Task                                     | Manager                                           | Bổ sung loại task TransferPick/TransferReceive/TransferReturn                 |

Business Rules/MSG tham chiếu được cập nhật khi chốt checklist; spec không tự bịa mã BR/MSG mới.

## 11. Gate A — Backend

### 11.1. Việc làm

1. Rà mapping EF, chốt tên entity/cột, viết migration **nhưng chưa chạy**; báo tên + tác động + truy vấn đếm dữ liệu cũ; chờ cho phép.
2. Domain + enums mới; mở rộng `WarehouseTask` (Reference, types).
3. Dịch vụ phân bổ FEFO/FIFO + giữ chỗ dùng chung cho tạo, sửa, đổi vị trí.
4. Commands/queries mục 8 theo CQRS hiện có; controller mỏng, `HasPermission`, phạm vi kho qua `IWarehouseAccessPolicy`.
5. Kiểm bất biến 4.2 trước mọi SaveChanges; một SaveChanges/transaction cho mỗi lệnh.
6. Realtime groups + publisher sự kiện sau commit.
7. Ánh xạ dữ liệu cũ (sau khi được duyệt).

### 11.2. Kiểm thử

- [ ] Gửi yêu cầu: giữ chỗ đúng FEFO/FIFO, trải nhiều vị trí, thiếu tồn chặn toàn bộ, ĐVT quy đổi đúng.
- [ ] Nháp không giữ chỗ, không thông báo; gửi nháp cũ thiếu tồn báo rõ.
- [ ] Sửa phiếu: đủ bảng 6.3 (tăng/giảm ở từng phần, thêm/bỏ dòng, đổi kho khi chưa có đợt); thiếu tồn từ chối nguyên khối; 409 khi lệch phiên bản.
- [ ] Nhiều đợt mở song song, phân bổ không thuộc hai đợt mở.
- [ ] Lấy hàng: mã quét sai bị từ chối; không lấy vượt; vào staging đúng; giữ chỗ tiêu thụ đúng.
- [ ] Đổi vị trí/lô: điều kiện hợp lệ, chuyển giữ chỗ nguyên tử, lý do bắt buộc, cảnh báo non-FEFO, gợi ý kiểm kê khi thiếu/hỏng, không tự sửa tồn/chất lượng.
- [ ] Báo Manager: dòng chờ, các dòng khác vẫn lấy được, ba cách xử lý của Manager.
- [ ] Trả hàng về vị trí khi giảm/hủy đợt sau lấy; đợt không xuất được khi còn hàng chờ trả.
- [ ] Xuất đợt: TransferOut từ staging, chặn khi còn dòng mở, 409 khi Owner vừa sửa.
- [ ] Nhận: tổng tốt/hỏng/thiếu = đã xuất, hỏng vào Damaged, sức chứa, nhận một lần mỗi đợt.
- [ ] Chênh lệch: nhận bổ sung, thất thoát có duyệt (không tự duyệt trái BR-61/BR-104), hàng hỏng; hoàn tất tự động đúng bất biến.
- [ ] Hủy (chưa xuất) và Dừng (đã xuất) nhả giữ chỗ đúng; đợt đã xuất vẫn nhận được.
- [ ] Quyền hiệu lực + phạm vi kho cho từng API; cross-tenant không đọc/ghi/nhận realtime được.
- [ ] Realtime: join group kiểm quyền; sự kiện phát sau commit, không phát khi rollback; payload tối thiểu.
- [ ] Concurrency: hai người cùng thao tác một đợt/phiếu, double submit; không âm tồn, không giữ chỗ kép.
- [ ] Ánh xạ dữ liệu cũ chạy trên fixture an toàn trước; regression xuất kho, nhập kho, task Relocation, điều chỉnh tồn.
- [ ] `dotnet build SSWMS-API.slnx` và toàn bộ `dotnet test Application.Tests/Application.Tests.csproj` đạt.
- [ ] GitNexus impact trước sửa symbol; detect changes sau hoàn tất.

**Dừng sau Gate A:** báo file/contract đã đổi, migration (tên, tác động, đã/chưa chạy), kết quả test thực tế, hạn chế; chờ lệnh sang Gate B.

## 12. Gate B — Frontend logic

- Types/services/hooks theo contract Gate A; query keys cho danh sách, chi tiết, đợt, task.
- Capability flags tính ở page từ quyền hiệu lực + trạng thái/tiến độ; permission codes mới trong `permissionCodes.ts`; route/navigation trong `src/config`.
- Form tạo/sửa (RHF + Zod), phần SL không sửa được hiển thị readonly theo dữ liệu BE.
- Realtime: join/leave group, invalidate, reconnect, banner “dữ liệu vừa thay đổi”.
- Task lấy/nhận/trả: state máy quét, SL tự điền, đổi vị trí/lô, báo Manager, xác nhận.

Kiểm thử:

- [x] Capability đúng theo quyền/trạng thái; không so tên vai trò trong component (xem 20.2).
- [x] Form nháp/gửi/sửa; lỗi tồn, 409, mất kết nối không báo thành công giả.
- [x] Realtime cập nhật danh sách/chi tiết/task; không ghi đè dữ liệu đang nhập (kiểm bằng test hook; chưa thử với SignalR thật).
- [x] Quét đúng/sai, SL tự điền, không nhập vượt, lý do bắt buộc.
- [x] Hủy/Dừng hiển thị đúng một nút theo ngữ cảnh.
- [x] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` đạt (2026-10-08).

**Dừng sau Gate B:** báo logic/test đạt, phần UI/QA còn lại; chờ lệnh sang Gate C.

## 13. Gate C — UI/UX và QA

- Danh sách, tạo/sửa, chi tiết theo 9.1–9.2; task Staff mobile-first.
- Kiểm 360×800, 768×1024, 1280×720, 1920×1080; zoom 125/150/200%.
- Bàn phím, focus khi đổi bước/dialog, aria-live cho cập nhật realtime và kết quả quét, contrast, reduced motion.
- QA end-to-end trên luồng ứng dụng với dữ liệu được phép: tạo → sửa → chia 2 đợt → lấy (có đổi vị trí, báo Manager) → xuất → nhận có hỏng/thiếu → xử lý → hoàn tất; nhánh hủy và dừng; hai trình duyệt để kiểm realtime.
- Regression UI danh sách/task khác không đổi màu, border, pagination.

**Dừng sau Gate C:** báo hoàn thành, bằng chứng test/QA (không chứa secret) và hạn chế còn lại.

## 14. An toàn DB, QA và bàn giao

- **Tuyệt đối không drop/delete/reset/recreate/replace/EnsureDeleted/truncate/bulk-delete/destructive rollback `db71143`.**
- Không auto migration; chạy BE local đặt `Database__ApplyMigrationsOnStartup=false`; migration và ánh xạ dữ liệu cũ chỉ chạy khi người dùng cho phép đích danh.
- Trước mọi thao tác ghi khi QA: in và xác minh provider/server/database thực tế (che secret); target remote hoặc chưa chứng minh an toàn → dừng báo.
- Test tự động dùng fixture an toàn; không chạy cleanup “chuẩn bị test”.
- “Xóa nháp” là chức năng nghiệp vụ của ứng dụng, không phải quyền xóa dữ liệu DB ngoài luồng.
- Commit/push/PR chỉ khi người dùng yêu cầu; chia BE, FE logic, UI/UX.

## 15. Tiêu chí nghiệm thu

1. Owner (và Manager được cấp quyền) tạo nháp, gửi yêu cầu; gửi là giữ chỗ đúng FEFO/FIFO; thiếu tồn bị chặn rõ ràng.
2. Manager kho xuất thấy phiếu ngay, phản hồi được; Owner sửa/dừng/hủy theo phản hồi.
3. Owner sửa được mọi phần hàng còn trong kho đúng bảng 6.3; phần đã xuất không sửa được; không ghi đè khi đồng thời.
4. Xuất và nhận nhiều đợt; mỗi đợt có task giao cho Staff.
5. Lấy hàng bằng quét mã, SL tự điền; đổi vị trí/lô có lý do và chuyển giữ chỗ nguyên tử; báo Manager và Manager xử lý được.
6. Nhận hàng bằng quét mã; tốt/hỏng/thiếu có nguyên nhân; hỏng vào Damaged; sức chứa được kiểm.
7. Chênh lệch xử lý được bằng nhận bổ sung, thất thoát có duyệt hoặc chuyển xử lý hàng hỏng; phiếu tự hoàn tất đúng lúc.
8. Hủy và Dừng phần còn lại nhả giữ chỗ đúng, không mất dấu SL đã xuất.
9. Mọi thao tác cập nhật realtime cho đúng người, đúng phạm vi; mất kết nối tự đồng bộ lại.
10. Không âm tồn, không giữ chỗ kép, không lộ dữ liệu tenant khác; dữ liệu cũ được ánh xạ theo phương án đã duyệt.
11. Build/test/QA báo đủ; gate nào chưa đạt ghi rõ chưa đạt.

## 16. Điểm còn phải chốt ở Gate A (không đổi nghiệp vụ đã thống nhất)

- Cách biểu diễn **thất thoát hàng thiếu** (không nằm ở tồn kho nào) trong luồng điều chỉnh có duyệt.
- Ledger có ghi trực tiếp `TransferIn` với `QualityStatus.Damaged` hay cần reclassify.
- Movement type cho trả hàng từ staging về vị trí.
- Có tạo đề xuất cycle count tự động hay chỉ thông báo gợi ý (tùy khả năng luồng `CycleCount` hiện có).
- Trạng thái cũ `PendingSourceApproval` → Draft cần người dùng xác nhận khi xem số liệu thực tế.

## 17. File dự kiến ảnh hưởng

| Repo | Vị trí                                                                                             | Thay đổi dự kiến                                                  |
| ---- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| BE   | `Domain/Entities/.../StockTransfer*.cs`, `Domain/Enums/StockTransferStatus.cs`, entity mới mục 4.3 | Mô hình phiếu/dòng/đợt/lấy/nhận/chênh lệch/phản hồi/lịch sử       |
| BE   | `Domain/.../WarehouseTask.cs`, `Domain/Enums/WarehouseTaskType.cs`                                 | Reference + loại task điều chuyển                                 |
| BE   | `Infrastructure/Data/Configurations/...`, `Infrastructure/Migrations/`                             | Cấu hình EF, migration (chạy khi được phép)                       |
| BE   | `Application/Features/Transfer/**`                                                                 | Commands/queries mới; thay dần Approve/Reject/Dispatch/Receive cũ |
| BE   | `Application/Permissions/Transfer/TransferPermissions.cs`                                          | `pick`, `resolve`, `cancel`; `approve` deprecated                 |
| BE   | `API/Controllers/TransfersController.cs`, `API/Realtime/*`                                         | Endpoint mới; group theo phiếu/kho, publisher sự kiện             |
| BE   | `Application.Tests/`                                                                               | Test mục 11.2                                                     |
| FE   | `src/features/transfer/**`                                                                         | Types, services, hooks, pages, components mới                     |
| FE   | `src/features/warehouse-task/**`                                                                   | Màn task lấy/nhận/trả hàng                                        |
| FE   | `src/features/platform-services/services/notification-realtime.service.ts`                         | Join/leave group, sự kiện điều chuyển                             |
| FE   | `src/config/permissionCodes.ts`, `src/config/*`, `src/app/(private)/transfers/**`                  | Quyền, route, navigation                                          |

## 18. Trạng thái tại lần viết spec

- [x] Khảo sát AMIS (chỉ xem, không lưu) và đối chiếu code BE/FE hiện tại.
- [x] Chốt nghiệp vụ với người dùng qua trao đổi ngày 2026-10-07/08.
- [ ] Người dùng duyệt spec.
- [x] Gate A Backend: mã nguồn + test xong (2026-10-08); migration `AddWarehouseTransferWorkflow` đã áp lên `db71143` ngày 2026-10-08 với phép của người dùng.
- [x] Gate B Frontend logic (2026-10-08): xem mục 20.
- [ ] Gate C UI/UX và QA.
- [x] Cập nhật checklist UC 82–88 (và UC 72) trên Google Sheet, sheet "mới" (2026-10-09, theo yêu cầu của người dùng): xem mục 24.

Lần viết tài liệu này không sửa source, không build/test, không khởi động server, không tạo/chạy migration, không ghi DB, không commit/push/PR.

## 19. Ghi chú triển khai Gate A (2026-10-08)

Gate A đã hoàn thành ở mức mã nguồn và kiểm thử tự động; các điểm dưới đây khác hoặc làm rõ so với bản spec ban đầu.

### 19.1. Khác với spec

| Mục           | Spec ban đầu                                                       | Triển khai                                                                                                                                                                                          | Lý do                                                                                       |
| ------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 6.5.1 / 6.5.5 | Lấy hàng chuyển hàng sang staging xuất; trả hàng đưa về từ staging | Lấy hàng **không đổi tồn**: chỉ ghi chi tiết lấy, giữ chỗ vẫn nằm ở vị trí/lô; lúc xuất mới trừ tồn (`TransferOut`)                                                                                 | Khớp luồng xuất kho hiện hành (`StockIssuePickDetail`, đã bỏ staging), ít rủi ro cho sổ cái |
| 6.5.5 / 4.3   | Task `TransferReturn` riêng                                        | Trả hàng nằm trong cùng task lấy hàng (`ReturnTransferPick`)                                                                                                                                        | Tránh thêm loại task; thao tác trả gắn với đợt đang lấy                                     |
| 6.1 / 8       | “Xóa nháp”                                                         | Hủy nháp qua `CancelTransfer` (nháp → `Cancelled`)                                                                                                                                                  | Không xóa cứng chứng từ                                                                     |
| 6.2 / 6.7     | Quyền phản hồi riêng                                               | `AddFeedback` dùng `transfers:view` ở controller, handler yêu cầu `dispatch` hoặc `receive`                                                                                                         | Một API chung cho quản lý hai kho                                                           |
| 6.7           | Thất thoát cần chứng từ điều chỉnh có duyệt                        | Xác nhận thất thoát **không** tạo điều chỉnh tồn: hàng thiếu đã bị trừ ở kho nguồn khi xuất và chưa vào kho đích; thao tác có lý do bắt buộc, có audit và do người có `transfers:resolve` thực hiện | Không có tồn kho nào để điều chỉnh                                                          |
| 6.7           | Hàng hỏng → luồng hàng hỏng                                        | Hàng hỏng nhập kho đích dạng `Damaged`/`DamageHold` (ghi trực tiếp, không cần reclassify); “xử lý” là xác nhận đã chuyển hồ sơ sang luồng hàng hỏng sẵn có                                          | Sổ cái đã hỗ trợ trạng thái chất lượng ngay trong `StockMovement`                           |
| 9.2           | Quét bằng thiết bị                                                 | BE bắt buộc `ScannedSlotCode` khi lấy/trả/cất; mã sản phẩm kiểm nếu có                                                                                                                              | Máy quét dạng bàn phím và nhập tay cho cùng kết quả                                         |
| 3             | Chỉ Owner/Manager tạo                                              | Kiểm quyền kho **đích** (Manage) như luồng cũ; Owner mọi kho                                                                                                                                        | Giữ hành vi phân quyền kho hiện hành                                                        |
| 6.3           | Xóa dòng                                                           | Dòng bị bỏ khỏi danh sách được giảm về số đã xuất; dòng không còn hàng giữ `Quantity = 0` và bị ẩn khỏi chi tiết                                                                                    | Khóa ngoại từ dòng đợt xuất không cho xóa hàng                                              |
| 6.5.1         | Sửa SL trong lúc lấy                                               | Lệch phiên bản chỉ kiểm ở **xuất đợt**, **nhận đợt** và **sửa phiếu**; các lệnh lấy từng dòng kiểm lại số lượng/giữ chỗ phía server nhưng không đòi phiên bản                                       | Quét liên tiếp không tự xung đột với chính mình                                             |

### 19.2. Đã làm

- Domain/EF: 7 thực thể mới, mở rộng `StockTransfer`, `StockTransferItem`, `WarehouseTask`; trạng thái cũ giữ nguyên giá trị, thêm `Draft`, `InProgress`, `AwaitingResolution`.
- Quyền mới `transfers:pick`, `transfers:resolve`, `transfers:cancel`; `transfers:approve` đánh dấu ngừng dùng nhưng **giữ lại**.
- Lệnh: lưu nháp, gửi, tạo-gửi ngay (dùng cho AI/đề xuất cân bằng tồn), sửa, hủy, dừng phần còn lại, phản hồi/trả lời, tạo/hủy đợt, lấy hàng, đổi vị trí/lô, báo/xử lý báo cáo, trả hàng, xuất đợt, nhận đợt, xử lý chênh lệch.
- Truy vấn: danh sách (kèm tiến độ), chi tiết (đợt, chênh lệch, phản hồi), tồn khả dụng theo ĐVT, phiếu lấy hàng, phiếu nhận hàng.
- Công việc của tôi hiển thị task `TransferPick`/`TransferReceive` kèm tiến độ; giao việc dùng lại API giao việc hiện có.
- Realtime: nhóm SignalR theo phiếu và theo kho (`JoinTransfer`, `JoinTransferWarehouse`) có kiểm tenant, quyền xem và phân công kho; sự kiện `TransferChanged` chỉ mang định danh, phát sau khi commit.
- Tương thích: AI trợ lý và đề xuất cân bằng tồn tạo phiếu theo luồng mới; chặn lưu trữ sản phẩm/ngừng kho không còn bị nháp làm kẹt.

### 19.3. Kết quả kiểm thử

- 947 test đạt, 1 bỏ qua (nền trước khi sửa: 915 đạt, 1 bỏ qua), gồm 35 test điều chuyển mới và test kiểm tra lệch model–migration.
- Phạm vi: FEFO/FIFO, ĐVT quy đổi, nháp, luồng đủ vòng (lấy → xuất → nhận → xử lý chênh lệch → hoàn tất), đổi vị trí/lô và FEFO, báo quản lý, sửa phiếu (tăng/giảm/phải trả hàng), phiên bản cũ, hủy/dừng, phản hồi, cách ly tenant, phạm vi kho, quyền của từng endpoint, hiển thị nháp, danh sách công việc, tên nhóm realtime.
- Chưa kiểm: đồng thời thật trên SQL Server (khóa `RowVersion`), kết nối SignalR thật, chạy migration trên DB. Các test dùng EF InMemory nên `RowVersion` được gán tay.

### 19.4. Điểm còn mở cho Gate B/C

- Cần chạy migration trên database được chỉ định **sau khi được cho phép đích danh**; xem `SSWMS-Backend/docs/features/2026-10-08-warehouse-transfer-legacy-data.md`.
- Phiếu cũ đang dở (`Approved`, `InTransit`, `ReceivedWithVariance`) cần quyết định trước khi chạy migration vì các API cũ đã bị gỡ.
- Manager/Staff cần được Owner gán `transfers:pick`, `transfers:cancel`, `transfers:resolve` trong phân quyền (không tự cấp).
- Gate B bắt buộc dùng lại lớp bảng chi tiết hàng hóa của trang Nhập kho cho các bảng dòng hàng của điều chuyển (theo yêu cầu người dùng 2026-10-08).

## 20. Ghi chú triển khai Gate B (2026-10-08)

### 20.1. Bổ sung phía Backend phát hiện khi làm FE

Ba khoảng trống hợp đồng của Gate A, đã bổ sung (chỉ thêm, không đổi hành vi cũ) và có test:

| Thiếu                                                                                    | Bổ sung                                                                                                       |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Danh sách "Công việc" không cho biết phiếu và đợt của task lấy/nhận hàng                 | `MyWarehouseTaskResponse` thêm `transferId`, `transferShipmentId`                                             |
| Không có API liệt kê vị trí/lô thay thế hợp lệ (spec 6.5.2 yêu cầu gợi ý theo FEFO)      | `GET /api/transfers/{id}/shipments/{sid}/lines/{lid}/alternatives` (quyền `transfers:view`, kiểm phạm vi kho) |
| Giao việc bằng API giao việc chung cần `RowVersion` của task nhưng đợt xuất không trả về | `StockTransferShipmentResponse` thêm `pickTaskVersion`, `receiveTaskVersion`                                  |

### 20.2. Quyết định triển khai

- **Bảng chi tiết hàng hóa dùng chung**: danh sách `/transfers` ghép `OperationalMasterDetail` + `OperationalListPanel` + `OperationalPagination` giống trang Nhập kho (`TransferMasterDetail` mỏng như `InboundMasterDetail`). Bảng `TransferGoodsTable` có cột riêng của điều chuyển nhưng dùng chung `InboundColumnLabel`, `goodsPreviewInteractions`, `formatQuantity` và cùng cơ chế phân trang/ khôi phục chiều cao. Tab "Hàng hóa" của trang chi tiết dùng lại chính `TransferGoodsTable`.
- **Capability**: `getTransferCapabilities` / `getShipmentCapabilities` (hàm thuần, có test) tính từ quyền hiệu lực + trạng thái. Luật BE "Owner sửa/hủy mọi phiếu, người khác chỉ phiếu mình tạo" cần biết Owner: `useTransferViewer` đọc cờ này một lần ở page (cùng cách `InboundRequestFormPage` đang làm); component không so tên vai trò. BE vẫn là nơi quyết định.
- **Realtime**: `NotificationRealtimeProvider` giữ một kết nối và chia sẻ qua `NotificationHubContext`; `useTransferRealtime` tham gia/rời nhóm theo phiếu và theo kho, tải lại bằng `invalidateQueries` (không ghép payload). Màn hình đang nhập dở (form sửa, lấy hàng, nhận hàng) dùng `autoRefresh: false`: chỉ hiện banner "Dữ liệu vừa thay đổi" với nút Tải lại.
- **Lỗi ghi**: `describeTransferError` tách 409 (phải tải lại) và mất kết nối (kết quả chưa xác định, tải lại trước khi thao tác lại); không bao giờ báo thành công khi chưa có phản hồi từ server.
- **Tạo yêu cầu** thực hiện hai bước trong form: lưu nháp rồi gửi. Nếu gửi bị chặn vì thiếu tồn, nháp được giữ và thông báo nêu rõ.
- **Tab "Lịch sử"** suy ra từ các mốc thời gian của phiếu (BE chưa có bảng lịch sử sửa phiếu nên chưa có người thực hiện cho mọi mốc).
- **Nhận hàng**: vị trí cất tra theo mã quét bằng API danh sách vị trí của kho nhập (`searchText`), khớp theo mã hoặc mã vạch.
- **Màn task** mở từ "Công việc" (`/tasks/transfers/{transferId}/shipments/{shipmentId}/pick|receive`); bắt đầu/tạm dừng/trả việc dùng lại API thao tác công việc của tôi.

### 20.3. Chưa làm / hạn chế

- Giao diện mới dùng shadcn/ui có sẵn nhưng **chưa qua rà soát UI/UX, a11y và responsive thật** (Gate C).
- Chưa chạy trên trình duyệt với backend thật và SignalR thật; migration vẫn chưa áp dụng vào `db71143` nên chưa QA luồng đầy đủ.
- Đổi vị trí khi lấy hàng chọn phân bổ giữ chỗ đầu tiên của dòng làm nguồn; trường hợp dòng giữ chỗ ở nhiều vị trí cần Gate C làm bộ chọn nguồn.
- Nhận bổ sung chênh lệch cho hàng theo lô chỉ chọn được lô có trong phiếu nhận của đợt.

## 21. Ghi chú Gate C (2026-10-08)

QA bằng trình duyệt thật với BE local (`Database__ApplyMigrationsOnStartup=false`) trên `db71143`, dữ liệu tạo qua luồng ứng dụng, không xóa/seed ngoài phần quyền.

### 21.1. Đã chạy được

- Phiếu 1 (1 Thùng): tạo → gửi (giữ chỗ) → tạo đợt → giao việc → staff lấy bằng quét mã kệ/mã hàng → xuất đợt → giao việc nhận → nhận → tự hoàn tất.
- Phiếu 2 (6 Thùng): như trên, nhận 3 tốt / 1 hỏng / 2 thiếu → Chờ xử lý chênh lệch → chuyển xử lý hàng hỏng + ghi nhận thất thoát → tự hoàn tất.
- Realtime hai trình duyệt (Owner và Staff): số phản hồi của Owner tự tăng khi có thay đổi; không có lỗi hub.
- Responsive 360×800, 640×360 (tương đương zoom 200%), 768×1024, 1280×720, 1920×1080: không tràn ngang trang; bảng nằm trong vùng cuộn.
- A11y: mọi nút/ô nhập có tên, một `h1`, `lang="vi"`; còn 1 nút trong combobox dùng chung chưa có nhãn.

### 21.2. Lỗi tìm thấy và đã sửa

| Lỗi                                                                | Nguyên nhân                                                                                               | Sửa                                                                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Staff mở phiếu lấy hàng bị 403 và hub báo lỗi liên tục             | Danh mục quyền `transfers:pick/resolve/cancel` chưa có trong DB và vai trò chưa được cấp                  | Seed danh mục (`docs/features/2026-10-08-transfer-permissions-seed.sql`) và cấp quyền cơ bản qua API admin/owner |
| Realtime không tới màn hình Owner                                  | `onclose` của kết nối cũ ghi đè kết nối mới ở `NotificationRealtimeProvider` nên hook không tham gia nhóm | Chỉ gỡ kết nối khi đúng kết nối đang công bố                                                                     |
| Sau giao việc, chi tiết phiếu vẫn "Chưa giao nhân viên"            | Giao việc đi qua API công việc kho, không làm mới truy vấn điều chuyển                                    | Làm mới truy vấn điều chuyển sau khi giao thành công                                                             |
| Staff thấy `__SYSTEM_DEFAULT__` làm vị trí và không biết lấy ở đâu | Tồn nằm ở vị trí mặc định theo kệ                                                                         | BE trả `rackCode`, `isSystemDefaultSlot`; hiển thị "Kệ A07"; quét mã kệ được chấp nhận cho vị trí mặc định       |
| Biểu ngữ "Có người vừa cập nhật" hiện sau thao tác của chính mình  | Sự kiện realtime dội lại                                                                                  | Bỏ qua trong lúc và 5 giây sau thao tác ghi của trình duyệt này                                                  |
| Trạng thái task hiện "Queued/Completed"                            | Hiển thị mã BE                                                                                            | Dịch sang tiếng Việt                                                                                             |
| "Đã lấy 0/1" sau khi xuất đợt                                      | BE trừ phần đã xuất khỏi số lượng chờ xuất                                                                | FE cộng phần đã xuất khi hiển thị                                                                                |

### 21.3. QA đợt hai (nhánh còn lại)

Đã chạy trên giao diện thật và đạt: sửa phiếu (giảm 10 → 8), chia hai đợt (3 + 4) và hủy một đợt, đổi vị trí khi lấy (gợi ý hiển thị phần đã đổi trước), báo quản lý rồi Manager "Giảm số lượng của đợt", trả hàng về vị trí, xuất đợt, nhận chia hai vị trí, dừng phần còn lại (phiếu tự hoàn tất, giữ chỗ về 0), hủy phiếu chưa lấy.

Lỗi tìm thấy và đã sửa thêm:

| Lỗi                                                    | Nguyên nhân                                                                                                                                    | Sửa                                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| "Dừng phần còn lại" và hủy phiếu báo lỗi cơ sở dữ liệu | Nhả giữ chỗ toàn phần đưa `ReservedQuantity` về 0, vi phạm `CK_InventoryReservations_Quantity_Positive` (EF InMemory không kiểm ràng buộc này) | Giữ số lượng và đổi trạng thái sang `Released`; test hủy phiếu khẳng định bất biến |
| Gợi ý lấy hàng không hiển thị phần vừa đổi vị trí      | Gợi ý điền đủ số cần lấy từ giữ chỗ đầu tiên theo FEFO                                                                                         | Vị trí vừa nhận phần đổi được gợi ý trước, giới hạn theo phần đổi chưa lấy         |
| Đợt đã xuất vẫn hiện "Lấy tại (theo FEFO)"             | Gợi ý tính lại từ giữ chỗ còn lại                                                                                                              | Chỉ hiển thị gợi ý khi đợt còn thao tác được                                       |

### 21.4. QA đợt ba

Đạt: nhận bổ sung hàng thiếu bằng mã vị trí (phiếu tự hoàn tất), lệch phiên bản khi hai Owner sửa cùng lúc (người sau được giữ nguyên dữ liệu đang nhập và có banner tải lại), mất kết nối rồi nối lại (màn hình tự đồng bộ sau khoảng 3 giây), axe-core WCAG 2.0/2.1 A và AA trên danh sách, form, chi tiết và màn nhận hàng: không có lỗi tương phản màu.

Lỗi tìm thấy và đã sửa:

| Lỗi                                                 | Nguyên nhân                                                                 | Sửa                                                                 |
| --------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| "Nhận bổ sung" không bao giờ gửi được               | Schema yêu cầu `destinationSlotId` hợp lệ trước khi mã quét được tra ra ID  | Schema chỉ yêu cầu mã quét hoặc nhập; ID được tra khi gửi           |
| Trang admin vai trò không tải được                  | DB có quyền do bản code khác thêm, bản build này ném lỗi khi dựng danh sách | Danh sách quyền/vai trò bỏ qua quyền chưa định nghĩa (BE `ba5d2e3`) |
| Thông báo lệch phiên bản lặp ý, viết thường chữ đầu | FE nối thêm gợi ý tải lại lên thông báo của BE                              | Viết hoa và chỉ thêm gợi ý khi chưa có                              |

### 21.4b. Luồng quét bằng máy quét mã vạch

Máy quét dạng bàn phím gõ mã rồi Enter vào ô đang focus. Trước đây sau khi quét vị trí, con trỏ vẫn ở ô vị trí nên mã hàng quét kế tiếp bị nhận như mã vị trí và bị từ chối. Đã sửa: con trỏ tự đi theo bước (vị trí → mã hàng → số lượng, Enter ở số lượng để xác nhận); Tab cũng kết thúc một lần quét; quét nhầm loại mã báo rõ "Đây là mã hàng / mã vị trí". Đã chạy lại trên trình duyệt chỉ bằng phím.

Bốn bổ sung (tùy chọn lưu trên từng thiết bị, thanh công tắc ở màn lấy hàng và nhận hàng):

- **Dùng máy quét (ẩn bàn phím ảo):** ô quét đặt `inputMode="none"` để bàn phím ảo không che màn hình khi dùng máy quét Bluetooth; tắt thì vẫn gõ tay được. Mặc định tắt.
- **Âm báo và rung:** tiếng bíp ngắn khi quét đúng, hai tiếng trầm và rung khi quét sai; mặc định bật. Không bao giờ gây lỗi nếu thiết bị chặn âm thanh hoặc không rung được (iOS không hỗ trợ rung).
- **Quét từng đơn vị:** mỗi lần quét đúng mã hàng cộng 1 vào số lượng (tối đa số có ở vị trí), Enter khi ô trống để xác nhận; mặc định tắt (số lượng gợi ý vẫn được tự điền).
- **Quét bằng camera:** nút camera ở mỗi ô quét, dùng `@zxing/browser` tải khi mở camera lần đầu; cần HTTPS hoặc localhost và quyền camera, có thông báo rõ khi bị từ chối, không có camera hoặc trang không an toàn. Chưa thử với camera thật (môi trường kiểm thử không có camera); đã kiểm bằng test giả lập.

### 21.5. Hạn chế còn lại

- Hai lỗi truy cập axe (`button-name` của nút trigger combobox, `aria-valid-attr-value` của tab) đã sửa: nút mở danh sách có nhãn mặc định "Mở danh sách"; hai thanh tab của chuyển kho nối với `role=tabpanel` theo mẫu WAI-ARIA. Axe không còn lỗi trên danh sách, form và chi tiết. Các nơi khác dùng `Tabs` của Radix vẫn giữ hành vi cũ.
- `prefers-reduced-motion`: đã đo bằng trình duyệt khi bật chế độ giảm chuyển động trên danh sách, chi tiết và hộp thoại; chỉ có biểu tượng làm mới của danh sách còn quay, đã sửa (đứng yên, mờ đi, `aria-busy`). Các trang khác không còn animation.
- Nhận hàng bằng mã kệ: đã hỗ trợ cho kệ quản lý ở mức kệ (`RackLevel`): mã không khớp ô con thì tra bố cục kho nhập ra ô mặc định của kệ. Đã QA Kho test → Đà Nẵng (nhận vào kệ A03; kệ A05 bị từ chối đúng vì không cho trộn sản phẩm).
- Log BE có lỗi có sẵn `CycleCountStatus 'Cancelled'` không thuộc điều chuyển.
- **Phân quyền trên `db71143`:** nhiều bản build với danh mục quyền khác nhau dùng chung một DB. Bước đồng bộ quyền khi khởi động của bản không có `transfers:pick/resolve/cancel` xóa chúng cùng các lượt gán; đã xảy ra nhiều lần trong ngày. Cần thống nhất một nhánh hoặc đặt `Database__ApplyMigrationsOnStartup=false`; script seed nằm ở `SSWMS-Backend/docs/features/2026-10-08-transfer-permissions-seed.sql`.
- Dữ liệu QA nằm trong `db71143`: các phiếu `TRF-20261008…` (hoàn tất, đã hủy, và một phiếu còn mở để thử lệch phiên bản); tồn Bia Tiger tại Đà Nẵng giảm và kho test tăng tương ứng.

## 22. Rà soát mã luồng điều chuyển (2026-10-08)

Rà soát BE + FE theo spec, `.rules` và `AGENTS.md` hai repo, GitNexus (impact: mọi symbol sửa đều LOW) và tiêu chí Ponytail (chỉ xét thừa/chết). Chỉ xét file thuộc điều chuyển; bỏ qua luồng import Excel đang sửa trên nhánh.

### 22.1. Lỗi đã sửa

| Mức  | Lỗi                                                                                                                                                                                          | Sửa                                                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Cao  | Hủy phiếu đang thực hiện và Dừng phần còn lại chỉ kiểm quyền `transfers:cancel` + kho, không kiểm "chủ hoặc người tạo" như spec mục 3 (FE đã ẩn nút nhưng BE cho Manager khác gọi trực tiếp) | `TransferRules.EnsureOwnerOrCreator` dùng chung cho Hủy, Dừng, Sửa, Trả lời phản hồi; test mới                                      |
| Cao  | Lưu nháp lần hai trên cùng màn hình (hoặc "Tạo yêu cầu" lại sau khi bị chặn vì thiếu tồn) bị 400 "Thiếu phiên bản" vì FE không gửi phiên bản sau lần lưu đầu mà BE bắt buộc                  | BE chỉ kiểm phiên bản nháp khi có gửi (như Gửi nháp/Hủy); đã chạy lại trên trình duyệt: lưu nháp 3 lần rồi gửi thành công; test mới |
| Vừa  | Báo quản lý hai lần trên cùng dòng tạo hai báo cáo chờ                                                                                                                                       | Từ chối khi dòng đang chờ quản lý; test mới                                                                                         |
| Thấp | Thông báo lỗi tiếng Anh ở truy vấn danh sách/chi tiết/kho nguồn của điều chuyển                                                                                                              | Đổi sang tiếng Việt                                                                                                                 |

### 22.2. Dọn mã và cấu trúc

- Xóa endpoint `GET /api/transfers/source-inventory` (không còn nơi gọi, thay bằng `availability`) cùng hằng số FE; xóa `isLinePendingManager` không dùng; bỏ điều kiện thừa trong phiếu lấy hàng.
- `.rules`: tách `PickExceptionDialogs`, `TransferFeedbackDialogs`, `TransferDirectory` thành mỗi dialog/thành phần một file; thêm barrel `TransferWork/index.ts`; chuyển logic lưu nháp/gửi/sửa của `TransferFormPage` (428 → 335 dòng) sang `use-transfer-form-actions.ts`.

### 22.3. Ghi nhận, chưa đổi

- Nhiều chỗ so tên vai trò `TenantOwner` để cho phép "chủ sửa/hủy mọi phiếu" (cùng mẫu với luồng Nhập kho). `AGENTS.md` khuyên dựa trên quyền hiệu lực; cần quyết định riêng về quyền kiểu "quản lý mọi phiếu" nếu muốn bỏ.
- Đổi vị trí lấy hàng ghi lý do `NonFefoLot` đè lý do nhân viên chọn khi lô không theo FEFO (lý do gốc vẫn có trong audit log).
- Phản hồi chỉ thông báo người tạo phiếu; nếu Manager tạo phiếu thì Owner không được báo.
- Theo dõi "thao tác ghi của chính mình" ở `useTransferRealtime` đếm mọi mutation của ứng dụng, không riêng điều chuyển.
- Quyền `transfers:pick/resolve/cancel` trên `db71143` lại bị mất khi kiểm tra (xem 21.5); các hộp thoại lấy hàng/báo quản lý/trả hàng sau khi tách file chưa kiểm lại trên trình duyệt, chỉ qua typecheck và test.

### 22.4. Kiểm thử

BE 1022 đạt, 1 bỏ qua; FE 643 đạt, typecheck và lint sạch. Trình duyệt: danh sách (mobile + desktop, bộ lọc, menu thao tác), form nháp lưu nhiều lần, gửi yêu cầu.

## 23. Chỉnh sửa theo phản hồi dùng thử (2026-10-09)

**Luồng xuất đợt thành hai bước (phương án A, không đổi vị trí tồn)**

- Thêm trạng thái đợt `ReadyToDispatch` ("Chờ xuất kho"). Trạng thái lưu dạng chuỗi nên không cần migration.
- Nhân viên (`transfers:pick`) bấm **Hoàn tất lấy hàng**: kiểm đủ/không dư/không chờ quản lý, đợt sang `ReadyToDispatch`, công việc lấy hàng hoàn tất, báo Manager kho xuất. Chưa trừ tồn.
- Manager kho xuất (`transfers:dispatch`) bấm **Xác nhận đã xuất kho** khi xe rời: trừ tồn, đợt sang `InTransit`, tạo công việc nhận hàng. Trước đây nhân viên tự xuất đợt.
- Manager có thể **Mở lại lấy hàng** (`POST .../reopen-picking`, bắt buộc lý do) để đưa đợt về `Picking`.
- Hủy phiếu và dừng phần còn lại bị chặn khi còn đợt `ReadyToDispatch`, kèm hướng dẫn xử lý.

**Gán việc theo kho**: Manager kho xuất giao việc lấy hàng và tạo đợt; Manager kho nhập giao việc nhận hàng (FE kiểm theo kho được gán, BE vẫn kiểm `Manage` theo kho của công việc).

**Giao diện chi tiết phiếu**: dải "Việc tiếp theo" theo vai trò và kho; nút giao việc ở góc phải trên; bố cục thông tin có cột Tiến độ riêng; nhãn "Lý do điều chuyển" và "Ghi chú cho kho"; cột danh sách "Mã yêu cầu".

**Màn lấy/nhận hàng**: báo rõ khi tài khoản thiếu quyền `transfers:pick`/`transfers:receive` thay vì ẩn nút; "Bắt đầu" ở Công việc của tôi mở thẳng màn lấy/nhận hàng.

**Form tạo yêu cầu**: ĐVT lấy từ sản phẩm (đơn vị chính + quy đổi) nên hiện ngay, nhãn "Thùng (1 Thùng = 24 Chai)"; chỉ gợi ý sản phẩm còn tồn khả dụng ở kho xuất (`GET /api/transfers/source-products`); nút "Tạo yêu cầu" và "Tạo đợt xuất" xám khi vượt tồn hoặc chưa chọn dòng.

**Hiệu năng**: gửi yêu cầu tải tồn khả dụng và giữ chỗ hiện có một lần cho cả phiếu thay vì lặp theo từng dòng. Chưa đo thời gian thực trên DB từ xa.

## 24. Vị trí đến, phân bổ lấy hàng, điều chỉnh phân bổ và checklist (2026-10-09)

Đã merge vào `dev` qua PR BE #213 và FE #187. Không có migration mới của luồng điều chuyển.

**Quy tắc nhìn thấy theo kho (che ở BE, không chỉ ở giao diện)**

| Người xem                                | Vị trí đến | Phân bổ lấy hàng / vị trí đi |
| ---------------------------------------- | ---------- | ---------------------------- |
| Chủ doanh nghiệp, người thuộc cả hai kho | Thấy       | Thấy                         |
| Người kho xuất                           | Không      | Thấy                         |
| Người kho nhập                           | Thấy       | Không                        |

**Vị trí đến (không bắt buộc, từng dòng)**: lưu ở `StockTransferItem.DestinationSlotId`; phải thuộc kho nhập, đang hoạt động, không phải khu chờ xuất (`GET /api/transfers/receivable-slots`); khóa sửa khi dòng đã bắt đầu nhận. Màn nhận hàng chỉ hiện "Gợi ý cất tại Khu / Kệ / Ô"; vẫn phải quét vị trí để xác nhận.

**Hiển thị phân bổ**: chi tiết phiếu trả `Allocations` (vị trí, lô, hạn, số lượng đang giữ chỗ) cho người kho xuất và chủ.

**Điều chỉnh phân bổ** (`GET .../items/{itemId}/allocation-options`, `POST .../allocation`): chỉ chủ và quản lý kho xuất (quyền `transfers:dispatch`). Chuyển giữ chỗ giữa các vị trí/lô, chỉ phần chưa lấy, tổng không đổi; chọn lô ngoài FEFO chỉ cảnh báo, không cần duyệt, ghi nhật ký (`AdjustAllocation` / `AdjustAllocationNonFefo`); lý do không bắt buộc; kiểm tra phiên bản phiếu; `CommandId` chống ghi trùng.

**Vị trí đi ưu tiên (không bắt buộc)**: dùng lại cột có sẵn `StockTransferItem.SourceSlotId` nên không cần migration. Khi gửi yêu cầu, vị trí này được lấy trước rồi mới theo FEFO/FIFO (`GET /api/transfers/source-locations`). Cần quyền `transfers:dispatch` và quyền quản lý kho xuất; chỉ đọc khi dòng đã giữ chỗ.

**Quét mã**: nhận nhãn in trên mã vạch (mã ngắn, `BarcodeValue`, nhãn ghép khu như `K01-A07-S-01`, dạng `KOVIA:LOC:*` cũ); mã vạch sản phẩm dùng SKU, dạng cũ vẫn quét được; nhận hàng tra vị trí phía server, mã ngắn trùng nhiều kệ trả 409; camera quét liên tục ở màn lấy và nhận hàng. Chế độ bật/tắt quét mã barcode (Manager) **hoãn, bàn sau**.

**Checklist UC (sheet "mới", cột C đến Q)**: UC 82 (tên giữ nguyên; luồng thêm sửa phiếu đã gửi, bỏ bước duyệt, giữ chỗ khi gửi); UC 83 (xem: tiến độ, che theo kho); UC 84 (tên giữ nguyên "Approve/Reject Warehouse Transfer Request"; nội dung các cột là theo dõi, phản hồi, điều chỉnh phân bổ thay cổng duyệt); UC 85 (chia đợt, lấy hàng, xác nhận xe rời kho hai bước); UC 86 (nhận và cất: vị trí tra ở server, gợi ý chỗ cất); UC 88 đổi tên thành "Cancel Request" (gồm hủy và dừng phần còn lại; chặn khi đợt chờ xuất); UC 72 bổ sung giao việc lấy/nhận hàng theo kho. UC 87 giữ nguyên. Mã BR/MSG giữ như cũ, không thêm mã mới. Chưa thêm dòng riêng "Sửa yêu cầu đã gửi": nội dung này nằm trong luồng thay thế của UC 82.
