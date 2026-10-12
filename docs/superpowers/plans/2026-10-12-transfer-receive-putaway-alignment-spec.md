# Kovia — Đồng bộ nhận/cất hàng và lấy hàng giữa Nhập kho và Điều chuyển

**Ngày:** 2026-10-12
**Trạng thái:** Spec chờ duyệt. Chưa có mã nguồn nào được sửa, chưa có migration nào được tạo hoặc áp.
**Nối tiếp:** `2026-10-08-warehouse-transfer-redesign-spec.md` (luồng điều chuyển), `SSWMS-Backend/docs/features/2026-10-05-putaway-location-plan-spec.md` và `2026-10-07-putaway-flow-phase-2-4-spec.md` (kế hoạch cất hàng nhập kho).
**Nguồn quy tắc đã đọc:** `../AGENTS.md`, `SSWMS-Backend/AGENTS.md` + `.rules`, `SSWMS-Frontend/AGENTS.md` + `.rules`, `docs/CODING_GUIDELINES.md`, `docs/DESIGN_SYSTEM.md`, `docs/LIST_TABLE_DESIGN_GUIDELINES.md`. `../docs/BUSINESS_RULES.md` mà hai `AGENTS.md` nhắc tới **không tồn tại** trong workspace; các BR được trích dẫn dưới đây lấy từ spec điều chuyển 2026-10-08.

---

## 1. Mục tiêu và quyết định đã chốt với người dùng

Nhập kho và Điều chuyển đều có hai khâu giống nhau: **đưa hàng vào ô** (nhận → cất) và **lấy hàng khỏi ô** (pick). Hiện hai luồng lệch nhau, nên người dùng phải học hai cách làm và Điều chuyển thiếu nhiều thứ Nhập kho đã có.

Quyết định đã được người dùng đồng ý:

1. Điều chuyển **giữ một bước "nhận và cất"** (nhân viên quét ô ngay lúc nhận). Không thêm bước cất riêng như Nhập kho.
2. Quản lý được **cấu hình trước kế hoạch cất: một dòng hàng vào một hoặc nhiều ô, kèm số lượng** (như Nhập kho), thay vì một ô cho mỗi dòng như hiện nay.
3. **Dùng chung** bộ gợi ý vị trí, ô quét, xác nhận mã ô và báo lệch giữa hai luồng; mỗi luồng gắn dữ liệu riêng.
4. Lấy hàng: **lấy trải nghiệm của Điều chuyển làm chuẩn** để Xuất kho dùng lại sau (ngoài phạm vi spec này).
5. Giao diện Điều chuyển bớt rườm rà: bỏ ba tab ở danh sách, sắp lại tab ở trang chi tiết theo giai đoạn làm việc.
6. Không đụng vào cơ chế quét mã bật/tắt (đã hoãn, xem memory `project-transfer-scan-mode-toggle`); chỉ chừa chỗ cắm.

### 1.1. Ngoài phạm vi

- Xuất kho dùng lại trang lấy hàng; tách bước cất riêng cho Điều chuyển.
- Model AI Python riêng (người dùng sẽ làm sau); spec này chỉ dùng lại `IPutAwaySuggestionModelClient` hiện có (xem 3.4).
- Báo cáo "cất khác kế hoạch" của Điều chuyển; quét bằng camera; ứng dụng di động riêng.
- Đổi cách nhập kho cất hàng (chỉ rút các thành phần dùng chung, giữ nguyên hành vi).

---

## 2. Hiện trạng đã kiểm chứng

Phương pháp: `git grep` + đọc mã, kèm GitNexus 1.6.5 (đã cài sẵn, index lại ngày 2026-10-12). Kết quả phân tích ảnh hưởng ở mục 9.

### 2.1. Backend

| Nội dung                        | Hiện trạng                                                                                                                                                                                                                                                                | Vị trí                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Kế hoạch cất của Điều chuyển    | **Một ô cho mỗi dòng**: cột `StockTransferItem.DestinationSlotId`. Không có số lượng theo ô.                                                                                                                                                                              | `Domain/Entities/Inventory/StockTransferItem.cs`                         |
| Lưu kế hoạch                    | `PUT /api/transfers/{id}/putaway-slots` (quyền `transfers:receive`, kho nhập mức `Manage`); chặn đổi ô của dòng đã bắt đầu nhận.                                                                                                                                          | `Application/Features/Transfer/SetTransferPutAwaySlots/`                 |
| Gợi ý ô                         | `GET /api/transfers/{id}/putaway-suggestions`: theo cả phiếu (không theo đợt), chỉ dòng chưa nhận gì, tối đa 5 ô/dòng, trả `Path` + `Available`, không tách số lượng, không có tóm tắt/rủi ro/ô đang chừa, không AI. Đòi `Manage` nên nhân viên nhận hàng không gọi được. | `.../GetTransferPutAwaySuggestions/`                                     |
| Logic xếp hạng ô                | Dùng chung với Nhập kho: `PutAwaySuggestionContextLoader` + `PutAwaySuggestionRules` (`Rank`, `Allocate`, `DescribeRisks`, `NearlyFullSlotCodes`).                                                                                                                        | `Application/Features/Inbound/Shared/`                                   |
| Nhận hàng                       | `POST .../shipments/{shipmentId}/receive`; mỗi entry có `DestinationSlotId`, `ScannedSlotCode`, `ScannedProductCode`; một dòng được tách nhiều ô. Không có khái niệm "khác kế hoạch".                                                                                     | `.../ReceiveTransferShipment/`, `Domain/.../StockTransferReceiptLine.cs` |
| Phiếu nhận                      | Mỗi dòng trả `suggestedSlotId/Code/RackCode/ZoneCode/IsSystemDefaultSlot` (một ô).                                                                                                                                                                                        | `.../GetTransferReceiveSheet/`                                           |
| Kế hoạch cất của Nhập kho (mẫu) | `PutAwayPlanLine(GoodsReceiptItemId, SlotId, Quantity, PlannedByUserId)`; `PutAwayDeviation`; `PutAwayDeviationReasonCode` = `SlotFull, SlotBlocked, LabelMismatch, Consolidation, Other`; `PUT /goods-receipts/{id}/putaway-plan`.                                       | `Domain/Entities/Inbound/`                                               |
| Danh sách                       | `GetTransfersQuery.Stage` = `Request` / `Transfer` / `Discrepancy` (`StockTransferStatus` có `Draft, InProgress, AwaitingResolution, Completed, Cancelled`, cộng các giá trị legacy chỉ đọc).                                                                             | `.../GetTransfers/GetTransfersQuery.cs`                                  |

### 2.2. Frontend

| Nội dung                | Hiện trạng                                                                                                                                                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Danh sách               | `TransferTabs` ba tab (`request`, `transfer`, `discrepancy`) qua `?tab=`; `transferStatusOptions(stage)` đổi bộ lọc trạng thái theo tab. "Yêu cầu" và "Điều chuyển" trùng nhau phần lớn.                                           |
| Chi tiết                | Dải `TransferNextSteps` + `TransferOverview` + tab `Hàng hóa · Đợt xuất (n) · Chênh lệch (n) · Phản hồi (n) · Lịch sử`.                                                                                                            |
| Cất hàng                | `PutAwaySlotsDialog` (182 dòng): một ô cho mỗi dòng, mở từ `ShipmentPutAwayCell`. Không có gợi ý tách số lượng, không có sơ đồ nhiều ô.                                                                                            |
| Nhận hàng               | `TransferReceiveTaskPage` (250 dòng) + `ReceiveEntryCard` + `use-transfer-receive-form.ts`: có quét ô, quét mã hàng (không bắt buộc), tách/gộp khai báo (`splitEntry`, `removeReceiptEntry`). Lệch ô chỉ cảnh báo, không có lý do. |
| Nhập kho cất hàng (mẫu) | `PutawayForm` 621 dòng, `PutawaySuggestionPanel/List/Summary`, `PutawaySlotCodeConfirm`, `PutawayDeviationPanel`, `PutawayPlanSheet`, `use-putaway-plan-editor`, `putaway-plan*.ts`.                                               |

### 2.3. Chênh lệch giữa hai luồng (điểm cần đồng bộ)

|                                     | Nhập kho                                        | Điều chuyển                             |
| ----------------------------------- | ----------------------------------------------- | --------------------------------------- |
| Kế hoạch trước                      | Nhiều ô + số lượng                              | Một ô                                   |
| Gợi ý                               | Tách số lượng, tóm tắt, rủi ro, ô đang chừa, AI | Danh sách ô, không tách                 |
| Nhân viên xem gợi ý                 | Có (quyền xem)                                  | Không (đòi `Manage`)                    |
| Cất khác kế hoạch                   | Bắt buộc nhóm lý do, ghi nhận, báo quản lý      | Chỉ cảnh báo, không ghi nhận            |
| Quét ô làm bằng chứng               | Có tiến độ "N/M vị trí", cờ đã xác nhận         | Có quét, không có tiến độ theo kế hoạch |
| Tách một dòng nhiều ô khi thực hiện | Có                                              | Có                                      |

---

## 3. Thiết kế Backend

Tuân thủ `SSWMS-Backend/.rules`: CQRS, mỗi feature một thư mục `Application/Features/Transfer/<Feature>/`, Response DTO ở `Contract/Models/Transfer/`, Command/Query ở Application, controller chỉ `ISender`, mỗi action có `/// <summary>` tiếng Việt, message exception tiếng Việt, FluentValidation chỉ kiểm hình dạng, handler kiểm ngữ nghĩa. **Không đặt Response DTO trong `Application/Features/`** (hiện `TransferPutAwayItemSuggestionResponse` nằm trong file Query; khi sửa phải chuyển sang `Contract`).

### 3.1. Dữ liệu (thêm, không sửa/xóa dữ liệu cũ)

Migration mới, tên đề xuất `AddTransferPutAwayPlan`:

| Bảng                                  | Cột                                                                                                                             | Ghi chú                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `StockTransferPutAwayPlanLines` (mới) | `Id`, `TenantId`, `StockTransferItemId`, `SlotId`, `Quantity decimal` (đơn vị chính), `PlannedByUserId`, `CreatedAt/ModifiedAt` | Duy nhất `(StockTransferItemId, SlotId)`. Mô phỏng `PutAwayPlanLine`. |
| `StockTransferReceiptLines`           | `IsOffPlan bit NOT NULL DEFAULT 0`                                                                                              | Dòng nhận khác kế hoạch.                                              |
| `StockTransferReceiptLines`           | `DeviationReasonCode nvarchar(40) NULL`                                                                                         | Dùng lại giá trị của `PutAwayDeviationReasonCode`.                    |

Quyết định thiết kế:

- **`Quantity` của dòng kế hoạch là tổng số lượng dự kiến cho ô đó trên cả dòng phiếu**, không bị giảm khi nhận. Phần còn lại tính khi đọc: `còn lại(ô) = Quantity − Σ GoodQuantity đã nhận vào ô đó của dòng`. Cách này tránh ghi hai nơi trong giao dịch nhận và an toàn khi một dòng phiếu chia nhiều đợt xuất (khác `PutAwayPlanLine` của Nhập kho, nơi `Quantity` là phần còn phải cất).
- **Giữ cột `StockTransferItem.DestinationSlotId`** để tương thích bảng hàng hóa, thông báo, test hiện có: khi kế hoạch có đúng một ô thì ghi ô đó, nhiều ô thì để `null` (giao diện hiển thị "N vị trí"). Dòng chỉ có `DestinationSlotId` (chưa có dòng kế hoạch) ở chế độ `Legacy` (3.5), giữ hành vi cũ. Không chuyển dữ liệu cũ.
- **Không thêm quyền mới.** Dùng `transfers:receive` + phạm vi kho nhập: ghi kế hoạch cần `Manage`, đọc gợi ý/kế hoạch cần `View` (nhân viên được giao nhận hàng). Lý do: sự cố 2026-10-08 cho thấy việc seed/đồng bộ quyền mới trên `db71143` rất dễ lỗi; spec này không cần phân quyền mới.
- `AGENTS.md`: **không áp migration lên `db71143`** khi chưa có lệnh rõ ràng. Giai đoạn A chỉ tạo migration, SQL rà soát tại `docs/migrations/<timestamp>_AddTransferPutAwayPlan.sql`, kiểm thử trên cơ sở dữ liệu cục bộ đặt tên riêng, rồi **dừng chờ duyệt**.

