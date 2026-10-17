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
- Bốn query riêng, reload từng bảng độc lập. Màn hình hẹp hiển thị một bảng và bốn lựa chọn có tổng số ngay trên nút; nhóm chưa mở chỉ lấy 1 dòng để có totalCount.
- “Xem tất cả” dùng Dialog rộng, bảng dùng chung, search server và page size 10/20/30/50. Preview không bị search của Dialog thay đổi.
- Query key gồm tenant, user, permissionKey, kho, loại, trang/cỡ trang và search. N chỉ thuộc key sắp hết hạn. Không dùng placeholder từ kho/tenant khác; dữ liệu bị từ chối 401/403 không được hiển thị.
- Link hàng hóa chỉ xuất hiện khi có INVENTORY_VIEW và giữ warehouseId/productId. Route tồn kho chưa lọc lotId; không tuyên bố là link lọc đúng lô.

### Hoạt động kho

Tái sử dụng GET `/dashboard/overview` với activityDays = 7/30/90. API vẫn gộp thống kê và biểu đồ; đổi kỳ refetch cả overview nhưng không refetch bốn bảng cảnh báo. API này chỉ bật khi mở tab Hoạt động kho. Giữ chỉ số công việc, chứng từ, tồn giữ/cách ly và vị trí; không cộng lượng khác ĐVT thành một tổng.

## Mốc ngày và giới hạn

Ngày đánh giá HSD dùng UTC để tương thích `ProductLotRules`/khả dụng hiện có; UI trả/hiển thị evaluationDate và UTC. `ExpiryDate` là DateOnly, không chuyển timezone. Sắp hết hạn gồm hôm nay đến hôm nay + N (N nguyên 1–365); quá hạn nhỏ hơn ngày đánh giá.

`ReplenishmentPlanning` và biểu đồ hoạt động dùng ngày Việt Nam UTC+7. Vì vậy 00:00–06:59 VN có thể lệch ngày đánh giá với forecast. Task này không âm thầm đổi quy tắc lô toàn hệ thống. Thời điểm cập nhật hiển thị theo giờ Việt Nam, chỉ đổi sau đọc thành công; bốn bảng không phải snapshot giao dịch nguyên tử.

## UI và bố cục

- Dùng `OperationalListPanel`, `Table`, `OperationalPagination`; header/footer cố định, chỉ body cuộn, scrollbar chung.
- Root → Tabs → TabsContent → Grid có min-h-0/min-w-0/flex-1 đúng chuỗi. Không thêm gutter hoặc công thức chiều cao viewport nghiệp vụ.
- Desktop đủ diện tích: grid 2 × 2. Hẹp/thấp: một bảng + bộ chọn nhóm có số lượng; ở viewport rất thấp giảm khoảng cách và đưa “Xem tất cả” lên header, snapshot vẫn đọc được trong Dialog.
- Reload ở bên phải. Tên dài xuống tối đa hai dòng ở preview, đầy đủ trong Dialog. Không để tên hàng đẩy cột số ra khỏi bảng.
- Phân biệt tải lần đầu, lỗi, dữ liệu cũ khi reload thất bại, không có cảnh báo, chưa cấu hình policy và không có kho được phép. Không hiển thị tổng 0 giả lúc chưa tải.
- Lựa chọn kho/tab/nhóm/N phản ánh trên URL qua Next navigation/native history, không thêm thư viện.

## Kiểm thử và vận hành

- Test tại `schemas/stock-alert.schema.test.ts`, `services/stock-alert.service.test.ts`, các test hook, `StockAlertPanel.test.tsx`, `WarehouseOverviewPage.test.tsx`.
- BE: `Application.Tests/Features/Dashboard/StockAlertTests.cs` và bộ reporting hiện có; fixture InMemory và SQL Server ToQueryString không mở kết nối.
- Chưa chứng nhận HTTP end-to-end/hiệu năng trên DB triển khai. FE và BE mới phải được đưa lên cùng đợt; FE cũ vẫn dùng được overview cũ khi BE mới triển khai trước.
- Không migration, polling, tự ghi tồn hoặc thay đổi quyền trong tính năng này. Không khởi động BE với startup migration bật khi kiểm thử.

Kế hoạch và checklist chi tiết: [warehouse overview redesign](../../../docs/superpowers/plans/2026-10-17-warehouse-overview-redesign-plan.md).
