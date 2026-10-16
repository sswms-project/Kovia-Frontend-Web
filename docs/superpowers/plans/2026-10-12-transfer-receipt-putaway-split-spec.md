# Kovia — Tách "Nhận & cất" của Điều chuyển thành Phiếu nhập điều chuyển và Chờ cất hàng

> **Quyết định thay thế ngày 2026-10-14:** người dùng đổi phạm vi cất sang **chỉ hàng tốt thực nhận**, giống Nhập kho. Những nội dung dưới đây về bắt buộc cất hàng hỏng là lịch sử thiết kế, không còn là tiêu chí hiện hành. Đợt 8 tốt + 2 hỏng hoàn tất cất sau 8 tốt, vẫn giữ `ReceivedWithDiscrepancy`; toàn hỏng/thiếu không tạo nhu cầu cất. Không sửa tồn/lịch sử cũ. Kế hoạch triển khai và kiểm thử hiện hành: [transfer-putaway-inbound-alignment-plan](./2026-10-14-transfer-putaway-inbound-alignment-plan.md).

Ngày: 2026-10-12 (sửa sau review và triển khai 2026-10-13) · Trạng thái: **Gate A/B có code và tự kiểm; Gate C chưa nghiệm thu; chưa áp migration, chưa nghiệm thu SQL race** · Nối tiếp: `2026-10-12-transfer-receive-putaway-alignment-spec.md`

## 1. Mục tiêu và các điểm đã chốt với người dùng

Kho nhận của Điều chuyển hiện chỉ có tab "Nhận & cất" và một lệnh nhận ghi tồn ngay. Đưa luồng về giống Nhập kho: có bước bắt đầu nhận hàng, kiểm hàng thành phiếu, rồi cất hàng ở một trang riêng.

| #   | Quyết định                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Nguồn                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| D1  | Tách nhận và cất thành hai bước. **Tồn kho chỉ được ghi ở bước cất**, giống Nhập kho. **Một ngoại lệ có chủ ý:** nhận bổ sung (`LateReceipt`) ghi tồn ngay vì lệnh đó đã gồm chọn vị trí và quét mã, tức là đã là một lần cất đầy đủ (mục 4.2).                                                                                                                                                                                                                                            | Người dùng; ngoại lệ chốt sau review                 |
| D2  | **Một nút "Nhận hàng" duy nhất** thay cho bước xe đến riêng: bấm là xác nhận xe đã đến (`InTransit → Receiving`, ghi người và giờ) và mở luôn phiếu nhập để kiểm hàng. Nút nằm ở thẻ đợt cho quản lý kho nhập (và người được giao). Mọi đợt, kể cả đợt đã `InTransit` từ trước, **phải qua nút này một lần** trước khi nộp phiếu (không có đường tắt). Nhập kho cũng không có bước xe đến riêng (mục 2); cách này giữ được ý "bấm nhận hàng để xác nhận xe đã đến" mà không thêm một bước. | Người dùng chốt đề xuất gọn (2026-10-13)             |
| D3  | **Không có bước duyệt phiếu nhập.** Nhân viên kiểm hàng, nếu lệch thì báo chênh lệch gửi quản lý và **vẫn tiếp tục cất**. Hàng đã điều chuyển nên khó trả hay điều chỉnh; quản lý xem và xử lý sau, tùy quyết định (ví dụ cất hàng hỏng vào khu hàng hư hỏng).                                                                                                                                                                                                                             | Người dùng (cập nhật 2026-10-13)                     |
| D4  | Màn hình giao việc (lấy, nhận, cất) có **cùng giao diện với hộp thoại giao việc của Nhập kho**: danh sách nhân viên kèm số việc đang mở, mức ưu tiên, hạn hoàn thành.                                                                                                                                                                                                                                                                                                                      | Người dùng                                           |
| D5  | **Chờ cất hàng mở thành một trang riêng chiếm toàn màn hình** (như trang chi tiết Chờ cất của Nhập kho), không dùng ngăn trượt (Sheet) bị kẹt ở dưới.                                                                                                                                                                                                                                                                                                                                      | Người dùng                                           |
| D6  | Giao việc cất **linh hoạt**: giao riêng ở bước nào cũng được, hoặc giao một người từ đầu để người đó vừa kiểm hàng vừa cất.                                                                                                                                                                                                                                                                                                                                                                | Người dùng                                           |
| D7  | **Không làm danh sách việc ngoài trang chi tiết** (kiểu tab Chờ nhận hàng, Chờ cất hàng của Nhập kho). Người dùng vào chi tiết phiếu để thao tác, tránh nhầm lẫn.                                                                                                                                                                                                                                                                                                                          | Người dùng (Q3)                                      |
| D8  | Giữ các quyết định trước: dùng `transfers:receive`, kế hoạch cất nhiều ô và `planVersion`, gợi ý AI, bắt buộc lý do khi cất lệch kế hoạch, lối thoát không quét được mã.                                                                                                                                                                                                                                                                                                                   | Spec trước                                           |
| D9  | **Ngân sách mỗi ô chỉ tính hàng tốt**, như luồng cũ. Hàng hỏng không trừ ngân sách, không bị đánh lệch do vượt ngân sách; vẫn phải đúng số thực nhận, đúng kho/vị trí và có mã quét hoặc lý do không quét được.                                                                                                                                                                                                                                                                            | Người dùng chốt ngày 2026-10-13 trong khi làm Gate A |

Ngoài phạm vi: danh sách việc kho nhận ngoài trang chi tiết (D7); công tắc bật/tắt quét mã (đã hoãn trước đó).

## 2. Hiện trạng trước triển khai (đã đọc code)

