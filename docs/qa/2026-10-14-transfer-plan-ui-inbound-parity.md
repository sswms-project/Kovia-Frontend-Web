# QA: thay giao diện lập kế hoạch điều chuyển theo cất hàng Nhập kho

Ngày 2026-10-14. Vai trò: người triển khai tự kiểm, chưa nghiệm thu độc lập. Không commit/push.

## Màn tham chiếu và phạm vi

- Đã mở trực tiếp Edge: Nhập kho `PA-PN-0003`, route `/inbound/putaway/cb0eed44-d45f-46ff-e76b-08df247f386a`; xem bố cục, ô chọn sức chứa, đơn vị/quy đổi, tiến độ, nhóm thu gọn và thanh lưu.
- Đã mở chi tiết `PDC000007`, bấm **Lập kế hoạch cất hàng**, xác nhận đi đến `/transfers/cf874e79-2f18-4221-b310-2805bdaf48c6/putaway`.
- Thay hoàn toàn markup phân bổ cũ trong `TransferPutawayPlanWorkspace`, không chỉ bổ sung AI. Bố cục theo PutawayForm của Nhập kho: thông báo → kế hoạch đã lưu (khi có) → tiến độ phân bổ → nhóm sản phẩm → cột Vị trí/Số lượng/Đơn vị/Quy đổi/thao tác → thanh lưu.
- Tái sử dụng PutawayPlanNotice, PutawayLocationSelect, lưới PUTAWAY_ROW_GRID và các primitive hiện có. Dropdown hiển thị sức chứa thực từ cùng dữ liệu sơ đồ và helper của Nhập kho; không bịa số sức chứa khi chưa có dữ liệu.
- Đơn vị chỉ dùng ĐVT chính và quy đổi chụp trên phiếu điều chuyển. Chuyển đơn vị không thay lượng gốc; payload vẫn là tổng kế hoạch theo ĐVT chính, gồm phần đã cất. Không tự suy đoán hệ số hoặc truy cập thêm API sản phẩm.
- Giữ quyền, khóa vị trí đã cất, phiên bản, kiểm dữ liệu, xác nhận thay nháp bằng AI, xử lý kết quả lưu chưa xác định và cơ chế rời trang hiện có. Không đổi API/BE/schema/migration hoặc nghiệp vụ giao việc. Nút **Lưu vị trí cất hàng** lưu kế hoạch điều chuyển; không phải xác nhận tồn kho, không giả vờ giao người cất nếu API chưa thực hiện việc đó.
- PutawayLocationSelect chỉ thêm callback mở sơ đồ tùy chọn, mặc định Nhập kho giữ nguyên. GitNexus impact HIGH qua hai direct callers: PutawayAllocationRow và PutawayPlanSheet; đã thông báo trước sửa. Workspace/Page impact LOW; index làm mới bằng `--index-only`, không ghi AGENTS/CLAUDE.

## QA trình duyệt thật — chỉ sửa nháp, không lưu

| Thao tác                                  | Kết quả                                                                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Mở màn lập kế hoạch từ chi tiết PDC000007 | Đúng màn mới; vị trí/số lượng đã điền, sức chứa hiển thị trong ô chọn                                                                        |
| Sửa 10 thành 8                            | Còn thiếu 2; tiến độ 0/1; quy đổi và nhãn lượng cùng cập nhật                                                                                |
| Thu gọn rồi mở lại                        | Giữ số lượng 8; bản thu gọn hiển thị vị trí × lượng                                                                                          |
| Bấm Còn lại                               | Về 10, Đã đủ, tiến độ 1/1                                                                                                                    |
| Enter ở nút thu gọn/mở                    | Hoạt động bằng bàn phím, lượng 10 không mất                                                                                                  |
| Dropdown vị trí                           | Nhóm theo khu; có mã/tên/sức chứa; vị trí đầy bị khóa; có nút chọn trên sơ đồ                                                                |
| Mở/đóng sơ đồ                             | Mở sơ đồ kho nhập, đóng trở lại form, giữ nháp                                                                                               |
| Desktop                                   | Không tràn ngang; body clientWidth = scrollWidth = 1.378 tại lúc đo                                                                          |
| Màn hẹp                                   | Kiểm đúng innerWidth 360, innerHeight 800 CSS; document width 360, body clientWidth = scrollWidth = 319; ô nhập xếp dọc, thanh lưu nhìn thấy |

Viewport override đã reset về mặc định. Browser đang zoom 90%, nên override vật lý 324×720 cho kích thước CSS 360×800; ghi rõ số đo thay vì suy đoán từ ảnh. Không thay zoom hay tùy chọn hệ thống của người dùng.

Hai lỗi giao diện tìm trong QA đã sửa: footer margin âm gây thanh cuộn ngang desktop; đoạn mô tả `sr-only` bị style Field làm rộng trên mobile. Nút mở sơ đồ chuyển vào dropdown để dòng phân bổ giữ chiều cao như Nhập kho.

Ảnh tại `D:/Kovia-QA/Transfer-Plan-UI-20261014`:

- `transfer-plan-desktop-final.jpg`
- `transfer-plan-mobile-360.jpg`

## Kiểm thử tự động

Bản sao riêng `D:/Kovia-QA/Transfer-Plan-UI-20261014/FE`, từ HEAD và các thay đổi đang có. Build/test không chạy trong repo hoặc output của server đang phục vụ 3000.

- Sáu test mới: bố cục/tiến độ/sức chứa/đơn vị, giữ lượng qua thu gọn, khóa vị trí đã cất, Còn lại không đếm đôi, chọn sơ đồ, quy đổi giữ lượng gốc, không tự ghi khi mở, chống lưu lặp, thiếu quyền.
- Test tập trung ban đầu 27 đạt, gồm 19 ca PutawayForm Nhập kho và 2 ca trang điều chuyển.
- Test mở dropdown mới ban đầu gặp `scrollIntoView` không có trong JSDOM; bổ sung mock chỉ trong test. Production code không bị sửa để né lỗi môi trường kiểm thử.
- Lượt toàn bộ FE ban đầu 1.180 đạt/1 timeout ở WarehouseLocationImportReview không liên quan; chạy riêng file đó và test mới: 9/9 đạt. Lượt toàn bộ cuối với `--maxWorkers=3`: **1.181/1.181 đạt**, không có test bỏ qua (`full-tests-final-limited-workers.json`).
- Next typegen và TypeScript noEmit, ESLint phạm vi sửa, Prettier và git diff --check đạt. Production build bản sửa cuối đạt, **71 trang tĩnh** (`production-build-final.log`).

Các báo cáo và log nằm trong `D:/Kovia-QA/Transfer-Plan-UI-20261014`; kết quả cuối không thay thế lịch sử lỗi môi trường ở các lượt trước.

## Giới hạn và an toàn

- Không bấm lưu kế hoạch, giao việc, xác nhận cất hoặc gọi AI thật trong browser QA. Những thao tác ghi/AI được kiểm bằng mock; không ghi dữ liệu DB deploy trong lượt này.
- Không chạy lại test BE vì không đổi BE. SQL Server race vẫn hoãn theo quyết định trước; không tự đánh dấu Gate A/C đã đóng.
- Không chứng nhận toàn bộ luồng điều chuyển, vật lý camera, trình đọc màn hình thực hay reduced-motion bằng cài đặt OS. Source kiểm reduced-motion và semantic controls; bàn phím/viewport đã kiểm như bảng trên.
- Bản chạy local vẫn FE 3000, BE 7070; giữ tắt migration/seed tự động và Quartz trong QA copy. Không sửa Program.cs ở repo.
