# Kế hoạch: ngày điều chuyển, ngày hàng về, cảnh báo tải kho nhập, chú thích FEFO, bấm dòng kho

Ngày lập: 2026-10-13. Nhánh làm việc: BE `feat/huytv`, FE `screen/huytv`. Chỉ commit, **không push, không tạo PR** khi chưa được yêu cầu.

## 0. Đọc trước khi code (bắt buộc)

- Hai repo: `AGENTS.md`, `.rules` (FE), `docs/CODING_GUIDELINES.md`, `docs/DESIGN_SYSTEM.md`, `docs/LIST_TABLE_DESIGN_GUIDELINES.md`.
- BE `AGENTS.md`: **không phân quyền theo tên vai trò**, kiểm theo quyền thực tế và phạm vi kho.
- Gốc `AGENTS.md`: **không xóa/reset `db71143`; không tự áp migration lên `db71143`**. Migration mới chỉ tạo và commit, báo tên migration cho người dùng và chờ phép.
- Trước khi sửa một symbol: `gitnexus impact <symbol> -r "<repo>"` (cục bộ, không commit `.gitnexus`). Báo kết quả nếu HIGH/CRITICAL.
- Làm tối giản (Ponytail): thay đổi nhỏ nhất đủ yêu cầu, tái dùng thành phần có sẵn.
- Không thêm quyền mới.

## 1. Quyết định đã chốt

| Chủ đề                   | Quyết định                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên ngày xuất            | "Ngày dự kiến điều chuyển" (cột mới `StockTransfers.PlannedTransferDate`, không bắt buộc)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Tên ngày tới             | "Ngày hàng dự kiến về kho nhập": **đổi nhãn của `RequiredBy`** (hiện "Hạn cần hàng"), không thêm cột                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Độ chính xác             | Có giờ, định dạng `dd/MM/yyyy HH:mm` (không giây). FE hiện gửi `RequiredBy` là **cuối ngày** (`23:59:59.999+07:00`, qua `toOperationalDateTimeEnd`). Giá trị cuối ngày giờ Việt Nam được hiểu là "chưa đặt giờ" và chỉ hiện ngày; `00:00` do người dùng chọn thật vẫn hiện giờ. Picker: chọn ngày mà không chọn giờ thì gửi cuối ngày. Mở form rồi lưu mà không sửa ngày thì gửi lại đúng chuỗi thời gian cũ (không làm tròn, không đổi múi giờ)                                                                                                                                                                                                                |
| Quy tắc                  | Cả hai ngày không bắt buộc. Ngày điều chuyển không ở quá khứ (đệm 5 phút). Ngày hàng về không trước ngày điều chuyển. Kiểm tra trên **giá trị hiệu lực sau cập nhật** (kể cả khi chỉ sửa một ngày, lấy ngày kia từ dữ liệu đã lưu). Kiểm tra ở **ba nơi**: Save, Update và **Submit** (xem mục 2), cùng một hàm kiểm tra                                                                                                                                                                                                                                                                                                                                        |
| So sánh khi chưa đặt giờ | "Chưa đặt giờ" = giá trị cuối ngày giờ Việt Nam. Nếu **một trong hai** ngày chưa đặt giờ thì so theo **ngày lịch Việt Nam**; chỉ so thời điểm khi **cả hai** đã đặt giờ. Áp cho cả kiểm tra "không ở quá khứ" (ngày hôm nay chưa đặt giờ không bị coi là quá khứ) và "hàng về không trước ngày điều chuyển". Ví dụ: điều chuyển 15/10 không chọn giờ (cuối ngày), hàng về 15/10 10:00 là hợp lệ. Hàm so sánh đặt ở một nơi dùng chung cho Save, Update, Submit; FE dùng cùng quy tắc trong schema. Test: chưa-giờ vs có-giờ cùng ngày (hợp lệ), khác ngày (đúng thứ tự thì hợp lệ, sai thì từ chối), cả hai có giờ (so thời điểm), hôm nay chưa đặt giờ khi gửi |
| Hạn các việc đã tạo      | Ngày trên phiếu chỉ là **hạn mặc định cho việc tạo sau**. Không đồng bộ hay ghi đè việc đang mở (quản lý có thể đã chỉnh hạn riêng). Trang chi tiết có thể nhắc ngắn khi ngày phiếu khác hạn của việc                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| FEFO                     | Bỏ chữ FEFO khỏi placeholder; thêm biểu tượng (i) mở popover giải thích                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Cảnh báo tải kho nhập    | Đếm theo ngày (giờ Việt Nam). Ngưỡng 2, là hằng số. Không chặn gửi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Danh sách kho            | Bấm cả dòng để vào chi tiết, bỏ nút chi tiết                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## 2. Phát hiện cần xử lý (quan trọng)

