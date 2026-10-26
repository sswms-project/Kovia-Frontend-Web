# Hoạt động kho — điều chỉnh bố cục

Nhánh: `screen/huytv`. Phạm vi: tab Hoạt động kho của Tổng quan kho, không đổi tab cảnh báo tồn kho, API hoặc nghiệp vụ.

## Bố cục

- Bốn ô chỉ số hiện tại gọn, một hàng trên màn hình rộng; link chi tiết có tên truy cập cụ thể và chỉ xuất hiện khi Page truyền capability. Component mới dùng riêng cho tab này; `OverviewMetric`/dashboard nhân viên không bị thay đổi.
- Phần dưới dùng tỷ lệ 3:2 cho biểu đồ và bảng. Biểu đồ có border bốn cạnh, header tích hợp kỳ 7/30/90 ngày, ngày bắt đầu/kết thúc theo định dạng Việt Nam và hai tổng số chứng từ hoàn tất. Biểu đồ giãn theo chiều cao còn lại, không cố định 256px hoặc có một vùng scroll thứ hai.
- Bảng `OperationalListPanel`/Table chung chia nhóm Chứng từ chờ xử lý, Tồn kho & công việc, Bố trí kho. Màn hình rộng không lặp lại bốn giá trị tổng. Chỉ body bảng cuộn, header/ghi chú cố định. Dự báo & bổ sung nằm trong header bảng, không chiếm thêm hàng riêng.
- Compact giữ lựa chọn Chỉ số/Biểu đồ hiện có. Khi chọn Chỉ số vẫn có đủ bốn giá trị tổng vì các ô trên không hiển thị. Không ép hai cột lên màn hình hẹp. Kỳ hoạt động chỉ tác động biểu đồ, không đổi ý nghĩa chỉ số tồn hiện tại; tỷ lệ vị trí có hàng không được trình bày thành sức chứa khối lượng/thể tích.

## Kiểm tra

- Dashboard: **8 files / 55 tests passed**. Sáu test mới kiểm tổng chứng từ, không lặp chỉ số ở bảng rộng, grouping, link có scope/quyền, kỳ trong biểu đồ, tổng hoàn tất/ngày, hai chế độ compact, zero active slots, retry và dữ liệu cũ.
- Scoped ESLint, production TypeScript và diff whitespace check đạt. Không chạy full suite/full build; test biểu đồ mock Recharts để kiểm dữ liệu/header/control, không thay thế kiểm tra rendering biểu đồ thật.
- Đã xem biểu đồ thật và bố cục rộng trên Edge local; không sửa dữ liệu hoặc thực hiện giao dịch. Ảnh: `2026-10-18-warehouse-activity-layout.png`. Chưa chứng nhận ma trận viewport hẹp, theme tối, zoom và keyboard toàn bộ; compact có regression test.
- React/shadcn/Ponytail dẫn đến tái sử dụng primitives hiện có, không dependency mới. GitNexus báo OverviewMetric HIGH nên không sửa component đó; Chart LOW, OperationsView chưa được index nên đã kiểm tra trực tiếp Page và tests. Không thay đổi BE/DB, migration, khởi động lại ứng dụng, commit/push hoặc tạo thư mục temp.
