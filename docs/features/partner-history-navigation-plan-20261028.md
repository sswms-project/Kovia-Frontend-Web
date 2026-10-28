# Kế hoạch đồng bộ nút back và lịch sử theo đối tác

Ngày 28/10/2026. Phạm vi: FE screen/huytv, chưa commit/push/deploy.

## Mục tiêu

1. Chi tiết sản phẩm và /reports/forecast dùng Button outline size icon (32px), Link thật và nhãn truy cập; giữ nguyên đích điều hướng/quyền hiện có.
2. Lịch sử yêu cầu xuất kho tại chi tiết khách hàng dùng OperationalListPanel có bg-card, header bảng bg-muted, border và pagination chung. Không thay đổi endpoint/nghiệp vụ xuất kho.
3. Chi tiết NCC có lịch sử yêu cầu nhập kho dưới Tổng quan: Mã yêu cầu, Kho nhận, Trạng thái, Tiến độ nhận, Ngày tạo, Ngày/giờ dự kiến. Mới nhất trước, phân trang server; mã mở trang chi tiết. Mobile dùng thẻ, tên dài xuống dòng.

## Dữ liệu và quyền

- Dùng useInboundRequestsQuery/API hiện có với supplierId chính xác, pageNumber/pageSize và sortDirection Descending. Thêm tham số enabled mặc định true vào hook để không đổi hành vi caller cũ.
- Chỉ bật query khi có INBOUND_REQUESTS_VIEW, phiên đăng nhập không lỗi và detail NCC đã khớp supplierId. Không coi quyền xem NCC là quyền xem yêu cầu nhập kho.
- BE giữ phạm vi tenant/kho, quyền xem nháp; FE không tải tất cả rồi lọc. Không thêm quyền, endpoint hoặc migration.
- Mỗi lần đổi NCC reset trang 1; query key có supplierId. Không render dữ liệu placeholder NCC/trang trước, dữ liệu cache sau lỗi hoặc khi mất quyền; loading/error/empty riêng và retry có điều kiện.
- Pagination nằm ngoài vùng cuộn; detail page dài được cuộn tự nhiên, không dùng calc viewport hoặc ép phần lịch sử vào vùng quá thấp.

## Triển khai và kiểm tra

- GitNexus impact đã kiểm tra sáu symbol liên quan: LOW. Giữ nguyên thay đổi local trước đó và protected rules/config.
- Tách bảng lịch sử NCC thành component thuần props, Page sở hữu query/pagination. Ghép vào SupplierDetail qua children, không tạo primitive/API mới.
- Kiểm tra request đúng supplierId và thứ tự mới nhất; đổi NCC/trang/quyền, dữ liệu cũ, lỗi/refetch, link và nội dung mobile; không mutation hoặc DB deploy để QA.
- Kiểm tra TypeScript, ESLint phạm vi thay đổi, tests mục tiêu, production build. Dùng fixture khi kiểm tra trình duyệt; báo riêng các phần chưa nghiệm thu trên thiết bị/tài khoản thật.
- Cập nhật kết quả và handoff sau kiểm tra; không tự commit/push/merge.

## Kết quả triển khai

- Hai nút back đã dùng Button outline size icon và Link đúng route. Không sửa quyền điều hướng.
- Lịch sử khách hàng dùng OperationalListPanel bg-card; lịch sử NCC là SupplierInboundHistory thuần props, ghép vào SupplierDetail qua children. Page giữ query và paging theo NCC.
- Tham số enabled của useInboundRequestsQuery mặc định true giữ caller cũ; lịch sử chỉ enable sau quyền xem nhập kho và detail NCC đúng ID. Dữ liệu placeholder/lỗi được ẩn. BE hiện có tự lọc tenant/kho và quyền xem nháp.
- Bốn tests tích hợp với query thật/service giả lập đạt: supplierId + sort mới nhất + phân trang server/link/ngày giờ; thiếu quyền không tải; đổi NCC reset trang và không lộ hàng cũ; refetch lỗi/mất quyền ẩn cache. Production typecheck, scoped ESLint và isolated Next production build đạt.
- Playwright dùng component thật ở 360/390/1024/1440px: hai panel có nền trắng và không tràn ngang toàn trang. Lịch sử NCC mobile dạng thẻ; desktop có cuộn thân bảng và pagination riêng. Ảnh: outputs/partner-history-qa-20261028/.
- Pass fixture đầu phát hiện bốn request bên ngoài do mock auth chưa khớp alias; đã sửa mock, chặn network ngoài fixture và chạy lại thành công không còn request bên ngoài. Không thực hiện nghiệp vụ hoặc ghi DB deploy. Không khẳng định đã nghiệm thu flow authenticated/điện thoại thật.
- Browser/port4319 đã đóng, source fixture tạm xóa; giữ ảnh kiểm tra. Không sửa BE, không migration/seed, chưa commit/push/deploy.