`transfer.RequiredBy` đang được dùng làm **hạn (due) của cả ba việc**: lấy hàng (`CreateTransferShipmentCommandHandler.cs:67`), nhận (`DispatchTransferShipmentCommandHandler.cs:89`), cất (`DispatchTransferShipmentCommandHandler.cs:95`, `StartTransferReceivingCommandHandler.cs:34`).

Khi `RequiredBy` đổi nghĩa thành "ngày hàng về kho nhập" thì việc **lấy hàng ở kho xuất** không nên lấy hạn này nữa mà lấy `PlannedTransferDate`:

- Việc lấy hàng (kho xuất): hạn = `PlannedTransferDate`, nếu null thì dùng `RequiredBy` như cũ (giữ tương thích).
- Việc nhận và cất (kho nhập): hạn = `RequiredBy` như hiện tại.

Phải có test cho cả hai trường hợp (có và không có `PlannedTransferDate`).

**Xóa ngày (đã chốt, không để quyết trong PR; chỉ áp cho Update).** SaveDraft lưu toàn bộ form nên `null` là xóa; Submit không nhận ngày (xem bước D.3). `UpdateTransferCommandHandler.cs:78` chỉ ghi khi `RequiredBy.HasValue` nên hiện không xóa được. Quy tắc cho Update, áp cho cả `RequiredBy` và `PlannedTransferDate`:

- Giá trị `null`: giữ nguyên.
- Cờ `ClearRequiredBy` / `ClearPlannedTransferDate` bật: xóa (giống `ClearDueAt` của giao việc).
- Vừa gửi giá trị vừa bật cờ xóa cùng một ngày: trả 400.
- Sau đó kiểm thứ tự hai ngày trên giá trị hiệu lực.

**Kiểm tra ngày lúc gửi nháp.** Phiếu thực tế được gửi qua `SubmitTransferCommandHandler`, hiện không kiểm ngày nào. Một nháp lưu hôm nay và gửi ngày mai có thể mang ngày đã quá hạn. Phải kiểm lại cả hai ngày lúc Submit (ngày quá khứ bị từ chối, thông báo yêu cầu cập nhật ngày). Khi sửa phiếu đang chạy (Update), **chỉ kiểm khi giá trị ngày thật sự đổi**; ngày cũ không đổi không bị chặn. Thêm test: nháp để qua ngày rồi gửi; sửa phiếu đang chạy có ngày đã qua nhưng không đổi ngày.

## 3. Thứ tự làm (mỗi bước một commit, chạy test trước khi sang bước sau)

### Bước A: Chú thích FEFO (FE, nhỏ)

File: `src/features/transfer/components/TransferFormPage/TransferSourceSlotField.tsx`, `TransferForm.tsx`.

1. Placeholder dòng 68: khi đã chọn sản phẩm là "Hệ thống tự phân bổ"; chưa chọn sản phẩm giữ "Chọn sản phẩm trước".
2. Thêm biểu tượng (i) cạnh nhãn cột "Vị trí đi (không bắt buộc)" mở `Popover` (shadcn). Nội dung:
   - FEFO: lô hết hạn trước thì lấy trước; sản phẩm không có hạn dùng thì lấy theo lô nhập trước (FIFO).
   - Không chọn vị trí đi: hệ thống tự phân bổ như trên khi gửi yêu cầu.
   - Chọn một vị trí: lấy ở vị trí đó trước, phần thiếu mới phân bổ theo FEFO/FIFO.
   - Người ở kho xuất có thể điều chỉnh sau ở trang chi tiết.
3. Gộp hai chỗ nhắc FEFO còn lại ở form (`TransferForm.tsx:140` và mô tả hộp sơ đồ `TransferSourceSlotField.tsx:108`) vào popover; chỉ còn một nơi giải thích.
4. Không đổi chữ FEFO ở màn lấy hàng và "Điều chỉnh phân bổ".
5. Phải dùng được bằng bàn phím và trên mobile (không dựa vào hover). Có `aria-label`.
6. Test: popover mở/đóng, placeholder đổi theo sản phẩm.

