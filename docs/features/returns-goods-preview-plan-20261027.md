# Kế hoạch: xem nhanh hàng hóa tại danh sách trả hàng

Ngày: 27/10/2026. Trạng thái: đã triển khai FE và kiểm tra cục bộ bằng fixture; chưa commit/push/deploy.

## 1. Mục tiêu và phạm vi

Bổ sung khung **Chi tiết hàng hóa trả lại · [Mã phiếu]** bên dưới danh sách của cả hai tab: Trả hàng từ khách và Trả hàng NCC. Dùng cách tương tác của danh sách điều chuyển/nhập kho hiện có, phù hợp điện thoại và máy tính.

Khung chỉ đọc để xem nhanh hàng hóa. Trang chi tiết riêng tiếp tục phục vụ sửa, thu hồi, duyệt, nhập lại kho, giao trả và lịch sử; các liên kết từ thông báo vẫn mở trang chi tiết. Không thay đổi quyền, trạng thái phiếu, quy tắc tồn kho, phân bổ hoặc cách ghi nhận nhập/trả hàng.

## 2. Hiện trạng đã đối chiếu

- `GoodsReturnRequestDirectory` và `SupplierReturnDirectory` đang dùng `onInspect` để chuyển sang trang chi tiết khi kích hoạt dòng. Cần tách chọn dòng xem nhanh khỏi điều hướng, không đổi ý nghĩa của thao tác “Chi tiết”.
- `GoodsReturnRequestsPage` và `SupplierReturnsPage` đã có hook tải chi tiết theo ID cho trang chi tiết riêng. Giữ truy vấn xem nhanh độc lập với ID từ route và phiếu đang mở popup thao tác.
- `GoodsReturnRequestSummary` có `items`; `SupplierReturnSummary` chỉ có thông tin tóm tắt, không có hàng hóa. Không mở rộng API danh sách để tải toàn bộ chi tiết của từng phiếu.
- `OperationalMasterDetail`, `OperationalListPanel`, `OperationalPagination` đã hỗ trợ bố cục kéo chiều cao, thu gọn và phân trang. Dùng trực tiếp phần chung, không sao chép wrapper/nghiệp vụ nhập kho vào trả hàng.
- Hợp đồng chi tiết hiện có đủ các trường dự kiến dưới đây. Chưa thấy cần sửa BE hoặc migration; xác nhận lại response thực tế bằng fixture/hợp đồng khi triển khai.

## 3. Hành vi giao diện

### Máy tính

1. Bấm vùng nội dung không phải điều khiển của dòng: chọn phiếu, tô nền dòng, cập nhật hàng hóa nếu khung đang mở.
2. Chọn dòng không tự mở khung đã đóng, không tự cuộn trang. Nút mũi tên giữa hai khung mở/đóng; kéo thanh phân cách để đổi chiều cao theo component chung.
3. Bấm mã phiếu hoặc menu “Chi tiết”: mở trang chi tiết riêng. Mã có gạch chân khi hover/focus như điều chuyển.
4. Nút duyệt, nhập lại, giao trả, menu, checkbox nếu có không kích hoạt chọn dòng/điều hướng ngoài ý muốn. Chọn văn bản không mở trang.
5. Chưa chọn phiếu: hiển thị hướng dẫn chọn phiếu. Không tự tải hay tự chọn phiếu đầu tiên.

### Điện thoại

- Giữ danh sách dạng thẻ hiện có; thêm nút rõ tên “Xem hàng hóa”. Bấm nút chọn phiếu, mở khung và cuộn tới tiêu đề hàng hóa một lần; tôn trọng reduced motion.
- Hiển thị hàng hóa dạng thẻ, số lượng kèm đơn vị, tên khu/kệ xuống dòng tự nhiên. Không ép bảng nhiều cột hoặc dùng hai vùng cuộn dọc bị bó chiều cao trên điện thoại.
- Nút mở chi tiết đầy đủ vẫn riêng biệt. Điều khiển có vùng chạm đủ lớn và nhãn truy cập rõ ràng.