- Đợt chuyển: `Picking → ReadyToDispatch → InTransit → Receiving → Received/ReceivedWithDiscrepancy`. Giá trị `Receiving` có nhưng **không lệnh nào chuyển vào nó**.
- `ReceiveTransferShipmentCommandHandler` nhận, kiểm vị trí, quét mã và `PostInAsync` ghi tồn trong **một** lệnh.
- Tab chi tiết: Hàng hóa, Lấy hàng, Nhận & cất, Chênh lệch/Phản hồi, Lịch sử. Kế hoạch cất hiện là một Sheet (`TransferPutawayPlanSheet`).
- Việc lấy và nhận là `WarehouseTask` (`TransferPick`, `TransferReceive`); việc nhận được tạo lúc xác nhận xuất (`DispatchTransferShipmentCommandHandler`) và gắn `ReceiveTaskId`.
- Giao việc dùng chung `AssignWarehouseTaskCommand(TaskId, StaffId, ExpectedStaffId, ExpectedVersion, Reason)`; **không có** mức ưu tiên và hạn. FE Điều chuyển dùng `AssignTransferTaskDialog` đơn giản (chỉ chọn nhân viên, lý do khi giao lại), khác `AssignWarehouseTaskDialog` của Nhập kho.
- `WarehouseTask` đã có sẵn cột `Priority` và `DueAt`, nên mở rộng giao việc không cần cột mới.
- Nhập kho: phiếu nhận `Approved` chỉ là chứng từ; `PutAwayStockCommandHandler` mới tạo tồn.
- **Nhập kho không có bước "xe đã đến" riêng.** `GoodsReceipt` có `ArrivalConfirmedAt/By`, nhưng chúng chỉ được ghi khi nhân viên **gửi phiếu** (`SubmitGoodsReceiptCommandHandler`, xác nhận hàng đã đến thực tế kèm lúc gửi duyệt). Nhập kho có duyệt phiếu (`ApproveGoodsReceipt`, từ chối thì yêu cầu sửa); Điều chuyển **không** theo phần duyệt này (D3).
- `ResolveTransferDiscrepancy` nhánh `LateReceipt` gọi `stockLedger.PostAsync` ngay, kèm vị trí đích và mã quét (nhận bổ sung = nhận + cất trong một lệnh).
- `TransferPutAwayPlans.LoadAsync` tính ngân sách ô từ `StockTransferReceiptLine` (dòng nhận cũ có vị trí).
- `GetAssignableWarehouseStaffQueryHandler` chỉ đếm việc của `InboundRequest` và `GoodsReceipt`, **không đếm** `WarehouseTask` điều chuyển.
- FE hiện gọi endpoint nhận `/receipt` với payload gồm vị trí và quét mã.
- Xử lý chênh lệch sau nhận đã có: `ResolveTransferDiscrepancy` với `LateReceipt` (nhận bổ sung), `LossAdjustment` (ghi nhận hao hụt), `DamageCase` (xác nhận hư hỏng). Hàng hỏng hiện được ghi tồn với trạng thái `DamageHold` tại vị trí nhân viên chọn.

## 3. Luồng mới

```
Picking → ReadyToDispatch → InTransit
   → [Nhận hàng = xác nhận xe đến + mở phiếu nhập] Receiving
   → [Nhân viên kiểm hàng, nộp phiếu nhập]  → AwaitingPutAway
        nếu lệch (hỏng/thiếu): tự mở chênh lệch, báo quản lý, KHÔNG chặn bước cất
   → [Cất hàng, quét mã vị trí, ghi tồn] Received / ReceivedWithDiscrepancy
```

- Đợt kết thúc khi **mọi lượng cần cất đã cất xong, gồm cả hàng tốt và hàng hỏng**. Ví dụ nhận 8 tốt và 2 hỏng: cất 8 tốt thì đợt vẫn `AwaitingPutAway` cho đến khi 2 hỏng cũng được cất.
- **Trạng thái cuối** theo đúng ngữ nghĩa hiện tại của `ReceiveTransferShipmentCommandHandler`: `ReceivedWithDiscrepancy` nếu **lúc nộp phiếu nhập đã phát sinh chênh lệch** (hỏng hoặc thiếu), ngược lại `Received`. Trạng thái này **không đổi lại** khi quản lý xử lý chênh lệch xong (việc đó nằm ở bản ghi chênh lệch, không ở trạng thái đợt). Vì vậy 8 tốt + 2 hỏng sau khi cất hết luôn là `ReceivedWithDiscrepancy`, không phải `Received`.
- **Đợt không có gì để cất** (toàn bộ là hàng thiếu: tốt = 0 và hỏng = 0) sang thẳng `ReceivedWithDiscrepancy` ngay lúc nộp phiếu, không qua `AwaitingPutAway`. Trong cùng giao dịch, **task `TransferPutAway` đã tạo sẵn được hủy** với lý do "Không có hàng cần cất" (cùng cách `CompleteTaskAsync` kết thúc task nhận), để không còn việc mở, không có thông báo giao việc vô nghĩa và không tính vào số việc đang mở của nhân viên.
- `AwaitingPutAway` được tính là **đợt mở** ở `TransferRules.Evaluate` (cùng nhóm với `InTransit`/`Receiving`), nên phiếu không thể `Completed` hay bị coi là đã đóng khi còn hàng chờ cất.
- Phiếu điều chuyển `Completed` theo sau như hiện nay.
- Hàng đã nhận nhưng chưa cất **không nằm trong tồn kho nhận**. Giao diện phải hiện rõ số "Đã nhận, chưa cất" để không bị hiểu là mất hàng.
- Chênh lệch (hỏng, thiếu) mở ngay khi nhân viên **nộp phiếu nhập** và báo quản lý kho nhập; quản lý xử lý bằng luồng Chênh lệch/Phản hồi hiện có, không cần chờ và không chặn việc cất.
- Hàng hỏng vẫn có dòng cất riêng; nhân viên chọn vị trí phù hợp (ví dụ khu hàng hư hỏng). **Kế hoạch/ngân sách hiện tại chỉ dành cho hàng tốt**, không dùng để giới hạn hàng hỏng (D9). Số thiếu không có dòng cất.

## 4. Backend

### 4.1. Dữ liệu (cần migration, **không áp lên `db71143` khi chưa có lệnh rõ**)

