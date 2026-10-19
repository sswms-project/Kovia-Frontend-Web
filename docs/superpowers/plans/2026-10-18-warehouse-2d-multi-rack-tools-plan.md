# Kế hoạch thao tác nhiều kệ trên sơ đồ kho 2D

- Ngày: 18/10/2026.
- Trạng thái: đã triển khai mã nguồn trên `screen/huytv`; kết quả kiểm tra và giới hạn xác minh ghi tại mục 10. Chưa commit/push.
- Mục 1–9 là spec đã đối chiếu với mapper scene, history, canvas, viewer chọn vị trí, validator và handler lưu ở BE. Không coi các tiêu chí QA trình duyệt/lưu thật là đã đạt nếu chưa có bằng chứng tại mục 10.
- Nhánh làm việc hiện tại: FE `screen/huytv`, BE `feat/huytv`.
- Mục tiêu: chọn nhiều kệ, kéo chung, căn hàng, giãn đều và hỗ trợ đường dóng; không biến sơ đồ kho thành trình vẽ tổng quát.
- Trước khi triển khai: kiểm tra lại trạng thái Git, đọc quy định repo và đồng bộ `origin/dev` an toàn nếu đã thay đổi. Giữ nguyên các chỉnh sửa local ngoài phạm vi.

## 1. Nền tảng đã kiểm tra

- Canvas dùng `konva`/`react-konva`; `WarehouseCanvas` được dùng cho cả designer và viewer.
- Selection hiện tại chỉ chứa một zone/rack/slot/decoration; Transformer chỉ gắn một node.
- Kéo kệ đang hít lưới ở canvas; workspace và history reducer tiếp tục chuẩn hóa geometry. Không thể chỉ sửa giao diện chọn nhiều mà bỏ qua các tầng chuẩn hóa này.
- Có sẵn Undo/Redo với giới hạn 100 bước, zoom/fit, inspector, kiểm tra quyền, cảnh báo chưa lưu và API lưu toàn scene theo version.
- `Ctrl + kéo` hiện dùng pan; `Ctrl + wheel` dùng zoom. Không chiếm các tổ hợp này để chọn nhiều.
- API lưu nhận danh sách geometry, kiểm tra trạng thái khu vực/kệ, biên kho và version. Dự kiến không cần endpoint, database migration hoặc thư viện mới.
- Tọa độ/kích thước kệ lưu SQL decimal(10,2), rotation decimal(6,2). Chuẩn hóa geometry hiện nằm ở nhiều tầng; phải kiểm tra cả mapper đọc/lưu, không chỉ drag callback.

### Phân biệt bố trí sơ đồ và vị trí nghiệp vụ

- Danh tính vẫn theo Warehouse → Zone → Rack → Slot. Kéo một hình kệ chỉ đổi X/Y của kệ trên sơ đồ; không đổi ZoneId, RackId, SlotId hoặc chuyển hàng giữa vị trí.
- Các ô nhỏ trong kệ hiện được canvas bố trí tương đối theo kích thước kệ; khi kéo hình kệ chúng đi theo phần hiển thị. Không phát sinh batch update tọa độ Slot trong database.
- Kệ RackLevel vẫn giữ DefaultSlotId/ô hệ thống mặc định; kệ SlotLevel vẫn giữ danh sách ô con. Không tạo, xóa, đổi storageMode hoặc mặc định chọn một slot khác sau khi căn kệ.
- Không suy sức chứa từ diện tích hình vẽ. Capacity, CurrentOccupancy, physical dimensions/units, cho phép trộn hàng và outbound-staging giữ nguyên.
- Viewer tiếp tục luồng chọn đơn rack/slot và kiểm tra vị trí được phép hiện có. Group selection chỉ thuộc designer; không truyền tập chọn nhiều sang form chọn vị trí nhập/xuất/tồn đầu kỳ.
- Không tự dịch chuyển con khi chỉ sửa hình Zone: quan hệ nghiệp vụ không phải phép transform cha–con trong Konva. Nếu cần di chuyển cả khu vực và kệ sẽ là tính năng khác.

## 2. Phạm vi đợt đầu

### Làm