### Bố cục chung

- Giữ tiêu đề, bộ lọc, phân trang ngoài phần thân cuộn; phân trang riêng cho hàng hóa nếu số dòng nhiều.
- Dùng token của `index.css`: mặt thẻ theo `bg-card`, đầu bảng `bg-muted` (theme sáng EAF7E2), border theo design system. Không ghi màu cứng, không lồng nhiều khung, không thêm công thức chiều cao viewport riêng.
- Khi đổi phiếu, phân trang hàng hóa về trang 1. Vị trí hiển thị Khu vực / Kệ / Vị trí qua formatter chung; không lộ `__SYSTEM_DEFAULT__` và không suy đoán khu vực khi API thiếu metadata.

## 4. Nội dung theo nghiệp vụ

| Tab               | Cột xem nhanh trên máy tính                                                                         | Quy tắc                                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trả hàng từ khách | #, Mã hàng, Tên hàng, ĐVT, SL trả, Tình trạng trên phiếu, Tình trạng thực nhận, Vị trí nhập lại, Lô | `condition` là tình trạng trên phiếu; `actualCondition` là tình trạng ghi nhận lúc nhập lại. Trước nhập lại, tình trạng thực nhận hiển thị “Chưa ghi nhận”, không lấy tình trạng đề nghị giả làm thực nhận. |
| Trả hàng NCC      | #, Mã hàng, Tên hàng, ĐVT, SL yêu cầu trả, SL đã giao trả, Tình trạng hàng, Vị trí lấy hàng, Lô     | Dùng `quantity` và `deliveredQuantity` đúng đơn vị response. Giá trị chưa có hiển thị “Chưa giao” theo trạng thái, không coi thiếu dữ liệu là đã giao 0.                                                    |

- Mã phiếu trên tiêu đề; phiếu xuất nguồn hoặc phiếu nhận nguồn, kho và đối tác hiển thị ngắn gọn ở phần thông tin của khung nếu có dữ liệu, tránh lặp trên từng dòng.
- Không thêm HSD, quy đổi, “Còn phải giao” hoặc tổng cộng khác đơn vị nếu chưa có hợp đồng/quy tắc đủ rõ. Footer tổng số là tổng **dòng hàng**.
- Trả từ khách: Còn tốt / Hư hỏng / Hết hạn / Hủy bỏ dùng nhãn tiếng Việt chung. Tình trạng thực nhận Hủy bỏ hiển thị “Không nhập kho”; trước nhập lại, vị trí chỉ ghi là dự kiến nếu đã chọn. Sau nhập lại, dùng vị trí đã ghi nhận; trường thiếu không tự gán vị trí mặc định.
- Hư hỏng/hết hạn vẫn giữ cách biểu diễn cách ly/Hold hiện hành; xem nhanh không mở khả dụng, không ghi tồn. Phiếu bị hủy/từ chối không được mô tả như đã nhập/giao hàng.
- Các giá trị số dùng formatter độ chính xác và đơn vị hiện có; không tự đổi Thùng/Hộp sang Cái.

## 5. Dữ liệu, trạng thái chọn và hiệu suất

- Page sở hữu query/state, component nhận dữ liệu và callback; giữ kiến trúc feature-first.
- Chỉ bật query xem nhanh khi có quyền xem tab, phiếu được chọn còn thuộc trang danh sách hiện tại, khung mở và danh sách hợp lệ. Dùng API chi tiết/hook hiện có của từng nghiệp vụ để dữ liệu nhất quán; không tạo một request cho mỗi dòng.
- Query key chứa đúng ID và phạm vi phiên/tenant theo cơ chế cache hiện có. Dùng chung cache chi tiết; kiểm tra các mutation hiện hành đã invalidate cache này sau sửa/thu hồi/duyệt/nhập lại/giao trả/hủy.
- Đổi nhanh A → B: không hiển thị dữ liệu A dưới mã B. Loading/error hiển thị trong khung với thử lại; không gắn dữ liệu cũ hoặc fallback thành danh sách rỗng khi query lỗi.
- Reset lựa chọn khi đổi tab, tìm kiếm, bộ lọc, trang, kích thước trang; hoặc khi phiếu biến mất khỏi kết quả sau refresh/thao tác. Không reset chỉ vì refetch nền nếu phiếu vẫn còn hợp lệ.
- Lưu riêng trạng thái mở/đóng cho hai tab; không lưu payload hàng hóa, ID phiếu hoặc dữ liệu nhạy cảm vào localStorage. Lỗi đọc/ghi preference không được làm hỏng trang.
- Đóng khung không phát sinh request mới; query đã chạy có thể hoàn tất vào cache nhưng không render khi khung đóng. Tận dụng cache/refetch policy của dự án, tránh vòng lặp refetch.