- `StockTransferShipmentStatus`: thêm `AwaitingPutAway` ở cuối, không đổi giá trị cũ. Cần kiểm tra cách lưu (số hay chuỗi) trước khi viết migration.
- `StockTransferShipment`: `ArrivedAt`, `ArrivedBy`, `ReceiptSubmittedAt/By`, `PutAwayTaskId`. Không cần trạng thái duyệt.
- `WarehouseTaskType`: thêm `TransferPutAway`.
- `StockTransferShipment.ReceiptFlowVersion` (`0` = luồng cũ nhận và cất một lệnh, `1` = luồng mới). Đợt tạo trước migration mặc định `0`; đợt đi qua `StartTransferReceiving` được đặt `1`. Đây là **cờ nhận diện rõ ràng**, không suy đoán từ dữ liệu.
- Dòng cất thực tế: bảng mới `StockTransferPutAwayLine` (shipment line, lô, **chất lượng `Good`/`Damaged`**, vị trí, số lượng, mã đã quét, `SlotCodeUnreadable`, `IsOffPlan`, `DeviationReasonCode`, ghi chú). `StockTransferReceiptLine` giữ vai trò dòng **kiểm đếm** (tốt, hỏng, thiếu, lý do). Với đợt `0` các cột vị trí và lệch kế hoạch trên `StockTransferReceiptLine` vẫn là nguồn sự thật và **không bị sửa**.
- `StockTransferItem.PutAwayQuantity`: **tổng đã cất gồm cả tốt và hỏng**, cộng dồn qua nhiều lần cất. Với phiếu cũ và đợt `0`, giá trị hiển thị được **suy ra** từ dòng nhận cũ (tốt + hỏng đã có vị trí), không lấy mặc định `0`, để lịch sử không bị hiện thành "chưa cất". `ReceivedQuantity` được tính ở bước nộp phiếu nhập.
- Ràng buộc tổng: với mỗi dòng đợt, lô và chất lượng, tổng đã cất **không vượt** số thực nhận tương ứng. Đây là kiểm riêng, **độc lập** với ngân sách kế hoạch (ngân sách vẫn có thể vượt khi có lý do, nhưng không được cất nhiều hơn thực nhận).
- Đợt đã `Received` và phiếu `Completed` trước thời điểm đổi **không bị chạm**. Phiếu có thể chứa cả đợt `0` và đợt `1`; mọi phép tính tổng phải gộp theo cờ này, không cộng đôi. Trước migration phải đếm bằng truy vấn chỉ đọc số đợt đang `InTransit`/`Receiving` trên `db71143`.

### 4.2. Lệnh và truy vấn (CQRS, DTO ở `Contract`)

| Việc                                | Lệnh/Truy vấn                                            | Điều kiện chính                                                                                                                                                                                                                               |
| ----------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bắt đầu nhận hàng (xác nhận xe đến) | `StartTransferReceiving`                                 | `InTransit`; quản lý kho nhập hoặc người được giao; `transfers:receive`; ghi `ArrivedAt/By`                                                                                                                                                   |
| Nộp phiếu nhập                      | `SubmitTransferReceipt` (thay phần đếm của lệnh nhận cũ) | **Chỉ từ `Receiving`** (không nộp thẳng từ `InTransit`); người được giao hoặc quản lý; kiểm `RowVersion`; lệch thì mở chênh lệch và báo quản lý; đợt sang `AwaitingPutAway`, hoặc sang thẳng `ReceivedWithDiscrepancy` nếu không có gì để cất |
| Cất hàng                            | `PutAwayTransferShipment`                                | `AwaitingPutAway`; mỗi dòng nêu chất lượng; kiểm không vượt thực nhận theo dòng, lô, chất lượng; kiểm `planVersion`, ngân sách ô, quét mã, lý do lệch (chuyển từ lệnh nhận hiện tại); cho phép cất nhiều lần                                  |
| Đọc phiếu nhập                      | `GetTransferReceiptSheet`                                | đối chiếu theo phiếu và thực nhận                                                                                                                                                                                                             |
| Đọc cất hàng                        | `GetTransferPutAwaySheet`                                | gồm `planBudgets`, số đã cất và còn lại; gợi ý lấy riêng khi bấm nút                                                                                                                                                                          |

- Logic của `ReceiveTransferShipment` được **tách**: phần đếm sang `SubmitTransferReceipt`, phần vị trí, quét mã, `PostInAsync` sang `PutAwayTransferShipment`. Bộ kiểm ngân sách ô và lý do lệch kế hoạch chuyển theo; `TransferPutAwayPlans.LoadAsync` tính lượng đã cất theo `ReceiptFlowVersion` (mục 4.1).
- Ngân sách còn lại = kế hoạch ô − tổng hàng **tốt** đã cất vào ô, trên các đợt/lô của cùng dòng phiếu. Gợi ý lập kế hoạch sau kiểm đếm cũng chỉ lấy phần hàng tốt chưa cất, không cộng hàng hỏng. Hàng hỏng không tiêu ngân sách; `PutAwayQuantity` vẫn cộng cả tốt và hỏng để quyết định hoàn tất. `planVersion` vẫn kiểm khi dòng phiếu có kế hoạch, kể cả request chỉ cất hàng hỏng. `PlanBudgets` là ngân sách dùng chung theo dòng phiếu, **không phải ngân sách riêng cộng được cho từng lô**.
- Đọc phiếu cất **không gọi AI**. Người dùng bấm Gợi ý thì FE mới gọi endpoint `putaway-plan-suggestions` hiện có; lỗi AI vẫn dùng gợi ý quy tắc như spec trước.
- **Endpoint `/receipt` cũ không bị xóa hay đổi nghĩa** trong cùng đợt phát hành. Nó vẫn chạy nguyên cho đợt `ReceiptFlowVersion = 0`; với đợt `1` nó trả lỗi rõ ràng (chỉ dẫn dùng luồng mới). Xóa endpoint ở PR dọn dẹp sau khi FE mới đã lên (mục 7).
- **Nhận bổ sung (`LateReceipt`)** giữ hành vi ghi tồn ngay vào vị trí đã chọn và quét mã. Đây là ngoại lệ có chủ ý của D1. **Nguồn lượng đã cất của đợt `ReceiptFlowVersion = 1` chỉ là `StockTransferPutAwayLine`**, nên với đợt `1` nhận bổ sung ghi **trong cùng giao dịch** hai bản ghi: `StockTransferReceiptLine` (`IsLateReceipt = true`, tính vào lượng thực nhận như hiện nay) và `StockTransferPutAwayLine` (chất lượng tốt, đánh dấu `IsLateReceipt`, vị trí và mã quét đã chọn). Vì cả lượng nhận và lượng cất cùng tăng, phần còn được cất không đổi và hàng bổ sung không thể bị cất lần hai; lượng này giảm ngân sách ô và tham gia khóa vị trí như mọi dòng cất khác. Với đợt `0` giữ nguyên hành vi cũ (chỉ `StockTransferReceiptLine`). Bộ đọc không cộng riêng dòng `IsLateReceipt` để tránh đếm đôi.
- Mọi lệnh ghi `StockTransfer.ModifiedAt` để khóa lạc quan, idempotent bằng `CommandId` như các lệnh hiện có.
- `nextActionCode`: `Receive` (gồm cả xác nhận xe đến) và thêm `PutAway`; thay cho `Receive` chung.
- Thông báo: đã bắt đầu nhận hàng (quản lý kho nhập, nếu người bắt đầu là nhân viên), phiếu nhập có chênh lệch (quản lý kho nhập), phiếu nhập đã nộp (người cất, hoặc quản lý nếu chưa giao), cất lệch kế hoạch (người lập kế hoạch, đã có).