### Bước B: Bấm dòng danh sách kho (FE, nhỏ)

File: `src/features/warehouse/components/WarehousePage/WarehouseList.tsx` (+ `WarehouseList.test.tsx`).

1. Bỏ cột thao tác (nút `ArrowUpRight`) và nút "Xem chi tiết" ở bản mobile.
2. Cả dòng bấm được đi tới `APP_ROUTES.warehouseDetail(id)`. Giữ `Link` ở tên kho để mở bằng Enter/chuột giữa; không chỉ dựa vào `onClick`. Kiểm tra repo đã có mẫu bảng "bấm dòng" chưa và dùng lại nếu có.
3. Dòng có `cursor-pointer` và trạng thái hover/focus theo `DESIGN_SYSTEM.md`. Vùng bấm tối thiểu 44px ở mobile.
4. Dùng thống nhất một hằng route (hiện trộn `warehouseDetail(id)` và `${warehouses}/${id}`).
5. Cập nhật test; kiểm tra các màn khác dùng `OperationalListPanel` theo `LIST_TABLE_DESIGN_GUIDELINES.md`.

### Bước C: Component ngày giờ dùng chung (FE)

1. Chuyển `DatePickerField` (`src/features/inbound-request/components/InboundRequestFormPage/DatePickerField.tsx`) sang `src/components/` hoặc `src/components/shared/` (xem cấu trúc hiện có), và thêm thuộc tính `withTime`.
2. **Không sửa file shadcn trong `src/components/ui`** (`calendar.tsx`, `popover.tsx`). Chỉ ghép thêm `Input`/`NativeSelect` cho hàng "Thời gian" (giờ và phút, `HH:mm`).
3. `withTime` tắt: giữ nguyên hành vi hiện tại (form nhập kho không đổi). `withTime` bật: ô bấm hiện `dd/MM/yyyy HH:mm`, popover có lịch và hàng "Thời gian" như mẫu đã thống nhất, có "Hôm nay" và "Xóa" khi không bắt buộc.
4. Giữ nguyên giao diện nhãn, dấu `*`, lỗi, `aria-*`. Chuỗi giá trị trao đổi khớp với schema form; chuyển ISO khi gửi API.
5. Cập nhật import ở nơi đang dùng (`InboundRequestForm.tsx` và test). Không chuyển các form khác sang component này trong đợt này.
6. Test: chọn ngày, chọn giờ, vô hiệu ngày quá khứ, xóa, bàn phím, `withTime` tắt giống cũ.

### Bước D: Hai ngày ở yêu cầu điều chuyển (BE + FE)

**BE** (impact trước: `StockTransfer`, `SaveTransferDraftCommand`, `UpdateTransferCommand`, `StockTransferResponse`, `WarehouseOperationsReader.GetTransferAsync`):

1. `Domain/Entities/Inventory/StockTransfer.cs`: thêm `DateTimeOffset? PlannedTransferDate` (và sửa chú thích `RequiredBy` thành ngày hàng dự kiến về kho nhập).
2. Cấu hình EF + **1 migration** (tên gợi ý `AddTransferPlannedTransferDate`). Chỉ tạo và commit, **không áp lên `db71143`**, báo tên cho người dùng. Kiểm model drift trước khi commit.
3. Hợp đồng ba luồng (khác nhau, không áp chung):
   - **SaveTransferDraft:** lưu toàn bộ form, thêm `PlannedTransferDate` vào command. `null` là xóa ngày (đúng như `RequiredBy` hiện tại: `draft.RequiredBy = command.RequiredBy`). Không cần cờ `Clear…`.
   - **UpdateTransfer:** thêm `PlannedTransferDate` và các cờ `ClearRequiredBy`, `ClearPlannedTransferDate`. `null` giữ nguyên, cờ xóa thì xóa, vừa đặt vừa xóa cùng một ngày trả 400. Chỉ kiểm tra ngày khi giá trị thật sự đổi.
   - **SubmitTransfer:** **không đổi command** (`SubmitTransferCommand(TransferId, ExpectedVersion)` giữ nguyên). Handler chỉ đọc hai ngày đã lưu trên phiếu để kiểm tra, không nhận và không ghi ngày từ payload. Kiểm lại cả hai ngày như quy tắc bên dưới.

   Quy tắc kiểm tra dùng chung (một hàm duy nhất, cả ba luồng gọi): ngày điều chuyển không ở quá khứ (đệm 5 phút); ngày hàng về không trước ngày điều chuyển; tính trên giá trị hiệu lực sau cập nhật. Cách so sánh xem mục 1 (hàng "So sánh khi chưa đặt giờ"). Khóa sửa theo trạng thái như `RequiredBy` hiện tại.

