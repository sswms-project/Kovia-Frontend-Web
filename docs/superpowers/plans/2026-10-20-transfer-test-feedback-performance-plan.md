# Điều chuyển kho — tổng hợp feedback và kế hoạch sửa, tối ưu API

Ngày test: 20/10/2026, múi giờ Asia/Saigon. Tài liệu hoàn thiện: 21/10/2026.

**Trạng thái: đã triển khai đợt sửa đầu ngày 21/10/2026; kết quả và phần còn lại ở mục 12.** Các mục phân tích ban đầu bên dưới được giữ lại làm baseline, không phải khẳng định mọi hạng mục đã hoàn tất.

## 1. Mục tiêu và cách tiếp tục

Người dùng yêu cầu gom feedback thành một file để lần sau đọc và thực hiện:

1. Thông báo trên mobile nằm phía trên, không che nút xác nhận lấy/cất hàng.
2. Làm rõ và sửa cách hiển thị số lượng “Đã lấy” sau khi xuất hàng.
3. Giảm thời gian chờ ở các thao tác điều chuyển và các GET tải lại đi kèm.
4. Điều tra lỗi 409 xuất hiện ngay sau lần cất hàng thành công; không che lỗi hoặc suy diễn là đã ghi trùng.

Lệnh tiếp tục gợi ý:

> Đọc AGENTS.md ở workspace và hai repo, .rules ở hai repo, sau đó đọc docs/superpowers/plans/2026-10-20-transfer-test-feedback-performance-plan.md trong FE. Kiểm tra lại hiện trạng code và triển khai từng giai đoạn; giữ nguyên quyền, nghiệp vụ tồn kho, idempotency và an toàn DB. Đo trước/sau, báo rõ phần chưa kiểm chứng.

Tài liệu là kế hoạch cross-repo, không phải yêu cầu chạy migration hoặc tự động gửi API nghiệp vụ. Các đường dẫn trong từng mục được tính từ repo được ghi rõ.

### Bối cảnh cần kiểm tra lại trước khi làm

- FE: `SSWMS-Frontend`, nhánh lúc khảo sát `screen/huytv`.
- BE: `SSWMS-Backend`, nhánh lúc khảo sát `feat/huytv`.
- Cả hai working tree đang có thay đổi điều chuyển, duyệt yêu cầu và mobile/camera chưa commit; không ghi đè, reset hoặc stash-pop mù quáng.
- Log quan sát thuộc BE build `outputs/transfer-acceptance-review-build-20261020`, trước đây PID 6744, exec session 58582, cổng 7070.
- Đã đọc log tới **23:52:11 ngày 20/10/2026**. Khi tiếp tục hoàn thiện tài liệu, session không còn truy cập được; không thấy PID 6744/cổng 7070 lắng nghe. Không có phép đo mới sau mốc trên, không giả định đang tiếp tục nghe log.
- Browser automation bị tắt trong lần khảo sát; chưa kiểm chứng trên điện thoại thật hoặc camera thật.
- GitNexus query trả về thiếu FTS index. Không xem kết quả rỗng là không có caller. Trước sửa symbol phải chạy impact, báo blast radius và cảnh báo HIGH/CRITICAL theo AGENTS.md; nếu bị chặn, báo rõ thay vì bỏ qua. Nếu công cụ báo stale, cập nhật index theo hướng dẫn repo.
- Trước triển khai đọc thêm FE `docs/CODING_GUIDELINES.md`, `docs/DESIGN_SYSTEM.md`, `docs/LIST_TABLE_DESIGN_GUIDELINES.md`, `docs/AI_WORKFLOW.md`, CSS tokens và tài liệu Next.js cài trong repo. Không áp dụng máy móc các chỉ dẫn Vite cũ trong `.rules` vào Next.js hiện tại.

## 2. Ranh giới an toàn

- Không xóa/drop/reset/recreate/truncate/bulk delete hoặc rollback phá hủy DB `db71143`.
- Không migration tự động. Nếu được yêu cầu khởi động BE, đặt rõ `Database__ApplyMigrationsOnStartup=false`.
- Khóa connection string cần xác minh từ source: `ConnectionStrings:SqlServerConnection`. Môi trường test trước đây dùng SQL Server, server `db71143.public.databaseasp.net`, database `db71143`; không chép secret vào log/tài liệu.
- Không chạy seed, repair, direct SQL write hoặc QA ghi dữ liệu lên DB deploy nếu chưa có chấp thuận đúng mục tiêu. Trước thao tác ghi được phép, xác nhận effective provider/server/database; không coi override dự định là xác nhận thực tế. Tuân thủ quy tắc dừng khi target remote/chưa chứng minh an toàn trong AGENTS.md.
- Kế hoạch ban đầu không yêu cầu thay schema. Migration từng được ghi nhận chưa được phép áp dụng: `20261019182401_AddCycleCountExecutionSnapshots`; kiểm tra trạng thái chỉ đọc nếu liên quan, không tự chạy.
- Không bỏ tenant filter, phân công kho, effective permissions, trần quyền, user overrides, kiểm tra người được giao việc để tăng tốc.
- Không bỏ RowVersion, CommandId/idempotency, transaction, FEFO/lô/chất lượng, kế hoạch cất, sức chứa dùng chung, precision ĐVT, pending return hoặc kiểm tra tồn.
- Không fire-and-forget ledger/audit/persist notification/low-stock để trả thành công sớm; không báo thành công trước khi lưu thành công.
- Không retry một lệnh ghi với CommandId mới khi kết quả chưa rõ. Giữ cơ chế retry đúng intent và đối chiếu trạng thái mới.
- Không commit, push, restart hoặc đổi lịch theo dõi chỉ vì đọc tài liệu này. Cần yêu cầu phù hợp của người dùng.