### 4.3. Giao việc

- Mở rộng `AssignWarehouseTaskCommand` thêm `Priority` và `DueAt` tùy chọn, `ClearDueAt` mặc định `false`; cho phép `TransferPick`, `TransferReceive`, `TransferPutAway`. Không gửi hạn mới thì giữ hạn cũ; muốn xóa phải gửi `ClearDueAt = true` (không gửi cùng `DueAt`). Việc khẩn phải có hạn nếu đang chỉnh lịch. Cùng người được giao vẫn chỉnh được lịch mà không tạo lịch sử giao lại.
- Tạo **sẵn `TransferPutAway` task** cùng lúc với task nhận khi xác nhận xuất (trạng thái xếp hàng, chỉ chạy được khi đợt `AwaitingPutAway`). Nhờ vậy giao việc cất được **bất kỳ lúc nào** (D6). Đợt cũ chưa có task cất thì `StartTransferReceiving` tạo trong cùng giao dịch (mọi đợt đều phải qua lệnh này, nên không có đợt nào sang `AwaitingPutAway` mà thiếu task).
- Truy vấn danh sách nhân viên mở rộng từ `GetAssignableWarehouseStaff`: **đếm thêm việc điều chuyển đang mở** (`WarehouseTask` loại `TransferPick`, `TransferReceive`, `TransferPutAway`, chưa hoàn tất hoặc hủy) vào số việc, để người đang có nhiều việc chuyển kho không hiện "0 việc". Điều kiện nhân viên đủ quyền theo loại việc được giao (`transfers:pick` cho lấy hàng, `transfers:receive` cho nhận và cất), thống nhất với kiểm tra trong `AssignWarehouseTaskCommandHandler`.
- Chọn "cùng một người làm kiểm hàng và cất hàng": FE gửi hai lệnh giao độc lập (nhận, cất). **Xử lý lỗi giữa chừng:** UI báo kết quả từng việc; nếu một việc thành công và việc kia lỗi, tải lại phiên bản và chỉ cho thử lại phần chưa xong, không thông báo cả hai đã được giao.

### 4.4. Quyền

- Dùng `transfers:receive` cho bắt đầu nhận hàng, nộp phiếu, cất; người chỉ được thao tác khi là người được giao hoặc quản lý kho nhập.
- Không có quyền duyệt phiếu vì không có bước duyệt (D3). Không thêm quyền nào mới.

## 5. Frontend

### 5.1. Trang chi tiết `/transfers/{id}`

Tab: **Hàng hóa · Lấy hàng · Phiếu nhập điều chuyển · Chờ cất hàng · Chênh lệch/Phản hồi · Lịch sử** (đếm theo từng tab như hiện nay). Nút **"Nhận hàng"** (xác nhận xe đã đến) nằm trong thẻ đợt ở tab Phiếu nhập và cả ở dải "Việc tiếp theo".

- **Lấy hàng:** nút Giao/Giao lại việc lấy hàng mở **hộp thoại giao việc kiểu Nhập kho** (D4).
- **Phiếu nhập điều chuyển:** mỗi đợt một thẻ gồm trạng thái, người được giao, nút Giao việc nhận hàng và nút **Nhận hàng** (xác nhận bắt đầu nhận hàng, mở phiếu kiểm hàng). Bảng đối chiếu theo dòng và lô: **Theo phiếu điều chuyển | Thực nhận tốt | Hỏng | Thiếu | Chênh lệch**, có huy hiệu khớp/lệch. Khi phiếu lệch, thẻ hiện huy hiệu "Có chênh lệch" kèm liên kết sang tab Chênh lệch/Phản hồi để quản lý xử lý; không có nút Duyệt.
- **Chờ cất hàng:** mỗi đợt đã nộp phiếu nhập một thẻ với số "Đã nhận / Đã cất / Còn lại", người được giao, nút Giao việc cất hàng, nút **Mở trang cất hàng** (không mở Sheet).

### 5.2. Trang cất hàng riêng (D5)

- Route mới: `/transfers/{id}/shipments/{shipmentId}/putaway` cho quản lý cấu hình; nhân viên dùng `/tasks/transfers/{id}/shipments/{shipmentId}/putaway` (cùng nguyên tắc với trang nhận hiện có).
- Giao diện theo `InboundPutawayDetailPage`: tiêu đề, dải thông tin, khối kế hoạch, danh sách dòng, thanh quét, khung chọn vị trí, bảng gợi ý (AI và quy tắc). Dùng lại bộ thành phần đã rút ra ở `components/operations/putaway/*`.
- Hai chế độ theo quyền: **quản lý** cấu hình vị trí cho nhân viên (lưu kế hoạch cất nhiều ô), **nhân viên** quét mã vị trí để xác nhận từng dòng rồi hoàn tất. Quản lý cũng có thể tự cất.
- `TransferPutawayPlanSheet` được thay bằng trang này; giữ nháp, cảnh báo rời trang, và xử lý 409/`planVersion` như bản hiện tại.
- Trang nhận hiện có (`TransferReceiveTaskPage`) rút lại thành trang **kiểm hàng** (đếm tốt, hỏng, thiếu, lô, lý do); bỏ phần chọn vị trí và quét mã vị trí.

### 5.3. Hộp thoại giao việc dùng chung (D4)

- Dùng `AssignWarehouseTaskDialog` của Nhập kho; mở rộng `kind` thành `Receiving | PutAway | TransferPick | TransferReceive | TransferPutAway`, nhãn "lấy hàng", "nhận hàng", "cất hàng".
- Trường: Nhân viên (danh sách có số việc), Mức ưu tiên, Hạn hoàn thành, Lý do khi giao lại. Trạng thái rỗng "Kho này chưa có Nhân viên kho đang hoạt động…" giữ nguyên.
- Thêm ô chọn "Giao luôn việc cất hàng cho người này" khi giao việc nhận (D6).
- Xóa `AssignTransferTaskDialog` sau khi chuyển hết nơi dùng.

## 6. Kiểm thử