4. Thêm `PlannedTransferDate` vào `StockTransferResponse` và các chỗ đọc (`WarehouseOperationsReader`), danh sách và chi tiết.
5. Việc lấy hàng dùng `PlannedTransferDate ?? RequiredBy` làm hạn (mục 2). Việc nhận/cất giữ `RequiredBy`.
6. Test BE (`Application.Tests/Features/Transfer/*`): lưu/đọc hai ngày; từ chối ngày sai thứ tự (cả khi chỉ sửa một ngày); hạn việc lấy hàng theo hai trường hợp; xóa ngày và 400 khi vừa đặt vừa xóa; nháp để qua ngày rồi gửi bị từ chối; sửa phiếu đang chạy giữ ngày cũ đã qua thì không bị chặn; đổi ngày phiếu không ghi đè hạn của việc đã tạo; phiếu cũ không có `PlannedTransferDate` vẫn chạy như trước.

**FE** (impact trước: `TransferRequestFormValues`, `transferToFormValues`, `toSaveDraftRequest`, `toUpdateTransferRequest`):

1. `TransferGeneralSection.tsx`: hai ô dùng component ở bước C với `withTime`: "Ngày dự kiến điều chuyển" và "Ngày hàng dự kiến về kho nhập" (thay ô "Hạn cần hàng" hiện tại dòng 141-145).
2. `types/transfer.types.ts`, `schemas/transfer-request.schema.ts`, `utils/transfer-form.ts`: thêm trường; quy tắc kiểm tra như BE.
3. Hiển thị: `TransferOverview.tsx:37` (đổi nhãn "Hạn cần hàng" thành nhãn mới và thêm ngày điều chuyển), `TransferDesktopTable.tsx:68` (cột ngày). Giá trị cuối ngày giờ Việt Nam chỉ hiện ngày; giờ khác hiện đủ giờ. Thêm test cho dữ liệu cũ `23:59:59.999+07:00` và cho `00:00` chọn thật.
4. Cập nhật `transfer-test-fixtures.ts` và test form.

### Bước E: Cảnh báo tải kho nhập (BE + FE, phụ thuộc bước D)

**BE** (query mới, không migration):

1. `GET /api/transfers/destination-load?warehouseId&date&excludeTransferId` trong `TransfersController.cs` (cùng kiểu với `source-locations`). Quyền: `transfers:create` hoặc quyền sửa tương ứng, kèm truy cập kho. Phản hồi chỉ gồm số đếm, không có chi tiết phiếu của kho khác:
   `{ inboundRequestCount, transferCount, total, threshold }`.
2. Đếm trong ngày `date` theo **giờ Việt Nam** (đầu ngày đến hết ngày):
   - Yêu cầu nhập kho của kho đó có `ExpectedDate` trong ngày, **allowlist** `InboundRequestStatus`: `Approved`, `Sent`, `Confirmed`, `PartiallyReceived` (không đếm `Draft`, `PendingApproval`, `Rejected`, `Received`, `Cancelled`, `Closed`). Allowlist đặt ở một chỗ để đổi dễ.
   - Phiếu điều chuyển có `DestinationWarehouseId` là kho đó, `RequiredBy` trong ngày, **chỉ** trạng thái `InProgress`. Không đếm `AwaitingResolution` (mọi đợt đã kết thúc, không còn hàng sắp về), `Draft`, `Completed`, `Cancelled` và các trạng thái cũ.
   - Loại phiếu đang sửa qua `excludeTransferId`.
   - Đơn vị đếm là **yêu cầu/phiếu**, không phải đợt giao và không phải dòng hàng. Đặt tên trường và thông báo theo đúng nghĩa này.
3. Ngưỡng là hằng số (2) đặt ở một nơi, ví dụ cạnh `InboundTaskAssignmentRules`; không rải số 2 trong code.
4. Test: đếm đúng từng loại, loại nháp/hủy/hoàn tất, loại phiếu đang sửa, biên ngày giờ Việt Nam (23:59 và 00:00), kho khác không bị đếm, không lộ chi tiết.

