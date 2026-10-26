# Biên bản tự kiểm: Cất hàng điều chuyển theo Nhập kho

Ngày: 2026-10-14. Trạng thái: code đã triển khai và kiểm thử tự động; chưa nghiệm thu trình duyệt/SQL Server race. Không commit/push.

## Phạm vi đã thay đổi

- Chỉ cất hàng tốt thực nhận; 8 tốt + 2 hỏng chỉ cần cất 8, cất 3 còn 5. Hàng hỏng/thiếu giữ nguyên ở hồ sơ chênh lệch.
- Không sửa tồn kho, sổ kho hay dòng cất lịch sử. Phiếu cất vẫn trả lịch sử hàng hỏng cũ, nhưng không đưa hàng hỏng vào phân bổ mới hoặc khấu trừ lượng tốt còn lại.
- Mở trang tự lấy gợi ý theo quy tắc kho (`useAi=false`), ưu tiên kế hoạch đã lưu rồi điền phần chưa phân bổ. Thiếu sức chứa giữ phần dư rõ ràng, không tự bỏ số lượng.
- Nháp kế hoạch chưa có được điền vị trí/số lượng, kể cả đã có vị trí cất tốt được khóa; chỉ ghi kế hoạch khi người dùng bấm lưu.
- AI chỉ chạy theo nút Gợi ý AI. Áp dụng nháp bẩn cần xác nhận; thay phân bổ xóa mã quét. Không ghi đè nháp bẩn, kết quả lưu chưa xác định hoặc áp response của đợt/phiên bản khác.
- Form nhóm theo hàng/lô, vị trí và số lượng cùng hàng trên desktop; có combobox/sơ đồ kho, camera/quét xác nhận, thu gọn không mất lượng đang chỉnh.
- Cất rỗng chỉ để hoàn tất đợt lịch sử đang chờ cất nhưng không còn hàng tốt; vẫn kiểm quyền, phiên bản, hash kế hoạch và idempotency, không ghi tồn.
- Tiến độ việc cất và lượng chờ cất trên chi tiết dùng lượng tốt, không dùng lượng hỏng hoặc lượng đã kiểm đếm làm lượng đã cất.

## Bằng chứng tự động

Bản sao kiểm thử riêng: `D:/Kovia-QA/Transfer-Putaway-Inbound-Alignment-20261014`. Cơ sở FE HEAD `7d7e737`, BE HEAD `0f183053`, kèm thay đổi chưa commit (bao gồm sửa thông báo/task trước đó). Không build trong repo hay output của dev server.

| Kiểm tra                         | Kết quả                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| Toàn bộ Vitest FE                | 1.171 đạt, 0 lỗi; báo cáo `fe-full-tests-final.json`                    |
| TypeScript FE                    | đạt, gồm production build cuối                                          |
| ESLint phạm vi thay đổi          | đạt, không cảnh báo                                                     |
| Production build FE              | Webpack đạt, 71 trang tĩnh; output nằm trong bản sao                    |
| Release API build BE             | 0 lỗi, 0 cảnh báo                                                       |
| Test BE điều chuyển/cất/việc kho | 320 đạt, 4 bỏ qua, 0 lỗi; `be-tests/putaway-alignment-final.trx`        |
| Receipt split sau thay đổi cuối  | 31 đạt, 0 lỗi; `be-tests/receipt-split-final.trx` (tập con của bộ trên) |
| Whitespace diff hai repo         | sạch                                                                    |

Các ca quan trọng: nhiều lô và ngân sách dùng chung; 8 tốt + 2 hỏng; toàn hỏng/thiếu; payload hỏng bị từ chối; vượt thực nhận; lịch sử hỏng không trừ lượng tốt; nhận bổ sung không đếm đôi; tự điền không gọi AI/ghi DB; có nháp bẩn/mã quét; sai đợt dù token giống nhau; đổi vị trí phải quét lại; nháp kế hoạch có vị trí đã cất; AI cần xác nhận; collapse/expand giữ số lượng; xung đột và replay đúng command khi chưa rõ kết quả. Hồi quy Nhập kho nằm trong full FE suite và bộ BE cất hàng.

## Giới hạn còn lại

- Kết nối điều khiển trình duyệt lỗi `failed to write kernel assets ... path not found`. Không có bằng chứng Edge desktop/mobile, zoom, physical camera hay round-trip trên API thật trong lượt này; không gắn nhãn đạt cho các mục đó.
- 4 test race SQL Server chưa chạy vì không có SQL Server QA cô lập và người dùng đã hoãn phần này. Không dùng db71143 để chạy race/rollback.
- Không chạy toàn bộ BE suite; kết quả BE ở đây là bộ có phạm vi nêu trên.
- Giữ kế hoạch dự kiến trước khi hàng về để tương thích; phân bổ thực tế bị giới hạn bởi lượng tốt đã kiểm nhận. Không thay global contract kế hoạch bằng kế hoạch riêng mỗi đợt.
- Đã cập nhật server QA từ code mới: BE `http://localhost:7080` (health 200), FE `http://localhost:3001` (login 200). Chỉ dừng các PID đã xác minh thuộc bản sao QA trước. Log xác nhận provider `Microsoft.EntityFrameworkCore.SqlServer`, server `db71143.public.databaseasp.net`, database `db71143`, `ApplyMigrationsOnStartup=False` và "Database migration and seed startup steps are disabled". Quartz bị tắt trong bản sao QA, không sửa Program.cs ở repo. Health/login không thay thế QA luồng được bảo vệ bằng tài khoản thật.