**BE (xUnit, `TransferFlowFixture`):** bắt đầu nhận hàng chỉ từ `InTransit` và chỉ người có quyền, ghi `ArrivedAt/By`, bấm lại không tạo trùng; nộp phiếu khớp và nộp phiếu lệch đều sang `AwaitingPutAway`, lệch thì mở chênh lệch và báo quản lý mà không chặn cất; không ghi tồn trước khi cất; cất ghi tồn đúng lô và ô; ngân sách ô và `planVersion` giữ như cũ; cất lệch kế hoạch bắt buộc lý do; lối thoát không quét được mã; hai người cùng cất một đợt (race, dùng bộ test race SQL Server có sẵn); giao việc kèm ưu tiên và hạn; giao lại cần lý do; đợt `InTransit` cũ phải qua `StartTransferReceiving` mới nộp được và task cất được tạo ở đó; phiếu đã `Completed` không đổi.
Thêm theo review: (1) 8 tốt + 2 hỏng, cất 8 tốt thì đợt vẫn `AwaitingPutAway`, cất nốt 2 hỏng thì đợt thành `ReceivedWithDiscrepancy` (có chênh lệch hỏng từ lúc nộp phiếu), còn nhận đủ không lệch thì cất hết là `Received`; (2) đợt toàn hàng thiếu sang thẳng `ReceivedWithDiscrepancy` và task cất tạo sẵn bị hủy với lý do "Không có hàng cần cất" (không còn việc mở, không tính vào số việc của nhân viên); (3) `AwaitingPutAway` được coi là đợt mở trong `TransferRules.Evaluate`; (4) cất vượt thực nhận theo dòng/lô/chất lượng bị từ chối dù có lý do vượt ngân sách; (5) nhận bổ sung của đợt `1` ghi tồn ngay và ghi cả dòng nhận lẫn dòng cất trong một giao dịch; lượng này giảm ngân sách ô, khóa vị trí, không làm tăng phần còn được cất và không thể bị cất lần hai; (6) phiếu có cả đợt `0` và đợt `1`: ngân sách, vị trí khóa và `PutAwayQuantity` không đếm đôi, lịch sử cũ không hiện thành "chưa cất"; (7) `/receipt` cũ vẫn chạy cho đợt `0` và báo lỗi rõ cho đợt `1`; (8) giao hai việc, một việc lỗi thì UI chỉ cho thử lại phần chưa xong; (9) danh sách nhân viên đếm cả việc điều chuyển và lọc theo quyền đúng loại việc.
**FE (Vitest):** bảng đối chiếu; ẩn/hiện nút theo trạng thái và quyền; trang cất hàng ở hai chế độ; hộp thoại giao việc; điều hướng tab.
**QA trình duyệt thật** theo bộ phiếu như đợt trước (một lô, nhiều lô, lệch kế hoạch, hỏng và thiếu, 360px, 768px, bàn phím).

## 7. Trình tự triển khai và cổng nghiệm thu

Phân cổng: **Gate A — BE, hợp đồng API, migration/SQL và test**; **Gate B — tích hợp FE và hộp thoại giao việc dùng chung**; **Gate C — UI/UX, QA trình duyệt và bằng chứng nghiệm thu**. Gate A có thể bàn giao code trước khi áp migration, nhưng không được coi QA vận hành/race đã đạt. Kết quả thật ghi riêng ở mục 11, không sửa các ghi nhận review lịch sử thành đã nghiệm thu.

1. **Giao việc (độc lập, làm trước):** mở rộng `AssignWarehouseTaskCommand`, đổi hộp thoại dùng chung; áp cho Lấy hàng. Không cần migration.
2. **BE:** migration (chỉ tạo SQL, chờ lệnh áp), bắt đầu nhận hàng, phiếu nhập, cất hàng, `nextActionCode`, test.
3. **FE:** tab mới, trang kiểm hàng, trang cất hàng, thay Sheet.
4. **QA thật** trên bản sao dữ liệu hoặc phiếu mới, không xóa `db71143`.
5. Đẩy lên `dev`: BE trước FE, PR không có dòng "Generated with Claude Code". BE chỉ **thêm** endpoint mới và giữ `/receipt` cũ, nên FE cũ vẫn chạy trong lúc FE mới chưa lên.
6. **PR dọn dẹp cuối:** sau khi FE mới đã lên `dev` và `main`, và không còn đợt `ReceiptFlowVersion = 0` đang mở, mới xóa endpoint `/receipt` cũ và mã liên quan.

## 8. Rủi ro

- **Đổi thời điểm ghi tồn** làm thay đổi báo cáo và tồn "đang chờ": cần hiển thị rõ và kiểm các báo cáo đọc `StockTransferItem`/tồn điều chuyển.
- **Đợt đang chạy** khi triển khai: đếm trước bằng truy vấn chỉ đọc; đợt `InTransit`/`Receiving` phải đi tiếp được.
- **Công sức làm lại:** QA và test màn nhận hiện tại phải làm lại cho hai màn mới; phần lõi (bộ dựng kế hoạch, ngân sách, quét mã) được dùng lại nên không viết lại.
- **Quy mô:** thay đổi trải rộng BE (migration, lệnh, đọc) và FE (tab, hai trang). Nên chia nhiều PR theo mục 7, mỗi PR có thể gộp độc lập.
- **Phát hành lệch BE/FE:** giải quyết bằng endpoint bổ sung và giữ `/receipt` cũ (mục 4.2); không đổi ngầm hợp đồng cũ.
- **Đếm đôi và lịch sử cũ:** giải quyết bằng `ReceiptFlowVersion` và suy ra `PutAwayQuantity` cho dữ liệu cũ (mục 4.1); cần test riêng.
- Chạy `gitnexus impact` trước khi sửa `ReceiveTransferShipmentCommandHandler`, `GetTransferReceiveSheetQueryHandler`, `AssignWarehouseTaskCommand`, `AssignWarehouseTaskDialog`, `TransferReceiveTaskPage`.

## 9. Quyết định đã chốt sau review và điểm còn cần kiểm

**Không có câu hỏi mở cho người dùng.** Việc cần kiểm khi bắt tay làm:

1. Đã đếm chỉ đọc lúc **12:18 ngày 2026-10-13 (UTC+7)**: 3 đợt `InTransit`, 0 đợt `Receiving`, 103 migration đã áp. Đây là ảnh chụp thời điểm kiểm; phải kiểm lại trước khi áp migration/phát hành.
2. Đã kiểm: `StockTransferShipmentStatus` và `WarehouseTaskType` đều lưu dạng **chuỗi** (`HasConversion<string>()`, độ dài tối đa 40 và 30 ký tự). Thêm `AwaitingPutAway` và `TransferPutAway` không đổi giá trị cũ; chỉ cần bảo đảm tên mới không vượt độ dài cột.