### 3.2. API

| Endpoint                                                                                                             | Thay đổi                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUT /api/transfers/{id}/putaway-plan` (mới, `transfers:receive`)                                                    | Thay kế hoạch của các dòng gửi lên: `{ expectedVersion, items: [{ itemId, lines: [{ slotId, plannedTotal }] }] }`. **`plannedTotal` là tổng kế hoạch của ô trên cả dòng phiếu**, không phải phần còn lại. `lines` rỗng = bỏ kế hoạch của dòng (chỉ khi dòng chưa có hàng nhận tốt vào ô nào). Không bao giờ xóa hay giảm dưới số đã nhận ở ô đã có hàng. Command `SetTransferPutAwayPlanCommand`. |
| `GET /api/transfers/{id}/putaway-plan-suggestions?shipmentId=` (**mới**, quyền `transfers:receive`, kho nhập `View`) | Gợi ý dạng object (xem 3.3). FE mới dùng endpoint này.                                                                                                                                                                                                                                                                                                                                            |
| `GET /api/transfers/{id}/putaway-suggestions` (**giữ nguyên**)                                                       | Vẫn trả **mảng** như hiện nay, không đổi hình dạng, để FE cũ không lỗi khi BE phát hành trước. Đánh dấu `[Obsolete]`, gỡ cùng `putaway-slots` ở bản sau khi FE mới đã lên.                                                                                                                                                                                                                        |
| `PUT /api/transfers/{id}/putaway-slots` (**chế độ cũ**)                                                              | Hành vi **không đổi**: chỉ ghi `StockTransferItem.DestinationSlotId`, không bao giờ tạo hay sửa `StockTransferPutAwayPlanLines`, vẫn chặn đổi ô của dòng đã bắt đầu nhận. Nếu dòng đã có kế hoạch mới thì trả `409` "Dòng hàng này đã dùng kế hoạch mới, hãy tải lại giao diện." Đánh dấu `[Obsolete]`; có thời hạn gỡ cùng endpoint gợi ý cũ.                                                    |
| `GET /api/transfers/{id}/shipments/{shipmentId}/receive-sheet`                                                       | Mỗi dòng/lô thêm `plan[]` đã phân bổ theo lô, `unplannedQuantity`, `planMode` và `planVersion` (3.5); **giữ** `suggestedSlot*` cho dòng ở chế độ cũ.                                                                                                                                                                                                                                              |
| `POST /api/transfers/{id}/shipments/{shipmentId}/receive`                                                            | Thêm `planVersion` (phiên bản kế hoạch đã dùng để dựng form) và `deviationReasonCode` mỗi entry. Quy tắc bắt buộc quyết định theo **dữ liệu BE** (3.5, 3.6), không theo việc client có gửi trường hay không.                                                                                                                                                                                      |
| `GET /api/transfers`                                                                                                 | Thêm `statusCounts` vào response (3.7). `stage` giữ, đánh dấu cũ.                                                                                                                                                                                                                                                                                                                                 |

Mỗi action mới có `/// <summary>` một dòng tiếng Việt và `[HasPermission(TransferPermissions.Receive)]`, không chuỗi quyền cứng.

**Giới hạn tương thích có chủ đích:** FE cũ vẫn chạy với dòng ở chế độ kế hoạch cũ. Khi quản lý (dùng FE mới) tạo kế hoạch mới cho một dòng, nhân viên còn dùng FE cũ sẽ bị từ chối khi nhận dòng đó (thiếu `planVersion`) và phải **tải lại/cập nhật giao diện**. Thông báo lỗi phải nói rõ điều này (tiếng Việt, mã `TRANSFER_PUTAWAY_PLAN_VERSION_REQUIRED`). Không khẳng định FE cũ tương thích trong mọi trường hợp.

### 3.3. Gợi ý vị trí cất (mở rộng, dùng chung với Nhập kho)

Mục tiêu: cùng một "động cơ gợi ý" cho hai luồng, khác nguồn dữ liệu đầu vào.

- Tách phần lõi của `GetPutAwaySlotSuggestionsQueryHandler` (xếp hạng → gọi AI nếu có → `Allocate` → rủi ro → ô gần đầy → tóm tắt) thành thành phần dùng chung trong `Application/Features/Inbound/Shared/` (cạnh `PutAwaySuggestionRules`); tên `PutAwayPlanBuilder`. Mỗi handler chỉ còn: nạp dữ liệu → gọi lõi → ánh xạ Response. Thêm vào tệp có sẵn trước khi tạo tệp mới (`.rules`).
- Số lượng cần gợi ý của một dòng:
  - có `shipmentId`: số lượng đã xuất của đợt chưa khai báo nhận;
  - không có: **`Chưa khai báo nhận = Quantity − StoppedQuantity − ReceivedQuantity − DamagedQuantity − MissingQuantity − ResolvedMissingQuantity`**. Phải trừ cả `ResolvedMissingQuantity`: xác nhận thất thoát giảm `MissingQuantity` và tăng `ResolvedMissingQuantity`, nên bỏ trường này thì hàng đã xác nhận mất sẽ quay lại thành "cần nhận".
  - Hàng thiếu đang chờ xử lý **không** thuộc kế hoạch; nhận bổ sung tăng `ReceivedQuantity` (và tính vào ngân sách ô nếu nhận tốt vào ô đó).
  - **Bỏ điều kiện "chỉ dòng chưa nhận gì"**: dòng đã nhận một phần vẫn được gợi ý cho phần còn lại.
- Lọc ô: chỉ ô `TransferReceivableSlots` của kho nhập.
- Response (DTO mới ở `Contract/Models/Transfer/`) mỗi ô: `slotId, slotCode, rackCode, zoneName, path, suggestedQuantity, available, reason, warnings`; mỗi dòng: `itemId, remaining, suggestions[], unallocatedQuantity`; cả phiếu: `summary, risks[], heldSlots[], isAiAssisted, notice`. Dạng gần giống `PutAwaySuggestionResponse` để FE dùng chung kiểu.
- Rủi ro lấy từ `DescribeRisks`, ô gần đầy, lô sắp hết hạn (30 ngày) như Nhập kho.
- Kiểm thử hành vi Nhập kho **không đổi** (`PutAwayLocationPlanTests`, `DirectReceivingWorkflowTests`, `PutAwaySuggestionRules` tests) là điều kiện nghiệm thu.

### 3.4. AI cho Điều chuyển (đã chốt: dùng ngay)

Người dùng chọn **dùng AI ngay** (2026-10-12). Dùng lại `IPutAwaySuggestionModelClient` giống `GetPutAwaySlotSuggestionsQueryHandler`: AI chỉ cho **thứ tự ưu tiên và trần số lượng**, `PutAwaySuggestionRules.Allocate` vẫn quyết định theo sức chứa thật; AI lỗi/chậm thì rơi về quy tắc kho và trả `notice`. AI không tự lưu kế hoạch. Người dùng sẽ thay bằng model Python riêng sau, nên giữ nguyên hợp đồng `IPutAwaySuggestionModelClient` và không gắn logic riêng của điều chuyển vào client. Response có `isAiAssisted` và `notice`; FE dùng token tertiary (tím) cho phần gợi ý có AI theo `DESIGN_SYSTEM.md`. Lõi dùng chung ở 3.3 phải gồm bước gọi AI để Nhập kho và Điều chuyển cùng đi một đường.

### 3.5. Lưu và đọc kế hoạch

`SetTransferPutAwayPlanCommandHandler` (thư mục `SetTransferPutAwayPlan/`, kèm Validator hình dạng):

- Validator: `transferId`, `itemId`, `slotId` đúng định dạng; `plannedTotal > 0` và đúng độ chính xác số lượng của đơn vị chính; không trùng `(itemId, slotId)` trong cùng yêu cầu; tối đa 20 ô/dòng.
- Handler: `TransferAggregate.LoadAsync` → `TransferRules.EnsureOpen` → kho nhập `Manage` → `InventoryCommandSafety.EnsureVersion` → mọi `itemId` thuộc phiếu → `TransferReceivableSlots.EnsureReceivableAsync` → với mỗi dòng: `Σ plannedTotal ≤ Quantity − StoppedQuantity`; với ô đã có hàng nhận tốt, `plannedTotal ≥ đã nhận tốt vào ô đó` (không rút dưới số đã nhận, **không xóa ô đã nhận**) → ghi/xóa dòng kế hoạch, cập nhật `DestinationSlotId` (1 ô → ghi ô đó; nhiều ô → `null`) → cảnh báo (không chặn) sức chứa/trộn hàng như Nhập kho → **cập nhật `StockTransfer.ModifiedAt`** → audit `SetPutAwayPlan` → thông báo cho nhân viên đang được giao task nhận → `SaveChangesWithConflictHandlingAsync` (một lần) → realtime `Updated`.
- Cho phép sửa kế hoạch khi dòng đã nhận một phần (phần còn lại vẫn cần kế hoạch); phần đã nhận không bị đổi.
- Lỗi: `NotFoundException` / `BadRequestException` / `ConflictException`, message tiếng Việt, ví dụ "Tổng số lượng kế hoạch vượt số lượng còn phải nhận của dòng hàng."

**Chế độ kế hoạch (`planMode`) do BE quyết định theo dữ liệu từng dòng phiếu:**

| Dòng phiếu                                                                       | `planMode` | Hành vi khi nhận                                                        |
| -------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| Có ít nhất một `StockTransferPutAwayPlanLine`                                    | `Planned`  | Bắt buộc `planVersion` hợp lệ và lý do lệch (3.6).                      |
| Không có dòng kế hoạch (kể cả chỉ có `DestinationSlotId` hoặc ô mặc định của kệ) | `Legacy`   | Như hiện nay: không đòi lý do; vẫn tính và ghi `IsOffPlan` để thống kê. |

Chế độ `Legacy` có thời hạn gỡ cùng các endpoint cũ (3.2).

**Đọc kế hoạch.** `GetTransfer` trả kế hoạch cả dòng; `GetTransferReceiveSheet` trả kế hoạch **đã phân bổ theo lô** cho một đợt:

```
line.lots[i].plan: [{ slotId, slotCode, rackCode, zoneName, path, plannedQuantity, remainingBudget }]
line.lots[i].unplannedQuantity
line.planMode, sheet.planVersion
```

Thuật toán phân bổ (xác định, lặp lại được):

1. Ngân sách từng ô = `plannedTotal − Σ nhận tốt đã ghi vào ô đó của dòng` (gồm cả nhận bổ sung).
2. Sắp các lô của đợt theo: hạn dùng gần nhất trước; lô **không có hạn dùng** sau cùng trong nhóm có lô; rồi số lô; rồi `lotId`. Entry **không theo lô** (`LotId = null`) là một nhóm riêng, xử lý sau cùng.
3. Với từng lô theo thứ tự, lấy lần lượt từ các ô còn ngân sách (ô nhiều ngân sách trước, rồi `slotId`) cho tới khi đủ số lượng đã xuất của lô; trừ vào ngân sách chung. Không áp cùng một kế hoạch cho mỗi lô.
4. Phần lô không còn ngân sách ở ô nào là `unplannedQuantity`; FE hiển thị thành khai báo điền sẵn số lượng nhưng để trống vị trí (nhân viên phải chọn ô thì mới xác nhận được).