## 3. Findings và mức độ chắc chắn

| ID      | Vấn đề                               | Kết luận khảo sát                                                                                               | Ưu tiên     |
| ------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------- |
| UX-01   | Toast che nút xác nhận mobile        | Đã xác nhận: Toaster toàn ứng dụng cố định `bottom-right`                                                       | P1          |
| QTY-01  | Đã lấy = 0 sau xuất 2                | Đã xác nhận: backend lưu phần đã lấy **chưa xuất**; label ngắn gây hiểu nhầm                                    | P1          |
| PERF-01 | Chi tiết/pick sheet/staff/tasks chậm | Log xác nhận chậm; source có nhiều lượt đọc nối tiếp, một số vòng lặp đọc DB                                    | P1          |
| PERF-02 | Xuất/cất hàng chậm                   | Log xác nhận; riêng cất hàng có phase breakdown cho thấy trước commit chiếm phần lớn                            | P1          |
| PERF-03 | Nhiều GET sau thao tác               | Log xác nhận nhiều lần gọi; invalidation rộng có trong FE, nhưng chưa quy được từng GET cho cùng tab/người dùng | P1          |
| FLOW-01 | 409 sau cất hàng thành công          | Đã thấy log; chưa có route/TraceId để xác định request gây lỗi                                                  | P0 điều tra |
| OPS-01  | Cảnh báo MARS/savepoints             | Đã thấy warning; chưa chứng minh là nguyên nhân chậm hoặc lỗi dữ liệu                                           | P2 kiểm tra |

## 4. UX-01 — thông báo mobile ở phía trên

### Nguyên nhân đã xác nhận

- FE `src/app/layout.tsx`: `<Toaster richColors position="bottom-right" />`.
- FE `src/components/ui/sonner.tsx`: wrapper client dùng Sonner, chưa đổi vị trí theo viewport.
- Trang thao tác có nút xác nhận phía dưới, nên toast phía dưới có thể che nút trên màn nhỏ.

### Phương án tối thiểu

- Một Toaster dùng chung: mobile `<768px` đặt **top-center**, desktop giữ bottom-right.
- Tái sử dụng `src/hooks/use-mobile.ts` (`useSyncExternalStore`, server snapshot an toàn); RootLayout vẫn là server component. Quyết định responsive trong client wrapper, xử lý thứ tự props để `position` cũ ở layout không vô tình ghi đè.
- Kiểm tra phiên bản/types Sonner đang cài và tài liệu shadcn/Sonner trước khi chọn `offset`/`mobileOffset`; tính safe-area và khoảng cách với header hiện có, không hard-code chiều cao footer.
- Rà soát các toast có override position riêng. Không tạo Toaster thứ hai, không sửa z-index toàn trang, không thay animation toàn cục để né lỗi.
- Toast không giành focus, không tràn ngang, có thể đóng trên cảm ứng. Lỗi field/unknown-result vẫn hiển thị inline; không chuyển hết thành toast tự biến mất.

### Nghiệm thu

- Width 320/390/540px: success/error/loading toast không che CTA phía dưới; không chạm notch hoặc che phần điều hướng quan trọng.
- 768px trở lên giữ vị trí desktop; resize/orientation và hydration không lỗi.
- Kiểm tra keyboard mở, zoom 200%, dialog mở, cuộn và nhiều toast liên tiếp; giữ màu/font/token hiện có.
- Áp dụng dùng chung, không chỉ riêng điều chuyển; regression các trang đang dùng toast.

## 5. QTY-01 — số lượng trong tab Hàng hóa

### Nguyên nhân và ý nghĩa chính xác

BE `Domain/Entities/Inventory/StockTransferItem.cs` định nghĩa `PickedQuantity` là lượng đã lấy **nhưng chưa xuất**.

BE `DispatchTransferShipmentCommandHandler.cs` giảm lượng picked khi xuất; `TransferAggregate.RecalculateItemPicked` tính phần còn đang lấy/chờ xuất. FE `utils/transfer-goods-rows.ts` hiện gán `picked: item.pickedQuantity`, bảng ghi “Đã lấy”. Tooltip hiện tại có giải thích “chưa xuất”, nhưng label và các màn khác chưa đồng nhất.

Trong ảnh của người dùng:

- **Chưa vào đợt = 0 đúng**: cả 2 thùng đã được chia vào đợt, không phải số chưa xuất.
- `PickedQuantity = 0` đúng theo field nghiệp vụ sau khi xuất hết 2 thùng.
- Label “Đã lấy” cần hiển thị tiến độ lũy kế ròng để người dùng thấy đã lấy 2, không hiểu thành chưa lấy.

### Phương án hiển thị

- Chỉ ở lớp trình bày, tính **Đã lấy = pickedQuantity + dispatchedQuantity**, cùng ĐVT cơ sở.
- Tooltip: “Số lượng đã lấy hợp lệ, gồm phần đã xuất; không gồm hàng đã trả lại vị trí.” Đây là tiến độ ròng, không phải tổng số lần quét/lấy trong lịch sử.
- Giữ nguyên BE `PickedQuantity`; không sửa DB, không đổi công thức reservation hay command guard.
- Giữ cột Chưa vào đợt và công thức hiện có `Quantity - BatchedQuantity - StoppedQuantity`; không tự gán số 0 thành requested hoặc ẩn cột theo một ví dụ.