**Khu hàng hư hỏng:** không thêm loại khu mới; kho tự tạo khu có tên chứa hàng hư và quản lý đặt kế hoạch cất hàng hỏng vào đó, tùy kho.

## 10. Lịch sử rà soát (2026-10-13)

Một người review độc lập đã đối chiếu spec với code và nêu 8 điểm; đã xác minh lại và chấp nhận cả 8:

| #   | Điểm                                                                  | Xử lý trong spec                                                                                                          |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Điều kiện hoàn tất bỏ sót hàng hỏng; `AwaitingPutAway` chưa là đợt mở | Mục 3: hoàn tất khi cất hết tốt và hỏng; đợt toàn thiếu sang thẳng `ReceivedWithDiscrepancy`; `AwaitingPutAway` là đợt mở |
| 2   | Dòng cất không phân biệt chất lượng, không giới hạn theo thực nhận    | Mục 4.1, 4.2: dòng cất có chất lượng; tổng đã cất không vượt thực nhận; `PutAwayQuantity` = tốt + hỏng, cất nhiều lần     |
| 3   | Nhận bổ sung ghi tồn trước bước cất                                   | Mục 1 (D1), 4.2: giữ làm ngoại lệ có chủ ý vì lệnh đã gồm vị trí và quét mã; ghi rõ, tính vào lượng đã cất                |
| 4   | Đọc kết hợp dữ liệu cũ và mới                                         | Mục 4.1: cờ `ReceiptFlowVersion`; `PutAwayQuantity` cũ được suy ra; không sửa chứng từ lịch sử                            |
| 5   | Đợt cũ bỏ qua bước bắt đầu nhận thì thiếu task cất                    | Mục 4.2, 4.3: nộp phiếu chỉ từ `Receiving`; task cất tạo ở `StartTransferReceiving`                                       |
| 6   | BE trước FE không tương thích khi bỏ lệnh cũ                          | Mục 4.2, 7: giữ `/receipt` cũ, thêm endpoint mới, xóa ở PR dọn dẹp cuối                                                   |
| 7   | Giao hai việc có thể chỉ thành công một                               | Mục 4.3: báo từng kết quả, tải lại phiên bản, chỉ thử lại phần chưa xong                                                  |
| 8   | Danh sách nhân viên không đếm việc điều chuyển                        | Mục 4.3: đếm thêm `WarehouseTask` điều chuyển và lọc theo quyền đúng loại việc                                            |

Lưu ý: bản trước của mục 9 ghi "không còn câu hỏi mở" là chưa chính xác; mục này thay thế.

### Vòng review thứ hai (2026-10-13)