1. Chọn nhiều kệ bằng Shift + click hoặc kéo khung chọn.
2. Kéo các kệ được chọn cùng nhau, giữ nguyên tương quan vị trí.
3. Căn trái/phải/trên/dưới và căn giữa ngang/dọc.
4. Giãn đều khoảng trống ngang/dọc khi chọn ít nhất ba kệ.
5. Đường dóng và hít mép/tâm giữa các kệ khi kéo.
6. Undo/Redo nguyên thao tác, dịch chuyển bằng bàn phím và vừa vùng chọn.

### Không làm trong đợt này

- Không gộp nghiệp vụ hoặc tạo nhóm lưu lâu dài; selection chỉ là trạng thái UI.
- Không chọn trộn zone/rack/decoration/slot, không đổi ZoneId, mã kệ hoặc dữ liệu tồn kho.
- Không resize/xoay cả nhóm. Giữ thao tác resize/xoay một đối tượng hiện có.
- Không nhân bản hàng loạt kệ, tự tạo mã, tự tạo vị trí hoặc xóa kệ nghiệp vụ.
- Không thêm thước mét/cm, tối ưu lối đi hoặc quy tắc an toàn vật lý khi chưa có mô hình đơn vị tương ứng.
- Không đổi hành vi viewer/chọn vị trí phục vụ nhập xuất kho.

## 3. Quy ước UI/UX

### Chọn và bỏ chọn

- Khi tắt `Chọn nhiều kệ`: click thường chọn một đối tượng như hiện tại, Shift + click kệ bật/thực hiện chọn nhiều. Khi bật chế độ: click/tap kệ thêm hoặc bỏ thành viên; không làm mất các thành viên còn lại.
- Shift + click kệ: thêm/bỏ kệ khỏi tập chọn, không kích hoạt pan.
- Có nút rõ ràng `Chọn nhiều kệ` trong toolbar. Trong chế độ này, kéo từ nền trống hoặc nền khu vực để vẽ khung; không vô tình kéo khu vực bên dưới.
- Khung chọn chỉ nhận kệ có phần hình học nằm trọn trong khung; dùng bounding box đã tính rotation để tránh cách chọn thay đổi theo chiều kéo.
- Khung mới thay tập chọn; Shift + khung thêm vào tập chọn. Khi thêm trùng không tạo bản sao.
- Đã chọn nhóm thì kéo trên bất kỳ kệ thành viên sẽ kéo nhóm. Quyết định click/toggle chỉ thực hiện sau khi xác định không có drag; drag không được toggle hoặc thu về chọn đơn. Muốn trở về chọn đơn: tắt chế độ chọn nhiều rồi click thường.
- Chuyển sang chọn zone/slot/decoration sẽ bỏ tập chọn nhiều kệ.
- Esc hủy gesture đang diễn ra và khôi phục geometry trước gesture; Esc khi không có gesture bỏ selection.
- Một ngưỡng di chuyển nhỏ phân biệt click với drag; xử lý click sinh ra sau thả khung để không mất ngay selection.
- Điều kiện tham gia nhóm: có quyền cấu hình tại kho đang mở, kệ Active, khu vực cha tồn tại và Active, `placementPending !== true`, geometry hữu hạn/hợp lệ. Không thêm điều kiện khu vực phải có khung đã bố trí nếu nghiệp vụ hiện tại không yêu cầu.
- Kệ chưa bố trí chỉ đặt qua luồng đặt riêng hiện có, không chọn bằng khung, không dùng làm mốc đường dóng. Thao tác nhóm không thay `placementPending` của bất kỳ đối tượng nào.
- Kệ không đủ điều kiện không tham gia khung chọn; thao tác chọn trực tiếp vẫn có thể giữ luồng xem chi tiết hiện tại. Trong chế độ chọn nhiều, slot con chuyển hit tới kệ cha đủ điều kiện; ngoài chế độ đó và trong viewer giữ luồng chọn slot hiện có.
- Nếu có thành viên mất điều kiện sau khi nhóm đã được chọn: hủy gesture, làm mới tập chọn và thông báo; không âm thầm chỉ di chuyển phần thành viên còn hợp lệ.

### Thanh thao tác