| Trạng thái ví dụ 2 thùng   | Chưa vào đợt | Picked thô (BE) | Đã xuất | Đã lấy hiển thị |
| -------------------------- | -----------: | --------------: | ------: | --------------: |
| Chưa chia đợt              |            2 |               0 |       0 |               0 |
| Chia đủ, chưa lấy          |            0 |               0 |       0 |               0 |
| Lấy đủ, chưa xuất          |            0 |               2 |       0 |               2 |
| Xuất 1, còn 1 chờ xuất     |            0 |               1 |       1 |               2 |
| Xuất đủ, nhận/cất hoàn tất |            0 |               0 |       2 |               2 |

### Các vị trí cần đồng bộ

- FE `utils/transfer-goods-rows.ts`, `components/TransferGoods/TransferGoodsTable.tsx` và test tương ứng.
- `TransferShipmentsPanel.tsx` đã cộng picked + dispatched: không cộng thêm lần nữa.
- `PickLineCard.tsx` đã tính cả phần xuất từ picks. Đối chiếu với desktop `TransferPickLinesTable.tsx` hiện dùng picked thô để không còn mobile 2/2 nhưng desktop 0/2 sau xuất.
- Rà soát export/tooltip/tổng tiến độ nếu tái sử dụng field; không thay toàn bộ `pickedQuantity` bằng tìm-thay.
- Test nhiều đợt, xuất một phần, trả hàng về vị trí, hủy đợt, dừng phần còn lại, sai lệch nhận, quy đổi ĐVT và số lẻ hợp lệ. Không làm mất khả năng xem chứng từ đã hoàn tất.

## 6. Số liệu API đã quan sát

Các thời điểm dưới đây là Asia/Saigon ngày **20/10/2026**. Tên là MediatR command/query, chưa phải đo end-to-end HTTP/browser.

`PerformancePipelineBehavior` hiện chỉ log handler thành công từ 500ms. Request lỗi có thể không có dòng slow request. Không có log không chứng minh không có request. Các khoảng dưới đây là mẫu đã quan sát, không phải percentile hoặc benchmark tải.

### GET và dữ liệu phục vụ thao tác

| Query                             | Thời gian ghi nhận | Mốc/vấn đề                                                                                      |
| --------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| GetTransfers                      | 1.095–1.370s       | Danh sách, mẫu trước đó                                                                         |
| GetTransfer                       | 3.310–5.519s       | 3.529s lúc 23:05:08; nhiều mẫu 4.6–5.0s; 3 dòng 5.426/5.519/5.513s lúc 23:47:15                 |
| GetMyWarehouseTasks               | 3.987–4.615s       | Nhiều cặp log, gồm 2 dòng 3.987s lúc 23:41:15                                                   |
| GetAssignableWarehouseStaff       | 3.374–4.819s       | 4.819s lúc 23:09:15; 4.627/4.701s lúc 23:47:40; receive/putaway có hai truy vấn quyền khác nhau |
| GetTransferPickSheet              | 3.144–4.010s       | 3.381s sau record pick; 4.010s sau dispatch                                                     |
| GetTransferPickAlternatives       | 2.347–2.487s       | Chọn vị trí lấy thay thế                                                                        |
| GetTransferPutAwayPlanSuggestions | 5.468–5.857s       | 23:48:31–23:49:41; log chưa phân biệt UseAi, không kết luận do AI                               |
| GetTransferReceiptSheet           | 2.112–2.204s       | Sau bắt đầu/ghi nhận nhận hàng; mẫu cuối 23:52:11                                               |
| GetTransferPutAwaySheet           | 3.207–3.395s       | 23:49:35 và sau cất 23:51:05                                                                    |

### Lệnh ghi và GET đi kèm

| Thao tác                 | Handler          | Mốc và tải lại quan sát được                                                                                                 |
| ------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| SaveTransferDraft        | 2.775s           | 23:04:56                                                                                                                     |
| SubmitTransfer           | 4.126s           | 23:05:01; GET chi tiết 3.529s lúc 23:05:08. Hai lệnh save/submit nối tiếp cộng khoảng 6.9s handler, không phải số đo browser |
| CreateTransferShipment   | 9.650s           | 23:10:07; GET staff 3.524s, transfer 4.926/4.826/4.815s và tasks khoảng 4s trong các giây tiếp theo                          |
| RecordTransferPick       | 3.796s           | 23:43:48; pick sheet 3.381s lúc 23:43:52                                                                                     |
| CompleteTransferPicking  | 3.441s           | 23:44:00; pick sheet 3.357s, transfer 4.794s                                                                                 |
| DispatchTransferShipment | 6.852s           | 23:47:09; pick sheet 4.010s; nhiều GET transfer 4.732–5.519s                                                                 |
| AssignWarehouseTask      | 3.592s và 3.600s | 23:47:58, 23:48:03; đây là hai lệnh giao việc, không mặc định coi là gửi trùng                                               |
| SetTransferPutAwayPlan   | 4.037s           | 23:48:51; pick sheet 3.217s, transfer 4.621/4.701s                                                                           |
| StartTransferReceiving   | 3.884s           | 23:49:04; receipt sheet 2.204s, transfer 4.603/4.678s                                                                        |
| SubmitTransferReceipt    | 4.580s           | 23:49:19; receipt sheet 2.118/2.132s, transfer 4.599s                                                                        |
| PutAwayTransferShipment  | 8.789s           | 23:51:01; 409 lúc 23:51:02; sheet 3.395s, transfer 4.616/4.713s                                                              |

Không cộng tất cả GET vào handler để suy ra thời gian người dùng chờ: một số có thể chạy song song hoặc từ tab/người dùng khác. Cần TraceId, request source và browser timing để kết luận.

### Phase cất hàng — mẫu 23:50:54–23:51:01

| Phase                   | Thời gian |
| ----------------------- | --------: |
| authorization-and-load  |    1789ms |
| validation-and-plan     |    1764ms |
| stock-ledger            |    1773ms |
| tasks-and-notifications |    1725ms |
| low-stock               |    1214ms |
| commit                  |     503ms |
| publish                 |       0ms |
| Tổng handler            |    8789ms |