Người review đồng ý các phản biện (#3 giữ ngoại lệ nhận bổ sung; #5/#6 bắt buộc qua "Nhận hàng", giữ endpoint cũ) và nêu thêm 3 điểm; đã xác minh với code và chấp nhận cả 3:

| #   | Điểm                                                              | Xử lý                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Nhận bổ sung của đợt mới chưa rõ lưu ở đâu, có thể bị cất lần hai | Mục 4.2: một nguồn duy nhất là `StockTransferPutAwayLine`; đợt `1` ghi cả dòng nhận và dòng cất trong một giao dịch; bộ đọc không cộng riêng `IsLateReceipt`                                                |
| B   | Đợt toàn hàng thiếu còn task cất mở                               | Mục 3: hủy task cất với lý do "Không có hàng cần cất" trong cùng giao dịch                                                                                                                                  |
| C   | Test 8 tốt + 2 hỏng sai trạng thái cuối                           | Mục 3, 6: trạng thái cuối là `ReceivedWithDiscrepancy` nếu lúc nộp phiếu đã phát sinh chênh lệch (đúng ngữ nghĩa `ReceiveTransferShipmentCommandHandler` hiện tại, không đổi lại khi chênh lệch được xử lý) |

Ghi chú về C: người review viết "nếu chênh lệch hỏng vẫn chưa xử lý". Code hiện tại gán `ReceivedWithDiscrepancy` theo việc **đã phát sinh** chênh lệch ở lần nhận, không theo việc còn mở hay không, nên spec giữ ngữ nghĩa đó cho nhất quán.

## 11. Bàn giao Gate A — 2026-10-13

**Trạng thái: `READY_FOR_CODEX_REVIEW` — tự kiểm của người triển khai, chưa phải duyệt độc lập hoặc chứng nhận phát hành. Người dùng đã yêu cầu commit local sau kiểm thử; chưa push.** Chỉ triển khai BE; chưa đổi code FE hoặc hộp thoại/trang mới của Gate B/C.

### API để Gate B tích hợp

Tiền tố `/api/transfers/{id}/shipments/{shipmentId}`:

| Phương thức/đuôi route  | Quyền               | Payload/response chính                                                                                                                                                                           |
| ----------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /start-receiving` | `transfers:receive` | `expectedVersion`, `commandId`                                                                                                                                                                   |
| `POST /submit-receipt`  | `transfers:receive` | Hai trường trên + `entries[]`: `lineId`, `lotId`, `goodQuantity`, `damagedQuantity`, `missingQuantity`, `reasonCode`, `note`; **không có vị trí**                                                |
| `POST /putaway`         | `transfers:receive` | `expectedVersion`, `commandId`, `planVersion`, `entries[]`: `lineId`, `lotId`, `qualityStatus` (`Good`/`Damaged`), `destinationSlotId`, `quantity`, mã quét, lý do/ghi chú, `slotCodeUnreadable` |
| `GET /receipt-sheet`    | `transfers:view`    | Version đợt, dấu nhận/nộp phiếu, dòng/lô, kiểm đếm ban đầu tách riêng `lateReceivedQuantity`; `actualGoodQuantity` đã gồm nhận bổ sung                                                           |
| `GET /putaway-sheet`    | `transfers:view`    | Phiếu kiểm đếm, `planVersion`, thực nhận/đã cất/còn lại theo chất lượng, ngân sách chung của hàng tốt, lịch sử dòng cất                                                                          |

- `GET /api/transfers/assignable-staff?warehouseId=...&taskType=TransferPick|TransferReceive|TransferPutAway`: quyền xem ở controller, handler kiểm quyền quản lý kho và quyền giao đúng loại việc. Nhân viên phải có quyền thực hiện loại việc và `warehouse-tasks:manage-own` theo hằng quyền hiện có; không suy từ tên vai trò. Endpoint nhân viên cũ không truyền `taskType` giữ tiêu chí inbound hiện có.
- Giao việc qua API công việc kho hiện có, bổ sung `priority`, `dueAt`, `clearDueAt`; không cần cột mới cho lịch.
- Ba lệnh ghi mới bắt buộc `commandId` và kiểm version đợt; replay cùng actor/payload không ghi lần hai. `ResolveTransferDiscrepancy` bổ sung `commandId` tùy chọn để FE mới chống lặp nhận bổ sung; client cũ không gửi vẫn tương thích. FE mới phải giữ cùng ID khi xác minh/thử lại một thao tác chưa rõ kết quả, không phát sinh ID mới để tự retry ghi.
- `/receipt`, alias `/receive` và `/receive-sheet` cũ được giữ. Luồng cũ hoàn tất cả task nhận và task cất nếu task cất đã tạo trước; version 1 bị chặn ở lệnh nhận cũ.
- DTO chi tiết thêm lượng đã cất/còn lại, version luồng, mốc nhận/nộp phiếu, task cất; che tên người cất nếu chỉ có quyền kho xuất. `nextActionCode = PutAway` được ưu tiên khi còn hàng chờ cất, không để xử lý chênh lệch che mất việc cất.

### Migration và an toàn DB

- Migration mới: **`20261013052038_SplitTransferReceiptPutAway`**. Thêm metadata nhận/nộp phiếu, `ReceiptFlowVersion` mặc định 0, liên kết task cất, bộ đếm lượng cất hiện đại và bảng `StockTransferPutAwayLines` với FK/check/index. Không backfill hoặc sửa chứng từ cũ; lượng đã cất của dữ liệu cũ được suy ra ở reader.
- SQL tiến tới, idempotent: `SSWMS-Backend/docs/migrations/20261013052038_SplitTransferReceiptPutAway.sql`. Không tạo/chạy SQL rollback. **Chưa áp migration; cần người dùng duyệt riêng trước khi áp lên `db71143`. Không khởi động API mới trên schema chưa cập nhật.**
- Chỉ đọc DB đã được duyệt: provider `Microsoft.EntityFrameworkCore.SqlServer`, server `db71143.public.databaseasp.net`, DB `db71143`, `Database__ApplyMigrationsOnStartup=false`; không SQL ghi, seed, cleanup hoặc startup ứng dụng trong lượt này.
- Model drift kiểm metadata trong bản sao ở D: **không có thay đổi model còn treo** sau migration. Đây không phải xác nhận migration đã áp trên DB.

### Kết quả kiểm thử và giới hạn

Tất cả build/test chạy ở bản sao riêng `D:/Kovia-QA/Transfer-ReceiptSplit-GateA-20261013`, baseline sạch BE `b2eecd69`, không build vào repo đang phục vụ phiên khác.

| Kiểm tra                                                                                                                                                                          | Kết quả                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| API Release build bản cuối                                                                                                                                                        | 0 lỗi, 0 cảnh báo                                                                                                                                     |
| 25 ca mới: nhận/cất tách, tốt/hỏng/nhiều lô, nhận bổ sung, replay, quyền/tenant, version, ngân sách và gợi ý chỉ hàng tốt, thông báo validation tiếng Việt, giao việc và tải việc | 25 đạt                                                                                                                                                |
| Nhóm test `Features.Transfer`                                                                                                                                                     | 163 đạt, 0 lỗi, 4 SQL race bỏ qua                                                                                                                     |
| Toàn suite bản cuối                                                                                                                                                               | 1.346 đạt, 5 lỗi, 5 bỏ qua / 1.356                                                                                                                    |
| Toàn suite baseline                                                                                                                                                               | 1.321 đạt, 5 lỗi, 3 bỏ qua / 1.329                                                                                                                    |
| Đối chiếu tên ca lỗi baseline/bản cuối                                                                                                                                            | Giống hệt: 4 `InboundOperationalEditingTests` + 1 `TenantRolePermissionTests.Inactive_user_cannot_reuse_a_cached_permission_set`; không có ca lỗi mới |
| EF model drift / whitespace diff                                                                                                                                                  | Không drift / `git diff --check` sạch                                                                                                                 |

- Có thêm **hai test handler race thực** (đổi kế hoạch cùng lúc cất; hai request cất cùng đợt) trên fixture SQL Server **local cô lập**. Chưa chạy vì người dùng hoãn SQL Server local; không lấy SQLite làm bằng chứng race SQL Server, không dùng `db71143` cho các test này. Rủi ro race giữ **High**, Gate A chưa đóng phần nghiệm thu đồng thời/rollback.
- 5 ca bỏ qua toàn suite gồm 4 race điều chuyển và 1 test dung lượng SQL Server. Không gọi là đạt.
- Chưa QA API HTTP/trình duyệt với migration mới; chưa kiểm responsive, bàn phím, reduced motion hoặc hồi quy hộp thoại FE. Gate B/C chưa thực hiện.
- GitNexus impact đã chạy trước các symbol dùng chung (DbContext/metadata Critical đã cảnh báo); `detect_changes` quét diff tracked. File mới chưa được index phải đối chiếu trực tiếp với source, build và test; không coi báo cáo phạm vi/risk của công cụ là chứng nhận nghiệp vụ.
- Bằng chứng: `build-final.log`, `new-cases.log`, `transfer-tests-final.log`, `full-tests-final.log`, `baseline-tests.log`, `model-check-final.log`, `db-readonly.log` và các TRX trong thư mục `results` dưới QA root. Biên bản BE: `SSWMS-Backend/docs/AI_REVIEW.md`.

## 12. Bàn giao Gate B — 2026-10-13

**READY_FOR_CODEX_REVIEW** — tự kiểm của người triển khai; chưa duyệt độc lập, chưa commit/push. Các ghi nhận Gate A/mục 2 là lịch sử, không đổi thành kết quả nghiệm thu mới.

- Đã tích hợp Start Receiving bằng thao tác người dùng, phiếu kiểm tốt/hỏng/thiếu không chọn vị trí, tab Phiếu nhập điều chuyển và Chờ cất hàng; kế hoạch mở thành trang riêng thay Sheet đang dùng. Cất thực tế có quét mã, lối thoát nhãn không đọc được, ngân sách chung qua lô chỉ cho hàng tốt, lý do lệch và tách phần vượt. Lịch sử đợt phiên bản 0 hoàn tất giữ cách đọc cũ.
- Giao lấy/nhận/cất dùng hộp thoại Nhập kho chung: nhân viên đủ quyền, số việc, ưu tiên và hạn. Giao hai việc có kết quả riêng; chỉ thử lại phần chưa xong, tải lại/xác minh khi phiên bản đổi hoặc phản hồi chưa rõ. Bổ sung BE sáu trường lịch vào DTO chi tiết đợt để giữ lịch hiện tại; không thay schema.
- Chống bấm lặp tại handler, không tự retry ghi. Nộp phiếu/cất/nhận bổ sung giữ nguyên mã thao tác và payload khi kiểm tra lại kết quả chưa rõ. Khi 409, giữ số lượng đang nhập; sau cất thành công mới dựng phần còn lại. Tra mã lỗi xóa xác nhận quét cũ. Dùng guard rời phiên chung, không thêm animation chuyển trang/remount.
- Test FE trên bản sao D: **180 file, 1.039 ca đạt**, baseline 175 file/996 ca; TypeScript và lint phạm vi sửa đạt. Có hồi quy hộp thoại/PutawayForm Nhập kho. Production build Webpack đạt; Turbopack chưa chứng nhận do junction node_modules nằm ngoài root bản sao. BE Release 0 lỗi/0 cảnh báo; nhóm Điều chuyển **166 đạt, 4 race SQL bỏ qua**, chưa chạy toàn bộ BE trong lượt Gate B.
- Bằng chứng: `D:/Kovia-QA/Transfer-ReceiptSplit-GateB-20261013`, chi tiết tên log trong `docs/AI_REVIEW.md` của hai repo. Không chia sẻ ZIP/config bản sao vì có thể chứa cấu hình triển khai.

### Việc còn lại — không ghi là đã đạt

1. Review độc lập code Gate B, đặc biệt giao việc thành công một phần, unknown-result và hồi quy primitive/guard dùng chung.
2. Gate C: QA trình duyệt API thật theo mục 6, responsive 360/768px, bàn phím, screen reader cơ bản, reduced motion; Back/Forward/làm mới khi có nội dung chưa lưu. Rà nhãn, focus/tab semantics và bố cục trang kế hoạch/cất trên thiết bị thật. Chưa có ảnh hoặc biên bản trình duyệt ở Gate B.
3. **Chưa áp `20261013052038_SplitTransferReceiptPutAway`.** Không khởi động API mới với schema cũ. Cần user duyệt riêng migration trước QA API thật; tắt migration/seed tự động. Gate B không kết nối/ghi DB deploy.
4. SQL Server race/rollback trên DB local cô lập vẫn hoãn theo người dùng; rủi ro High, không coi test bỏ qua hoặc SQLite là bằng chứng đạt.

## 12. Ghi chú Gate C — QA trình duyệt thật (2026-10-13)

Môi trường: BE cục bộ `:7070` build từ `feat/huytv` (kèm thay đổi chưa commit ở `AssignWarehouseTaskCommandHandler`; việc nền Quartz tắt trong bản chạy), FE `:3000`, DB `db71143` với migration `20261013052038` đã áp (ghi qua luồng ứng dụng, không xóa/reset). Tài khoản seed: Owner, Warehouse Staff.

**Phiếu QA đã tạo** (ghi thật vào DB dùng chung, để lại): `QA-GC-261013-1651`, `QA-GC-261013-B1706`, `QA-GC-261013-C1717`.

| Hạng mục                                                                                                             | Kết quả                                                                                           |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Giao việc lấy hàng bằng hộp thoại kiểu Nhập kho (nhân viên + số việc, ưu tiên, hạn, lý do)                           | Đạt                                                                                               |
| Giao nhận + cất cho cùng một người (hai lệnh, báo từng kết quả)                                                      | Đạt                                                                                               |
| "Nhận hàng" = xác nhận xe đến (`InTransit→Receiving`), bắt buộc lý do khi hỏng/thiếu, xác nhận nộp                   | Đạt; tồn kho không đổi sau nộp phiếu                                                              |
| Phiếu lệch (8 tốt, 1 hỏng, 1 thiếu) sang `AwaitingPutAway`, mở 2 chênh lệch, không chặn cất                          | Đạt                                                                                               |
| Cất theo trang riêng: quét mã, cất một phần rồi tiếp tục, vượt thực nhận bị chặn, hàng hỏng cất riêng                | Đạt; kết thúc `ReceivedWithDiscrepancy`                                                           |
| Kế hoạch cất (gợi ý quy tắc khi AI không phản hồi), cất khác kế hoạch bắt buộc lý do, trong kế hoạch không bị gắn cờ | Đạt; phiếu không lệch kết thúc `Received`, phiếu `Completed`                                      |
| Nhận bổ sung từ chênh lệch thiếu                                                                                     | Đạt; một nguồn lượng đã cất (đã cất 9 → 10, còn chờ 0)                                            |
| Đợt phiên bản 0 đã nhận mở trang chỉ xem                                                                             | Đạt                                                                                               |
| 360px: trang cất hàng (thẻ)                                                                                          | Đạt, không tràn ngang                                                                             |
| 360px/768px: bảng kiểm hàng                                                                                          | **Chưa đạt**: bảng rộng 896–910px, phải cuộn ngang; cột Hỏng/Thiếu/Nguyên nhân nằm ngoài màn hình |

Phát hiện chưa sửa: (1) bảng kiểm hàng không có bố cục thẻ ở màn nhỏ; (2) sau khi quản lý lưu kế hoạch, tab "Cất hàng thực tế" của cùng trang vẫn hiện "Chưa có vị trí theo kế hoạch" kể cả sau Tải lại vì `applyPlan` của `use-transfer-putaway-form` không được gọi ở đâu; (3) lỗi nghiệp vụ 409 khi sản phẩm chưa có quy đổi sang đơn vị sức chứa của vị trí buộc phải bấm Tải lại (dữ liệu đã nhập được giữ); (4) nhãn "Lý do đổi người nhận việc (nếu có)" xuất hiện cả khi giao lần đầu; (5) nút, tab, link dưới 44px (tab 21px, nút 28–32px).

Chưa kiểm: zoom 200% thật, đọc màn hình, reduced motion thật, Back/Forward trên trang mới, nhiều lô, phiên bản 1 với kế hoạch bị đổi giữa chừng khi hai người cùng mở.