- Khi chọn từ hai kệ: hiện `Đã chọn N kệ`, `Căn chỉnh`, `Giãn đều`, `Vừa vùng chọn`, `Bỏ chọn` trong vùng toolbar hiện có.
- Dùng Button/DropdownMenu/Tooltip/Toggle primitives sẵn có, màu và typography theo design system. Không tạo thêm một thanh công cụ cao cố định che canvas.
- Menu Căn chỉnh có icon kèm nhãn đầy đủ; Giãn đều chỉ bật khi có ít nhất ba kệ và đủ chỗ.
- Chọn nhiều chỉ dùng viền/bounding box và drag handles phù hợp; tháo Transformer resize/rotate của selection đơn khi có nhóm. Không để handle cũ tiếp tục thay đổi một thành viên trong nhóm.
- Inspector nhóm chỉ hiện số kệ và mã kệ làm chuẩn, không hiển thị form chi tiết của một kệ như thể áp dụng cho cả nhóm.
- Nút `Hít đối tượng` tách riêng với `Hiện lưới`. Không suy diễn ẩn lưới đồng nghĩa tắt hít lưới; giữ hành vi cũ và diễn giải đúng trong trợ giúp.
- Màn hình hẹp: toolbar wrap hoặc dùng menu nhóm thao tác; nút bật chọn nhiều vẫn tiếp cận được. Touch chọn nhiều bằng chế độ bật rõ ràng rồi tap kệ; không yêu cầu Shift trên thiết bị cảm ứng. Pinch/pan không bị nhận nhầm là khung chọn.
- Phím tắt không hoạt động khi focus nằm trong input, select, textarea, contenteditable hoặc overlay nhập liệu.

## 4. Quy tắc hình học

### Kệ làm chuẩn

- Shift + click thêm kệ: kệ được thêm cuối là kệ chuẩn, hiển thị viền và mã phân biệt.
- Chọn bằng khung: chọn kệ trên cùng, rồi trái nhất làm chuẩn; dùng ID để phân định khi trùng vị trí.
- Bỏ kệ chuẩn: xác định lại theo cùng quy tắc ổn định. Không âm thầm đổi chuẩn trong khi đang kéo.
- Căn hàng không di chuyển kệ chuẩn. Các mép/tâm tính theo bounding box hiển thị sau rotation, không tự xoay kệ.

### Kéo nhóm và giới hạn biên

- Lưu snapshot geometry khi bắt đầu gesture; mọi preview tính từ snapshot và một delta chung, không cộng dồn sai số qua mỗi mousemove.
- Đổi tọa độ con trỏ từ màn hình sang scene, bao gồm scale, pan và scroll; không dùng screen pixel làm tọa độ lưu.
- Hít lưới theo một mốc của nhóm, áp dụng cùng delta cho mọi thành viên. Không hít từng kệ riêng làm thay đổi khoảng cách.
- Tính bounding box hợp của cả nhóm và giới hạn delta chung tại biên kho; tuyệt đối không co kích thước kệ để vừa biên.
- Width/height/rotation/zIndex và thông tin nghiệp vụ phải giữ nguyên khi kéo/căn/giãn đều.
- Căn hàng: tính cả kết quả trước, kiểm tra hợp lệ rồi áp dụng toàn bộ. Nếu vượt biên thì không áp dụng một phần và nêu lý do.
- Giãn đều: giữ hai kệ ngoài cùng cố định, chia đều khoảng trống giữa mép hình học của các kệ còn lại, không chỉ chia đều tâm. Không tự chồng kệ khi tổng kích thước không đủ chỗ.
- Giãn đều ngang/dọc sắp theo mép trái/trên, dùng tâm rồi ID làm tie-break; chỉ đổi tọa độ trên trục được chọn. Nếu hai mốc không tạo đủ khoảng trống không âm thì disable đúng lệnh theo trục và giải thích. Kệ chuẩn căn hàng không đóng vai trò mốc cho lệnh giãn đều.
- Không thêm ràng buộc kệ phải nằm trong khung Zone nếu nghiệp vụ hiện tại chưa quy định. Không đổi cha nghiệp vụ vì kéo qua hình khu vực khác.

### Đường dóng

- So sánh mép trái/phải/trên/dưới và tâm của kệ/nhóm đang kéo với các kệ hợp lệ không nằm trong selection.
- Ngưỡng hít ban đầu: 6 CSS pixel, quy đổi theo zoom; không tăng theo kích thước scene.
- Mỗi trục chọn mốc gần nhất; dùng quy tắc tie-break ổn định để tránh rung giữa các mốc.
- Ưu tiên: biên hợp lệ → mốc đối tượng nếu đủ gần → lưới khi không có mốc đối tượng. Không hít lưới lại sau khi đã hít đối tượng.
- Đường dóng không nhận pointer event, không lưu vào scene và biến mất khi thả/hủy gesture.
- Chỉ hiển thị đường dóng khi vị trí cuối thực sự khớp; nếu clamp biên phá mốc thì bỏ đường dóng đó.
- Dùng node refs/preview và batch drawing phù hợp; không ghi history/server state mỗi pointermove. Bắt đầu với danh sách ứng viên đơn giản, chỉ thêm spatial index nếu profiling chứng minh cần.