## An toàn và hướng triển khai

Không có migration, seed, SQL ghi trực tiếp hoặc thao tác ghi vào DB deploy trong lượt kiểm thử này. Không sửa primitive shadcn hoặc form Nhập kho. Ponytail hướng việc tái sử dụng builder quy tắc/sức chứa và component hiện có, không thêm thư viện hay gộp API/hook hai nghiệp vụ.

Log khởi động: `be-stdout.log`, `fe-stdout.log` trong thư mục QA. Bản sao Program.cs chỉ có guard in/xác minh target và tắt Quartz; build lại bản sao này đạt 0 lỗi/cảnh báo. Production build hoàn tất trước khi chạy dev trên bản sao mới, không ghi đè output của dev server đang chạy lúc build.

GitNexus impact chủ yếu LOW; `buildTransferPutAwayEntries` MEDIUM (5 tham chiếu trực tiếp, gồm hook/schema/tests) được kiểm hồi quy. API route map không trả handler này; đã đối chiếu thủ công route, service consumer, quyền Receive và response giữ nguyên. Chỉ thêm query tùy chọn useAi, mặc định true giữ client cũ.

## Bổ sung sau review — sửa R1/R2

Đã sửa hai finding Medium, trạng thái `READY_FOR_FINAL_REVIEW` (tự kiểm của người triển khai, chưa nghiệm thu độc lập).

- R1: giữ lượng kế hoạch còn khả thi trong bộ tính sức chứa chung trước khi phân bổ phần còn lại cho các sản phẩm. FE không chèn thêm lượng kế hoạch ngoài gợi ý BE đã kiểm tra. Test mô phỏng A theo kế hoạch ở S=8, B ưu tiên S=8, sức chứa S=10: B chỉ dùng phần còn lại hoặc vị trí khác; có thêm quy đổi sức chứa 24/12 và ô không cho chứa lẫn.
- R2: khi xác nhận dữ liệu sai, tự mở đúng nhóm hàng/lô có lỗi, hiện thông báo trường cần sửa và focus ô lỗi sau khi nội dung được mở. Nhóm hợp lệ vẫn thu gọn; số lượng và mã quét đã nhập không bị xóa. Bấm xác nhận lại vẫn nhận phản hồi, không gửi request cất.

Bản sao kiểm thử: `D:/Kovia-QA/Transfer-Putaway-Fixes-20261014`.

| Kiểm tra                                  | Kết quả / minh chứng                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Toàn bộ FE                                | 1.175 đạt, 0 lỗi — `fe-full-tests.json`                                                        |
| FE điều chuyển                            | 363 đạt — `fe-transfer-tests.json` (tập con của toàn bộ FE)                                    |
| Hai ca tái hiện review cũ                 | 2/2 đạt — `review-reproductions-fixed.json` (test tạm chỉ trong bản sao)                       |
| TypeScript / lint phạm vi sửa             | Đạt, đã sinh type route bằng Next typegen                                                      |
| FE production Webpack                     | Đạt, 71 trang tĩnh, output riêng trong bản sao                                                 |
| BE điều chuyển/cất/sức chứa/công việc kho | 386 đạt, 4 SQL race bỏ qua — `results/be-focused-final.trx`                                    |
| Release API                               | 0 lỗi; 4 cảnh báo NU1902/NU1903 từ gói Pkcs 10.0.0 hiện có, không đổi dependency trong bản sửa |

Không migration/seed/SQL ghi trực tiếp/ghi dữ liệu deploy; không commit/push. Không chạy toàn bộ BE suite. QA Edge/mobile/camera và SQL Server race chưa được chứng nhận. Hai ca lỗi cũ đã có bằng chứng tự động nhưng không thay thế nghiệm thu giao diện thật.

Bản chạy QA đã cập nhật tại BE 7080 và FE 3001; health/login 200. BE launcher PID 26072, API PID 9692 tại lúc kiểm tra; FE giữ launcher/node hiện có. `be-fixes-stdout.log` ở thư mục bản chạy `Transfer-Putaway-Inbound-Alignment-20261014` ghi target SqlServer/db71143.public.databaseasp.net/db71143, ApplyMigrationsOnStartup=False và migration/seed bị tắt lúc 16:02. Chỉ thay Application assembly đã test và bốn file FE trong bản sao đang chạy; không build vào output server hay sửa Program.cs của repo. Bản assembly trước sửa giữ ở `Transfer-Putaway-Fixes-20261014/Application-before-fixes.dll`.
