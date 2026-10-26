# Cất hàng điều chuyển theo trải nghiệm Nhập kho

## Quyết định nghiệp vụ

- Chỉ cất hàng tốt thực nhận. Còn cất = tổng hàng tốt thực nhận − tổng hàng tốt đã cất, theo dòng và lô. Không trừ hàng hỏng lần nữa.
- Hàng hỏng/thiếu vẫn thuộc hồ sơ chênh lệch. Đợt 8 tốt + 2 hỏng hoàn tất cất sau 8 tốt và giữ trạng thái ReceivedWithDiscrepancy.
- Không sửa/xóa dòng cất, sổ kho hoặc tồn kho lịch sử. Luồng phiên bản 0 và nhận bổ sung giữ tương thích.
- Kế hoạch trước khi hàng về là kế hoạch dự kiến. Khi thực hiện, phân bổ chỉ tới lượng tốt thực nhận còn lại; không tự lưu kế hoạch hoặc tự ghi tồn.

## A — Backend

1. Phiếu kiểm nhận chỉ tạo nhu cầu cất khi có hàng tốt. Toàn hàng hỏng/thiếu kết thúc kiểm nhận, hủy việc cất không cần thiết và giữ chênh lệch.
2. Phiếu cất chỉ trả dòng hàng tốt cần cất; lịch sử vẫn trả mọi chất lượng. Lệnh cất từ chối hàng hỏng và cộng dồn giới hạn thực nhận theo dòng/lô.
3. Cho hoàn tất đợt lịch sử đang chờ cất nhưng không còn hàng tốt bằng lệnh cất rỗng có phiên bản, quyền và idempotency, không ghi tồn. Lệnh rỗng khi còn hàng tốt bị từ chối.
4. Gợi ý dùng chung bộ xếp hạng/phân bổ sức chứa của Nhập kho. Thêm lựa chọn useAi: mặc định giữ hành vi API cũ; false không gọi AI, true chỉ từ thao tác người dùng.
5. Số còn cất trên chi tiết đợt/phiếu tính bằng hàng tốt đã cất, không lấy tổng lịch sử gồm hàng hỏng để khấu trừ.

## B — FE và UI/UX

1. Mở trang tự tải gợi ý quy tắc kho. Kế hoạch đã lưu được ưu tiên; phần thiếu kế hoạch được điền vị trí và số lượng từ gợi ý. Không đủ sức chứa giữ dòng phần dư rõ ràng, không bịa vị trí/số lượng.
2. Nháp kế hoạch chưa có vị trí được điền tự động, vẫn cần bấm Lưu kế hoạch. Không thay kế hoạch đã lưu hoặc nội dung người dùng đang chỉnh.
3. Form cất hiển thị vị trí có thể đổi bằng combobox/sơ đồ kho và số lượng đã điền, bố cục gọn trên desktop, xếp dọc trên mobile. Quét/camera vẫn bắt buộc để xác nhận vị trí, trừ lối thoát có lý do hiện hành.
4. AI chạy khi bấm Gợi ý AI. Áp dụng theo hàng hoặc toàn bộ, xác nhận trước khi thay nháp đang chỉnh; không làm mất kết quả lưu chưa xác định. Thay vị trí/phân bổ xóa xác nhận quét và yêu cầu kiểm tra lại.
5. Gợi ý tự động không ghi đè nháp bẩn, không áp response của phiên bản cũ. Tải lỗi có thông báo và thử lại; người dùng vẫn có thể chỉnh tay. Không gọi AI khi mở/tải lại trang.
6. Sử dụng OperationalListPanel, LookupCombobox, PutawaySuggestionPanel, dialog và ScanInput/camera sẵn có. Không thêm thư viện, không gộp hook/API nhập kho với điều chuyển.

## C — Kiểm thử và bàn giao

- BE: 8 tốt + 2 hỏng, cất nhiều lần, toàn hỏng/thiếu, nhiều lô, vượt thực nhận, payload hỏng bị từ chối, lịch sử hỏng giữ nguyên, hoàn tất lịch sử không ghi tồn, gợi ý quy tắc không gọi AI.
- FE: ngân sách dùng chung qua lô, tự điền chỉ phần còn lại, không đủ chỗ, không nhận hàng hỏng, không ghi đè nháp/mã quét, quét sai vị trí, áp dụng AI có xác nhận, xung đột/kết quả chưa xác định.
- Hồi quy Nhập kho vì dùng chung bộ gợi ý. Chạy test/build/TypeScript/lint trên bản sao riêng ổ D, không ghi đè output dev server.
- Không migration, seed hay SQL ghi trực tiếp. Không tự commit/push. Cập nhật AI_REVIEW bằng kết quả thật; kiểm trình duyệt chỉ ghi đạt khi có bằng chứng thực tế.

## Trạng thái

- A/B đã triển khai. C tự kiểm: toàn bộ FE 1.171 test đạt; BE phạm vi điều chuyển/cất/việc kho 320 đạt, 4 SQL race bỏ qua; TypeScript/lint và production FE/Release API build đạt. Không có migration hoặc ghi DB deploy.
- Chưa chứng nhận QA trình duyệt hay SQL Server race. Server QA đã cập nhật code mới ở 7080/3001, health/login trả 200, target/flag migration được xác minh qua log và Quartz tắt trong bản sao. Biên bản: [QA alignment](../../qa/2026-10-14-transfer-putaway-inbound-alignment.md).
- Sau review, đã sửa R1 (kế hoạch và gợi ý dùng chung sức chứa, không ghép lượng chưa được BE kiểm) và R2 (mở nhóm có lỗi, thông báo/focus khi xác nhận sai mà vẫn giữ dữ liệu). Kiểm lại trên bản sao riêng: toàn bộ FE 1.175 đạt, BE phạm vi mở rộng 386 đạt/4 race bỏ qua; TypeScript/lint, production FE và Release API build đạt. API có bốn cảnh báo bảo mật dependency Pkcs hiện có, ghi riêng trong biên bản. Hai ca tái hiện review trước nay đạt. Server QA đã cập nhật bản sửa; các giới hạn nghiệm thu trình duyệt/race vẫn giữ nguyên. Trạng thái `READY_FOR_FINAL_REVIEW`, chưa commit/push.