### Pipeline hình học thống nhất và độ chính xác lưu

- Dùng cùng bộ tính kết quả kéo cho một kệ đã bố trí và nhiều kệ: snapshot → delta → hít/biên → giá trị có thể lưu → kiểm tra → preview → commit. Không cho đường kéo kệ đơn gọi lại snap tại dragBoundFunc, commitNodeGeometry, workspace hoặc reducer sau bước này. Resize/xoay đơn giữ quy tắc riêng hiện có, không áp dụng máy móc pipeline kéo cho chúng.
- X/Y cuối cùng của mỗi kệ được biểu diễn ở bước 0,01 đơn vị scene, không gọi đó là mét/cm. Width/height/rotation lấy nguyên giá trị trước thao tác kéo/căn, không làm tròn lại chúng như một tác dụng phụ.
- Kéo nhóm phải chọn một delta chung bội số 0,01 khi các tọa độ đầu đã có hai chữ số thập phân; không làm tròn riêng từng kệ rồi phá khoảng cách. Nếu snapshot không đáp ứng độ chính xác dự kiến, báo/kiểm tra trước thay vì âm thầm sửa cả nhóm.
- Căn/giãn đều cho phép sai lệch tối đa 0,01 đơn vị scene so với mép/tâm lý tưởng vì mép của kệ xoay có thể là số vô tỷ. Giá trị preview sau bước lượng tử hóa phải đúng giá trị commit/request; không hiển thị một kết quả đẹp hơn kết quả được lưu.
- Biên là điều kiện bắt buộc, không dùng sai số căn hàng để cho phép vượt biên. Tính lại bounding box từ X/Y đã lượng tử hóa và width/height/rotation không đổi, đối chiếu công thức BE. Nếu làm tròn đẩy ra ngoài, tìm vị trí khả thi hướng vào trong; kéo nhóm vẫn dùng chung delta. Không có kết quả khả thi thì giữ snapshot và nêu lý do, không resize hoặc lưu giá trị chưa kiểm tra.
- Chỉ dùng epsilon số học được xác định và test để tính toán floating-point; không nới validator BE hoặc dựa vào SQL tự làm tròn sau lưu. Kiểm tra request và mô phỏng round-trip hai chữ số thập phân tại fixture, gồm kệ xoay 45° sát mép.
- Mapper đọc/lưu và reconcile phải giữ kết quả đã chốt; không snap lại góc/tọa độ khi chỉ đọc hoặc serialize. Rà soát `normalizeRotation` đang làm tròn số nguyên để không làm mất rotation hợp lệ của kệ qua luồng đọc/group-edit. Không coi sửa dữ liệu cũ tự động là một phần của tính năng này.

## 5. State, Undo/Redo và lưu dữ liệu

