# Đồng bộ bộ lọc khu vực Tồn kho

1. Dùng chung thanh công cụ, ô tìm kiếm, chọn kho và bảng trượt bộ lọc cho chín tab.
2. Giữ kho khi chuyển tab, nhớ điều kiện riêng theo tab và đặt lại phân trang khi thay đổi bộ lọc. Vị trí được gắn với kho đã chọn.
3. Lọc trên máy chủ trước phân trang với các danh sách phân trang. Dùng cùng điều kiện khi xuất Excel. Với ABC, giữ tham số phân loại tách khỏi điều kiện hiển thị.
4. Kiểm tra kiểu dữ liệu, cấu hình và các luồng chọn kho, chuyển tab, đặt lại, tìm chứng từ và xuất Excel.

## Phạm vi triển khai

- Kho được giữ trong khu vực Tồn kho. ABC và Bất thường yêu cầu chọn một kho. Đổi kho xóa vị trí trong Tồn kho khả dụng và Lịch sử biến động.
- Tồn kho khả dụng và Lịch sử biến động tìm theo SKU hoặc tên. Chọn chính xác mặt hàng nằm trong bảng trượt. Lịch sử biến động cũng nhận mã phiếu nhận hàng đầy đủ.
- Hàng giữ cho phiếu, Hàng hỏng và Chênh lệch dùng ô tìm và chọn mặt hàng có truy vấn danh mục. Điều chỉnh và Tồn đầu tìm theo mã phiếu.
- Bất thường tìm theo SKU hoặc tên trước phân trang. ABC lọc kết quả của phiên phân loại theo SKU, tên và nhóm. File Excel ABC dùng cùng điều kiện với bảng.

## Kiểm tra trên trình duyệt

1. Chọn một kho và vị trí ở Tồn kho khả dụng. Sang Lịch sử biến động, đổi kho rồi quay lại. Xác nhận kho mới được giữ và vị trí cũ đã được bỏ.
2. Chọn một mặt hàng ngoài trang gợi ý đầu tiên trong Hàng giữ cho phiếu, Hàng hỏng và Chênh lệch. Sang tab khác rồi quay lại để kiểm tra mặt hàng đã chọn.
3. Điền từ khóa và bộ lọc, sang trang tiếp theo và thay đổi điều kiện. Xác nhận bảng về trang 1. Dùng nhãn dưới thanh lọc để bỏ từng điều kiện.
4. Tìm mã phiếu điều chỉnh hoặc mã phiếu nhận đã có biến động. Xuất Excel và đối chiếu nhóm kết quả với bảng. Lặp lại với kết quả ABC đã lọc nhóm.
5. Xem ở chiều rộng điện thoại. Kiểm tra nút lọc, ô tìm, các thao tác và vùng cuộn trong bảng trượt.
