# Tổng quan kho Kovia

Owner (`/dashboard/tenant`) và Manager (`/dashboard/manager`) cùng dùng `WarehouseOverviewPage`. RoleGuard điều hướng giao diện; BE kiểm tra `DashboardPermissions.View`, tenant và phạm vi kho cho mọi API. Không cấp quyền bằng tên vai trò. Dashboard Staff/Admin không đổi trong task thiết kế lại này.

## Dữ liệu thật và luồng đọc

```text
Page → React Query hook → service/Axios → Zod response
     → DashboardController → query handler → ReportingScopeResolver → WarehouseReportingReader
```

Các view đang dùng API thật, không dùng `utils/sample-data.ts`. Những component/sample cũ còn trong thư mục không phải nguồn dữ liệu của tổng quan hiện hành.

### Cảnh báo tồn kho

- Dưới tối thiểu / vượt tối đa: so **tồn khả dụng** với policy Active; max null không phải 0. Số lượng và ngưỡng dùng ĐVT cơ sở. Không tự tạo policy.
- Sắp hết hạn / quá hạn: tính **tồn thực tế còn lại**, không trừ giữ chỗ và không giấu hàng hỏng/cách ly/vị trí inactive còn hàng. Gom theo kho + sản phẩm + LotId.
- GET `/dashboard/stock-alerts/thresholds?kind=below-minimum|above-maximum`.
- GET `/dashboard/stock-alerts/expiry?kind=expiring|expired&expiringDays=5`.
- Hai họ API nhận warehouseIds, pageNumber, pageSize (1–50), search (tối đa 200 ký tự); FE serialize mảng kho cùng kiểu overview hiện có.
- Tổng quan chỉ hiển thị hai bảng: dưới tối thiểu và sắp hết hạn. API vượt tối đa/quá hạn vẫn giữ cho nơi khác; URL cũ trỏ tới hai nhóm đó rơi về dưới tối thiểu.
- Hai query bảng riêng, reload từng bảng độc lập. Màn hình hẹp hiển thị một bảng và hai lựa chọn có tổng số ngay trên nút.
- Phía trên hai bảng có ba thẻ số và ba biểu đồ (`AlertOverviewCharts`): dưới tối thiểu lấy 6 dòng đầu của API ngưỡng (đã xếp thiếu nhiều nhất trước) và vẽ % khả dụng so với tối thiểu; sắp hết hạn đọc GET `/dashboard/stock-alerts/expiry-distribution?expiringDays=N` (số lô theo số ngày còn lại) rồi gom khoảng ở FE (`utils/expiry-buckets.ts`); bất thường đọc `newLast14Days` của GET `/inventory-anomalies/summary` (ngày Việt Nam). Thẻ và biểu đồ bất thường chỉ hiện khi có `inventory-anomalies:view`; lỗi 403 của nó không khóa cả tổng quan.
- “Xem tất cả” dùng Dialog rộng, bảng dùng chung, search server và page size 10/20/30/50. Preview không bị search của Dialog thay đổi.
- Query key gồm tenant, user, permissionKey, kho, loại, trang/cỡ trang và search. N chỉ thuộc key sắp hết hạn. Không dùng placeholder từ kho/tenant khác; dữ liệu bị từ chối 401/403 không được hiển thị.
- Link hàng hóa chỉ xuất hiện khi có INVENTORY_VIEW và giữ warehouseId/productId. Route tồn kho chưa lọc lotId; không tuyên bố là link lọc đúng lô.

### Hoạt động kho

GET `/dashboard/overview` nhận `dateFrom`/`dateTo` theo ngày lịch Việt Nam, gồm cả hai đầu, tối đa 366 ngày. UI hỗ trợ tuần ISO (thứ Hai–Chủ nhật), tháng, quý, năm và khoảng ngày tùy chọn; chỉ gửi khi bấm Áp dụng. Kỳ đã áp dụng lưu trên URL và mặc định là tháng hiện tại ở Việt Nam. BE giữ `activityDays=7/30/90` cùng chuỗi ngày cũ để tương thích client trước đó.

API trả `activityGranularity`: tối đa 31 ngày nhóm theo ngày, 32–93 ngày theo tuần, dài hơn theo tháng; tuần/tháng đầu và cuối chỉ tính phần trong khoảng đã chọn. Các kỳ trống được điền 0. FE kiểm tra ngày trả về khớp ngày yêu cầu, không hiển thị nhầm số liệu từ BE cũ.