## 6. Trình tự triển khai

1. Đọc lại `.rules`, `AGENTS.md`, coding/design/list-table guidelines; kiểm tra status và giữ nguyên thay đổi ngoài phạm vi. Dùng GitNexus impact trước khi sửa các symbol liên quan, báo nếu HIGH/CRITICAL.
2. Đối chiếu mapper/DTO chi tiết và formatter; chốt fixture cho các trạng thái và đơn vị. Nếu thiếu trường, ghi rõ trước khi bổ sung BE; không tự đặt dữ liệu thay thế.
3. Ghép `OperationalMasterDetail` vào từng danh sách; tách callback chọn dòng khỏi mở trang chi tiết. Chỉ chia sẻ helper tương tác nếu thực sự trùng, không tạo framework trả hàng chung.
4. Thêm component hàng hóa theo từng nghiệp vụ, trạng thái loading/empty/error; ghép lựa chọn/query ở Page. Xử lý bàn phím, mobile, reset lựa chọn và cache invalidation.
5. Chạy kiểm tra mục 7, review diff đối chiếu kế hoạch. Cập nhật tài liệu bàn giao với kết quả thực tế; commit/push/PR khi người dùng yêu cầu.

## 7. Kiểm tra và điều kiện nghiệm thu

### Tự động, dùng mock/fixture không ghi DB

- Cả hai tab: chọn dòng, mở/đóng khung, liên kết mã phiếu, menu/nút con không kích hoạt lẫn nhau; Enter/Space phù hợp và focus nhìn thấy.
- Query chỉ tải phiếu chọn khi mở; chuyển nhanh A/B không sai dữ liệu; loading/error/thử lại/403/404 không lộ chi tiết cache cũ.
- Đổi bộ lọc/trang/tab, phiếu biến mất, refetch nền, sửa/hủy/nhập lại/giao trả cập nhật đúng preview; đổi phiếu reset trang hàng hóa.
- Trả từ khách: đủ bốn tình trạng; trước/sau nhập lại; tình trạng thực nhận khác đề nghị; Hủy bỏ không nhập kho; phiếu hủy/từ chối không hiện kết quả nhập giả.
- Trả NCC: phiếu nháp/chờ duyệt/đã giao/hủy; số giao chưa có; phiếu nguồn tùy chọn/legacy; chất lượng và vị trí đúng metadata.
- Số lẻ, đơn vị khác nhau, tên dài, nhiều dòng, thiếu vị trí/lô, vị trí kỹ thuật không lộ tên hệ thống. Không hiển thị “0” cho số chưa biết.
- Chạy test mục tiêu, ESLint phạm vi thay đổi, production typecheck và build theo lệnh dự án; sửa lỗi liên quan trước bàn giao.

### Trực quan

- Kiểm tra 360/390/430px, tablet, desktop; zoom 125% và 200%; theme theo dự án.
- Không tràn ngang toàn trang, không che hàng hóa/phân trang, không mất border; kéo/thu gọn/mở lại đúng component chung.
- Kiểm tra thứ tự Tab, nút có tên, trạng thái chọn và nội dung ẩn không còn focus; mobile cuộn đúng và không nhảy khi chỉ refetch.

### An toàn phát hành