- Giữ selection nhiều kệ trong designer; không thay rộng API single-selection của viewer khi không cần thiết. Dùng nguồn selection duy nhất, tránh nhiều state lệch nhau giữa canvas, toolbox và inspector.
- Thêm batch geometry action cho history reducer. Một lần kéo, một lệnh căn hoặc một lệnh giãn đều = một history entry.
- Batch path giữ tọa độ cuối từ pipeline trên; kiểm tra đủ ID, không trùng, tất cả thành viên đủ điều kiện rồi commit nguyên khối. Không chạy lại normalize/snap từng đối tượng. Cùng pipeline áp dụng kéo kệ đơn có đường dóng; không đổi hành vi resize/xoay đơn không liên quan.
- Tính đến chuẩn hóa khi thay kích thước lưới/canvas và reconcile server; không để các thao tác sau làm méo kết quả nhóm hoặc thay đổi ngoài ý muốn mà không thể Undo.
- Không tạo history entry nếu geometry thực tế không thay đổi. Undo rồi có thao tác mới phải xóa redo đúng như hiện tại.
- Mũi tên: dịch theo một bước lưới, Shift + mũi tên: mười bước lưới. Một chuỗi giữ phím là một thao tác Undo; dừng an toàn khi mất focus.
- Khi reload/đổi kho/scene reconcile: loại ID không còn tồn tại; hủy gesture khi quyền/trạng thái thay đổi. Không khôi phục geometry cũ đè lên dữ liệu server mới.
- Lưu vẫn dùng request/version hiện tại và nút Lưu; không gọi API khi chỉ chọn, preview hoặc hít.
- Khi gesture đang hoạt động: disable Lưu, Undo/Redo, căn/giãn đều, thay canvas và thao tác nghiệp vụ tại inspector; handler cũng guard chứ không chỉ disable nút. Không serialize node refs đang preview hoặc scene cũ để lưu giữa gesture.
- Esc/pointercancel/hủy khung/hai ngón chuyển sang pinch/mất focus: hủy preview và phục hồi các node từ scene hợp lệ đang sở hữu gesture, không ghi history. Với nudge giữ phím, keyup chốt một batch; mất focus trước keyup thì hủy chuỗi chưa chốt.
- Đóng/Reload/đổi kho: hủy gesture trước, sau đó giữ hộp xác nhận bỏ thay đổi đã commit hiện có. Không xóa các chỉnh sửa trước gesture. Trong lúc request Lưu đang chạy, không bắt đầu gesture mới hoặc ghi lại lần hai.
- Scene reconcile/permission update đến giữa gesture: đánh dấu gesture cũ vô hiệu trước khi dựng scene mới; callback dragend/keyup đến muộn không được commit hoặc restore snapshot đè scene mới. Việc hủy không tự nâng baseVersion để vượt kiểm tra xung đột.
- Request vẫn do mapper scene hiện có tạo, không thay bằng payload chỉ chứa selection. Đặc biệt phải giữ đầy đủ decorations của scene: BE reconcile danh sách này có thể xóa biểu tượng bị bỏ sót. Slots không có trong request geometry và phải tiếp tục như vậy; quy tắc lọc inactive/chưa bố trí giữ đúng contract hiện có.
- Nếu server báo xung đột phiên bản: dùng luồng xử lý hiện có, không tự retry ghi đè.

## 6. Thứ tự triển khai

| Giai đoạn | Công việc                                                                 | Kết quả cần đạt                                                        |
| --------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 0         | Đồng bộ nhánh an toàn; GitNexus impact; đọc lại quy định và tests hiện có | Xác định consumers designer/viewer, không thay đổi local ngoài phạm vi |
| 1         | Batch geometry reducer và các hàm hình học thuần                          | Kéo/căn nhiều kệ là một transaction UI có kiểm thử                     |
| 2         | Shift-click, khung chọn, kệ chuẩn, trạng thái nhóm                        | Chọn/bỏ chọn đúng khi zoom/pan và khi có zone/slot bên dưới            |
| 3         | Kéo nhóm, căn hàng, giãn đều và toolbar nhóm                              | Giữ khoảng cách khi kéo, không vượt biên, không đổi dữ liệu nghiệp vụ  |
| 4         | Đường dóng, hít đối tượng, nudge và vừa vùng chọn                         | Tương tác nhất quán ở các mức zoom, không xung đột pan/zoom            |
| 5         | Kiểm thử hồi quy, QA UI và tài liệu                                       | Đạt checklist dưới; chưa commit/push nếu người dùng chưa yêu cầu       |

## 7. Vị trí dự kiến thay đổi

- `src/features/warehouse/components/WarehouseDesigner/WarehouseDesignerWorkspace.tsx`: orchestration selection, batch callbacks và keyboard.
- `.../WarehouseCanvas.tsx`: hit handling, khung chọn, drag preview, guide rendering và fit selection.
- `.../DesignerToolbar.tsx`, `.../DesignerContextToolbar.tsx`: group actions và trợ giúp. Tách một component nhóm nhỏ nếu thực sự giúp giảm độ phức tạp.
- `src/features/warehouse/hooks/use-layout-editor-history.ts`: batch action và history semantics.
- `src/features/warehouse/utils/layout-grid.ts`: dùng lại rotation bounds/grid. Tách `layout-rack-operations.ts` cùng feature nếu cần để giữ thuật toán nhóm độc lập, dễ test.
- `src/features/warehouse/utils/layout-scene-mapper.ts` và tests: kiểm tra snapshot đọc/lưu, độ chính xác, placementPending, decorations đầy đủ và không có slot mutation; chỉ sửa nơi có sai lệch được chứng minh bởi test.
- `src/features/warehouse/types/warehouse-layout-scene.types.ts`: chỉ thêm kiểu selection/batch UI cần thiết; không đổi DTO lưu nếu không có lý do.
- Cập nhật các test hiện có của canvas, history và geometry; bổ sung test workspace/group-toolbar khi cần.
- BE: rà soát validator/version/save contract và fixture hồi quy; không dự kiến sửa source, migration hoặc cấu hình.

