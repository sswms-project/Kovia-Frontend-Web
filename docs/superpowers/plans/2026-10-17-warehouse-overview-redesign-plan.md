# Kế hoạch thiết kế lại Tổng quan kho Kovia

Ngày: 2026-10-17. Trạng thái: **READY_FOR_CODEX_REVIEW** — đã triển khai BE → FE và tự kiểm thử; chưa có review độc lập hoặc kiểm thử HTTP với DB triển khai.

Phạm vi tài liệu: kế hoạch BE → FE → UI/UX. Quyền triển khai không bao gồm migration hoặc thay đổi dữ liệu DB triển khai. Không tự thay đổi quy tắc lô chung.

## 1. Mục tiêu và giới hạn

- Mở Tổng quan là thấy hàng cần chú ý, không phải cuộn qua các box thống kê và biểu đồ mới gặp cảnh báo.
- Dùng list/table chung của dự án, giữ giao diện xanh Kovia, bảng trắng có đủ border, số liệu dễ đối chiếu.
- Owner/Manager dùng cùng bố cục; dữ liệu và liên kết phụ thuộc quyền hiệu lực và phạm vi kho do BE xác định, không cấp quyền bằng tên vai trò.
- Giữ các chỉ số và biểu đồ đang có, nhưng không để chúng lấn vùng cảnh báo.
- Dashboard chỉ đọc: không tự nhập/xuất/điều chuyển, xử lý hàng hết hạn, thay đổi policy hoặc ghi tồn.
- Không đổi dashboard Staff/Admin, không làm widget builder, kéo thả bố cục, xuất Excel, realtime/polling, AI hay bộ lọc thời gian cho tồn hiện tại trong phiên bản này.
- Theo model hiện có, chưa thấy cần migration. Nếu triển khai phát sinh nhu cầu đổi schema/index, tách đề xuất và xin phép trước; không áp tự động.

## 2. Cơ sở đã kiểm tra

### 2.1 AMIS — chỉ học cách tổ chức thông tin