- Thay đổi dự kiến chỉ FE, API đọc hiện có; không migration, seed hoặc thay đổi số lượng tồn/quyền/quy trình trả hàng.
- Không dùng thao tác nhập lại/giao trả trên DB deploy để QA tính năng chỉ đọc này. Dùng fixture cho trạng thái ghi và dữ liệu nhạy cảm.
- Nếu phát sinh nhu cầu migration, dừng để báo tên/tác động và xin phép riêng theo AGENTS.md. Startup migrations luôn tắt khi chạy local.
- Trước commit chạy GitNexus detect_changes và kiểm tra diff chỉ thuộc phạm vi. Khi cần hoàn tác, revert commit tính năng FE; không rollback DB hoặc hoàn tác các thay đổi khác.

## 8. Kết quả cần bàn giao

- Hai tab có khung xem nhanh đồng bộ với điều chuyển/nhập kho và vẫn mở được trang chi tiết riêng.
- Có bằng chứng kiểm tra hai nghiệp vụ, mobile/desktop, tải dữ liệu đúng phiếu và không phát sinh request theo từng dòng.
- Báo rõ file thay đổi, kết quả test/build, hạn chế dữ liệu thực tế nếu có. Kiểm tra fixture không thay thế nghiệm thu giao diện trên production.

## 9. Kết quả triển khai 27/10/2026

- Hai directory dùng `ReturnGoodsWorkspace` ghép `OperationalMasterDetail`; click dòng chọn preview, link mã/menu Chi tiết giữ điều hướng riêng. Mobile có nút Xem hàng hóa và thẻ theo từng dòng.
- `ReturnGoodsPreview` dùng list panel, bảng/thẻ và pagination chung; mapper riêng cho khách/NCC giữ đúng tình trạng và đơn vị, không cộng hàng khác đơn vị. Customer DTO chỉ có chuỗi vị trí đã định dạng: bỏ token slot kỹ thuật nếu còn trong chuỗi, không suy đoán metadata khu/kệ bị thiếu.
- Trích logic chọn phiếu hiện có sang `useGoodsPreviewSelection`, wrapper nhập kho giữ API và storage key cũ; thêm fallback khi storage không cho ghi. Hai tab trả hàng lưu riêng boolean mở khung, không lưu dữ liệu phiếu.
- Page giữ query; chỉ truyền ID cho query xem nhanh khi chọn hợp lệ và khung mở. Query chi tiết không dùng placeholder của phiếu khác. Mutation hiện có invalidate prefix chi tiết trả hàng nên không cần thêm mutation/API mới.
- Test fixture: 53/53 đạt trong 14 file, gồm hành vi nhập lại/sửa nháp cũ, hook lựa chọn, phân trang, mapper, hai Page với query thật và service giả lập; kiểm tra A → B đang tải và lỗi refetch có cache không hiện nhầm dữ liệu.
- Typecheck production, scoped ESLint và production Next build đạt. Dùng GitNexus impact/detect_changes và kiểm tra diff thủ công cả file mới chưa được index; tổng diff GitNexus high bao gồm các Page và thay đổi quy tắc có sẵn, không thay đổi các hàm mutation/nghiệp vụ. Symbol hook inbound mới hơn index được đối chiếu caller/test trực tiếp khi impact không tìm thấy.
- Playwright trên fixture dùng component thật: hai tab ở 360/390/1024/1440px, thêm viewport 1152×720 và 720×450, không tràn ngang toàn trang; mobile cuộn khi mở rõ ràng, kiểm tra thêm theme tối. Ảnh ở `outputs/returns-preview-qa-20261027/`. Browser/server fixture đã đóng, source fixture tạm đã xóa. Không khẳng định đã thử zoom trình duyệt thật 125/200% hoặc điện thoại vật lý.
- Không sửa BE/schema, không chạy migration/seed, không gọi API production hay ghi DB. Kiểm nhận trên môi trường đăng nhập thật/thiết bị vật lý vẫn là bước test tay của người dùng.