**FE**:

1. Hook `useTransferDestinationLoadQuery` gọi khi đã chọn kho nhập và ngày hàng về (có debounce nhẹ; không gọi khi thiếu một trong hai).
2. Trong `TransferGeneralSection.tsx`: khi `total >= threshold` hiện cảnh báo vàng dưới ô ngày, ví dụ "Kho nhập đã có N yêu cầu dự kiến về ngày này (X nhập kho, Y điều chuyển). Nên chọn ngày khác. Bạn vẫn có thể tiếp tục." Dùng `Alert` shadcn. Không chặn gửi. Không hiện khi tải lỗi (không làm gián đoạn form).
3. Người dùng đổi kho nhập hoặc ngày thì cảnh báo tự cập nhật. Có `aria-live="polite"`.
4. Test: hiện/ẩn theo ngưỡng, không chặn nút gửi, lỗi tải không hiện cảnh báo.

## 4. Kiểm thử và xác nhận cuối

Tách hai giai đoạn.

**Giai đoạn 1: không chạm database thật.**

- BE: `dotnet build`, test toàn bộ bằng fixture, kiểm model drift. **Đo baseline của `dev` ngay trước khi bắt đầu** (số test lỗi và tên test), rồi so với kết quả sau thay đổi; không dùng danh sách "lỗi có sẵn" cố định. Nếu API đang chạy chiếm file thì test trên bản sao ngoài thư mục dự án.
- FE: `pnpm exec tsc --noEmit`, ESLint, Vitest toàn bộ.

**Giai đoạn 2: QA thật, chỉ khi migration `AddTransferPlannedTransferDate` đã được người dùng cho phép áp lên `db71143`.**

- Không chạy BE mới với `db71143` trước đó: BE đọc cột chưa tồn tại sẽ lỗi ngay. Các thay đổi chỉ FE (bước A, B) vẫn QA được với BE hiện tại.
- Chạy local (BE `:7070`, FE `:3000`, `Database__ApplyMigrationsOnStartup=false`, in và kiểm tra server/database hiệu lực trước mọi thao tác ghi). Kiểm thủ công: tạo phiếu với hai ngày, cảnh báo tải, sửa, xóa ngày, gửi nháp để qua ngày, phiếu cũ, 360px và 768px, bàn phím.
- Trước khi commit: `gitnexus detect_changes`; stage từng file cụ thể; không stage `AGENTS.md`/`CLAUDE.md`.

## 5. Ngoài phạm vi (không làm trong đợt này)

- Chuyển các form tạo khác (nhập kho, xuất kho, kiểm kê, giao việc) sang component ngày giờ chung.
- Ngày riêng cho từng đợt giao của điều chuyển nhiều đợt (cảnh báo đếm theo ngày cấp phiếu).
- Đồng bộ hạn của các việc đã tạo khi đổi ngày trên phiếu.
- Giữ chỗ lịch cho kho nhập (cảnh báo chỉ là con số tại thời điểm tạo).
- Áp migration lên `db71143`; push; tạo PR.

## 6. Báo cáo khi xong

Nêu rõ: các commit, các test đã chạy và kết quả, tên migration mới và nhắc chưa áp, các quyết định phát sinh (nhất là cách xóa ngày), và những gì chưa kiểm.

## 7. Tiến độ thực hiện

- Baseline vừa fetch từ `origin/dev`: FE `99e6c3b` — 179 file / 1008 test đạt; BE `e04412f9` — 1350 đạt, 5 lỗi, 1 bỏ qua. Biên bản và TRX nằm tại `D:/Kovia-QA/Transfer-Dates-FormPolish-20261013-1900`. Các lỗi baseline: bốn ca `InboundOperationalEditingTests.EditsPreserveSnapshotsUnlessTheUserChangesTheLine` và `TenantRolePermissionTests.Inactive_user_cannot_reuse_a_cached_permission_set`.
- A: đã thay placeholder, gộp giải thích vào Popover dùng được bằng bàn phím/mobile; 5 test của trường vị trí đạt, ESLint các file thay đổi đạt. Không ghi DB.
- B–E: chưa hoàn thành. Migration chưa được tạo hoặc áp; QA API thật chưa chạy.