**`planVersion`:** SHA-256 của chuỗi chuẩn hóa gồm `itemId|slotId|plannedTotal` của **các dòng phiếu thuộc đợt nhận**, sắp xếp cố định theo `itemId` rồi `slotId`, số decimal định dạng cố định (2 chữ số thập phân, dấu chấm, không phụ thuộc culture). Không dùng `GetHashCode()`. Chỉ băm các dòng liên quan tới đợt để quản lý sửa dòng không liên quan không gây `409`. Dòng ở `Legacy` vào băm như tập kế hoạch rỗng. **Không cần cột mới**: giá trị luôn tính lại từ `StockTransferPutAwayPlanLines`, nên migration `AddTransferPutAwayPlan` (PR #217) không đổi.

### 3.6. Nhận hàng: so với kế hoạch và ghi nhận lệch

Trong `ReceiveTransferShipmentCommandHandler`:

- **Kiểm `planVersion` luôn được thực hiện khi đợt có dòng `Planned`, và cả khi kế hoạch hiện tại vừa bị xóa hết.** BE tính lại băm từ dữ liệu hiện tại và so với `planVersion` client gửi: thiếu hoặc lệch → `409` mã `TRANSFER_PUTAWAY_PLAN_CHANGED`. Nếu client gửi băm khác rỗng nhưng kế hoạch hiện tại đã rỗng, vẫn phải `409`; không bỏ qua chỉ vì DB không còn dòng kế hoạch. Dòng `Legacy` không bị đòi `planVersion`.
- **So kế hoạch bằng cộng dồn toàn request.** Gộp mọi entry tốt của cùng dòng phiếu theo `(itemId, slotId)` (kể cả khác lô), cấp ngân sách ô theo thứ tự entry trong request. Entry nào làm vượt ngân sách của ô, hoặc vào ô không có trong kế hoạch, bị coi là **khác kế hoạch** (`IsOffPlan = true`). Ví dụ ô A có kế hoạch 100, nhận 60 + 60: entry thứ nhất đúng, entry thứ hai lệch. Kiểm tổng hiện có theo từng `(line, lot)` vẫn giữ.
- **Lý do:** dòng `Planned` có entry khác kế hoạch thì bắt buộc `deviationReasonCode` thuộc `PutAwayDeviationReasonCode`; `Other` bắt buộc `Note` 5–500 ký tự (dùng trường `Note` hiện có). Thiếu → `400` mã `TRANSFER_PUTAWAY_DEVIATION_REASON_REQUIRED`. Dòng `Legacy` giữ như cũ.
- Hàng hỏng/thiếu không tính "khác kế hoạch" (vẫn theo luồng nguyên nhân hiện có); ngân sách ô chỉ trừ bằng **số nhận tốt**.
- **Nhận bổ sung** qua `ResolveTransferDiscrepancy` ngoài phạm vi kiểm lệch kế hoạch lần này; nhưng lượng tốt đã nhận bổ sung vẫn làm giảm ngân sách ô.
- Thông báo `TransferUpdate` cho người lập kế hoạch gần nhất và manager kho nhập khi có dòng khác kế hoạch (trừ người nhận).
- Quét ô: giữ `TransferScanRules.EnsureSlotMatchesAsync`; không đổi quy tắc "bắt buộc/không bắt buộc quét"; chừa điểm cắm cho công tắc quét (đã hoãn).
- **Kiểm soát ghi đồng thời.** Cả lưu kế hoạch và nhận hàng đều cập nhật dòng `StockTransfer` (`ModifiedAt`) trong cùng giao dịch, để `StockTransfer.RowVersion` bắt xung đột; xung đột rollback toàn bộ và trả `409`. Phiên bản riêng của đợt xuất không đủ vì ngân sách ô dùng chung giữa nhiều đợt. Race này còn có thể bỏ lọt lý do bắt buộc hoặc ghi sai bằng chứng lệch kế hoạch, nên **giữ mức High cho tới khi Gate A chứng minh bằng test đồng thời** (đổi kế hoạch trong lúc nhận; hai đợt nhận cùng lúc) rằng hai thao tác cùng được bảo vệ bởi `StockTransfer.RowVersion` và xung đột rollback toàn bộ.
- Giữ nguyên: kiểm sức chứa `StorageCapacityPolicy`, `TransferIn`, tạo discrepancy, một lần nhận mỗi đợt.

### 3.7. Danh sách: số đếm theo trạng thái

- Thêm `statusCounts` vào `StockTransferListResponse`: `{ all, draft, inProgress, awaitingResolution, completed, cancelled }`, tính **trên cùng bộ lọc** (tìm kiếm, kho, ngày) **trừ trạng thái**, và theo phạm vi kho + phiếu nháp chỉ người tạo thấy (đúng quy tắc hiện có của `GetTransfers`). Một truy vấn gom nhóm, không N+1.
- `Stage` giữ để không vỡ FE cũ trong một bản; thêm ghi chú Swagger "đã thay bằng `status`". Quy đổi cho FE: `request` → mọi trạng thái trừ `Cancelled`; `transfer` → `InProgress`; `discrepancy` → `AwaitingResolution`. **Đây là thay đổi ý nghĩa có chủ đích, không phải tương thích nguyên vẹn:** tab `transfer` cũ là "phiếu đã có đợt xác nhận rời kho", gồm cả phiếu hoàn tất và chờ chênh lệch; sau thay đổi các phiếu đó xem ở "Hoàn tất" và "Chờ xử lý chênh lệch". `statusCounts.all` **loại phiếu đã hủy** để khớp danh sách mặc định.
- Cần xác nhận bằng GitNexus (`GetTransfersQueryHandler`) mọi nơi gọi `Stage` trước khi đánh dấu cũ (mục 9).

### 3.8. Kiểm thử Backend (thêm vào `Application.Tests/Features/Transfer/`)

Ghi chú: file hiện có `TransferPutAwaySlotTests.cs`, `TransferDestinationSlotTests.cs`, `TransferFlowFixture.cs`; mở rộng trước khi tạo file mới.

- Lưu kế hoạch: nhiều ô một dòng; tổng vượt → lỗi; ô không thuộc kho nhập → lỗi; phiên bản cũ → `409`; sửa kế hoạch khi đã nhận một phần (không rút dưới số đã nhận); bỏ kế hoạch (`lines` rỗng); `DestinationSlotId` đồng bộ (1 ô → ghi, nhiều ô → null).
- Dòng chỉ có `DestinationSlotId` là `planMode = Legacy`; endpoint cũ không đổi hành vi, và trả `409` khi dòng đã có kế hoạch mới.
- Gợi ý: có `shipmentId`; dòng đã nhận một phần; tách số lượng nhiều ô; thiếu chỗ → `unallocatedQuantity`; nhân viên có `View` gọi được, người ngoài kho bị `403`; cross-tenant bị từ chối.
- Nhận hàng: đúng kế hoạch (không lý do); khác ô không lý do → `400`; khác ô có lý do → ghi `IsOffPlan`; vượt số lượng ô; `Other` thiếu ghi chú; dòng không kế hoạch không bị đòi lý do; thông báo gửi đúng người; chia nhiều đợt xuất vẫn tính `remainingQuantity` đúng.
- Quyết định chế độ theo dữ liệu: bỏ `planVersion` hoặc bỏ lý do ở dòng `Planned` vẫn bị từ chối; dòng `Legacy` không bị đòi.
- `planVersion`: băm ổn định (cùng dữ liệu cho cùng giá trị, bất kể thứ tự); chỉ gồm dòng của đợt; **kế hoạch bị xóa hết sau khi form được dựng vẫn trả `409`**; sửa dòng không liên quan không gây `409`.
- Cộng dồn ngân sách: ô A kế hoạch 100, nhận 60 + 60 (kể cả khác lô) → entry thứ hai lệch; nhiều lô dùng chung ngân sách, không nhân đôi; lô không hạn dùng và entry không lô theo đúng thứ tự; `unplannedQuantity` đúng.
- Công thức chưa khai báo nhận: hỏng, thiếu, **thất thoát đã xác nhận**, nhận bổ sung, dừng hàng.
- Đồng thời: đổi kế hoạch trong lúc nhận; hai đợt cùng nhận một dòng; xung đột rollback toàn bộ.
- Danh sách: `statusCounts` đúng theo bộ lọc, phạm vi kho, nháp chỉ người tạo.
- Hồi quy Nhập kho: bộ test cất hàng/gợi ý hiện có phải xanh sau khi tách lõi dùng chung.
- Quyền: cho phép/từ chối/khác tenant/khác kho cho `putaway-plan`, `putaway-suggestions`.

Lệnh kiểm thử theo thói quen đã dùng: chạy bản sao ngoài thư mục đang bị API khóa (`D:\bt_copy3`), `dotnet build` Release trước, vì deploy lên `main` chạy `dotnet build --configuration Release` (sự cố CS4016 ngày 2026-10-11 xuất phát từ đây).

---

## 4. Thiết kế Frontend (logic)

Tuân thủ `SSWMS-Frontend/.rules` và `docs/CODING_GUIDELINES.md`: trang là vỏ mỏng và sở hữu mọi hook React Query; component chỉ hiển thị; schema Zod trong `schemas/*.schema.ts` phản chiếu validator BE; thứ tự cập nhật khi BE đổi: **schema → types → service → hook → component**; không `any`; mutation có `onError` + `logger.error` + `toast.error`; không lưu dữ liệu server vào Zustand; khối dùng chung phải được **thăng cấp từ feature lên `src/components/` khi có lần dùng thứ hai thật** (nay đã có: Nhập kho + Điều chuyển).

### 4.1. Thành phần dùng chung (rút từ Nhập kho)

Vị trí: `src/components/operations/putaway/` (cạnh `OperationalListPanel`, `OperationalMasterDetail`). Có `index.ts` barrel. Kiểu trung lập ở `src/types/putaway.types.ts` (không import kiểu của `inbound` hay `transfer`).

| Thành phần dùng chung                                                         | Rút từ                           | Ghi chú                                                                                                                                   |
| ----------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `PutawaySuggestionPanel`, `PutawaySuggestionList`, `PutawaySuggestionSummary` | `inbound/.../PutawayDetailPage/` | Nhận `PutAwaySuggestionView` trung lập qua props.                                                                                         |
| `PutawaySlotCodeConfirm`                                                      | `inbound/...`                    | **Rủi ro HIGH** theo GitNexus (3 ảnh hưởng, gồm `PutawayAllocationRow`, `PutawayForm`); bắt buộc chạy `PutawayForm.test.tsx` và test mới. |
| `PutawayDeviationPanel` (chọn nhóm lý do)                                     | `inbound/...`                    | Nhóm lý do một danh sách hằng số duy nhất.                                                                                                |
| `PutawayPlanNotice`                                                           | `inbound/...`                    | Thông báo "có kế hoạch" cho nhân viên.                                                                                                    |

Cách làm an toàn (mỗi bước một commit nhỏ, chạy test Nhập kho sau mỗi bước):

1. Tạo kiểu trung lập + bộ chuyển đổi `toSuggestionView(inboundResponse)` ở feature Nhập kho; di chuyển component sang thư mục dùng chung; sửa import trong Nhập kho. **Không đổi hành vi.**
2. Thêm bộ chuyển đổi tương tự cho Điều chuyển (`toSuggestionView(transferResponse)` ở `transfer/utils/transfer-put-away.ts`, thay `suggestionToOption`).
3. Component dùng chung **không** gọi hook, **không** biết `inbound`/`transfer` (quy tắc "Data Flow").

Không tạo thêm tệp ngoài những gì nêu ở đây; sửa tệp có sẵn trước (`.rules`).

### 4.2. Kế hoạch cất của Điều chuyển

- `transfer/types/transfer.types.ts`: thêm `TransferPutAwayPlanLine`, `TransferPutAwayPlanRequest`, mở rộng `TransferReceiveSheetLine.plan[]`, `TransferListResponse.statusCounts`; giữ `suggestedSlot*`.
- `transfer/schemas/`: `transfer-putaway-plan.schema.ts` (Zod): `quantity > 0`, độ chính xác theo đơn vị, không trùng ô, tối đa 20 ô/dòng. **Payload luôn gửi `plannedTotal` (tổng kế hoạch của ô trên cả dòng)**. UI hiển thị "Đã nhận" (khóa) và "Còn lại"; người dùng sửa tổng với ràng buộc `plannedTotal ≥ đã nhận vào ô` và `Σ plannedTotal ≤ Quantity − Stopped`. Quy đổi giữa "còn lại" và "tổng" chỉ ở một hàm thuần duy nhất trong `transfer-put-away.ts`, có test.
- `transfer/services/`: `setPutAwayPlan`, thêm `getPutAwayPlanSuggestions(transferId, shipmentId?)` gọi endpoint mới (3.2); giữ `getPutAwaySuggestions` cho tới khi gỡ endpoint cũ.
- `transfer/hooks/use-transfer-put-away-actions.ts` (có sẵn): thêm `useSetTransferPutAwayPlanMutation` (`retry: false`, 409 → hiện lý do + tải lại), `useTransferPutAwaySuggestionsQuery`.
- `transfer/hooks/use-transfer-putaway-plan-editor.ts`: trạng thái nháp kế hoạch, mô phỏng `inbound/hooks/use-putaway-plan-editor.ts` (183 dòng). Cân nhắc dùng chung phần thuần tính toán (`putaway-plan.ts`, `putaway-plan-draft.ts`); chỉ thăng cấp nếu logic thực sự giống (đã kiểm: Nhập kho tính theo `Remaining`, Điều chuyển theo `planned − received`, nên **chỉ chia sẻ hàm thuần phân bổ/kiểm tổng**, không chia sẻ hook).
- `PutAwaySlotsDialog` + `ShipmentPutAwayCell` được thay bằng `TransferPutAwayPlanSheet` (4.3). Gỡ mã cũ sau khi chuyển xong (không để mã chết).

### 4.3. Nhận hàng

`useTransferReceiveForm` + `ReceiveEntryCard` (ảnh hưởng thấp theo GitNexus: chỉ `TransferReceiveTaskPage`):

- Gửi `planVersion` của phiếu nhận trong request; `409` `TRANSFER_PUTAWAY_PLAN_CHANGED` → tải lại phiếu nhận, **giữ số lượng và ô nhân viên đã nhập** cho các khai báo còn hợp lệ, chỉ đánh dấu dòng kế hoạch đã đổi, không âm thầm mất bản nháp.
- Phần `unplannedQuantity` hiện thành khai báo điền sẵn số lượng, **vị trí trống** nhãn "Chưa có vị trí theo kế hoạch".
- Khởi tạo khai báo từ `plan[]`: mỗi ô kế hoạch còn lại → một khai báo với `goodQuantity` = số lượng đề xuất của đợt (thay cho "một khai báo cho cả lô"); dòng không có kế hoạch giữ nguyên hành vi hiện tại.
- Quét mã ô: nếu khớp một ô kế hoạch → tự gán khai báo tương ứng và đánh dấu đã xác nhận; khớp ô ngoài kế hoạch → mở lựa chọn "Cất khác kế hoạch" (4.4) thay vì chỉ cảnh báo.
- Thêm trạng thái `isOffPlan` và `deviationReasonCode` vào giá trị khai báo; schema Zod: khác kế hoạch ⇒ cần nhóm lý do; `Other` ⇒ ghi chú 5–500 ký tự.
- Tiến độ "Đã xác nhận N/M vị trí được giao" tính ở hook, hiển thị ở đầu danh sách khai báo.
- `splitEntry`/`removeReceiptEntry` giữ; `splitEntry` mới ưu tiên gán ô kế hoạch còn lại thay vì ô trống.

### 4.4. Danh sách và trang chi tiết

- `TransferTabs.tsx` được thay bằng `TransferStatusFilter` (4.5 của spec UI). `parseTransferStage`/`transferStatusOptions` đơn giản hóa; `?tab=` cũ được ánh xạ sang `?status=` để liên kết cũ không chết (đổi ý nghĩa có chủ đích, xem 3.7) (`request` → mặc định, `transfer` → `InProgress`, `discrepancy` → `AwaitingResolution`).
- `TransferPage` giữ trách nhiệm đọc `status`, `page`, `pageSize`, tìm kiếm trong URL; `TransferDirectory` nhận `statusCounts` qua props.
- Trang chi tiết: đổi danh sách tab và gộp `Phản hồi` (UI mục 5.3). `DetailTab` mở rộng, mặc định chọn theo `nextSteps` (UI mục 5.3).

### 4.5. Quyền và khả năng (capability)

Không thêm mã quyền FE. Trang tính cờ `canPlanPutAway` (= `transfers:receive` + quản lý kho nhập), `canReceive`, `canViewPlan` từ `permissionCodes.ts` và `transfer-capabilities.ts` hiện có, truyền xuống component. Component không so tên vai trò hay chuỗi quyền.

### 4.6. Kiểm thử Frontend

- Đơn vị (Vitest): schema kế hoạch; hàm thuần phân bổ/kiểm tổng; ánh xạ `?tab=` → `?status=`; khởi tạo khai báo từ `plan[]`; xác định "khác kế hoạch"; tiến độ N/M.
- Component: `TransferPutAwayPlanSheet` (thêm/xóa/tách ô, lỗi tổng, áp dụng gợi ý, bàn phím); `ReceiveEntryCard` (ô kế hoạch, lệch kế hoạch, lý do); `TransferStatusFilter` (số đếm, `aria-current`).
- Hồi quy Nhập kho: `PutawayForm.test.tsx` (523 dòng) và `putaway-plan.test.ts` (486 dòng) phải xanh sau khi rút component dùng chung.
- Chạy theo `package.json` (pnpm): `pnpm lint`, `pnpm test`, `pnpm build` (kiểm kiểu); đọc `node_modules/next/dist/docs/` trước khi dùng API Next mới (theo `AGENTS.md`).

---

## 5. Thiết kế UI/UX

Mục tiêu: người dùng chỉ phải trả lời "việc kế tiếp của tôi là gì" và làm ngay; thao tác chính ít bước, rõ ràng, an toàn khi sai. Áp dụng `docs/DESIGN_SYSTEM.md`: token Tailwind (không màu cứng), Inter + JetBrains Mono cho mã/số, viền thay bóng, bo 4px, trạng thái có icon + chữ (không chỉ màu), tertiary tím **chỉ** cho tính năng AI (gợi ý có AI hỗ trợ dùng tertiary; phần quy tắc kho thuần dùng `primary`/`secondary`, và khi AI lỗi phải hiện `notice` rằng đang dùng quy tắc kho).

### 5.1. Nguyên tắc chung

1. **Một trạng thái, một nơi**: mỗi phiếu có đúng một "Việc tiếp theo" nổi bật ở đầu trang (`TransferNextSteps` giữ lại, đây là phần hiệu quả nhất hiện nay).
2. **Điền sẵn, chỉ sửa khi lệch**: số lượng và ô lấy từ kế hoạch; người dùng quét xác nhận, không nhập lại.
3. **Lệch kế hoạch là bình thường nhưng phải có lý do ngắn**: chọn một nhóm lý do, không bắt gõ văn bản (trừ `Other`).
4. **Không che thông tin bằng tab thừa**: chỉ chia tab theo giai đoạn làm việc lớn; số đếm tab = việc đang chờ xử lý.
5. Mọi hành động có hậu quả (tạo yêu cầu, xác nhận xuất, xác nhận nhận, hủy, dừng) có hộp thoại xác nhận nêu số lượng bị ảnh hưởng (giữ theo spec điều chuyển 9.2).

### 5.2. Danh sách điều chuyển (`/transfers`)

Bố cục theo `LIST_TABLE_DESIGN_GUIDELINES.md`: `OperationalListPanel` + `OperationalPagination`, header và toolbar không cuộn, chỉ thân bảng cuộn, không `calc(100vh-…)`.

- **Bỏ ba tab.** Thay bằng thanh lọc nhanh theo trạng thái ngay đầu panel, mỗi mục kèm số đếm:

  `Tất cả (n) · Nháp (n) · Đang thực hiện (n) · Chờ xử lý chênh lệch (n) · Hoàn tất (n) · Đã hủy (n)`
  - Là điều hướng thật (liên kết cập nhật `?status=`), `aria-current="page"` cho mục đang chọn, bàn phím đi bằng Tab/Enter, tái dùng kiểu thanh điều hướng của `data-slot="operational-workspace-navigation"` hiện có; **không** dùng div giả tab.
  - "Chờ xử lý chênh lệch" có huy hiệu số nổi bật (đây là việc cần người xử lý), mục khác chỉ hiện số đếm xám.
  - "Tất cả" mặc định ẩn "Đã hủy" (giữ hành vi hiện tại), "Đã hủy" xem riêng.

- Ô lọc trạng thái trong toolbar **bỏ** (đã có thanh lọc nhanh). Giữ ô tìm kiếm, kho xuất/kho nhập, khoảng ngày; đổi bất kỳ bộ lọc nào đặt lại trang về 1.
- Cột: giữ như hiện nay; thêm cột **"Việc cần làm"** (một chip ngắn: "Cần lấy hàng", "Cần giao nhận", "Cần xử lý chênh lệch", "Hoàn tất") để người dùng quét nhanh mà không mở từng phiếu. Dữ liệu lấy từ trạng thái phiếu + tiến độ đợt, tính ở BE hoặc `transfer-next-steps.ts`; chốt ở mục 10.
- Mobile (<768px): chuyển sang danh sách thẻ trong `data-slot="operational-list-body"`; thanh lọc nhanh cuộn ngang trong chính nó, không gây cuộn ngang cả trang.
- Trạng thái rỗng/tải/lỗi chiếm vùng thân, có hành động ("Tạo yêu cầu điều chuyển" nếu có quyền).

### 5.3. Trang chi tiết phiếu (`/transfers/{id}`)

Giữ: header + `TransferStatusBadge`, `TransferNextSteps`, `TransferOverview`. Đổi thanh tab theo **giai đoạn làm việc**:

| Tab                                           | Nội dung                                                                                                                                                                                       | Ai dùng chính          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Hàng hóa** (mặc định khi không có việc chờ) | Bảng master/detail hiện có (`TransferMasterDetail`, dùng `OperationalMasterDetail`); mỗi dòng thêm cột "Vị trí cất" hiển thị "Ô A07-01" hoặc "3 vị trí".                                       | Tất cả                 |
| **Lấy hàng**                                  | Danh sách đợt xuất từ góc kho xuất: tạo đợt, giao task lấy hàng, tiến độ lấy, xác nhận xuất, trả hàng (`TransferShipmentsPanel` phía xuất).                                                    | Manager/Staff kho xuất |
| **Nhận & cất**                                | Từ góc kho nhập: kế hoạch cất (nút "Cấu hình vị trí cất"), giao task nhận, trạng thái nhận từng đợt, liên kết "Mở màn nhận hàng".                                                              | Manager/Staff kho nhập |
| **Chênh lệch (n)**                            | `TransferDiscrepancyPanel` + **Phản hồi** gộp làm hai khối trong cùng tab (phản hồi là trao đổi để giải quyết sự cố nên đi cùng chênh lệch). Huy hiệu số = chênh lệch mở + phản hồi chờ xử lý. | Manager kho nhập/xuất  |
| **Lịch sử**                                   | `transfer-history` như hiện nay.                                                                                                                                                               | Tất cả                 |

- Tab nào **không liên quan** tới người xem (ví dụ Staff kho xuất không có việc ở "Nhận & cất") vẫn hiển thị nhưng mờ nhẹ và không có hành động; không ẩn để mọi người cùng thấy cùng một phiếu.
- **Mở sẵn đúng tab**: khi vào trang, nếu "Việc tiếp theo" thuộc một tab (ví dụ cần giao task nhận) thì mở tab đó; nếu không thì "Hàng hóa". Đổi tab cập nhật `?tab=` để chia sẻ liên kết.
- Số đếm trên tab chỉ cho **việc đang chờ**, không đếm tổng mọi thứ, để huy hiệu có ý nghĩa.
- Tab dạng thẻ (Lấy hàng, Nhận & cất, Chênh lệch) chảy theo chiều cao nội dung và cuộn cùng trang như hiện tại (đã có `OperationalListPanel` biến thể không khóa chiều cao); chỉ tab Hàng hóa dùng bố cục chiếm trọn chiều cao.
- ARIA: giữ cách nối `tabIds` hiện có (`aria-controls`, `aria-labelledby`).

### 5.4. Cấu hình kế hoạch cất (quản lý kho nhập)

`TransferPutAwayPlanSheet` (thay `PutAwaySlotsDialog`): Sheet bên phải ~50% desktop, toàn màn hình mobile, theo mẫu `PutawayPlanSheet` của Nhập kho (animation Sheet: `slide-in-from-right`, 300ms, `ease-out`, `animation-duration-300`).

```
┌ Cấu hình vị trí cất · TRF-2026…  ·  Kho nhập: Kho Test ────────── [x]
│ [Gợi ý vị trí]                         Đã đặt kế hoạch 3/5 dòng
├────────────────────────────────────────────────────────────────────
│ BIA-TIGER · Bia Tiger thùng        Cần cất 120 thùng
│  ▸ Ô A07-01  Khu K01/Kệ A07  [ 80 ]  còn nhận được 200   ⓘ [Xóa]
│  ▸ Ô A07-02  Khu K01/Kệ A07  [ 40 ]  gần đầy             ⚠ [Xóa]
│  [+ Thêm vị trí]  [Chọn trên sơ đồ]      Tổng 120/120 ✓
├────────────────────────────────────────────────────────────────────
│ … dòng tiếp theo
├────────────────────────────────────────────────────────────────────
│ Tóm tắt: Phân bổ 5 dòng vào 7 vị trí theo quy tắc kho.
│ Rủi ro: • Ô A07-02 sẽ gần đầy • Lô LOT-0912 hết hạn 22/10
└ [Đóng]                                      [Lưu kế hoạch & báo nhân viên]
```

- **Nút "Gợi ý vị trí"** gọi gợi ý rồi hiện khối gợi ý (tóm tắt, rủi ro, ô theo dòng); **"Áp dụng gợi ý"** điền vào kế hoạch nháp (chưa lưu); người dùng sửa được; chỉ lưu khi bấm **"Lưu kế hoạch & báo nhân viên"**.
- Mỗi dòng hàng: danh sách ô + ô nhập số lượng (căn phải, đơn vị gắn bên cạnh, số tabular); tổng hiện "120/120" với icon ✓ khi khớp, cảnh báo khi thiếu/thừa (icon + chữ, không chỉ màu). Số lượng mặc định của ô thêm mới = phần còn thiếu.
- Chọn ô bằng `LookupCombobox` (đã có), gợi ý đứng đầu kèm dòng phụ giải thích; footer "Chọn trong sơ đồ kho" mở `TransferSlotMapDialog` (đã có). Khi mở sơ đồ, sheet tạm ẩn như dialog cũ (đã xử lý tương tự).
- Dòng đã nhận một phần: phần đã nhận hiển thị khóa ("Đã nhận 50 vào A07-01"), chỉ sửa phần còn lại; không thể giảm ô đã nhận dưới số đã nhận.
- Rời sheet khi có thay đổi chưa lưu → hỏi xác nhận.
- Lỗi 409 (phiếu đã đổi): thông báo ngay trong sheet + nút "Tải lại", không mất bản nháp đang sửa nếu còn hợp lệ.
- Chỉ người có `canPlanPutAway` thấy nút mở sheet; người khác xem được kế hoạch ở chế độ chỉ đọc (cùng sheet, không có nút lưu).

### 5.5. Màn nhận hàng của nhân viên (mobile-first)

Trang `TransferReceiveTaskPage` giữ bố cục hiện có (`TransferWorkHeader`, vùng cuộn riêng `data-slot="transfer-scroll"`, nút lớn một tay, không cuộn ngang ở 360px), nhưng thẻ khai báo gọn hơn và dẫn từng bước:

```
┌ BIA-TIGER · Bia Tiger thùng          Lô LOT-0912   Đã xuất 120 thùng
├ Kế hoạch cất:                                   Đã xác nhận 1/2
│  ✓ A07-01 · 80 thùng      ○ A07-02 · 40 thùng
├ [ Quét mã vị trí cất hàng ………………………… ]        (đang chờ A07-02)
├  Tốt [ 40 ]   Hỏng [ 0 ]   Thiếu [ 0 ]
└ [Tách vị trí khác]
```

- **Bước 1 – Quét ô.** Ô quét tự focus. Quét đúng một ô trong kế hoạch → ô đó chuyển ✓, khai báo tương ứng được gán và điền sẵn số lượng; con trỏ nhảy sang ô số lượng.
- **Bước 2 – Số lượng.** Điền sẵn theo kế hoạch; chỉ sửa khi hàng thực tế lệch (tách tốt/hỏng/thiếu như hiện nay; hỏng/thiếu bắt buộc nguyên nhân).
- **Quét mã hàng**: hạ xuống thành thao tác phụ ("Xác nhận mã hàng") nằm gọn trong thẻ, **không** là một ô quét lớn thứ hai. Giữ khả năng bật/tắt cho công tắc quét sẽ làm sau (chỉ chừa vị trí).
- **Khác kế hoạch** (quét ô ngoài kế hoạch hoặc đổi số lượng vượt ô): thay đoạn cảnh báo bằng một khối ngắn ngay dưới ô quét:

  `Ô vừa quét khác kế hoạch (A07-01).  Lý do: ( Ô đầy ) ( Ô bị chặn ) ( Sai nhãn ) ( Gộp hàng ) ( Khác… )`

  Chọn một nhóm là đủ; `Other` mở ô ghi chú 5–500 ký tự. Khối dùng animation dropdown (200ms). Không dùng hộp thoại chặn (giữ nhịp thao tác một tay).

- **Hàng không có kế hoạch**: giữ cách hiện tại (không đòi lý do), vẫn hiện ô mặc định của kệ nếu có.
- **Xác nhận nhận** vẫn là hộp thoại xác nhận tổng hợp: nêu số lượng tốt/hỏng/thiếu, và "N dòng khác kế hoạch" nếu có.
- Phản hồi quét: âm/rung và thông báo trạng thái dùng `playScanFeedback`/`role="status"` có sẵn; trạng thái luôn có chữ + icon.
- Khả dụng: nút ≥ 44px, thứ tự Tab hợp lý, mọi ô quét có nhãn, lỗi gắn `aria-describedby`; hoạt động ở zoom 200% và 360px.

### 5.6. Lấy hàng

Giữ nguyên trải nghiệm hiện có (`TransferPickTaskPage`, quét, đổi ô, báo vấn đề, trả hàng). Việc duy nhất ở spec này là **đưa các thành phần thuần hiển thị có thể dùng cho Xuất kho vào `src/components/operations/pick/` sau này**; không làm bây giờ (ngoài phạm vi, 1.1). Ghi nhận để tránh rút sớm.

### 5.7. Nhập kho: những gì học lại từ Điều chuyển (giai đoạn sau, không chặn)

- Dải "Việc tiếp theo" trên phiếu nhận hàng/cất hàng.
- Nhập số lượng tự điền, tách/gộp khai báo nhanh ở phiếu cất hàng.
- Đây là cải tiến UX riêng, đề xuất tách thành spec nhỏ sau khi spec này xong (không làm trong cùng PR để giữ phạm vi).

### 5.8. Thành phần shadcn/ui và tiêu chuẩn

- Dùng `Sheet`, `Dialog`, `Button`, `Badge`, `Tabs`/`TabsList variant="workspace"` (đã có), `LookupCombobox`, `Table`, `Tooltip`, `ToggleGroup`/liên kết điều hướng cho lọc nhanh. **Không** tạo primitive mới; thiếu thì cài bằng `pnpm dlx shadcn@latest add <tên>`.
- Dropdown/Select luôn `align="start"`, `sideOffset={4}`; không `position="item-aligned"`.
- Animation: Sheet 300ms, Dialog 250ms, dropdown 200ms, vi mô 150ms; dùng `data-[state=open]:…` và `animation-duration-*` (không `duration-*`).
- Trước khi hoàn tất UI chạy skill `web-design-guidelines` (UX, khả dụng, responsive); khi thiết kế component dùng chung áp `vercel-composition-patterns` (tránh prop boolean phình to, ưu tiên composition).

---

## 6. Trình tự triển khai và cổng nghiệm thu

Theo `AGENTS.md`: nhánh làm việc bắt đầu từ `origin/dev` mới fetch; PR vào `dev`; chỉ leader đưa `dev` → `main`; không commit/push/PR/đổi Jira khi chưa được yêu cầu rõ ràng; không ghi "Generated by Claude" vào PR (xác nhận 2026-10-11); handoff qua `docs/AI_REVIEW.md` ở mỗi repo (không ghi đè phát hiện của agent khác; không commit file của phiên khác).

| Gate                   | Nội dung                                                                                                                                                                                                                                                             | Điều kiện ra                                                                                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0 — Chuẩn bị**       | Re-index GitNexus 2 repo; chạy `impact` cho từng ký hiệu sẽ sửa; ghi kết quả vào PR. Chốt các điểm ở mục 10. Tạo nhánh từ `origin/dev`.                                                                                                                              | Người dùng duyệt spec và mục 10.                                                                                                                                                                                                                       |
| **A — Backend**        | 3.1–3.8: migration (chỉ tạo + rà SQL), `SetTransferPutAwayPlan`, gợi ý dùng chung, so kế hoạch khi nhận, `statusCounts`, test.                                                                                                                                       | `dotnet build -c Release` + test liên quan xanh; hồi quy Nhập kho xanh; `gitnexus detect_changes` chỉ chạm ký hiệu dự kiến; **dừng trước khi áp migration**; xác nhận qua diff migration thực tế rằng PR #217 không cần đổi; test đồng thời ở 3.6 đạt. |
| **A+ — Áp migration**  | Chỉ khi người dùng ra lệnh rõ cho đúng mục tiêu. `Database:ApplyMigrationsOnStartup=false` khi chạy; in và xác nhận provider/server/database hiệu lực (ẩn mật khẩu); ưu tiên dùng cơ sở dữ liệu cục bộ riêng để kiểm. **Không** xóa/reset/`EnsureDeleted` `db71143`. | Migration áp xong, kiểm tra `__EFMigrationsHistory`, không drift model.                                                                                                                                                                                |
| **B — Frontend logic** | 4.1–4.6: rút thành phần dùng chung (Nhập kho không đổi hành vi) → kế hoạch + gợi ý Điều chuyển → nhận hàng theo kế hoạch + lệch → lọc nhanh danh sách + tab chi tiết.                                                                                                | `pnpm lint`, `pnpm test`, `pnpm build` xanh; test Nhập kho xanh.                                                                                                                                                                                       |
| **C — UI/UX & QA**     | Mục 5, chạy trình duyệt qua toàn vòng đời trên cơ sở dữ liệu cho phép; kiểm 360/768/1280, zoom 200%, bàn phím, đọc màn hình cơ bản, `web-design-guidelines`.                                                                                                         | Checklist 7 đạt, ghi vào mục Ghi chú Gate C.                                                                                                                                                                                                           |

Phụ thuộc: B cần hợp đồng API của A (gửi kiểu TS sớm sau khi A chốt DTO); C cần A+ nếu muốn kiểm thử trên dữ liệu thật; có thể kiểm bằng cơ sở dữ liệu cục bộ khi chưa được phép áp lên `db71143`.

PR đề xuất (mỗi PR một mối quan tâm, vào `dev`, squash nếu được phép):

1. BE: tách lõi gợi ý dùng chung (không đổi hành vi) + test hồi quy.
2. BE: migration + kế hoạch cất + gợi ý theo đợt + so kế hoạch khi nhận + `statusCounts`.
3. FE: rút thành phần cất hàng dùng chung (không đổi hành vi Nhập kho).
4. FE: kế hoạch cất + nhận hàng theo kế hoạch của Điều chuyển.
5. FE: lọc nhanh danh sách + tab chi tiết.

---

## 7. Tiêu chí nghiệm thu

Nghiệp vụ

- [ ] Quản lý kho nhập đặt kế hoạch một dòng vào nhiều ô kèm số lượng; tổng vượt số lượng còn phải nhận bị chặn.
- [ ] Gợi ý hiển thị tóm tắt, rủi ro, tách số lượng; nhân viên được giao nhận hàng xem được gợi ý/kế hoạch (chỉ đọc).
- [ ] Phiếu nhận điền sẵn theo kế hoạch; quét ô khớp kế hoạch gán đúng khai báo; tiến độ N/M đúng.
- [ ] Nhận khác kế hoạch bắt buộc nhóm lý do; `Other` bắt buộc ghi chú; lưu `IsOffPlan` và lý do; thông báo đúng người.
- [ ] Dòng không có kế hoạch nhận như cũ, không bị đòi lý do.
- [ ] Phiếu chia nhiều đợt xuất: phần còn lại của kế hoạch tính đúng theo từng đợt.
- [ ] Nhập kho cất hàng/gợi ý hoạt động y hệt trước (test hồi quy xanh).

Giao diện

- [ ] Danh sách: một danh sách, lọc nhanh có số đếm; liên kết `?tab=` cũ vẫn dẫn đúng.
- [ ] Chi tiết: tab theo giai đoạn, mở đúng tab theo "Việc tiếp theo", huy hiệu chỉ đếm việc chờ.
- [ ] Không có div giả điều khiển; mọi trạng thái có icon + chữ.
- [ ] Hợp quy bố cục danh sách (checklist cuối `LIST_TABLE_DESIGN_GUIDELINES.md`).
- [ ] Dùng token thiết kế, không màu cứng; animation đúng bảng thời lượng.
- [ ] 360px không cuộn ngang; zoom 200% dùng được; điều hướng bằng bàn phím đầy đủ.

Kỹ thuật

- [ ] `dotnet build -c Release` xanh (trùng lệnh deploy); test liên quan xanh.
- [ ] `pnpm lint`, `pnpm test`, `pnpm build` xanh.
- [ ] `gitnexus detect_changes` ở cả hai repo chỉ chạm các ký hiệu dự kiến.
- [ ] Không có `any`, không chuỗi quyền cứng, không DTO trong `Application/Features/`.
- [ ] Không thao tác phá hủy trên `db71143`; migration chỉ áp khi được lệnh.

---

## 8. Rủi ro và cách giảm

| Rủi ro                                                                                                    | Cách giảm                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rút thành phần dùng chung làm vỡ cất hàng Nhập kho (`PutawaySlotCodeConfirm` được GitNexus đánh giá HIGH) | Rút theo từng bước nhỏ không đổi hành vi, chạy `PutawayForm.test.tsx` mỗi bước, bộ chuyển đổi kiểu ở biên feature.                                  |
| Tách lõi gợi ý BE làm đổi kết quả Nhập kho                                                                | Tách thuần túy (không đổi thuật toán) và khóa bằng test hồi quy hiện có trước khi sửa.                                                              |
| Migration trên `db71143`                                                                                  | Chỉ tạo + rà SQL; áp khi có lệnh rõ; kiểm local trước. Cột thêm đều nullable/mặc định.                                                              |
| Đồng bộ quyền (sự cố seed 2026-10-08)                                                                     | Không thêm quyền; dùng `transfers:receive` + phạm vi kho.                                                                                           |
| Dữ liệu cũ chỉ có `DestinationSlotId`                                                                     | `planMode = Legacy`, không chuyển dữ liệu, không đòi lý do; có thời hạn gỡ.                                                                         |
| Người dùng thấy "đòi lý do" là rườm rà                                                                    | Chỉ đòi khi thật sự khác kế hoạch; chọn một nhóm là đủ; không đòi ở dòng không có kế hoạch.                                                         |
| Liên kết `?tab=`/API `stage` cũ                                                                           | Giữ một bản và ánh xạ; **ý nghĩa tab `transfer` thay đổi có chủ đích** (3.7); gỡ ở bản sau.                                                         |
| Mở rộng phạm vi sang Xuất kho                                                                             | Đã loại khỏi phạm vi (1.1).                                                                                                                         |
| AI gợi ý lỗi hoặc chậm                                                                                    | Dùng quy tắc kho và trả `notice`; AI không tự lưu kế hoạch; hợp đồng `IPutAwaySuggestionModelClient` không đổi để thay bằng model Python riêng sau. |
| Race giữa lưu kế hoạch và nhận hàng bỏ lọt lý do/ghi sai bằng chứng lệch                                  | **High** cho tới khi test đồng thời ở Gate A chứng minh hai thao tác cùng được bảo vệ bởi `StockTransfer.RowVersion` (3.6).                         |
| FE cũ gặp dòng đã có kế hoạch mới                                                                         | Giới hạn tương thích có chủ đích: bị từ chối với mã `TRANSFER_PUTAWAY_PLAN_VERSION_REQUIRED` và thông báo yêu cầu tải lại/cập nhật giao diện (3.2). |

---

## 9. Phân tích ảnh hưởng (GitNexus, 2026-10-12)

Quy ước repo (CLI): `gitnexus impact <ký hiệu> -r <đường dẫn repo> --direction upstream`. Trạng thái index: FE đã làm mới; BE xem ghi chú dưới bảng.

| Ký hiệu (Frontend)       | Rủi ro   | Phụ thuộc trực tiếp                                                                                               |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `ReceiveEntryCard`       | LOW      | `TransferReceiveTaskPage`                                                                                         |
| `useTransferReceiveForm` | LOW      | `TransferReceiveTaskPage`                                                                                         |
| `PutAwaySlotsDialog`     | LOW      | `TransferDetailPage`                                                                                              |
| `TransferTabs`           | LOW      | `TransferDirectory`, `TransferPage` (2 luồng thực thi)                                                            |
| `PutawaySuggestionPanel` | LOW      | `PutawayForm`, `InboundPutawayDetailPage`                                                                         |
| `PutawaySuggestionList`  | (nhiều)  | `PutawayForm`, `PutawaySuggestionPanel`, `PutawayPlanSheet`, `GoodsReceiptDetailPage`, `InboundPutawayDetailPage` |
| `PutawaySlotCodeConfirm` | **HIGH** | `PutawayAllocationRow`, `PutawayForm`                                                                             |
| `PutawayDeviationPanel`  | LOW      | `PutawayForm`, `InboundPutawayDetailPage`                                                                         |

| Ký hiệu (Backend)                                                                             | Rủi ro  | Phụ thuộc trực tiếp                                              | Ghi chú                                                                  |
| --------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `PutAwaySuggestionContextLoader`                                                              | LOW     | 3 (chỉ test)                                                     | mô-đun Inbound                                                           |
| `ReceiveTransferShipmentCommandHandler`                                                       | LOW     | 1                                                                |                                                                          |
| `GetTransferReceiveSheetQueryHandler`                                                         | LOW     | 1                                                                |                                                                          |
| `StockTransferReceiptLine`                                                                    | LOW     | 2 trực tiếp, 2 luồng thực thi                                    | thêm cột `IsOffPlan`, `DeviationReasonCode`                              |
| `GetTransfersQueryHandler`, `GetPutAwaySlotSuggestionsQueryHandler`, `PutAwaySuggestionRules` | LOW     | 0 (handler được gọi qua MediatR nên đồ thị không thấy người gọi) | cần `git grep` bổ sung cho `Stage`, `PutAwaySuggestionRules.*`           |
| `GetTransferPutAwaySuggestionsQueryHandler`, `SetTransferPutAwaySlotsCommandHandler`          | chưa đo | —                                                                | **chưa có trong index cũ** (index BE dừng ở `3afb80f`, cũ hơn `6a6ac8a`) |

> Index BE đang được làm mới lúc viết spec (repo lớn, vài phút). Ở Gate 0 chạy lại `gitnexus status` cho tới khi hết "stale", rồi chạy `impact` cho hai handler còn thiếu và ghi kết quả vào PR. Lưu ý đồ thị không nhìn thấy người gọi qua MediatR (`sender.Send`), nên với handler luôn bổ sung `git grep` tên Command/Query để biết ai gọi.

---

## 10. Điểm đã chốt (2026-10-12)

Người dùng đã trả lời: 1 đồng ý, **2 chọn B (dùng AI ngay)**, 3 A, 4 A, 5 A, 6 A, 7 A. Các mục dưới đây giữ nguyên nội dung câu hỏi; riêng mục 2 đã đổi theo lựa chọn B.

1. **Quyền**: dùng `transfers:receive` (ghi kế hoạch cần quản lý kho nhập; xem cần quyền xem kho nhập) và **không** thêm quyền mới. _Đề xuất: đồng ý._
2. **AI cho gợi ý Điều chuyển**: **dùng ngay** (xem 3.4); model Python riêng sẽ làm sau. _Đã chốt: B._
3. **Cột "Việc cần làm" ở danh sách**: tính ở BE (thêm trường `nextActionCode` vào dòng danh sách) hay FE từ `transfer-next-steps.ts`. _Đề xuất: BE, để danh sách không phải tải chi tiết từng phiếu._
4. **Phản hồi gộp vào tab Chênh lệch** (5.3). _Đề xuất: gộp._ Nếu phản hồi được dùng độc lập với chênh lệch nhiều, giữ tab riêng.
5. **Bắt buộc nhóm lý do khi nhận khác kế hoạch ở BE** (3.6) so với chỉ cảnh báo như nay. _Đề xuất: bắt buộc, vì đây là bằng chứng quản lý kiểm tra; nhóm lý do chỉ một lần chạm._
6. **Gỡ `PUT /putaway-slots` cũ**: giữ một bản làm tương thích rồi gỡ. _Đề xuất: đồng ý._
7. **Thứ tự phát hành**: BE (gồm tách lõi) → FE rút thành phần chung → FE Điều chuyển. _Đề xuất: đồng ý._

---

## 11. Danh sách tệp dự kiến chạm tới

Backend

- Mới: `Application/Features/Transfer/SetTransferPutAwayPlan/{Command,CommandHandler,CommandValidator}.cs`; `Contract/Models/Transfer/TransferPutAwayPlanResponse.cs` và DTO gợi ý; `Domain/Entities/Inventory/StockTransferPutAwayPlanLine.cs`; migration `AddTransferPutAwayPlan` + SQL rà soát trong `docs/migrations/`.
- Sửa: `GetTransferPutAwaySuggestions/*`, `GetTransferReceiveSheet/*`, `GetTransfer/*`, `GetTransfers/*`, `ReceiveTransferShipment/*`, `SetTransferPutAwaySlots/*` (bộ chuyển đổi), `API/Controllers/TransfersController.cs`, `Application/Features/Inbound/GetPutAwaySlotSuggestions/*` + `Shared/*` (tách lõi), `StockTransferReceiptLine.cs`, DbContext configuration, test trong `Application.Tests/Features/Transfer/` và `Inbound/`.

Frontend

- Mới: `src/components/operations/putaway/*` (+ `index.ts`), `src/types/putaway.types.ts`, `transfer/components/TransferDetailPage/TransferPutAwayPlanSheet.tsx`, `transfer/components/TransfersPage/TransferStatusFilter.tsx`, `transfer/hooks/use-transfer-putaway-plan-editor.ts`, `transfer/schemas/transfer-putaway-plan.schema.ts`.
- Sửa: `transfer/types`, `services`, `hooks/use-transfer-put-away-actions.ts`, `hooks/use-transfer-receive-form.ts`, `components/TransferWork/ReceiveEntryCard.tsx`, `pages/TransferReceiveTaskPage.tsx`, `pages/TransferDetailPage.tsx`, `pages/TransferPage.tsx`, `components/TransfersPage/TransferDirectory.tsx`, `utils/transfer-stage.ts`, `utils/transfer-put-away.ts`, `inbound/components/PutawayDetailPage/*` (chuyển import), `inbound/components/ReceiptDetailPage/PutawayPlanSheet.tsx`, test liên quan.
- Gỡ sau khi thay: `PutAwaySlotsDialog.tsx` (+ test), `ShipmentPutAwayCell.tsx` (nếu không còn dùng), `TransferTabs.tsx` (+ test).

---

## 12. Ghi chú cho người thực hiện

- Đọc lại `SSWMS-Backend/docs/features/2026-10-05-putaway-location-plan-spec.md` và `2026-10-07-putaway-flow-phase-2-4-spec.md` trước khi chạm lõi gợi ý.
- Sau mỗi cụm thay đổi: `gitnexus detect_changes` ở repo tương ứng; cảnh báo người dùng nếu `impact` ra HIGH/CRITICAL (hiện có `PutawaySlotCodeConfirm`).
- Không commit/push/PR khi chưa được yêu cầu; PR không có dòng "Generated with Claude Code".
- Khi gặp hành vi hiện tại khác spec, ghi vào mục "Khác với spec" ở cuối file này (theo cách các spec 19–22 của điều chuyển đã làm), không sửa âm thầm.

---

## 13. Lịch sử rà soát spec (2026-10-12)

Hai vòng rà soát độc lập đã đối chiếu spec với mã BE/FE; các điều chỉnh đã áp dụng ở trên:

1. Tổng kế hoạch và phần còn lại thống nhất: payload và DB lưu **tổng**, UI quy đổi (3.2, 4.2).
2. Kế hoạch nhiều lô: phân bổ ngân sách chung theo thứ tự xác định, có `unplannedQuantity` (3.5).
3. So lệch cộng dồn theo `(itemId, slotId)` toàn request (3.6).
4. `planVersion` băm SHA-256 theo dòng của đợt; luôn kiểm kể cả kế hoạch vừa bị xóa; chế độ `Planned`/`Legacy` do **BE quyết định theo dữ liệu**, không theo việc client có gửi `planVersion` (3.5, 3.6).
5. Tương thích: endpoint gợi ý mới song song với endpoint cũ (giữ mảng); endpoint `putaway-slots` cũ không đổi hành vi; giới hạn tương thích với FE cũ được nêu rõ (3.2).
6. Công thức "chưa khai báo nhận" trừ cả `ResolvedMissingQuantity` (3.3).
7. Ánh xạ tab cũ là thay đổi có chủ đích; `statusCounts.all` loại phiếu hủy (3.7).
8. Race ghi đồng thời giữ mức High cho tới khi có test chứng minh (3.6, 8).
9. Câu AI đồng bộ với quyết định dùng AI ngay (mục 5, 8).

---

## 14. Tiến trình Gate A — 2026-10-12

**Trạng thái: đã triển khai mã Backend; chưa đóng nghiệm thu Gate A.** Còn bằng chứng race đồng thời trên SQL Server ở 3.6. Chưa bắt đầu Gate A+ hoặc Gate B; không tự commit/push.

Đã làm:

- Migration `20261012021015_AddTransferPutAwayPlan` và SQL rà soát: bảng kế hoạch mới, `IsOffPlan` và `DeviationReasonCode`; không sửa migration cũ, không thêm cột phiên bản kế hoạch hay quyền mới. **Chưa áp migration**, chưa kết nối/ghi DB deploy.
- `SetTransferPutAwayPlan`: tổng theo ô, nhiều ô, độ chính xác ĐVT, phạm vi kho/quyền, giữ lượng tốt đã nhận (kể cả nhận bổ sung), đồng bộ `DestinationSlotId` và thông báo người nhận đang được giao việc.
- Gợi ý mới dạng object, theo đợt hoặc phần chưa khai báo; lõi quy tắc/AI dùng chung với Nhập kho; giữ endpoint mảng cũ.
- Phiếu nhận: ngân sách ô dùng chung qua các lô theo thứ tự xác định, `planMode`, `planVersion`, `plan[]`, `unplannedQuantity`. Nhận: kiểm phiên bản, ngân sách cộng dồn toàn request, lý do lệch, bằng chứng thực nhận và thông báo. Lưu kế hoạch/nhận đều cập nhật `StockTransfer` trong cùng lần save.
- Chi tiết trả kế hoạch và phần đã nhận/còn lại; danh sách trả `statusCounts`, `nextActionCode` mà không tải chi tiết từng phiếu.

Kết quả kiểm thử trên bản sao D, không build trong repo đang dùng chung:

| Kiểm tra                                   | Kết quả / giới hạn                                                                                                                                                                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API Release build cuối                     | Đạt, 0 cảnh báo / 0 lỗi.                                                                                                                                                                                                                                  |
| Transfer + hồi quy cất hàng/gợi ý Nhập kho | **182 đạt / 0 lỗi** ở lượt cuối.                                                                                                                                                                                                                          |
| Bộ test BE đầy đủ                          | 1.242 đạt / 14 lỗi / 1 bỏ qua, 1.257 tổng; chạy trước chỉnh nhỏ cuối về `nextActionCode` của trạng thái legacy. 14 lỗi đều tái hiện ở baseline `dcc7cc3`: 9 tồn kho, 4 sửa phiếu nhập, 1 cache quyền người dùng ngừng hoạt động. Không sửa ngoài phạm vi. |
| Model/snapshot                             | `has-pending-model-changes`: không drift. Không kiểm migration history của DB deploy.                                                                                                                                                                     |
| Concurrency / rollback cô lập              | 3 hoán vị stale-save trên SQLite in-memory + 1 kiểm metadata SQL Server đạt. Chứng minh token chung và rollback companion writes với rowversion mô phỏng; **chưa chứng minh hai handler chạy đồng thời trên SQL Server thật**. Rủi ro mục 8 vẫn giữ High. |
| GitNexus                                   | BE đã làm mới index tại `dcc7cc3`; DbContext Critical đã báo trước khi sửa. Scan tracked High được rà diff trực tiếp; không bao phủ đầy đủ file mới chưa tracked hoặc caller MediatR.                                                                     |

Bằng chứng: `D:/Kovia-QA/TransferAlignment-20261012-GateA/results/`; nhật ký ở `SSWMS-Backend/docs/AI_REVIEW.md`. Đây là tự kiểm của người triển khai, không phải phê duyệt độc lập. `docs/BUSINESS_RULES.md` được chỉ dẫn nhưng hiện không tồn tại trong hai repo.

### Khác với spec / làm rõ hợp đồng

- API thực tế trước thay đổi dùng `POST .../shipments/{shipmentId}/receipt`, trong khi mục 2/3 ghi `/receive`. Giữ `/receipt` nguyên trạng và thêm alias `/receive`, không phá client cũ.
- Thống nhất cách hiểu mục 3.2 và 3.6: **thiếu** `planVersion` ở dòng Planned trả `400` với mã `TRANSFER_PUTAWAY_PLAN_VERSION_REQUIRED`; **có gửi nhưng cũ**, kể cả kế hoạch vừa bị xóa, trả `409` với mã `TRANSFER_PUTAWAY_PLAN_CHANGED`.
- Triển khai trên nhánh làm việc `feat/huytv` hiện có, giữ các thay đổi instruction file đang có. Không tự chuyển nhánh hoặc tạo PR. Migration cũ không đổi; chưa kiểm trạng thái PR #217 trên GitHub nên không kết luận về mergeability của PR.
- Không có SQL Server QA cô lập để chạy race thực tế. Không tự dùng DB deploy để vượt qua Gate A+/quy trình cho phép migration. Cần kiểm SQL Server plan/receive và hai đợt nhận trước khi đánh dấu Gate A hoàn tất.

---

## 15. Sửa findings Gate A và đồng bộ dev — 2026-10-12

Mục này thay thế thông tin migration/kiểm thử hiện tại của checkpoint 14; mục 14 được giữ làm lịch sử. Người dùng đã cho phép sửa và commit để review, **không push hoặc áp migration**.

### Những phần đã sửa

- PR #217 đã merge vào `dev` tại `b7ff92c7`. BE tích hợp `origin/dev` tại `29f01acf`, giải 5 conflict và bỏ migration trùng `20261012021015` cùng Designer/SQL. Chỉ giữ **`20261011173500_AddTransferPutAwayPlan`** và các file của `dev`; không rollback DB, không sửa nội dung migration đã phát hành.
- Giữ navigation `Item ↔ StockTransferItem.PutAwayPlanLines` và snapshot của `dev`, đồng thời giữ enum `DeviationReasonCode` với `HasConversion<string>()` (cột SQL vẫn `nvarchar(40)`). Bỏ DbSet bị auto-merge thành hai khai báo. Không mất thay đổi CycleCount từ `dev`.
- Thông báo: người tạo + người lập kế hoạch gần nhất được gộp/loại trùng; khi có chênh lệch hoặc cất khác kế hoạch, dùng **`transfers:resolve` tại kho nhập** qua resolver hiện có, chỉ một lượt gửi theo quyền, loại người thực hiện và người đã nhận trực tiếp. Không lọc người nhận theo tên vai trò trong handler.
- Dòng phiếu nhận thêm **`planWarnings[]`**: `{ slotId, slotCode, path, remainingBudget, message }`. Chỉ cảnh báo ô kế hoạch còn ngân sách nhưng không còn nhận được; bao gồm ô/kệ/khu vực bị tắt hoặc vị trí không còn hợp lệ. Giữ phần đó trong `unplannedQuantity`, không tự chuyển sang ô khác. **Gate B phải hiển thị cảnh báo cạnh dòng hàng**, cho người dùng chọn ô và khai báo lý do như hiện tại.

### Quyết định cho Gate B / ghi chú phát hành

- BE đánh lệch cả entry làm vượt ngân sách theo 3.6. FE hỗ trợ tách phần trong kế hoạch và phần vượt thành hai khai báo khi còn độ chính xác hợp lệ, hiển thị rõ trước xác nhận; vẫn giữ quyền chỉnh của người dùng và BE kiểm lại toàn request.
- `nextActionCode` là **việc tiếp theo của phiếu**, không phải chứng nhận quyền hoặc việc cá nhân được giao. FE kiểm capability/quyền/giao việc trước khi mở hành động. Không đổi thứ tự ưu tiên BE trong lượt fix này; cần đo SQL thực tế cho trang 50 dòng trước khi kết luận về hiệu năng.
- Gợi ý AI chỉ tải khi người dùng bấm **Gợi ý vị trí**; không tự gọi khi mở trang, lấy lại focus hoặc reconnect. Không tự lưu kế hoạch.
- Ghi chú phát hành: danh sách mặc định (không có `stage`/`status`) và `statusCounts.all` loại phiếu đã hủy; vẫn xem được phiếu hủy bằng bộ lọc `Cancelled`. `stage` cũ giữ nguyên hành vi trong bản tương thích.

### Kiểm thử và giới hạn

- Bản sao D: `D:/Kovia-QA/TransferAlignment-20261012-GateAFix/BE`; baseline là `origin/dev` `29f01acf` trong thư mục riêng.
- Release API build: **0 cảnh báo / 0 lỗi**. **189 test liên quan đạt**. EF `has-pending-model-changes` báo không drift; kiểm metadata xác nhận chỉ một migration kế hoạch và không có FK/property ngầm.
- Toàn bộ suite: **1.258 đạt / 5 lỗi / 1 bỏ qua (1.264 tổng)**; baseline dev **1.222 đạt / 6 lỗi / 1 bỏ qua (1.229 tổng)**. Cả 5 lỗi đều có sẵn (4 InboundOperationalEditing, 1 cache quyền inactive); lỗi reflection endpoint thứ sáu của baseline đã được Gate A sửa. Không thêm test lỗi mới.
- Chưa chạy ứng dụng, kết nối/ghi DB deploy, áp migration, đo SQL trang 50 dòng hoặc chạy hai handler đồng thời trên SQL Server. **Gate A vẫn chưa đóng nghiệm thu; rủi ro race giữ High.** SQLite/metadata không thay thế bằng chứng SQL Server thật. Gate B/UI chưa triển khai trong lượt này.

---

## 16. Tiến trình Gate B — 2026-10-12

**Trạng thái: đã triển khai và tự kiểm mã Gate B; chưa nghiệm thu toàn luồng hoặc phê duyệt merge.** Mục này cập nhật trạng thái FE sau mục 15, không đóng Gate A/A+ hoặc Gate C. Chưa commit/push trong lượt này.

### Đã triển khai

- Rút sáu thành phần cất hàng thuần hiển thị vào `components/operations/putaway` và kiểu trung lập vào `types/putaway.types.ts`. Nhập kho giữ adapter, hook/API và phần ảnh bằng chứng riêng; không chuyển nghiệp vụ Nhập kho sang Điều chuyển.
- Thêm hợp đồng TS/service cho kế hoạch nhiều vị trí và endpoint gợi ý dạng object; giữ service/endpoint mảng cũ trong thời gian tương thích. `query-keys.ts` và `api-endpoints.ts` chỉ thêm hai dòng mỗi file, không format lại.
- Sheet kế hoạch dùng hook `use-transfer-plan-editor.ts`: Đã nhận khóa, Còn lại chỉnh được, payload lưu tổng; kiểm tổng `Quantity − Stopped`, độ chính xác ĐVT, vị trí trùng và tối đa 20 vị trí/dòng. Chọn bằng combobox/sơ đồ, hỏi trước khi bỏ nháp, lỗi gắn trường và focus lỗi. Gợi ý chỉ gọi khi bấm, chỉ điền nháp, không tự lưu.
- Phiếu nhận điền phân bổ theo từng lô và vị trí, phần chưa có kế hoạch để trống vị trí. Vẫn phải quét/nhập mã và xác nhận tra cứu; ID điền sẵn không được coi là đã quét. Ngân sách tốt dùng chung giữa các lô và cả request. Có tiến độ xác nhận, nhóm lý do lệch, Other 5–500 ký tự, tách phần trong/vượt kế hoạch, giữ hành vi Legacy và nguyên nhân hỏng/thiếu.
- Hiển thị `planWarnings` cạnh thẻ hàng, không âm thầm bỏ cảnh báo ô bị tắt. Thao tác Làm theo kế hoạch hỏi trước khi thay nội dung đã sửa.
- Refetch không tự nâng token cùng nháp cũ. Lỗi 409/kết quả lưu chưa xác định khóa gửi lại, cho tải lại để đối chiếu và giữ số lượng/ghi chú. Request ghi không tự retry; handler có khóa tức thời chống bấm/quét lặp.
- Danh sách có lọc trạng thái kèm số đếm, cột Việc cần làm và URL giữ trạng thái/tìm kiếm/kho/ngày/trang. Tab chi tiết theo Hàng hóa, Lấy hàng, Nhận hàng, Chênh lệch/Phản hồi, Lịch sử; mặc định theo việc tiếp theo, đếm việc đang chờ. Link task kiểm quyền/phạm vi và người được giao, không lấy `nextActionCode` làm quyền.

### Bổ sung hợp đồng đọc BE, không đổi schema

- Chi tiết thêm `baseQuantityPrecision` từ ĐVT chính và `receivedPutAwayLocations` cho mọi vị trí đã nhận tốt, gồm nhận bổ sung/ngoài kế hoạch. Nếu chỉ có `putAwayPlan`, FE không thể khóa một vị trí đã nhận ngoài kế hoạch; trường bổ sung giải quyết thiếu dữ liệu này.
- Các vị trí đã nhận được hợp vào nháp với lượng tối thiểu đã nhận; không xóa/đổi vị trí đó. Reader lấy đường dẫn và GetTransfer che trường mới nếu người xem không có phạm vi kho nhập.
- Không đổi command ghi, migration, seed hay danh mục quyền. Migration chuẩn vẫn là `20261011173500_AddTransferPutAwayPlan`; chưa kiểm/áp dụng migration trên DB deploy.

### Kiểm thử và ảnh hưởng

| Kiểm tra                 | Kết quả / giới hạn                                                                                                                                                                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FE toàn bộ Vitest        | **929 đạt / 166 file, 0 lỗi**. Bao gồm test Nhập kho và nhận/lấy hàng hiện có.                                                                                                                                                                                                                 |
| TypeScript, ESLint `src` | Đạt; TypeScript cũng chạy trong cả hai production build.                                                                                                                                                                                                                                       |
| Production build         | **Webpack và Turbopack đều đạt**, 70 trang static. Chỉ build trên bản sao D.                                                                                                                                                                                                                   |
| BE Release build         | **0 lỗi / 0 cảnh báo**; không khởi động API.                                                                                                                                                                                                                                                   |
| Test BE Transfer         | **129 đạt**, dùng fixture EF InMemory cô lập; không chứng nhận race SQL Server thật. Không chạy lại toàn suite BE trong lượt Gate B.                                                                                                                                                           |
| GitNexus                 | FE `detect_changes`: Critical, 125 ký hiệu/16 luồng; BE: Low, 12 ký hiệu/0 luồng. Đã rà hook nhận/lấy hàng, invalidation, danh sách/chi tiết và adapter Nhập kho bằng diff + test. Index không bao phủ hết file mới chưa tracked/caller MediatR; không coi scan là bằng chứng an toàn độc lập. |
| Git                      | Diff whitespace đạt; giữ nguyên thay đổi AGENTS.md/CLAUDE.md có sẵn; chưa stage/commit/push.                                                                                                                                                                                                   |

- Test `ReceiptTables` đã lỗi trên HEAD gốc vì còn tìm nhãn `Kệ KE-01`, trong khi UI hiện tại là `Kệ KE-01 (không chia ô)`. Đã sửa duy nhất kỳ vọng test cho đúng nhãn có sẵn; không sửa UI Nhập kho để làm test xanh.
- Chạy công cụ Node trực tiếp từ dependency đã có, không `pnpm install`. Bản sao QA dùng junction node_modules nên build Turbopack ban đầu báo symlink ra ngoài root; đặt `turbopack.root = D:/` **chỉ trong config bản sao QA** rồi build đạt. Config/bundler/output server dev ở repo gốc không đổi. Sau lỗi đầu, TEMP/TMP của lượt build tiếp theo đặt trên D; Next đã sinh một panic log chẩn đoán ở Temp mặc định trong lượt lỗi đầu.
- Bản sao: `D:/Kovia-QA/Transfer-GateB-20261012`, `D:/Kovia-QA/Transfer-GateB-20261012-BE`; baseline FE: `D:/Kovia-QA/Transfer-GateB-20261012-FE-baseline`. BE có báo cáo TRX tại `results/transfer-gate-b.trx`.

### Khác với spec / việc còn phải nghiệm thu

- `splitEntry` thêm khai báo vị trí trống để người dùng chủ động đổi vị trí: các ô kế hoạch đã được điền riêng ngay từ đầu nên không nhân đôi phân bổ kế hoạch khi tách.
- Quyền sửa vẫn theo quyền hiệu lực và phạm vi kho hiện có; không thêm kiểm tên vai trò. Policy BE hiện có chưa phân biệt View/Manage bằng cấp phân công riêng, nên không tuyên bố nhân viên có `transfers:receive` chỉ được xem. Cần đối chiếu/chốt ranh giới này trong QA phân quyền, không tự thêm quyền hoặc blacklist vai trò ở FE. Chế độ chỉ đọc không gọi AI hay có nút lưu; chưa nghiệm thu khả năng xem gợi ý AI riêng của nhân viên như mục 7.
- Guard bỏ nháp áp dụng khi đóng Sheet; chưa có bằng chứng browser Back/Forward/rời cả trang. Không đánh dấu checklist UI/khả dụng từ unit test.
- Gate C còn phải chạy Edge 360/768/1280, zoom 200%, bàn phím, screen reader/reduced motion, toàn vòng đời nhiều đợt và mất mạng thật. Chưa đo SQL danh sách 50 dòng.
- Gate A vẫn thiếu race hai handler thật trên SQL Server; mức High giữ nguyên. Không chạy ứng dụng, không kết nối/ghi DB deploy, không migration/seed. Kết quả trên là tự kiểm của người triển khai, không phải review độc lập hoặc chứng nhận production.

---

## 17. Bổ sung: lối thoát khi không quét được mã vị trí — 2026-10-12

**Quyết định (người dùng chốt):** thêm lối thoát giống Nhập kho; nhóm lý do dùng lại `PutAwayDeviationReasonCode` (chỉ `LabelMismatch` và `Other`); áp dụng cho **mọi dòng** (cả `Legacy` lẫn `Planned`).

**Hiện trạng:** BE luôn bắt quét mã ô (`TransferScanRules.EnsureSlotMatchesAsync` → `RequireScanned`) cho mọi khai báo có hàng tốt hoặc hỏng; trước đây không có lối thoát nên nhãn hỏng/mất chặn xác nhận nhận đợt. Đây là hành vi sẵn có, không do Gate B thêm. Luật FE "dòng `Planned` phải có mã quét" chỉ chặn trước đúng lỗi này, vì ô điền sẵn từ kế hoạch chưa phải là đã quét.

### Backend

- `ReceiveTransferShipmentEntry` thêm `SlotCodeUnreadable` (mặc định `false`).
- Khi `true`: chỉ hợp lệ với khai báo có hàng tốt hoặc hỏng; **không được kèm** `ScannedSlotCode`; `DeviationReasonCode` phải là `LabelMismatch` hoặc `Other`, `Other` cần `Note` 5–500 ký tự. Sai → `400` mã `TRANSFER_SLOT_SCAN_REASON_REQUIRED`.
- Bỏ qua `EnsureSlotMatchesAsync`, nhưng **vẫn** kiểm ô thuộc kho nhập, đang hoạt động, không phải khu chờ xuất; quét mã hàng và mọi kiểm số lượng giữ nguyên.
- Ghi nhận **không cần migration:** `ScannedSlotCode = null` nghĩa là chưa xác nhận bằng quét (dữ liệu cũ luôn có mã vì quét đang bắt buộc); lý do nằm ở `DeviationReasonCode` và `Note`. `IsOffPlan` chỉ bật khi thật sự khác kế hoạch, không bật chỉ vì không quét. Nếu khai báo vừa khác kế hoạch vừa không quét được, dùng **một** lý do duy nhất (`LabelMismatch`/`Other`) cho cả hai; giới hạn đã biết.
- Thông báo gộp vào luồng "khác kế hoạch" hiện có: người tạo phiếu, người lập kế hoạch (nếu có) và người giữ quyền `Resolve` ở kho nhập; tiêu đề "Hàng điều chuyển nhận không quét mã vị trí" khi chỉ có lý do này.
- Test: có cờ + `LabelMismatch`; thiếu lý do, lý do ngoài hai nhóm, `Other` thiếu ghi chú, có kèm mã quét → từ chối và không ghi dòng nhận; ô ngoài kho nhập, khai báo chỉ hàng thiếu → từ chối; dòng `Planned` không bị đánh khác kế hoạch.

### Frontend

- Thẻ nhận hàng có nút "Không quét được mã vị trí?" (chỉ khi trang cấp danh sách vị trí). Mở ra: chọn vị trí từ danh sách (ô theo kế hoạch của dòng đứng đầu, rồi tìm trong kho nhập), chọn nhóm lý do (`LabelMismatch`/`Other`), nút "Quay lại quét mã vị trí". Trang sở hữu truy vấn danh sách vị trí, chỉ gọi khi có thẻ được mở.
- Khai báo có `slotCodeUnreadable` được tính là đã xác nhận trong tiến độ N/M, không bị ô quét tự dẫn tới lại; quét thành công một mã sau đó tự trả về đường quét thường.
- Yêu cầu gửi `slotCodeUnreadable: true`, `scannedSlotCode: null`, `deviationReasonCode`.
- Dùng lại `PutawayDeviationPanel` với tham số `reasons` mới để giới hạn nhóm lý do; ô khác kế hoạch kết hợp không quét được dùng cùng một lý do.

### Không đổi

Quét mã hàng vẫn tùy chọn; `planVersion`, ngân sách ô, `IsOffPlan` và công tắc quét (đã hoãn) giữ nguyên. Báo cáo riêng cho nhận không quét mã **chưa** làm.
