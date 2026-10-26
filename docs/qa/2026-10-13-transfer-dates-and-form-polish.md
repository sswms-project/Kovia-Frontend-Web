# Điều chuyển: ngày, form và tải kho nhập — biên bản triển khai

Ngày: 2026-10-13. Người thực hiện: Codex. Trạng thái: `READY_FOR_CODEX_REVIEW` (tự kiểm tra của người triển khai, chưa phải review độc lập hoặc chứng nhận phát hành).

## Phạm vi đã triển khai

- A: placeholder ngắn; giải thích phân bổ FEFO/FIFO bằng Popover có nhãn, bàn phím/mobile.
- B: dùng lại `ClickableTableRow`, giữ Link tên kho desktop và Link phủ thẻ mobile; bỏ hai nút chi tiết dư thừa.
- C: chuyển `DatePickerField` sang `components/forms`, thêm giờ tùy chọn; chế độ chỉ ngày của Nhập kho/Kiểm kê không đổi. Không sửa primitive `components/ui`, không thêm thư viện.
- D: hai ngày BE/FE; Update có cờ xóa riêng, SaveDraft null thay toàn bộ, Submit chỉ kiểm ngày đã lưu. So sánh theo ngày Việt Nam nếu một bên chưa có giờ; cả hai có giờ thì so thời điểm. Không làm tròn timestamp không đổi. Hạn việc lấy mới dùng ngày điều chuyển rồi fallback ngày hàng về; nhận/cất giữ ngày hàng về. Không ghi đè hạn việc đang có.
- E: endpoint số đếm riêng; quyền `transfers:create` cùng phạm vi kho/tenant. Đếm Approved/Sent/Confirmed/PartiallyReceived của nhập kho và InProgress của điều chuyển theo khoảng `[00:00+07, 00:00+07 ngày kế tiếp)`. Loại phiếu đang sửa, đếm phiếu không đếm đợt/dòng. FE debounce ngày, không giữ cảnh báo của key cũ, hủy request không dùng nữa, không retry lỗi tự động, cảnh báo không chặn gửi. Lỗi đọc cảnh báo được log warning có nội dung, không bật console-error overlay hoặc toast chặn form.

## Baseline và bằng chứng

Tất cả build/test chạy trong bản sao ở `D:/Kovia-QA/Transfer-Dates-FormPolish-20261013-1900`; không build .NET trong repo chung.

- Origin/dev FE mới fetch: `99e6c3b31736e9428a971301e6e6f53b57aabdbb`, 179 file / 1008 test đạt.
- Origin/dev BE mới fetch: `e04412f9a43356815cfd0015d6f4bec09732b657`, 1350 đạt / 5 lỗi / 1 bỏ qua.
- Nhánh bắt đầu: FE `cec5cf4`, BE `fdbd117c`. Có thay đổi đã commit trên nhánh làm việc nhưng chưa nằm ở baseline dev, nên không quy toàn bộ chênh lệch số lượng test cho công việc này.
- Cuối triển khai: FE 186 file / 1093 test đạt; `tsc --noEmit`, ESLint file thay đổi và production build Webpack đạt. Build dùng `KOVIA_ISOLATED_BUILD=true`; output và thay đổi tsconfig tự sinh chỉ nằm trong bản sao.
- BE API Release: 0 cảnh báo / 0 lỗi. Nhóm Transfer: 208 đạt / 0 lỗi / 4 race SQL Server bỏ qua. Toàn suite: 1400 đạt / 5 lỗi / 5 bỏ qua. Đối chiếu TRX: không có tên testcase lỗi mới so với dev.
- Năm lỗi baseline còn nguyên: bốn tổ hợp của `InboundOperationalEditingTests.EditsPreserveSnapshotsUnlessTheUserChangesTheLine` và `TenantRolePermissionTests.Inactive_user_cannot_reuse_a_cached_permission_set`.
- Test mới bao phủ ngày lịch/có giờ, midnight, EOD, đệm 5 phút, timestamp nguyên bản, clear flags, giá trị hiệu lực, Submit nháp cũ trước giữ chỗ, đọc danh sách/chi tiết, hạn việc mới và không ghi đè việc đã có; count status/kho/tenant/biên ngày/exclude/quyền; debounce, error/no-retry/threshold và submit không bị cảnh báo chặn. Rà cuối bổ sung so sánh timestamp nguyên bản cả giây/phần lẻ khi chỉ sửa ngày kia, và nhận diện đúng sentinel `.9990000` khác với giờ `.9991234`.