## 8. Tiêu chí nghiệm thu

- Chọn, thêm/bỏ và kéo 2–3 kệ bằng Shift-click/khung chọn; kệ chuẩn luôn rõ ràng.
- Kéo một thành viên không mất selection nhóm; slot bên trong không cướp thao tác ở chế độ chọn kệ, viewer vẫn chọn vị trí như cũ.
- Các lệnh căn đúng cho kệ khác kích thước và kệ xoay; giãn đều giữ hai đầu và khoảng trống bằng nhau.
- Clamp biên giữ nguyên đội hình; không biến kéo nhóm thành resize. Lệnh không hợp lệ không áp dụng một phần.
- Khớp giữa guide preview và tọa độ sau thả, sau Undo/Redo và sau lưu–tải lại; kiểm tra sai số lưu với độ chính xác DTO/database hiện có.
- Một thao tác = một Undo; hủy gesture không làm dirty scene; không ghi API trước khi Lưu.
- Kiểm tra zoom 20%, 100%, 400%, pan/scroll, drag ra ngoài viewport, pointercancel và đổi tab/mất focus giữa gesture.
- Keyboard và touch có đường sử dụng rõ ràng; menu/tooltip/toolbar không che canvas hoặc tràn ở viewport hẹp/zoom trình duyệt 200%.
- Không có thao tác ghi khi read-only, thiếu quyền, kệ/khu vực inactive hoặc khi quyền bị thu hồi giữa gesture.
- Không đổi tồn kho, slot, mã kệ, ZoneId, capacity hoặc trạng thái nghiệp vụ khi thao tác hình học.
- Chạy targeted tests → lint/typecheck → production build → toàn bộ FE tests; kiểm tra ảnh UI với dữ liệu đại diện và nhiều kệ.
- QA lưu thật chỉ thực hiện qua luồng ứng dụng được phép sau khi xác nhận effective database; tuyệt đối không chạy migration/seed/cleanup hoặc script ghi trực tiếp để thử tính năng.

### Ca hồi quy bắt buộc bổ sung sau review

- Cả kéo đơn lẫn kéo nhóm khớp đường dóng không trùng lưới; kết quả không nhảy lại ở canvas/workspace/history/save mapper.
- Một kệ đã bố trí cạnh một kệ `placementPending`: chỉ kệ đã bố trí được chọn/di chuyển và kệ chưa bố trí vẫn bị loại khỏi request.
- Test cả RackLevel có default slot và SlotLevel có nhiều slot; xác nhận mọi ID, quan hệ, capacity, occupancy, units và dữ liệu slot trước/sau không thay đổi.
- Căn mép kệ khác kích thước/góc xoay; giữ kệ chuẩn đứng yên. Round-trip decimal hai chữ số, góc có phần thập phân và sát bốn biên đều giữ kết quả hợp lệ.
- Lưu khi pointer/key gesture đang diễn ra không gọi mutation. Pointercancel, pinch, mất focus, đổi kho và reconcile giữa drag không tạo commit muộn; dirty/history trước gesture không bị mất.
- Click/tap thêm/bỏ nhiều kệ khi bật chế độ; click thường khi tắt trở về chọn đơn; drag không sinh toggle/click làm mất nhóm.
- Lưu sơ đồ sau khi căn kệ vẫn giữ decorations không được chọn; không gửi request rút gọn gây reconcile xóa biểu tượng. Kiểm tra payload bằng mock/fixture, không thử xóa thật trên database triển khai.

## 9. Sau đợt đầu

Chỉ xem xét sau khi có phản hồi sử dụng: khoảng cách nhập số với đơn vị đã chuẩn hóa, cảnh báo chồng lấn, khóa vị trí và tạo dãy kệ qua luồng nghiệp vụ hợp lệ. Không đưa các phần này vào code đợt đầu dưới dạng placeholder.