Nguồn tham khảo: [Tổng quan kho AMIS](https://amisapp.misa.vn/warehouse/overview).

Đã quan sát trực tiếp bốn bảng dưới tối thiểu, vượt tối đa, sắp hết hạn và quá hạn; mỗi bảng có tải lại và thời điểm cập nhật. Cài đặt số ngày sắp hết hạn mở bằng popover, có Hủy/Áp dụng. Bốn bảng trong tài khoản tham khảo đều không có dữ liệu; chưa xác minh được hành vi bấm dòng có dữ liệu. Không suy diễn luồng nghiệp vụ ẩn của AMIS thành yêu cầu cho Kovia.

### 2.2 Kovia — tái sử dụng trước khi tạo mới

| Có sẵn               | Nguồn                                                                                           | Cách sử dụng                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Page tổng quan chung | FE `src/features/dashboard/pages/WarehouseOverviewPage.tsx`                                     | Giữ page mỏng, quản lý query/state/capability                                |
| View, metric, chart  | FE `components/WarehouseOverview/`                                                              | Thiết kế lại composition, giữ phép tính/chức năng đã có                      |
| Hook/service/schema  | FE `use-warehouse-overview.ts`, `warehouse-overview.service.ts`, `warehouse-overview.schema.ts` | Mở rộng trong feature hiện tại                                               |
| Khung bảng           | FE `src/components/operations/OperationalListPanel.tsx`                                         | Bắt buộc cho các bảng cảnh báo và xem tất cả                                 |
| Phân trang           | FE `src/components/operations/OperationalPagination.tsx`                                        | Không tự viết footer phân trang khác                                         |
| Primitives           | FE `src/components/ui/`                                                                         | Table, Button, NativeSelect/Select, Tabs, Dialog, Popover, Skeleton, Tooltip |
| Scope báo cáo        | BE `Application/Features/Dashboard/ResolveReportingScope/ReportingScopeResolver.cs`             | Chặn khác tenant/kho ngoài quyền trước khi đọc số liệu                       |
| Reader tổng quan     | BE `Infrastructure/Persistence/Implementations/WarehouseReportingReader.cs`                     | Tái sử dụng scope/projection, truy vấn chỉ đọc                               |
| Policy min/max       | BE `Domain/Entities/Product/ProductWarehousePolicy.cs`                                          | Đã có MinStockThreshold và MaxStockThreshold nullable                        |
| Tồn/lô               | BE `InventoryStock`, `ProductLot`                                                               | Đã có tồn thực tế, giữ chỗ, chất lượng, điều kiện dùng và hạn dùng           |
| Test nền             | BE `Application.Tests/Features/Dashboard/WarehouseReportingTests.cs`                            | Mở rộng fixture/test hiện tại, không dựng test DB triển khai                 |

Hiện API overview có preview dưới tối thiểu tối đa 10 dòng; chưa có đầy đủ ba bảng còn lại hay API phân trang độc lập cho từng cảnh báo. README dashboard còn mô tả dữ liệu mẫu; phải cập nhật theo luồng đang chạy thật, không lấy README cũ làm nguồn xác định hành vi.

## 3. Bố cục đề xuất

### 3.1 Desktop/laptop đủ diện tích

```text
Tổng quan kho                  [Tất cả kho được phép v] [↻]
[Cảnh báo tồn kho]  [Hoạt động kho]

┌ Dưới mức tối thiểu ───────── ↻ ┐ ┌ Vượt mức tối đa ─────────── ↻ ┐
│ Bảng sản phẩm / kho / số lượng│ │ Bảng sản phẩm / kho / số lượng│
│ Cập nhật …                   │ │ Cập nhật …                   │
│ OperationalPagination       │ │ OperationalPagination       │
└─────────────────────────────┘ └─────────────────────────────┘
┌ Sắp hết hạn trong 5 ngày ⚙ ↻ ┐ ┌ Quá hạn sử dụng ────────── ↻ ┐
│ Bảng sản phẩm / kho / lô / HSD│ │ Bảng sản phẩm / kho / lô / HSD│
│ Cập nhật …                   │ │ Cập nhật …                   │
│ OperationalPagination       │ │ OperationalPagination       │
└─────────────────────────────┘ └─────────────────────────────┘
```

- Mặc định mở **Cảnh báo tồn kho**; grid 2 cột × 2 hàng, mỗi hàng `minmax(0, 1fr)` trong chiều cao còn lại. Không đặt bốn bảng trên một hàng.
- Chỉnh so với phác thảo ban đầu: chuyển thống kê/biểu đồ sang tab **Hoạt động kho**, thay vì nối tất cả bên dưới khiến trang dài và trái quy chuẩn list/table. Không bỏ các chức năng này.
- Header gọn, không tagline hoặc đoạn hướng dẫn dài. Chọn kho và reload toàn màn hình nằm bên phải; reload từng bảng ở mép phải header của bảng đó. Không đặt tên nút reload là “Đặt lại”.
- Kho hiển thị mã + tên nếu nguồn options hỗ trợ; không dùng tên kho làm ID. Không mở rộng response chỉ để có mã nếu chưa cần.
- Toolbar có thể xuống hàng khi thiếu chỗ; không ép chữ/nút chồng lấn.

### 3.2 Màn hình hẹp, thấp hoặc zoom lớn

- Khi grid 2 × 2 không còn đủ chỗ đọc header + ít nhất vài dòng, chuyển sang **một bảng đang chọn**, với bộ chọn bốn nhóm cảnh báo ở phía trên. Thứ tự và dữ liệu không thay đổi.
- Đây là biến thể một cột, không xếp bốn bảng có chiều cao lớn thành trang cuộn dài. Chọn nhóm bằng ToggleGroup single có sẵn, nhãn và tổng của bốn nhóm luôn hiện; không tự làm thanh tab có cuộn dọc.
- Dự kiến bắt đầu thử grid từ vùng nội dung rộng khoảng 1.000px và viewport cao khoảng 720px; breakpoint cuối cùng phải qua QA với sidebar mở/đóng và zoom, không chốt chỉ theo tên thiết bị.
- Bảng được cuộn ngang bên trong khi cần, không che mất cột và không tạo scrollbar ngang cho cả trang. Không ẩn hẳn SKU, số lượng hoặc HSD để vừa màn hình.
- Bộ chọn nhóm luôn có tổng cảnh báo của cả bốn nhóm; tổng chưa tải/lỗi phải hiện rõ, không giả là 0. Nhóm chưa mở lấy trang đầu tối đa 1 dòng để có totalCount từ API đã thiết kế, không thêm endpoint tổng hợp. Các tổng này không đổi theo search trong Dialog.

### 3.3 Tab Hoạt động kho

- Giữ các chỉ số hiện có, dùng box thống kê gọn, không giả làm bộ lọc khi không có hành vi lọc.
- Giữ biểu đồ phiếu nhận cất xong / phiếu xác nhận xuất và lựa chọn 7/30/90 ngày ngay cạnh biểu đồ. Không đặt kỳ này ở header chung vì nó không thay đổi tồn hiện tại.
- Desktop: phần còn lại chia vùng biểu đồ và bảng chỉ số “Công việc, chứng từ và vị trí”; nhóm các dòng công việc chờ, tồn giữ/cách ly và vị trí trong cùng bảng gọn thay cho nhiều khối mô tả.
- Dùng `OperationalListPanel` cho bảng chỉ số; header cố định, thân bảng cuộn. Dòng chỉ số chỉ điều hướng nếu có đích thật và đủ quyền; không thêm phân trang giả cho tập chỉ số cố định.
- Màn hình hẹp: có lựa chọn “Biểu đồ” / “Chỉ số” để nội dung đang xem chiếm vùng còn lại, không ép biểu đồ và bảng cao cùng lúc. Giữ bộ chọn kỳ trong vùng biểu đồ.

## 4. Quy chuẩn list/table và hình thức

- Root theo shell chung: `flex h-full min-h-0 min-w-0 w-full flex-1 flex-col`; bỏ `p-4 md:p-6` dư của view nếu shell đã cấp gutter.
- Chuỗi Root → Tabs → TabsContent → Grid đều có `min-h-0 min-w-0`, vùng nội dung Tabs/TabsContent có `flex-1` và bố cục flex/grid rõ ràng. Header/TabsList không co. Không dựa vào default TabsContent vì primitive hiện tại chưa tự có min-h-0.
- Từng bảng dùng `OperationalListPanel`; không tạo một loại DashboardTable primitive mới, không sửa cơ chế chiều cao/scroll chung chỉ để hợp dashboard.
- `Table` là con trực tiếp của panel; `TableHead` sticky theo từng cell. Header bảng, dòng cập nhật và `OperationalPagination` là các phần không cuộn. Footer phân trang là con trực tiếp của panel.
- Chỉ body của từng bảng cuộn, dùng scrollbar mảnh chung; không dùng body/page làm vùng cuộn bảng và không chép công thức `calc(100vh - ...)`.
- Panel nền `bg-card`, border bốn cạnh và đường phân cách header/footer rõ, dùng `border-border`. Không dùng `overflow-hidden` để che một lỗi tràn từ tổ tiên.
- Số căn phải, `tabular-nums`, format vi-VN; SKU dùng kiểu mã của hệ thống. ĐVT luôn hiện rõ. Không cộng tổng số lượng của các sản phẩm khác đơn vị.
- Dòng có border dưới và hover nhẹ. Tooltip hoặc màn xem đầy đủ phải cho đọc được tên dài; không chỉ cung cấp thông tin qua hover.
- Tiêu đề gọn, body khoảng 13–14px theo token; không font lớn như landing page, gradient, bóng đổ nặng hay ảnh minh họa chiếm vùng bảng.
- Không dùng màu đỏ cho cả bảng. Chỉ nhấn số thiếu/vượt hoặc HSD/trạng thái, kèm chữ để không phụ thuộc vào màu.

## 5. Dữ liệu và định nghĩa nghiệp vụ

### 5.1 Quy tắc chung

1. BE lọc tenant + kho được phép trước mọi join/group/count/paging. Kiểm tra cả quan hệ sản phẩm/lô thuộc đúng tenant và lô thuộc đúng sản phẩm; không chỉ tin FK gửi từ FE.
2. Không chọn kho = tất cả kho được phép, không phải toàn bộ kho trong DB. Chọn rõ kho ngoài quyền phải bị từ chối, không âm thầm đổi sang “tất cả”.
3. Một dòng ngưỡng = một sản phẩm tại một kho. Một dòng hạn dùng = một sản phẩm + lô tại một kho; gom các vị trí nhưng không gom lô khác ID chỉ vì trùng số lô.
4. Tất cả số lượng và ngưỡng dùng đơn vị cơ sở của sản phẩm; giữ `decimal`, không làm tròn trước so sánh.
5. Số dòng tổng là số nhóm cảnh báo, không phải số InventoryStock, số vị trí hay tổng số lượng hàng.
6. `generatedAt` là thời điểm đọc thành công, không phải thời điểm từng hàng được sửa. Các panel tải độc lập không hứa là một snapshot giao dịch đồng thời.

### 5.2 Hai bảng ngưỡng

Đề xuất dùng **tồn khả dụng** cho cả hai phép so sánh để nhất quán với cảnh báo dưới ngưỡng hiện tại. Vì vậy tiêu đề/cột phải nói rõ “khả dụng”, không ghi chung “SL tồn” rồi tính một đại lượng khác.

- Khả dụng: tổng `QuantityOnHand - ReservedQuantity` trên các dòng đạt chất lượng, khả dụng, vị trí/kệ/khu hoạt động và lô sử dụng được theo rule hiện tại. Không tự clamp số âm hoặc đổi phép tính đã có mà không review tác động.
- Dưới tối thiểu: policy Active và `availableQuantity < MinStockThreshold`. Bằng min không cảnh báo. Policy có min > 0 nhưng chưa có dòng tồn vẫn phải ra cảnh báo với 0.
- Vượt tối đa: policy Active, max có giá trị và `availableQuantity > MaxStockThreshold`. Bằng max không cảnh báo; max null không được coi là 0. Nếu max = 0 hợp lệ theo validator hiện hành thì áp dụng đúng giá trị 0, không tự bỏ qua.
- Không tự tạo policy khi chưa cấu hình. Response cho biết có policy phù hợp hay chưa để FE phân biệt “Chưa cấu hình” với “Không có cảnh báo”. Có một số policy không có nghĩa toàn bộ danh mục đã được cấu hình; không hiển thị thông điệp khẳng định tất cả sản phẩm đều an toàn.
- Cột bản gọn: **Hàng hóa (tên + SKU), Kho, Khả dụng, Tối thiểu/Tối đa, ĐVT**.
- Bản xem tất cả thêm **Thiếu/Vượt** = chênh lệch dương với ngưỡng. Sắp xếp mức thiếu/vượt giảm dần, tiếp theo WarehouseId + ProductId để phân trang ổn định; không so xếp hạng bằng tổng lượng khác ĐVT ở cấp toàn kho.
- Nếu sau này muốn cảnh báo vượt max bằng tồn thực tế thay vì khả dụng, đó là thay đổi nghiệp vụ phải đổi đồng bộ nhãn/công thức/test; không trộn hai cách tính trong cùng phiên bản.

### 5.3 Hai bảng hạn dùng

- Đếm **tồn thực tế còn lại** `QuantityOnHand > 0`, không trừ giữ chỗ. Hàng đã giữ/cách ly/hỏng hoặc ở vị trí ngừng hoạt động vẫn có thể hết hạn và không được tự biến mất khỏi cảnh báo.
- Không tái sử dụng nguyên `UsableStocks` cho hai bảng này vì helper đó loại hàng hết hạn, dẫn đến bảng “Quá hạn” trống sai.
- Chỉ nhóm có lô hợp lệ và ExpiryDate mới tham gia. Không có HSD không có nghĩa là chưa hết hạn; không đưa vào hai bảng và không báo “đã kiểm tra toàn bộ hàng”.
- Sắp hết hạn: `evaluationDate <= expiryDate <= evaluationDate + N`, gồm cả hết hạn hôm nay; chưa bao gồm đã quá hạn. Mặc định N = 5, cho nhập số nguyên 1–365, có Hủy/Áp dụng và lỗi cạnh input.
- Quá hạn: `expiryDate < evaluationDate`. Hai tập không trùng nhau.
- Không yêu cầu trạng thái lưu của lô phải là Active để nhận diện đã quá hạn; dùng ngày và lượng thực tế còn lại, không chỉ dựa vào nhãn trạng thái lưu trong DB.
- Cột bản gọn: **Hàng hóa (tên + SKU), Kho, Số lô, Hạn dùng, Tồn thực tế, ĐVT**. Bản xem tất cả thêm **Còn lại/Quá hạn (ngày)**.
- Sắp hết hạn xếp HSD tăng dần; quá hạn xếp HSD tăng dần (cũ nhất trước), sau đó WarehouseId + ProductId + LotId để ổn định.

### 5.4 Mốc ngày — quyết định tương thích cần ghi rõ

Code hiện tại dùng ngày UTC trong `ProductLotRules.GetEffectiveStatus` và `WarehouseReportingReader.UsableStocks`; biểu đồ hoạt động lại chia ngày theo UTC+7. Không được vô tình đổi rule sử dụng lô toàn hệ thống trong một task đổi dashboard.

Đề xuất v1: hai bảng hạn dùng dùng **cùng ngày UTC đang được nghiệp vụ áp dụng**, trả `evaluationDate` + `timeBasis = UTC` để tooltip giải thích mốc đánh giá; thời điểm cập nhật vẫn hiển thị theo giờ Việt Nam. ExpiryDate là DateOnly, không chuyển timezone làm đổi ngày HSD.

Giới hạn đã biết: 00:00–06:59 giờ Việt Nam còn thuộc ngày UTC trước. Nếu người dùng muốn chuyển toàn hệ thống sang ngày nghiệp vụ Việt Nam, cần một hạng mục riêng thống nhất rule lô/khả dụng/import/xuất/điều chuyển/báo cáo và kiểm tra impact trước. Không chỉ sửa dashboard làm hai màn hình mâu thuẫn nhau.

Review bổ sung: `ReplenishmentPlanning.LoadAsync` đã dùng `DemandForecastCalculator.BusinessDate` (UTC+7), nên giữ UTC chỉ tương thích với rule lô/dashboard/tồn hiện tại, không đồng nhất mọi nghiệp vụ. Thêm test tại 00:30 Việt Nam: lô có HSD ngày UTC trước vẫn được dashboard đánh giá theo UTC, trong khi luồng bổ sung có thể loại khỏi khả dụng theo ngày Việt Nam. Tooltip phải nêu đúng ngày đánh giá; không khẳng định số liệu dashboard và forecast luôn bằng nhau.

## 6. Tương tác và trạng thái

| Thao tác                | Hành vi                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| Chọn kho                | Đổi phạm vi mọi phần, reset các trang về 1; không hiện dữ liệu kho cũ dưới nhãn kho mới             |
| Reload header           | Refetch dữ liệu của màn đang xem trong phạm vi hiện tại, giữ bộ lọc; không fetch chart chưa mở      |
| Reload một bảng         | Refetch đúng query của bảng đó, không làm ba bảng khác nháy hoặc reset                              |
| Đổi N ngày              | Áp dụng chỉ cho sắp hết hạn, reset trang của bảng đó; không ảnh hưởng biểu đồ/hết hạn               |
| Xem tất cả              | Mở Dialog rộng trong viewport, giữ đúng kho/nhóm/N; dùng bảng chung và phân trang server            |
| Mở tồn kho của sản phẩm | Link thật đến tồn kho với warehouseId + productId, chỉ khi đủ quyền INVENTORY_VIEW                  |
| Đổi kỳ 7/30/90          | Refetch overview hiện có (cả thống kê và chart trong cùng response), không reload bốn bảng cảnh báo |

- Mỗi panel quản lý loading/error/empty riêng. Initial load có skeleton theo cấu trúc bảng, không nhảy chiều cao từ không có gì sang cả card.
- Refetch giữ dữ liệu cũ **cùng query key**, spinner nhỏ và không đổi timestamp đến khi thành công. Nếu lỗi, ghi “Chưa tải lại được — đang hiển thị dữ liệu lúc …”, có thử lại; không giả thành bảng rỗng.
- Đổi tenant/user/quyền/kho/nhóm/N không được dùng placeholder cũ của phạm vi khác. 401/403 phải loại dữ liệu không còn được phép hiển thị và ẩn liên kết tương ứng.
- “Không có cảnh báo”, “Chưa cấu hình ngưỡng”, “Chưa có kho được phép”, “Không tải được dữ liệu” là các trạng thái khác nhau. Tải options kho lỗi không được hiểu là danh sách kho trống.
- Không hiển thị 0 trước khi API thành công. Không render cùng bảng desktop/mobile hai lần rồi để cả hai cùng fetch.
- Hộp Xem tất cả vẫn dùng quyền xem dashboard; không yêu cầu quyền tồn kho chỉ để đọc lại cảnh báo đã được phép xem. Quyền điều hướng sâu kiểm riêng.
- Bản gọn mỗi bảng mặc định 10 dòng/trang, footer chung không hiện bộ chọn pageSize để tiết kiệm chỗ. Xem tất cả dùng 10/20/30/50; state ở Page. Hai cách xem chia sẻ query/cache khi tham số giống nhau, không gọi API trùng vô ích.
- Search trong Xem tất cả là search server theo SKU/tên (và số lô đối với hạn dùng), debounce theo helper chung, reset trang 1. Không lọc trên 10 dòng hiện có rồi coi là toàn bộ kết quả.
- Xem tất cả của hạn dùng phải cho đọc đủ kho/lô/HSD. Link sang tồn kho hiện chỉ hỗ trợ warehouseId/productId, **chưa hỗ trợ lotId**; không gắn lotId giả rồi tuyên bố lọc đúng lô. Nếu muốn thêm deep-link lô, phải mở rộng route/query/test thật và review riêng.
- Trạng thái phạm vi kho, tab, nhóm cảnh báo và N nên phản ánh trên URL bằng router hiện có, validate đầu vào và giữ Back/Forward; không thêm thư viện state/router. Các page/modal state không chia sẻ ngoài dashboard giữ cục bộ.
- N giữ trong phiên/URL, không ghi cấu hình doanh nghiệp vào DB trong v1. Reload/copy URL có thể khôi phục N; không làm migration chỉ để lưu một lựa chọn xem.

## 7. Kế hoạch BE và hợp đồng API

### 7.1 Hai họ endpoint đọc, phục vụ bốn bảng

Đề xuất bổ sung trong `DashboardController`, giữ nguyên contract overview cũ:

```text
GET /api/dashboard/stock-alerts/thresholds
    ?kind=below-minimum|above-maximum
    &warehouseIds=...&pageNumber=1&pageSize=10&search=...

GET /api/dashboard/stock-alerts/expiry
    ?kind=expiring|expired&expiringDays=5
    &warehouseIds=...&pageNumber=1&pageSize=10&search=...
```

- Hai DTO dòng riêng cho ngưỡng/hạn dùng, không DTO khổng lồ nhiều trường null, không bốn controller gần giống nhau. `kind` là tập giá trị hữu hạn được validator kiểm tra; tên JSON chính xác chốt trong contract trước FE.
- Mỗi response bọc theo `ApiResponse<T>` chung; dữ liệu chứa `items`, `totalCount`, `pageNumber`, `pageSize`, `generatedAt`, `appliedWarehouseIds`; hạn dùng thêm `evaluationDate`, `timeBasis`, N đã áp dụng. Ngưỡng thêm số policy phù hợp trước lọc search/cảnh báo để phân biệt chưa cấu hình.
- DTO đặt ở `Contract/Models/Dashboard`; query/validator/handler ở Application Features Dashboard. Controller chỉ gửi query qua ISender.
- Tái sử dụng `DashboardPermissions.View`, `IReportingScopeResolver`, `IWarehouseReportingReader`; không tạo dịch vụ CRUD/repository/layer mới. Nếu reader lớn, thêm partial file cho cảnh báo trong cùng reader, không gom mọi query mới vào method overview.
- Validator: GUID không rỗng, tối đa 100 kho như overview hiện có, pageNumber >= 1, pageSize 1–50, search giới hạn 200 ký tự, N nguyên 1–365 khi kind=expiring. kind=expired không dùng N để thay đổi kết quả.
- Query AsNoTracking, aggregate/count/order/paging ở DB trước materialize; không load cả tồn lên FE, không N+1 theo từng SKU/kho/lô.
- Không chạy các truy vấn EF song song trên cùng DbContext. FE có thể request độc lập; trong từng request reader await theo trình tự an toàn.
- Không đổi payload overview hiện có. Tái sử dụng cùng projection/định nghĩa dưới min để metric `lowStockCount` và bảng mới không khác nhau khi cùng phạm vi; thứ tự mới phải có tie-breaker.
- Giữ `generatedAt` là mốc đọc gần đúng, không thêm khóa ghi hoặc transaction isolation mới chỉ để ép bốn bảng thành snapshot nguyên tử. Count/items có thể đổi giữa hai lượt đọc khi kho có nghiệp vụ đồng thời; xử lý trang vượt cuối, không dùng dashboard làm căn cứ ghi tồn.

### 7.2 Hiệu năng và phạm vi tải

- Tab cảnh báo tối đa bốn request danh sách. Grid tải mỗi bảng theo trang hiện tại; bản hẹp tải bảng đang chọn 10 dòng và ba nhóm còn lại tối đa 1 dòng/nhóm để giữ chỉ báo tổng. Không render hai bộ component để điều khiển fetch theo CSS.
- Overview hiện có chỉ cần khi mở Hoạt động kho; không gọi nó để lấy một số tổng rồi tiếp tục gọi trùng các cảnh báo.
- API overview hiện gộp chart và thống kê: mở phần Chỉ số hoặc đổi kỳ vẫn tính cả response này. Cam kết không tải chart chưa mở chỉ áp dụng khi chưa vào Hoạt động kho; không tách endpoint chart trong task này.
- Không thêm cache BE, index hay virtualization trước khi đo. Giới hạn pageSize 50 đã kiểm soát lượng DOM; nếu cần index sau kiểm tra SQL thì tách migration có phê duyệt.
- Kiểm tra SQL translation với provider SQL Server, không xem test InMemory là đủ chứng nhận query chạy được trên SQL Server.

## 8. Kế hoạch FE

1. Chốt/đọc DTO và validator BE; cập nhật Zod schema → type suy ra → service → hook → Page → component. Không tự đặt alias field khác JSON BE.
2. Giữ `WarehouseOverviewPage` quản lý API hooks, phạm vi, tab, trang, search và capability; component trình bày nhận props/callbacks, không tự fetch.
3. Query key giữ tenantId + userId + permissionKey như hiện tại, thêm loại cảnh báo/kho/N/page/pageSize/search. N chỉ tham gia key sắp hết hạn, activityDays chỉ key overview hoạt động.
4. Tách UI vừa đủ trong `components/WarehouseOverview/`: bảng ngưỡng, bảng hạn dùng, dialog xem tất cả và popover N. Hai bảng ngưỡng dùng chung composition thực sự; không xây schema-driven dashboard framework.
5. Tái sử dụng `OverviewMetric`, `WarehouseActivityChart`, formatter, helper debounce và primitives hiện có. Xuất component qua barrel hiện tại.
6. Nếu một primitive thực sự thiếu, kiểm tra official docs và thêm qua shadcn CLI theo rule; dự kiến không cần dependency mới.
7. Không đụng API ghi tồn, quyền phân công kho, form nhập đầu kỳ, layout table toàn hệ thống hay rule lô chung nếu chưa có nhu cầu được duyệt riêng.
8. Cập nhật README dashboard theo source hiện hành và tài liệu kiểm thử sau triển khai; không ghi “đã test” khi chỉ lập kế hoạch.

## 9. Khả năng sử dụng và accessibility

- Mọi panel có aria-label/labelledby; heading đúng cấp. Icon reload/cài đặt có tooltip + accessible name riêng từng bảng.
- Dùng Button cho action, Link cho điều hướng, không div onClick hoặc biến TableRow thành nút thiếu hỗ trợ bàn phím.
- Select có label; Dialog/Popover quản lý focus bằng primitive, Escape đóng, trả focus về nút mở, nội dung không tràn dưới màn hình.
- Focus-visible không bị border sticky che; kiểm tra Tab/Shift+Tab/Enter/Space. Không khóa zoom.
- Ô N có nhãn, min/max, báo lỗi tại chỗ; Hủy không làm query đổi N.
- Thông báo cập nhật dùng vùng aria-live gọn, không đọc lại cả bảng sau mỗi render. Spinner tôn trọng reduced motion.
- Không dựa riêng vào màu/tooltip để truyền tải “hết hạn”, “thiếu”, “vượt”. Nội dung dài có thể đọc bằng bàn phím.
- Các tiêu chí bổ sung tham khảo [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md); rule/layout/token Kovia vẫn là ưu tiên.

## 10. Thứ tự thực hiện và điều kiện qua bước

| Bước             | Công việc                                                      | Điều kiện hoàn thành                                                              |
| ---------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A. Chốt contract | Review công thức, mốc ngày UTC tương thích, mock bố cục và DTO | Không còn nhầm khả dụng/tồn thực tế; không hứa deep-link lô chưa có               |
| B. BE            | Hai query/API đọc, scope, projection, validator, DTO           | Test logic + quyền + SQL translation qua; không phát sinh migration ngoài dự kiến |
| C. FE data       | Schema/service/hook/query-key, state kho/tab/paging            | Contract test qua; không lộ cache giữa tenant/kho; refresh độc lập thật           |
| D. UI            | Grid cảnh báo, biến thể hẹp, Dialog xem tất cả, hoạt động kho  | Dùng table chung, border/scroll đúng, mọi nút có hành vi                          |
| E. QA            | Unit/component + build/type/lint + browser responsive          | Checklist dưới đây qua và nêu rõ phần chưa kiểm                                   |
| F. Bàn giao      | Cập nhật README, AI_REVIEW theo workflow và báo kết quả        | Không tự commit/push/PR khi chưa được yêu cầu                                     |

Đã chạy GitNexus impact trước khi sửa controller/interface/reader/Page/View hiện có: LOW; kiểm tra thủ công các wrapper Owner/Manager. Symbol mới chưa có trong index không được xem là đã chứng nhận tác động.

## 11. Checklist kiểm thử và nghiệm thu

### BE

- [ ] Không quyền dashboard, khác tenant, kho không được phép, không có kho; FE gửi ID giả không vượt scope.
- [ ] Policy inactive, không policy, min 0, max null/0, đúng bằng ngưỡng, tồn 0 không có stock row, lượng thập phân, nhiều vị trí và giữ chỗ.
- [ ] Dưới min dùng cùng định nghĩa với overview cũ; hàng hỏng/khóa/hết hạn/vị trí inactive không được tính thành khả dụng.
- [ ] Expiry: hôm qua/hôm nay/ngày N/ngày N+1, N biên 1/365 và N sai, không HSD, hết hàng, lô locked/expired còn tồn, vị trí inactive còn tồn.
- [ ] Ngày UTC/VN khác nhau lúc 00:00–06:59 VN có kết quả đúng quyết định mục 5.4 và đối chiếu với BusinessDate của forecasting, không đổi DateOnly qua timezone.
- [ ] Không double-count do join/policy; cùng lot ở nhiều vị trí được gom; cùng số lô khác ID không bị nhập chung.
- [ ] Tổng/paging/search thực hiện trước Take; thứ tự ổn định, trang cuối mất dữ liệu được đưa về trang hợp lệ.
- [ ] Query ngưỡng và expiry dịch được thành SQL Server bằng ToQueryString không kết nối DB; test không tracking/không gọi SaveChanges trong query.
- [ ] Không thay đổi contract cũ hoặc ngầm đổi quyền; test hồi quy reporting/dashboard liên quan.

### FE và browser

- [ ] Loading/empty/no-policy/options-error/panel-error/stale/401/403 và không nháy số 0 giả.
- [ ] Đổi kho nhanh A → B không hiện response A dưới nhãn B; đổi tenant/quyền không dùng cache sai.
- [ ] Reload từng bảng không gọi các bảng khác; reload chung giữ filter; đổi 7/30/90 không query lại cảnh báo.
- [ ] Dialog đúng kho/loại/N; search và pageSize reset page; total footer từ server; Hủy N không thay đổi truy vấn.
- [ ] Link đủ quyền, giữ warehouseId/productId; không có quyền vẫn đọc cảnh báo nhưng không thấy action điều hướng bị cấm.
- [ ] Sidebar mở/đóng; 1920×1080, 1536×864, 1366×768, 1024×768, 768×1024, 390×844; zoom 80/100/125/150/200%.
- [ ] Màn hình hẹp vẫn thấy chỉ báo cả bốn nhóm, không bỏ sót quá hạn khi nhóm đang chọn trống; tổng nhóm không bị search trong Dialog thay đổi.
- [ ] Không mất border trái/phải, footer không bị cắt, không page overflow, tên dài/SKU/lô dài không đẩy reload khỏi hàng.
- [ ] Table body cuộn bằng chuột/trackpad/bàn phím; sticky header và footer không che focus; không scrollbar kép.
- [ ] Bàn phím và reduced motion; màu tương phản cả theme đang hỗ trợ; dialog trở về focus đúng.
- [ ] Build production, typecheck, lint các file chạm và test feature chạy qua; báo riêng giới hạn bộ test/fixture cũ nếu có.

## 12. An toàn thực thi

- Làm trên BE `feat/huytv`, FE `screen/huytv`; kiểm tra lại branch/status ngay trước lúc triển khai. Giữ nguyên thay đổi local của người dùng trong AGENTS/CLAUDE/appsettings.
- Không bật local BE/FE chỉ để viết kế hoạch. Khi được yêu cầu chạy app, tuân theo shared AGENTS: xác minh cấu hình hiệu lực và đặt `Database__ApplyMigrationsOnStartup=false` cho lần chạy của agent.
- Không dùng startup làm kiểm tra migration; không đổi thiết lập host của người dùng qua task dashboard.
- Không seed/cleanup/repair hoặc direct SQL write lên `db71143`; không drop/reset/truncate/EnsureDeleted/destructive rollback. Migration cần tên/tác dụng cụ thể và phép riêng trước khi áp.
- Unit/contract/SQL translation dùng fixture cách ly không chạm DB triển khai. Không chạy thêm test nhóm có SQL write khi chưa chứng minh target và có quyền tương ứng.
- Không tạo bản sao repo, folder bt_copy, heap dump hoặc nhiều build cache/tmp. Tận dụng workspace/dependency hiện có; build tốn dung lượng phải kiểm tra dung lượng trước.

**Kết quả mong đợi:** bốn cảnh báo dễ đọc ngay khi vào Tổng quan, số liệu có định nghĩa rõ, thao tác lọc/reload nhất quán, xem đầy đủ bằng bảng dùng chung, không làm đổi số tồn hay quyền của người dùng.

## 13. Kết quả triển khai và phạm vi chứng minh

- Đã bổ sung hai API đọc, DTO, validator, reporting scope và aggregate/paging/search phía BE; không migration, dependency mới hoặc API ghi. Giữ UTC theo mục 5.4; test riêng khác biệt UTC+7 của forecasting.
- Đã nối schema → service → query → Page → UI; bốn cảnh báo dùng OperationalListPanel/Table/OperationalPagination, xem đầy đủ trong Dialog, popover N ngày và tab Hoạt động tái sử dụng metric/chart hiện có. Xem tất cả nằm trên header ngay trước reload để dễ tìm ở viewport thấp.
- Grid dùng 2 × 2 khi vùng nội dung đủ rộng/cao; biến thể hẹp dùng ToggleGroup có đủ bốn tổng. Viewport cao tối đa 500px giảm khoảng cách và ẩn dòng snapshot bản gọn để giữ vùng dữ liệu; thông tin thời điểm vẫn có trong title/header và bản xem đầy đủ.
- BE: 18/18 test dashboard/reporting liên quan; full suite an toàn 1.586 passed, 4 skipped (1.590 selected). Hai nhóm SQL Server ghi thật bị loại, các test SQL opt-in không chạy. Query SQL Server có kiểm tra translation không kết nối bằng ToQueryString; không coi đó là HTTP/SQL integration.
- FE: full suite 1.360/1.360 qua trước chỉnh sửa cuối; chạy lại toàn feature dashboard sau chỉnh sửa cuối 36/36 qua, gồm reset riêng trang sắp hết hạn và giữ trang quá hạn khi đổi N. Production typecheck và scoped ESLint; production build theo kết quả ghi trong AI_REVIEW.
- Browser dùng UI thật với dữ liệu mẫu cách ly, không gọi API/DB. Đã đo 1920×1080, 1536×864, 1366×768, 1024×768, 768×1024, 390×844 và khung thấp 683×384: không tràn toàn trang, thân bảng/footer còn trong viewport. Đã kiểm tra chọn nhóm, Dialog, nhập/áp dụng N và đổi Chỉ số/Biểu đồ.
- Đã sửa lỗi tên dài đẩy cột số khỏi bảng và lỗi vùng dữ liệu về 0 ở viewport thấp phát hiện trong browser QA. Kiểm tra bằng fixture không thay thế QA dữ liệu thật/quyền thật.
- Chưa chứng nhận toàn bộ checklist mục 11: chưa chạy ma trận zoom thật 80/100/125/150/200%, sidebar mở/đóng đầy đủ, dark theme/reduced-motion/focus toàn diện hoặc SQL concurrency. Giữ checklist chưa đánh dấu thay vì tự coi tất cả đạt.
- Không tự commit/push/PR, không khởi động BE/FE chính, không thay đổi DB triển khai. Các chỉnh sửa AGENTS/CLAUDE/appsettings có trước được giữ nguyên.