Các log: `FE-dev/baseline-fe.log`, `FE/final-fe.log`, `FE/final-fe.json`, `FE/final-fe-build.log`, `BE-dev/TestResults/baseline-be.trx`, `BE/TestResults/final-be.trx`, `BE/step-d-be.log`, `BE/step-e-be.log`, `BE/final-be-build.log`. Chỉ chia sẻ log/TRX/SQL đã rà; không chia sẻ archive hoặc cấu hình runtime trong bản sao.

## Migration và an toàn

`20261013132528_AddTransferPlannedTransferDate` chỉ thêm `StockTransfers.PlannedTransferDate datetimeoffset NULL`. SQL sinh tại `BE/TestResults/AddTransferPlannedTransferDate.sql` đã đọc; snapshot chỉ thêm ba dòng. `has-pending-model-changes` không báo thay đổi còn treo.

EF dùng design-time factory metadata-only: provider SQL Server, server `invalid-design-time`, database `KoviaMigrationMetadataOnly`; không khởi động API, không kết nối hay ghi DB. Migration **chưa được áp lên database nào**. Không seed/quyền/direct SQL/write QA lên `db71143`. Không chạy BE mới với DB deploy khi cột chưa có.

## Review nguồn và giới hạn

- Ponytail: tái dùng row, Calendar/Popover/Input/Field/Alert, reader/repository và query-key/service pattern có sẵn. GitNexus impact/detect_changes đã chạy; các phạm vi HIGH/CRITICAL đã được báo. Keyword search vẫn báo FTS thiếu sau khi đã reindex; ASP.NET route-map không tìm ra controller. Vì vậy đã đọc trực tiếp contract/callers và dùng build/test để bổ sung, không coi bản đồ là chứng nhận toàn bộ luồng.
- Rà nguồn theo Web Interface Guidelines: nhãn/ARIA, live region cảnh báo, ref focus RHF cho ô ngày, vùng bấm 44px của chế độ giờ, popup giới hạn theo viewport, reduced motion, Link thật và không thêm animation remount.
- Lệnh mở server QA `next start` bị công cụ từ chối (`blocked by policy`). Browser mới chỉ mở `about:blank`, chưa điều hướng app; phiên này đã đóng. Không có screenshot hay kết quả Edge 360/768px mới. Fixture mock chuẩn bị ở `FE/output/playwright/setup-mock.js` **chưa chạy**; không phải bằng chứng browser QA.
- QA thật (tạo/sửa/xóa ngày/cảnh báo/Submit qua giao diện), Edge mobile, zoom, touch và screen reader vẫn chưa chứng nhận. Chỉ chạy sau khi người dùng cho phép áp đúng migration mới lên `db71143`; vẫn phải tắt automatic migration/seed và xác nhận target hiệu lực trước viết.
- Các race SQL Server trước đó vẫn được hoãn; 5 ca bỏ qua không tính là đạt. Không kết luận đủ điều kiện promote main từ biên bản này.

## Commit theo bước

- A FE `1774806`.
- B FE `25de3b5`.
- C FE `9506c44`.
- D BE `ed678550`, FE `08d4bc7`.
- E BE `f7c68500`; FE commit cùng cảnh báo/biên bản cuối, xem hash trong thông báo bàn giao/Git log.

Không push, không PR, không merge. Các thay đổi AGENTS.md/CLAUDE.md có sẵn được giữ nguyên và không đưa vào commit.