## 10. Thực hiện và xác minh — 19/10/2026

- Dùng lại Konva, history reducer, các primitives shadcn và API lưu toàn scene hiện có; không thêm dependency, API, schema hoặc migration.
- Designer có Shift-click, chế độ chọn nhiều, khung chọn, kệ chuẩn, kéo chung, căn sáu hướng, giãn đều khoảng trống, đường dóng/hít đối tượng, dịch bằng phím và vừa vùng chọn. Viewer giữ selection đơn.
- Batch chỉ thay X/Y, kiểm tra đủ thành viên và biên ở độ chính xác 0,01 trước khi tạo một history entry. Hủy preview không tạo history; khóa thao tác ghi khi đang kéo/nudge hoặc request đang chạy.
- Đổi bước lưới không hít lại geometry đã chốt. Thu nhỏ canvas vượt biên đối tượng bị từ chối thay vì tự resize/dịch kệ.
- Đọc geometry giữ góc thập phân hợp lệ; đường resize/xoay đơn vẫn dùng quy tắc hiện có. Request tiếp tục giữ đầy đủ decorations và không có slot geometry.
- GitNexus impact/detect-changes đã dùng để kiểm tra phạm vi designer/history/geometry; các file hướng dẫn và dashboard đã dirty từ trước được giữ nguyên (đối chiếu SHA-256). BE không thay đổi source/config.
- Đã pass targeted tests và lint toàn `src` + `next.config.ts`. Có kiểm thử hook dùng Konva Group/Transform ở zoom 20%, 100%, 400%, hủy/pinch/quyền/reconcile, batch Undo/Redo, giữ dữ liệu RackLevel/SlotLevel và kiểm tra payload bằng mock.
- Full FE suite: **243 file / 1.504 test pass**, `pnpm exec vitest run --maxWorkers=2 --testTimeout=15000` (619,63 giây). Typecheck `pnpm exec tsc --project tsconfig.production.json --noEmit --incremental false` pass. Production build với `KOVIA_ISOLATED_BUILD=true`, `CIRCLE_NODE_TOTAL=2`, `pnpm run build` pass: compile 62 giây, TypeScript 2,4 phút, tạo đủ 72/72 static pages với một worker.
- Chưa QA kéo/thả trực tiếp trên trình duyệt, viewport hẹp/touch thật và lưu–tải qua API: công cụ CUA/Node REPL lỗi `failed to write kernel assets: The system cannot find the path specified` kể cả sau reset. Các test DOM/hook không thay thế được phần QA này.
- Không khởi động lại ứng dụng, không ghi database, không chạy migration/seed/cleanup trong lần thực hiện này.

### Sửa hồi quy sau review — 19/10/2026

- Pinch được nhận ở DOM touch capture, trước khi Konva chặn `touchmove` lúc kéo; hủy preview ngay khi có ngón thứ hai. Chặn sự kiện xuống Konva cho đến khi nhả hết các ngón để không phát sinh chọn/kéo muộn. Dùng lại `touch-none` của canvas, không bật `Konva.hitOnDragEnabled` toàn cục.
- Keyboard truyền `event.repeat` vào giao dịch nudge: repeat chỉ tiếp tục phiên đang tồn tại, không mở lại phiên đã bị Escape, blur hoặc reconcile hủy. Nhấn phím mới vẫn hoạt động bình thường; không thêm state/store.
- Đã tái hiện hai lỗi bằng test đỏ trước sửa. Sau sửa: toàn bộ module warehouse **30 file / 189 test pass**, bao gồm DOM capture không có Stage touchmove, nhả một ngón sau pinch, late dragend, ba đường hủy nudge và wiring `event.repeat` từ workspace. Lint các file thay đổi, Prettier và diff whitespace check pass.
- Các file dirty ngoài phạm vi ở FE/BE được đối chiếu SHA-256 và giữ nguyên. Không commit/push, đổi API hoặc ghi database. Chưa kiểm chứng bằng thiết bị touch/trình duyệt thật; giới hạn công cụ QA nêu trên vẫn còn.
- Typecheck toàn source bằng `pnpm exec tsc --project tsconfig.production.json --noEmit --incremental false` pass sau sửa. Không chạy lại full FE suite hoặc production build trong lượt sửa hẹp này; kết quả full suite/build ở trên thuộc bản trước đợt sửa hồi quy.