Khoảng 7.76s nằm trước commit trong mẫu này. Đây là cơ sở ưu tiên tối ưu đọc/chuẩn bị/ledger/notification context; không chứng minh mỗi phase là một câu SQL, cũng không chứng minh DB lock hay mạng là nguyên nhân duy nhất.

Cảnh báo MARS/savepoint lúc 23:47:09 và 23:51:00 cần kiểm tra xử lý transaction khi SaveChanges thất bại. Timeout SQL 14.022s lúc 22:36:50 thuộc job email post-login, **không quy thành API điều chuyển**.

## 7. Nguyên nhân trong source và phương án tối ưu

### 7.1 Đo đủ trước khi thay đổi lớn

- Bổ sung vào logging hiện có: TraceId, method/route, query/command, status/success/failure, elapsed; không dump request body/token/email/nội dung nhạy cảm.
- Đo tổng HTTP riêng với handler và SQL: số round-trip, tổng SQL duration, số dòng/payload; reuse telemetry hiện có trước khi thêm interceptor/framework mới. Không bật sensitive-data logging.
- Các phase quan trọng cần correlation cùng request. Log rules/AI mode ở suggestions để biết chậm do đâu, không log prompt/dữ liệu kinh doanh.
- Trên FE xác định query key/observer/tab, invalidation source, realtime origin, explicit reload và thời điểm mutation kết thúc. Không ghi identifiers nhạy cảm vào telemetry chia sẻ.
- Đo warm/cold tách biệt, cùng build/dữ liệu/quyền/kho; tách ảnh hưởng Next dev/compile và thiếu RAM khỏi server/SQL latency.

### 7.2 GetTransfer và pick/receipt/putaway sheets

Nguồn BE: `Infrastructure/Persistence/Queries/WarehouseOperationsReader.cs`, `Application/Features/Transfer/TransferAggregate.cs`, các query handlers sheet.

- `GetTransferAsync` đã AsNoTracking nhưng đọc nhiều tập dữ liệu nối tiếp: items, plan, dữ liệu legacy/modern nhận-cất, reservations, vị trí, shipments, discrepancies, feedback.
- Pick sheet dùng aggregate tracked rồi đọc products/units/picks/exceptions/reservations/stocks/slots/racks/zones/lots. Đây là cơ hội giảm projection và số vòng đi DB, chưa phải lý do gộp thành một Include khổng lồ.
- Aggregate hiện tách 3 root queries để tránh tích Descartes nhiều collection; không đảo ngược tối ưu này một cách máy móc.
- Dùng read DTO/projection không tracking khi thực sự read-only; gom ID/lookup, bỏ query không cần khi tập ID rỗng, tái sử dụng dữ liệu đã nạp trong cùng request.
- Chỉ tách endpoint nhẹ cho màn staff khi số đo chứng minh full detail dư thừa; contract phải chứa đủ quyền/scope/version/status. Không bỏ full detail rồi vô tình mất kiểm tra canAct.
- Giữ masking thông tin kho xuất/kho nhập theo người xem và đường dẫn legacy. Không cache nguyên chứng từ mutable giữa người dùng.

### 7.3 Dropdown Người lấy hàng và giao việc

Nguồn BE: `AssignableStaffReader.cs`, `AssigneeLoadService.cs`, `Infrastructure/Authorization/PermissionService.cs`.

- Reader duyệt ứng viên và gọi effective permissions nối tiếp. PermissionService xác minh active user/role bằng DB **trước cache** để bảo vệ việc thu hồi quyền: vì vậy “đã có Redis” không có nghĩa không có query mỗi người.
- Workload reader đã batch theo tập staff IDs nhưng vẫn đọc nhiều loại công việc và dòng hàng nối tiếp. Không gọi nhầm đây là workload N+1 từng staff.
- Ưu tiên batch snapshot active users/roles/permissions và projection workload trong một request, giữ tenant ceiling, override deny/grant, role/user inactive và warehouse assignment. Cache request-scoped phải có key tenant/user/scope đúng; không dùng cache quyền lâu dài chưa có invalidation.
- FE `hooks/use-transfer-task-assignment.ts`: quyền nhận và cất là hai tập phải giao nhau. Không bỏ một truy vấn chỉ vì thấy hai request.
- Hook hiện fetch full transfer trước giao việc để lấy version rồi POST hai task nối tiếp; có xử lý partial result. Đo và cân nhắc read version nhỏ hơn trước khi tạo command gộp mới. Không song song hóa hai lệnh mù quáng hoặc báo cả hai thành công khi chỉ một task thành công.
- UI cần loading/empty/error riêng trong dropdown, không hiển thị “Giao việc sau” như thể danh sách đã tải xong khi vẫn loading. Có thể prefetch theo kho khi mở đúng ngữ cảnh và stale policy phù hợp, không tải tất cả nhân sự mọi kho.

### 7.4 GetMyWarehouseTasks

Nguồn BE: `Application/Features/Organization/GetMyWarehouseTasks/GetMyWarehouseTasksQueryHandler.cs`.

- Handler đọc nhiều miền task rồi gộp in-memory; warehouse scope và phân trang ở giai đoạn muộn.
- Đẩy filter tenant/kho/assignee/type/status phù hợp xuống SQL, chỉ project dữ liệu cần thiết; tránh tải lịch sử vô hạn để phục vụ một trang nhỏ.
- Giữ tổng số, sort ổn định, mọi loại task, lịch sử, exportAll và giới hạn export. Không thay bằng UNION/framework mới nếu projection/filter nhỏ đã đáp ứng.

