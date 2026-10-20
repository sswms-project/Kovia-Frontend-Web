# Điều chuyển kho — tinh gọn thao tác (20/10/2026)

## Phạm vi đã được duyệt

Thực hiện phần 2 và 3 của đề xuất tối ưu điều chuyển: giảm bước UI thường ngày, không gộp các mốc nghiệp vụ ghi tồn. Giữ quyền hiệu lực, phạm vi kho, cách ly doanh nghiệp và dữ liệu lịch sử.

## Luồng và giao diện

1. **Chuẩn bị xuất** mặc định chọn toàn bộ phần còn lại trong một chuyến. Bật “Chia hàng thành nhiều chuyến” mới sửa lựa chọn/số lượng. Người có quyền phân công chọn người lấy ngay trong cùng xác nhận; vẫn được giao sau. “Tôi thực hiện” chỉ hiện nếu chính người xem nằm trong danh sách đủ điều kiện của BE.
2. Mở rộng API tạo đợt hiện có bằng `staffId`, `expectedVersion`, `commandId`, không tạo endpoint/sơ đồ dữ liệu mới. Tạo đợt, công việc, phân công, lịch sử và thông báo được stage trong cùng lần lưu. Không nối hai API ghi từ FE. Hợp đồng cũ không phân công vẫn được hỗ trợ.
3. Chi tiết phiếu có **Thực hiện – Hàng hóa – Lịch sử**. URL tab cũ được ánh xạ về Thực hiện. Thông tin phiếu và hàng hóa từng đợt thu gọn; người phụ trách/trạng thái và một hành động chính mỗi đợt luôn nhìn thấy. Điều chỉnh phân bổ, lập kế hoạch cất, giao lại, mở lại và hủy nằm ở “Thao tác khác”. Chênh lệch/phản hồi chỉ xuất hiện khi có dữ liệu.
4. **Lấy hàng liên tục**: bảng dùng `OperationalListPanel` và vùng quét cố định bên cạnh (xếp dọc trên màn nhỏ). Vẫn quét vị trí → mã hàng → số lượng. Chỉ chuyển tiếp sau khi ghi thành công và đọc phiếu mới; ưu tiên phần còn lại của cùng dòng, sau đó dòng khác không chờ quản lý. Giữ popup cho đổi vị trí/lô, báo thiếu và trả hàng; chi tiết lấy/trả/báo cáo cũ vẫn xem được.
5. **Kiểm nhận → cất**: sau khi nộp thành công, đọc lại phiếu và phân công. Chỉ tự mở cất khi còn hàng tốt, đúng người được giao cất và đủ quyền; nếu khác người thì hiển thị tên người phụ trách hoặc trạng thái chờ phân công. Không tự nộp cất, không tự cấp quyền.
6. “Việc cần làm” ở danh sách trở thành liên kết vào tab Thực hiện/Lịch sử; không tự chạy lệnh ghi từ danh sách.

## An toàn bắt buộc

- Chuẩn bị xuất chưa trừ tồn. Vẫn cần xác nhận xe rời kho để ghi xuất; kiểm nhận chưa tăng tồn; chỉ cất hàng tốt mới tăng tồn đích. Hàng hỏng/thiếu xử lý riêng.
- BE kiểm lại Dispatch, quyền Assign nếu có người nhận, kho nguồn, điều kiện người nhận, RowVersion và giới hạn số lượng. Không so sánh tên vai trò để cấp quyền mới.
- FE giữ phiên bản tại lúc mở form. Không mượn phiên bản realtime mới cho nội dung form cũ.
- Khóa xác nhận trùng trước render pending. Khi mất kết nối, đóng băng payload/command ID và chỉ cho thử lại đúng thao tác. Cảnh báo trước khi rời trang chưa rõ kết quả.
- Ghi lấy thành công nhưng đọc lại thất bại: chặn lượt mới, yêu cầu tải lại; không tiếp tục từ số lượng cũ.
- Không migration, không seed, không sửa/xóa dữ liệu deploy. Chạy local với `Database__ApplyMigrationsOnStartup=false`.

### Bổ sung sau review quyền và phạm vi kho

- Người được giao lấy/nhận/cất phải thuộc đúng kho, đang hoạt động và có quyền Xem điều chuyển, Thực hiện việc của mình cùng quyền Lấy/Nhận tương ứng. Không tự cấp quyền khi giao việc.
- Nhân viên chỉ thao tác việc được giao. Kho nhập làm thay cần Nhận + Phân công; kho nguồn giữ quyền Xuất làm thay lấy hàng hiện có. Tenant Owner giữ ngoại lệ phạm vi/doanh nghiệp hiện tại, không vượt tenant.
- Màn lấy hàng đồng bộ capability với BE; chưa đọc được phân công thì không bật thao tác. Liên kết xem lấy chỉ dành cho kho nguồn, xem nhận/cất dành cho kho nhập (hoặc chủ), có quyền Xem; không hiện menu rỗng.

## Kiểm chứng và giới hạn

- Kiểm thử InMemory BE cho nguyên tử lưu, replay, quyền người giao/người nhận, phạm vi kho, tenant, phiên bản cũ, lịch sử/thông báo và tồn không đổi khi chuẩn bị.
- Kiểm thử FE cho mặc định một chuyến, chia đợt, phân công cùng payload, chống trùng/đóng băng lệnh, tự chuyển dòng, chặn khi đọc mới lỗi, tab/deep link và điều hướng cất đúng người.
- Có build production FE và Release BE; chi tiết kết quả cuối cùng ghi trong `docs/AI_REVIEW.md` của hai repo.
- Không chạy bài race dùng SQL Server hay QA ghi dữ liệu trên deploy. Đã quan sát form/chi tiết tại viewport hẹp; kiểm tra trình duyệt tiếp bị chặn vì browser use bị tắt trong Work settings. Cần người dùng kiểm tra trực tiếp màn rộng và luồng nhập liệu thực tế.