FE đọc chỉ số hiện tại qua `/dashboard/overview?includeActivity=false` và biểu đồ qua `/dashboard/activity`, không gọi lại toàn bộ phép đếm cho biểu đồ. Endpoint cũ vẫn mặc định trả đủ cả hai để tương thích client cũ. Hai query key độc lập gồm tenant, user, quyền, kho và kỳ tương ứng; truyền AbortSignal để hủy request cũ khi đổi bộ lọc. Đổi kỳ chỉ cập nhật query biểu đồ; giữ nguyên các ô thống kê và bảng chi tiết, trạng thái tải/lỗi/thử lại nằm trong biểu đồ. Hai query chỉ bật khi mở tab Hoạt động kho. Bộ lọc căn phải trong header biểu đồ, khoảng ngày mở rộng về trái và xuống dòng khi thiếu chiều rộng. Chỉ chuỗi phiếu hoàn tất thay đổi theo kỳ; không cộng lượng khác ĐVT thành một tổng.

Cảnh báo có dữ liệu dùng icon, nhãn và màu ngữ nghĩa: đỏ cho quá hạn/thiếu tồn, cam cho sắp hết hạn/vượt tối đa. Không tô cả bảng; kết quả rỗng hoặc đang tải giữ màu trung tính. Ngưỡng nghiệp vụ không thay đổi.

## Mốc ngày và giới hạn

Ngày đánh giá HSD dùng UTC để tương thích `ProductLotRules`/khả dụng hiện có; UI trả/hiển thị evaluationDate và UTC. `ExpiryDate` là DateOnly, không chuyển timezone. Sắp hết hạn gồm hôm nay đến hôm nay + N (N nguyên 1–365); quá hạn nhỏ hơn ngày đánh giá.

`ReplenishmentPlanning` và biểu đồ hoạt động dùng ngày Việt Nam UTC+7. Vì vậy 00:00–06:59 VN có thể lệch ngày đánh giá với forecast. Task này không âm thầm đổi quy tắc lô toàn hệ thống. Thời điểm cập nhật hiển thị theo giờ Việt Nam, chỉ đổi sau đọc thành công; các bảng và biểu đồ không phải snapshot giao dịch nguyên tử.

## UI và bố cục

- Dùng `OperationalListPanel`, `Table`, `OperationalPagination`; header/footer cố định, chỉ body cuộn, scrollbar chung.
- Root → Tabs → TabsContent → Grid có min-h-0/min-w-0/flex-1 đúng chuỗi. Không thêm gutter hoặc công thức chiều cao viewport nghiệp vụ.
- Desktop đủ diện tích: thẻ số, hàng biểu đồ, rồi hai bảng cạnh nhau (cao tối thiểu 22rem, tab cuộn). Hẹp/thấp: một bảng + bộ chọn nhóm có số lượng; ở viewport rất thấp giảm khoảng cách và đưa “Xem tất cả” lên header, snapshot vẫn đọc được trong Dialog.
- Reload ở bên phải. Tên dài xuống tối đa hai dòng ở preview, đầy đủ trong Dialog. Không để tên hàng đẩy cột số ra khỏi bảng.
- Thời điểm cập nhật và ngày đánh giá UTC nằm giữa footer phân trang, không tạo hàng riêng ở header hay phía dưới bảng; áp dụng cả preview và Dialog.
- Phân biệt tải lần đầu, lỗi, dữ liệu cũ khi reload thất bại, không có cảnh báo, chưa cấu hình policy và không có kho được phép. Không hiển thị tổng 0 giả lúc chưa tải.
- Lựa chọn kho/tab/nhóm/N phản ánh trên URL qua Next navigation/native history, không thêm thư viện.

## Kiểm thử và vận hành

- Test tại `schemas/stock-alert.schema.test.ts`, `services/stock-alert.service.test.ts`, các test hook, `StockAlertPanel.test.tsx`, `WarehouseOverviewPage.test.tsx`.
- BE: `Application.Tests/Features/Dashboard/StockAlertTests.cs` và bộ reporting hiện có; fixture InMemory và SQL Server ToQueryString không mở kết nối.
- Đo đọc SQL tại kho Đà Nẵng 19/10/2026 (không mở host/không ghi dữ liệu): bản cũ 24 SELECT và 5.464–6.493 ms cho một overview; bản mới 15 SELECT và 3.441–3.959 ms cho chỉ số, 2 SELECT và 476–508 ms cho biểu đồ. Đây là hai lượt đo reader cùng phạm vi, không phải SLA HTTP hay load test. Browser kiểm tra đổi tháng/năm chỉ tải biểu đồ. FE và BE mới phải được đưa lên cùng đợt; FE cũ vẫn dùng được overview cũ khi BE mới triển khai trước.
- Không migration, polling, tự ghi tồn hoặc thay đổi quyền trong tính năng này. Không khởi động BE với startup migration bật khi kiểm thử.

Kế hoạch và checklist chi tiết: [warehouse overview redesign](../../../docs/superpowers/plans/2026-10-17-warehouse-overview-redesign-plan.md).