### 7.5 Command ghi: giảm đọc lặp trước commit

Nguồn BE: dispatch/putaway handlers, `TransferReceiptWorkflow`, `StockLedgerService`, `TransferNotificationText`, `NotificationRecipientResolver`, `LowStockAlertEvaluator`.

- Dispatch có đọc inventory trong vòng lặp detail; putaway gọi ledger theo entry. Đo SQL thực tế rồi batch các entity/lookup cần thiết, vẫn track đúng record và giữ cạnh tranh tồn kho.
- Workflow có nhiều điểm kiểm tra permission/actor/task; tái sử dụng validated snapshot trong cùng request nếu tương đương, không xóa bước bảo vệ.
- Notification context đọc warehouses, recipients/roles, assignments và đôi khi requester. Recipient resolver đã batch permission bằng SQL; tái dùng context đã có, không thay nó bằng quyền dựa tên role hoặc thêm vòng lặp resolve quyền từng người.
- LowStockAlertEvaluator đã batch policies nhưng bên trong mỗi scope vẫn đọc product, warehouse active, pending-aware availability và active alert. Ưu tiên batch metadata/alerts và availability nếu interface hiện có cho phép; phải giữ thay đổi chưa SaveChanges trong phép tính pending-aware.
- Giữ một lần commit nghiệp vụ, notification persisted/audit cùng transaction theo thiết kế hiện tại. Publish trong mẫu cất là 0ms: chưa có bằng chứng để ưu tiên thay SignalR/outbox/queue.
- Không dùng `Task.WhenAll` với cùng DbContext: EF Core không hỗ trợ nhiều operation song song trên cùng context. Thay bằng giảm round-trip/projection/batch. [Tài liệu EF async](https://learn.microsoft.com/en-us/ef/core/miscellaneous/async).
- Chỉ đề xuất index khi có truy vấn/plan chứng minh; index mới là thay schema cần SQL review và xin phép migration riêng. [Hướng dẫn truy vấn hiệu quả](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying).

### 7.6 FE: một nơi sở hữu refresh sau write

Nguồn FE: `use-transfers.ts`, `use-transfer-realtime.ts`, hooks pick/receipt/putaway/assignment, các trang thao tác.

- `invalidateTransferQueries` còn invalidate rộng transfers/inventory/tasks với refetch active; một số mutation đã dùng refetchType none và explicit reload. Rà theo từng mutation, không thay toàn cục rồi để màn khác stale.
- Chọn một nơi sở hữu mandatory refresh của thao tác hiện tại. Query khác cần stale đánh dấu đúng phạm vi; chỉ refetch ngay nếu màn đang thực sự phụ thuộc dữ liệu đó.
- Realtime đã có originClientId theo tab và bỏ auto-refetch chính origin. Giữ update từ tab/người dùng khác và reconnect; không thêm cửa sổ “bỏ hết event 5 giây”.
- QueryClient toàn cục đã staleTime 5 phút, refetchOnWindowFocus false, retry query 1/mutation 0. Không đổ lỗi window focus mặc định hoặc tăng staleTime để che GET thừa.
- Giữ dữ liệu cũ khi refetch, loading cục bộ đúng component, khóa xác nhận chống double submit; không đợi toàn bộ dashboard/inventory/tasks xong mới kết thúc trạng thái pending của một thao tác nếu không cần an toàn nghiệp vụ.

## 8. FLOW-01 — 409 sau cất hàng

Log: command cất thành công 23:51:01; ngay 23:51:02 báo “Phiếu điều chuyển không còn ở trạng thái đang thực hiện.”

**Chưa xác định request nào** vì thiếu route/TraceId. Không kết luận mất dữ liệu, double-submit hoặc mutation thất bại từ thông báo này.

Giả thuyết cần xác minh:

- `GetTransferPutAwayPlanSuggestionsQueryHandler` gọi EnsureOpen; request rules/suggestions được kích hoạt trên snapshot cũ khi phiếu vừa Completed có thể bị 409.
- Rules query trên FE tự enabled theo phiên bản và trạng thái; AI query đang enabled false/manual, không tự chạy AI.
- `TransferPutAwayPage.tsx` busy dùng mutation pending/editor/reloading, trong khi hook form còn `reloadRequired` sau ghi. Cần đối chiếu khoảng giữa mutation kết thúc và tải snapshot mới, cả tab khác đang mở.
- GET pick sheet không gọi EnsureOpen theo đường đọc đã khảo sát; không quy lỗi này cho pick sheet chỉ vì nó được gọi sau write.

Hướng sửa sau khi có trace:

1. Giữ khóa/gate cho dependent suggestions qua toàn bộ write → đồng bộ snapshot mới; dùng reloadRequired/terminal status đúng chỗ, không chỉ isPending.
2. Hủy/không áp dụng response query phiên bản cũ bằng AbortSignal/query key hiện có; không giả định hủy GET đồng nghĩa hủy transaction ghi.
3. Khi Completed, cho xem read-only và dừng gợi ý/kế hoạch không còn hợp lệ; không tắt khả năng xem lịch sử.
4. Phân biệt write thành công nhưng reload phụ lỗi với write chưa rõ kết quả. Không hiển thị “cất thất bại” và mời gửi lệnh mới sau commit thành công.
5. Giữ 409 thật cho stale version/đổi kho/quyền/tồn; không catch rồi trả 200 hoặc bỏ mọi toast 409.

Test bắt buộc: API write thành công, GET cũ trả chậm, completed giữa lúc suggestions đang chạy, hai tab, partial putaway còn việc, retry cùng CommandId, refresh lỗi sau commit, timeout chưa rõ kết quả.

## 9. OPS-01 — MARS/savepoint

Warning chỉ ra savepoint bị tắt khi SQL Server MARS bật. Nếu SaveChanges lỗi, phải audit đường rollback/dispose transaction và retry trước khi tiếp tục dùng context.

Không tắt MARS hàng loạt hoặc đổi transaction policy chỉ để mất warning. Trước tiên xem có reader đang mở, transaction owner và concurrency retry hiện có; thêm isolated test khi phù hợp. Không thử gây lỗi/rollback trên DB deploy. [EF Core transactions và MARS](https://learn.microsoft.com/en-us/ef/core/saving/transactions).

## 10. Thứ tự triển khai và nghiệm thu

### Giai đoạn A — chốt hiện trạng và đo

- [ ] Đọc rules/docs, kiểm tra branch/dirty diff và impact; bảo toàn sửa mobile/camera hiện có.
- [ ] Xác minh logging source và build đang chạy; thêm correlation tối thiểu cho failure + success và SQL/phase timing.
- [ ] Xác định request 409, các GET cùng observer/tab và baseline cùng môi trường.

### Giai đoạn B — sửa hiển thị ít rủi ro

- [ ] Toaster responsive dùng chung; kiểm tra toàn web.
- [ ] Đã lấy lũy kế ròng; đồng nhất goods/shipments/desktop/mobile, không đổi field BE.
- [ ] Gate reload/suggestions sau write và terminal state nếu trace xác nhận; giữ unknown-result/idempotency.

### Giai đoạn C — tối ưu có đo

- [ ] Thu hẹp invalidation và refresh ownership từng mutation, giữ foreign realtime/reconnect.
- [ ] Staff permissions/workload và các GET detail/sheet: giảm round-trip/overfetch theo kết quả đo.
- [ ] Command: batch stock/context/low-stock metadata phù hợp, giữ transaction và pending-aware semantics.
- [ ] Tasks: filter/projection trước materialization, giữ pagination/totals/export.
- [ ] Audit MARS failure handling; không thay cấu hình nếu chưa có căn cứ.

### Kiểm thử và tiêu chí kết thúc

- FE: targeted tests goods rows/table, shipment/pick desktop/mobile, global toaster, query invalidation/realtime, assignment partial success, receipt/putaway stale/retry; ESLint + tsc + production build theo scripts repo.
- BE: build + transfer workflow/permissions/acceptance/pick/dispatch/receipt/putaway/idempotency/concurrency tests hiện có; thêm test vào harness sẵn có. Không chạy SQL fixture nếu chưa chứng minh effective target an toàn; báo SKIP thật.
- Roles: Tenant Owner, Manager kho xuất, Manager kho nhập, Staff được giao, người khác kho/tenant, bị thu hồi quyền, task reassigned trong lúc đang mở. Tối ưu không thay ai được thấy/làm gì.
- Mobile: vừa camera QR/barcode vừa nhập mã; không che CTA, không auto mở camera; camera cleanup/unmount, một camera active, đổi dòng, quét sai, keyboard/scroll. Giữ bản sửa camera trước đó, không viết lại luồng.
- Benchmark read-only có kiểm soát: cùng build/user/scope/data, tách cold/warm; 5–10 mẫu báo median/max, chỉ báo P95 khi đủ mẫu. Lệnh ghi chỉ đo qua thao tác app được phép hoặc fixture cô lập đã xác minh, không spam POST để benchmark DB deploy.
- Ghi trước/sau: handler/HTTP/browser riêng, số SQL/round-trip, số GET theo tab, payload, trạng thái nghiệp vụ cuối. Không bỏ kiểm tra để đạt con số.
- Mục tiêu ban đầu: giảm median nhóm chậm ít nhất khoảng 30% khi giữ điều kiện tương đương; điều chỉnh mục tiêu sau baseline có correlation. Không hứa <500ms với DB remote khi chưa đo.
- Không còn GET refresh trùng vô ích trong cùng observer/intent; không còn 409 phụ ngoài dự kiến sau commit. Update hợp lệ từ tab khác vẫn tới, lỗi thật vẫn được báo.
- Trước commit nếu người dùng yêu cầu: GitNexus detect_changes, review scope/test results, cập nhật AI_REVIEW theo workflow; không tự gọi self-review là independent review.

## 11. Kết quả của lượt lập tài liệu

- [x] Xác nhận nguyên nhân toast và ý nghĩa picked/unbatched qua source.
- [x] Gom số đo API/phase và tách kết luận khỏi giả thuyết.
- [x] Lập phương án từng giai đoạn và ràng buộc an toàn.
- [ ] Chưa sửa chức năng trong tài liệu; chưa chạy benchmark mới; chưa xác nhận sửa trên điện thoại thật.

Ponytail định hướng dùng wrapper/hook/projection và cơ chế telemetry sẵn có, không thêm thư viện, queue hoặc architecture mới khi chưa có bằng chứng cần thiết. Hướng dẫn React định hướng giữ đúng ranh giới client/server, query ownership và render cục bộ. Các giới hạn an toàn/correctness có ưu tiên cao hơn tốc độ.

## 12. Triển khai đợt đầu — 21/10/2026

### Đã sửa

- Toaster chung: mobile dưới 768px chuyển top-center, có safe-area và khoảng trống dưới header; desktop giữ vị trí cũ. Offset áp dụng cả vùng 601–767px vì breakpoint native của Sonner hẹp hơn breakpoint workspace. Không đổi RootLayout sang client hoặc tạo Toaster thứ hai.
- Goods rows hiển thị picked + dispatched; giữ nguyên số thô BE và unbatched. Desktop bảng lấy hàng đồng nhất với card mobile; tooltip không còn mô tả nhầm là phần chưa xuất.
- Rules/suggestions dừng khi cần tải snapshot mới, unknown result hoặc trạng thái terminal. Vẫn cho phép trạng thái mở `AwaitingResolution`, không chỉ `InProgress`.
- Trước lưu kế hoạch/cất hàng, hủy query gợi ý rules/AI đang chạy; AI query dùng AbortSignal. Có test xác nhận cancellation xảy ra trước write. Không hủy/retry lệnh ghi khi hủy query đọc.
- Tạo đợt, hoàn tất lấy, xuất và giao việc chỉ refetch phiếu/list đang xem và pick sheet khi bước hoàn tất cần nó; lookup phụ/inventory/tasks được đánh dấu stale, không tự refetch cả cây. Luồng foreign-origin realtime/reconnect không bị thay đổi.
- Dropdown Người lấy hàng có nội dung loading/error riêng thay vì trông như đã tải xong và chọn “Giao việc sau”.

### Tối ưu BE đã thực hiện

- Staff lookup dùng `GetPermissionsForUsersAsync`: active users/roles được đọc theo nhóm, role grants và personal overrides theo nhóm, vẫn áp dụng tenant ceiling và policy eligibility. Không dùng cache quyền lâu dài cho batch. Các lệnh ghi vẫn kiểm tra lại bằng đường quyền đơn lẻ. Test đối chiếu batch/single, override deny/grant, inactive, foreign tenant và ngoài ceiling.
- Chi tiết phiếu tái sử dụng aggregate receipt cho good/physical legacy; discrepancy project thông tin hàng trực tiếp, bỏ lookup SKU riêng; bỏ query authors khi không có feedback.
- Shipment read gộp task + assignee name và dùng chung receipt aggregate cho physical/good, giữ version/priority/due và đường legacy/modern.
- Dispatch nạp một batch inventory tracked thay vì query từng pick detail. Giữ Consume/ledger, concurrency và một commit nghiệp vụ.
- Low-stock nạp products/active warehouses một lần cho các policy scopes. Pending-aware availability, active alert, audit và staging vẫn giữ nguyên. Test chứng minh metadata reads không tăng theo số scope và kho inactive không bị đánh giá.
- Tasks đẩy warehouse scope/warehouse filter/assigned-to xuống các root queries, bỏ child queries với IDs rỗng và trả sớm khi không có việc/quyền kho. Chưa thay toàn bộ pagination liên miền sang SQL.
- PerformancePipeline log failure và slow success với TraceId, failure chỉ ghi tên loại lỗi, không ghi payload/message nhạy cảm. HTTP logging dùng route template + status + elapsed + TraceId; middleware nằm ngoài exception handler để log status cuối sau xử lý exception.
- Audit MARS: UnitOfWork dispose capacity-owned transaction khi SaveChanges lỗi; các explicit transaction có owner rollback. Không đổi MARS, không gây lỗi transaction trên DB deploy, chưa kiểm chứng race SQL Server thật.

### Đo trước/sau chỉ đọc trên SQL Server

Probe nằm ngoài repo tại workspace `outputs/transfer-feedback-read-probe-20261021/`. Đọc đúng connection key đã xác minh; in effective SQL Server/server/database đã redacted; interceptor chặn non-SELECT, scalar và SaveChanges. Không start application host/job, migration/seed hay gọi endpoint ghi.

Baseline lấy từ assemblies đã build ngày 20/10 trong `outputs/transfer-acceptance-review-build-20261020`; bản sau từ source đợt sửa này. Cùng reader `GetTransferAsync`, cùng phiếu đã có, cùng scope người tạo; mỗi bản 1 warmup và 5 mẫu warm. Đây là phép đo **reader DB**, không gồm HTTP authentication, middleware hoặc browser render.

|                   |                     Baseline |                   Sau tối ưu |
| ----------------- | ---------------------------: | ---------------------------: |
| Số SELECT mỗi mẫu |                           20 |                           15 |
| Warm samples (ms) | 4106, 4100, 4086, 4101, 4090 | 3110, 3099, 3084, 3081, 3100 |
| Median warm       |                       4100ms |                       3099ms |
| Warmup riêng      |                       4802ms |                       3452ms |

Giảm 5 SELECT (25%), median reader giảm khoảng 24.4%. Số items/shipments/discrepancies và tổng dispatched trong mẫu đối chiếu không đổi. Đây là mẫu nhỏ, chạy tuần tự trên DB remote, không phải P95, không chứng minh mọi trường DTO đều bằng nhau hoặc mọi API nhanh hơn 24%. Mục tiêu 30% ban đầu chưa đạt ở reader này.

### Kiểm tra và giới hạn

- FE: nhóm transfer + warehouse-task + platform-services + Toaster: **87 file / 530 test passed** ở lượt rộng; sau đó bổ sung regression AwaitingResolution và desktop pick progress, chạy focused lại (ghi kết quả cuối trong AI_REVIEW).
- BE targeted: **364 passed, 4 SQL Server race skipped**. Build API và tests thành công với `-p:EnableDefaultContentItems=false` để tránh artifact `API/tmp` cũ bị Web SDK gom vào Content.
- BE toàn bộ: **1919 passed, 2 failed, 5 skipped**. Hai lỗi được tái hiện nguyên trạng trên assemblies test ngày 20/10, không phải hồi quy của đợt sửa này:
  - `WarehouseOperationsWorkflowTests.RecordStockPicking_SupportsOneStockIssueItemPickedFromMultipleSlotsAndValidLots`: fixture vị trí không đáp ứng guard active.
  - `CycleCountAdjustmentWorkflowTests.Submit_RejectsCycleCountWithUncountedItems`: NullReference do mock dữ liệu chưa đủ ở handler hiện tại.
- FE production build đã pass 73 static pages; TypeScript dùng production config. `tsc` mặc định vướng các fixture QA cũ ở `tmp/excel-export-qa`/`tmp/opening-stock-ui`; không sửa lan các fixture đó.
- Probe restore báo advisory transitive `System.Security.Cryptography.Pkcs 10.0.0`; không thêm/nâng package production trong đợt này. Theo dõi riêng thay vì trộn dependency upgrade vào tối ưu điều chuyển.
- Không commit/push, không restart local, không QA ghi DB deploy. Browser/camera thật chưa kiểm chứng.

### Còn lại — không đánh dấu hoàn tất toàn bộ kế hoạch

1. Test lại API ghi qua luồng app được phép để lấy HTTP/handler/phase mới và xác minh 409 đã hết trong tình huống thực tế; historical 409 chưa xác định được route vì log cũ thiếu correlation.
2. Đo staff/workload và task APIs dưới scope/dữ liệu thật. Batch quyền đã có, nhưng workload reader và pagination liên miền vẫn còn cơ hội tối ưu.
3. Pick/receipt/putaway sheet và rules suggestions chưa được viết lại thành read model nhỏ; ledger và pending-aware availability vẫn giữ phần đọc theo entry/scope. Chỉ tối ưu tiếp theo trace/SQL count, không bỏ guard để đạt con số.
4. Production SQL timing/count theo từng HTTP request chưa được thêm thành interceptor dùng chung; hiện có HTTP/handler correlation và probe SELECT-only. Không coi logging mới là full tracing mọi câu SQL.
5. QA giao diện/keyboard/camera trên điện thoại thật và viewport 320–767px; DOM tests không thay thế kiểm tra pixel/hardware.

## 13. Tối ưu tiếp sau review — 21/10/2026

Đã xử lý PERF-01–04 theo hướng thay đổi nhỏ, giữ nguyên các chốt quyền, phiên bản, kết quả chưa rõ và nghiệp vụ tồn kho:

- Giao việc: thêm bản đọc gọn theo phiếu/đợt/kho quản lý cho bước kiểm tra trước khi ghi, thay một lần GET toàn bộ phiếu. Vẫn đọc chi tiết mới sau khi ghi và khi đối chiếu kết quả chưa rõ. BE cần triển khai trước FE do có endpoint đọc mới; không cần migration cho endpoint này.
- Dropdown nhân viên: tính tải bằng settings + 4 projection chỉ lấy trường cần dùng. Không cache quyền, không chạy nhiều lệnh cùng DbContext; giữ công thức xếp hạng và số việc hiện có.
- Công việc kho: lọc loại việc ngay ở truy vấn gốc, bỏ các nhánh/dòng phụ không dùng, tính lookup nhận hàng một lần. Giữ nguyên phân trang/tổng/thống kê sau khi sắp xếp chung; full SQL paging liên nhóm chưa triển khai.
- Phiếu lấy hàng: không nạp aggregate có tracking của toàn phiếu; gộp các tham chiếu metadata, vẫn tính phần đã lấy ở các đợt khác để không gợi ý vượt giữ chỗ. Test xác nhận tám lượt repository và không có thực thể bị tracking.

### Kết quả đo chỉ đọc

So sánh assemblies đóng băng ngày20/10 với bản mới, cùng một phiếu/đợt và nhóm ứng viên hiện có (1 người), mỗi bản 1 warmup + 5 mẫu warm. Provider/server/database được in và kiểm tra: SqlServer / db71143.public.databaseasp.net / db71143. Bộ chặn từ chối lệnh không phải SELECT và mọi SaveChanges; không mở host/background job, migration/seed hoặc gọi API ghi.

| Đường đọc                         | SELECT trước → sau | Trung vị trước → sau |
| --------------------------------- | ------------------ | -------------------- |
| Phiếu lấy hàng                    | 14 → 8             | 2885 → 1715 ms       |
| Tính tải nhân viên                | 8 → 5              | 1657 → 1067 ms       |
| Công việc lọc TransferPick        | 17 → 9             | 3515 → 1926 ms       |
| Bản đọc gọn trước giao việc (mới) | 1                  | 214 ms               |

Hash toàn bộ DTO tuần tự hóa khớp giữa hai bản cho ba phép so sánh trên bộ dữ liệu này. Đây là thời gian handler đọc trực tiếp, **không phải** tổng HTTP/xác thực/trình duyệt hay tốc độ các lệnh POST/PUT. Nguồn phép đo ở `../outputs/transfer-ops-read-probe-20261021` trong workspace.

### An toàn schema và kiểm thử

- Bản thử eager include đầu tiên lộ việc DB deploy chưa có cột SnapshotCapturedAt/SnapshotMovementCount thuộc migration đang chờ AddCycleCountExecutionSnapshots. Không chạy migration/repair. Đã thay bằng projection đúng trường tính tải và đo thành công lại trên cùng DB. Không suy ra mọi luồng kiểm kê khác đã tương thích schema.
- FE: 78 files / 503 tests, lint phạm vi sửa, TypeScript production và build production 73 trang đạt.
- BE: nhóm liên quan 379 đạt / 4 race SQL Server bỏ qua. Toàn bộ 1931 đạt / 2 lỗi fixture cũ đã tái hiện trên baseline / 5 bỏ qua; không tuyên bố toàn bộ suite xanh.
- Chưa kiểm thử trình duyệt/thiết bị hoặc thời gian lệnh ghi thật. Chưa commit/push, không restart local, không migration/seed hay QA ghi DB deploy. Cảnh báo Pkcs kế thừa ở probe và xUnit2000 SupplierReturn không nằm trong bản tối ưu này.
