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

## Feedback đang thu thập — 20/10/2026

Trạng thái: ĐÃ ĐƯỢC NGƯỜI DÙNG CHO PHÉP TRIỂN KHAI. Nội dung dưới đây giữ lại số đo và feedback gốc; kết quả sửa nằm ở mục “Kết quả triển khai feedback”.

1. **Tạo điều chuyển chậm.** Log BE lúc 17:05–17:06 (giờ Việt Nam): SaveTransferDraftCommand 3.478 ms, SubmitTransferCommand 6.319 ms, GetTransferQuery 2.993 ms. FE hiện lưu nháp rồi gửi tuần tự và đợi invalidation/refetch; riêng hai lệnh xử lý khoảng 9,797 giây. Các số là thời gian handler, không phải HTTP end-to-end; chưa đo riêng SQL/thông báo/realtime, không cộng cơ học các request chạy song song. Cần đo và tối ưu, không đánh đổi kiểm quyền, giữ chỗ, tính nguyên tử hay chống gửi trùng.
2. **Thông tin phiếu luôn hiển thị.** Bỏ cơ chế dropdown/thu gọn của phần Thông tin phiếu, hiển thị nội dung mặc định, không chỉ đổi trạng thái mở ban đầu mà vẫn giữ nút thu gọn.
3. **Khung Việc tiếp theo tại tab Thực hiện có dấu hiệu bị đè.** Cần tái hiện và xác định nguyên nhân (bố cục, co chiều cao, overflow/border hoặc phần tử chồng lấn); hiện mới là hiện tượng người dùng báo, chưa kết luận nguyên nhân. Sửa để khung, nội dung và nút không bị che ở các viewport/zoom.
4. **Số lượng quét lấy hàng bị đổi khi lăn chuột.** Người dùng thấy 10 biến thành 9,99 hoặc 10,01. Ngăn wheel vô tình tăng/giảm giá trị nhưng vẫn cuộn trang và nhập/quét bằng bàn phím bình thường. Kiểm tra step và độ chính xác ĐVT; chặn số lẻ không hợp lệ ngay trên giao diện, hiện lỗi tại ô và không gửi request. Không tự làm tròn/cắt số hoặc vô tình cấm số lẻ hợp lệ của ĐVT cho phép thập phân; đối chiếu quy tắc BE trước khi triển khai.
5. **Giao diện staff mobile-first.** Ưu tiên màn quét mã, lấy hàng, kiểm nhận và cất hàng trên điện thoại: vùng quét/nhập rõ ràng, nút dễ chạm, thao tác chính dễ thấy, thông tin theo từng việc/dòng hàng thay vì ép bảng rộng cuộn ngang. Giữ hỗ trợ máy quét bàn phím, camera, trạng thái chờ/lỗi/chống gửi trùng và dùng tốt trên desktop. Chưa triển khai, cần tổng hợp thiết kế sau khi người dùng feedback xong.
6. **Xác nhận lấy hàng, xác nhận xe rời kho, giao việc nhận/cất đều chờ lâu.** Người dùng chưa rõ do mạng hay xử lý; không kết luận khi chưa đo. Log handler BE ghi nhận ngày 20/10/2026 (giờ Việt Nam): RecordTransferPickCommand 4.176 ms lúc 17:17:32; CompleteTransferPickingCommand 4.495 ms lúc 17:18:46; DispatchTransferShipmentCommand 9.711 ms lúc 17:20:02; hai lượt AssignWarehouseTaskCommand 4.265 ms lúc 17:22:50 và 4.048 ms lúc 17:23:07. Sau các thao tác có nhiều GetTransferQuery khoảng 4,8–5,3 giây, một số hoàn tất gần nhau; pick-sheet khoảng 4,0–4,5 giây. Cần tách thời gian lệnh, GET/refetch, invalidation/realtime và chuỗi phân công hai việc; kiểm tra request lặp trước khi tối ưu. Đây không phải số đo toàn bộ HTTP hay toàn bộ thời gian một lần bấm, không cộng các request song song. Ghi nhận thêm các lệnh kế hoạch cất: SetTransferPutAwayPlanCommand 5.254 ms; GetTransferPutAwayPlanSuggestionsQuery khoảng 6,98–7,29 giây; xem trong cùng đợt phân tích nếu cùng nguyên nhân. Giữ đúng phân quyền, phạm vi kho, chống trùng và mốc ghi tồn.
7. **Bảng hàng hóa từng đợt tại tab Thực hiện mặc định mở, dùng list/table chung.** Theo ảnh người dùng gửi (Đợt 1 / Hàng hóa đợt 1), mở sẵn bảng hàng hóa của đợt thay vì mặc định thu gọn; đây không phải yêu cầu đổi tab Hàng hóa. Chưa có yêu cầu bỏ hẳn khả năng thu gọn bảng như phần Thông tin phiếu. Áp dụng OperationalListPanel và Table/chính sách list-table hiện có, tận dụng OperationalPagination khi cần phân trang; giữ border, header, vùng cuộn và footer đúng guideline, không tự dựng khung hoặc công thức chiều cao riêng. Thiết kế phù hợp nhiều đợt và kết hợp mobile-first cho staff, tránh các vùng cuộn lồng nhau hoặc co/che nội dung.
8. **Scrollbar trang kế hoạch cất hàng phải đồng bộ web.** URL người dùng phản ánh: `/transfers/da815bd6-a0d4-4602-b31f-bd933d157bc3/putaway`. Dùng lại scrollbar/component cuộn đã thiết kế dùng chung của dự án, không tạo CSS hay scrollbar riêng cho trang. Kiểm tra đúng vùng cuộn, header/footer, bàn phím/touch và tránh cuộn lồng nhau; kết hợp thiết kế mobile-first cho staff. Hiện chỉ ghi nhận, chưa thay đổi giao diện.
9. **Xác nhận cất hàng quá chậm.** Log 17:30:51 ngày 20/10/2026: PutAwayTransferShipmentCommand mất 10.786 ms (10,786 giây). Sau đó GetTransferQuery xuất hiện nhiều lượt khoảng 4.934–5.205 ms; GetTransferPutAwaySheetQuery mất 6.570 ms lúc 17:31:01 và 6.569 ms lúc 17:31:08. Thời gian handler đã chậm thực sự, không chỉ cảm giác spinner; handler bao gồm chờ DB/dịch vụ nên chưa quy riêng cho mạng, SQL hay realtime. Không cộng các GET song song và không coi số đo này là tổng HTTP end-to-end.

### Số đo bổ sung trong khi người dùng tiếp tục thao tác

Log handler BE ngày 20/10/2026, giờ Việt Nam (không phải HTTP end-to-end; log hiện không có transfer ID nên không khẳng định mọi request thuộc riêng URL trên):

- 17:25:09 — StartTransferReceivingCommand: 5.002 ms.
- 17:26:36 — SubmitTransferReceiptCommand: 6.408 ms.
- GetTransferReceiptSheetQuery: khoảng 2.938–3.014 ms.
- GetTransferPutAwaySheetQuery: 6.581 ms lúc 17:27:02; 6.628 ms lúc 17:27:59; 6.674 ms lúc 17:28:07.
- GetTransferPutAwayPlanSuggestionsQuery: 6.782–7.268 ms trong khoảng 17:25–17:28 (nhiều lượt gọi).
- 17:27:52 — SetTransferPutAwayPlanCommand: 4.340 ms.
- GetTransferPutAwaySlotsQuery: khoảng 753–988 ms; GetTransferQuery tiếp tục khoảng 4.789–5.228 ms, có nhiều lượt hoàn tất gần nhau sau thao tác.

Cần đưa nhận/kiểm đếm/cất và kế hoạch cất vào đợt phân tích hiệu năng tổng thể: tách xử lý BE, request phụ/refetch và ảnh hưởng mạng; chưa kết luận nguyên nhân hay cộng các thời gian song song. Chỉ theo dõi log của thao tác do người dùng thực hiện, không tự gửi lệnh ghi để đo.

### Rà code bước cất hàng và kế hoạch xử lý hiệu năng (chưa triển khai)

#### Đã xác nhận qua code

- **Lệnh cất có nhiều bước đọc tuần tự.** `PutAwayTransferShipmentCommandHandler` nạp aggregate toàn phiếu, quyền/kho/assignee/replay, receipt và lịch sử cất của đợt, kế hoạch, sản phẩm/ĐVT, danh sách vị trí nhận toàn kho, rồi đọc lại các slot/rack được chọn. `TransferPutAwayPlans.LoadAsync` tiếp tục truy vấn receipt/lịch sử cất theo toàn phiếu để tính ngân sách qua nhiều đợt. Dữ liệu có giao nhau, nhưng không được thay bằng dữ liệu của riêng đợt khi ngân sách cần toàn phiếu.
- **GET phiếu cất nạp dữ liệu chồng lặp.** `GetTransferPutAwaySheetQueryHandler` gọi `GetTransferReceiptSheetQueryHandler` (đã nạp aggregate), sau đó tự nạp aggregate lần nữa; kế hoạch đọc lịch sử cất, GET lại đọc actual putaway và dữ liệu vị trí. Đây là điểm có thể giảm roundtrip/tải thừa sau khi đo, không phải lý do để bỏ dữ liệu kiểm soát ngân sách hoặc lịch sử.
- **FE đợi refresh rồi lại refresh.** `usePutAwayTransferShipmentMutation.onSuccess` trả về `invalidateTransferQueries`, làm mới diện rộng transfers/inventory/tasks; `useTransferPutAwayForm.send` đợi mutateAsync xong mới báo thành công; `TransferPutAwayPage` sau confirm thành công lại gọi `reload()` với detail + putaway sheet. Có chuỗi chờ nối tiếp và hai nguồn refresh; cần gộp quyền sở hữu refresh, không chỉ bỏ await trong khi vẫn cho cất tiếp từ dữ liệu cũ. Realtime/observer khác có thể góp request, nhưng chưa gán chắc từng GET trong log cho một nguồn khi thiếu correlation ID.
- **Gợi ý không đồng nghĩa với gọi AI.** Query AI đang `enabled:false`; query theo quy tắc kho dùng cùng tên handler, `useAi:false`, cache theo version. Log chỉ có tên handler nên chưa chứng minh các lượt 7 giây là do AI. Kiểm tra thêm tác động đổi version/invalidation tới query quy tắc.
- **Điểm cần profile, chưa có tỷ trọng thời gian:** ledger kiểm lô/tồn/sức chứa (đã có cache sản phẩm/slot trong phạm vi instance), low-stock evaluator, chọn người nhận thông báo, SaveChanges, publish thông báo/realtime sau commit. Chưa có số đếm SELECT/roundtrip hoặc timing từng đoạn để kết luận nút thắt lớn nhất.

#### Thứ tự thực hiện khi người dùng kết thúc feedback

1. **Đo baseline và lập bản đồ request (ưu tiên cao nhất).** Gắn correlation/trace và timing từng chặng đọc-validate-ledger-alert-save-publish; ghi số roundtrip/thời gian SQL, cache hit/miss và số dòng/đợt/slot, không log token, connection string hay dữ liệu nhạy cảm. Đối chiếu Network FE với log BE để tách: lệnh POST, refresh bắt buộc, dữ liệu phụ và thời gian spinner. Không tự tạo/cất phiếu deploy để benchmark; dùng fixture cô lập hoặc quan sát thao tác người dùng.
2. **Sửa vòng đời request ở FE.** Một nơi chịu trách nhiệm refresh sau mỗi thao tác, khóa theo đúng transfer/shipment/query key và gộp echo realtime của chính lệnh. Chỉ đợi dữ liệu tối thiểu của màn đang làm; danh sách phụ/inventory/tasks ngoài màn đánh dấu stale, cập nhật khi cần. Tách trạng thái “đã ghi nhận, đang tải phần còn lại” khỏi “đang ghi”; chưa có snapshot mới thì khóa lượt ghi kế tiếp. Không optimistic báo tồn đã đổi trước khi server xác nhận, không bỏ replay/uncertain-result.
3. **Tối ưu BE cất hàng và các GET liên quan từ số đo.** Tái sử dụng dữ liệu đã nạp trong cùng request, gom đọc receipt/putaway/plan theo scope chính xác, bỏ nạp aggregate lần hai ở GET, chọn projection/no-tracking cho phần chỉ đọc. Xác nhận slot/rack/zone theo tập ID cần dùng thay vì lấy toàn kho nếu vẫn giữ đủ kiểm tra kho, active, rack-level và mã quét. Ledger/capacity dùng cache hiện có, batch các đọc còn lặp theo sản phẩm/slot/lô nếu profile cho thấy đáng kể. Không Task.WhenAll truy vấn trên cùng DbContext.
4. **Rà side effect sau commit.** Đo riêng low-stock, notification recipients và publish. Bảo toàn alert/audit trong giao dịch và thông báo/realtime đúng người/đúng kho. Không fire-and-forget task dùng scoped DbContext, không bỏ thông báo, không thêm queue/cache/dependency mới khi chưa cần. Chỉ đưa side effect ra khỏi đường phản hồi nếu có cơ chế bền vững, xử lý lỗi/retry phù hợp và phạm vi được thống nhất.
5. **Mở rộng mẫu tối ưu có bằng chứng sang các mục 1 và 6.** Rà tạo phiếu hai lệnh tuần tự, ghi/hoàn tất lấy, xuất xe, phân công nhận/cất và kế hoạch cất. Nếu thay đổi endpoint/chuỗi ghi phải giữ tính nguyên tử, tương thích nháp và tránh trường hợp thành công một nửa; không gộp các mốc lấy/xuất/kiểm nhận/cất thành một mốc ghi tồn.
6. **Gộp đợt sửa UI theo note.** Thông tin phiếu luôn hiện (2), khung Việc tiếp theo (3), mặc định mở bảng/list dùng chung (7), scrollbar chung (8); thiết kế staff mobile-first (5), chặn wheel/số lượng sai precision (4). Xác minh layout qua nhiều viewport/zoom; không đụng các role/permission đã sửa ngoài yêu cầu.
7. **Kiểm chứng trước bàn giao.** Test quyền/tenant/kho/assignee, version/plan version cũ, retry cùng command ID, gửi trùng, nhiều đợt/nhiều lô/nhiều vị trí, cất một phần, concurrent capacity và lỗi đọc lại sau commit. Đếm GET theo key để không có hai vòng refetch cho cùng thao tác; giữ form khi lỗi. So sánh trước/sau cùng dữ liệu/môi trường: handler/SQL/roundtrip, POST HTTP và thời gian sẵn sàng UI riêng; ghi số mẫu, không hứa SLA từ một lượt đo. Chạy test, typecheck/lint/build phù hợp; SQL race cần fixture SQL cô lập được xác minh.

**Ràng buộc:** không sửa/xóa dữ liệu lịch sử hay DB deploy, không tự migration/seed. Không giảm kiểm quyền, FEFO/lô, số lượng/ĐVT, ngân sách cất, sức chứa, mốc ghi tồn, RowVersion/PlanVersion hoặc idempotency để đổi lấy tốc độ. Nếu profile cho thấy cần index/migration, báo riêng tên và tác động, chờ cho phép trước khi áp dụng.

## Kết quả triển khai feedback — 20/10/2026

1. **Tạo yêu cầu:** giữ lưu nháp → gửi vì endpoint tạo nhanh cũ phục vụ AI không mang đủ thông tin form (người yêu cầu, thời gian, ghi chú, ĐVT, vị trí ưu tiên). Bỏ refetch chen giữa hai lệnh và khi chuẩn bị điều hướng. Khóa đồng bộ toàn chuỗi để bấm đúp không tạo/gửi thêm phiếu; giữ nháp khi gửi lỗi. Chưa đổi thành endpoint atomic mới.
2. **Thông tin phiếu:** bỏ hoàn toàn nút/Collapsible, luôn hiện nội dung.
3. **Việc tiếp theo:** tách khung khỏi viền cha bằng khoảng đệm, giữ shrink-0/min-width, cho nội dung và nút xuống dòng trên điện thoại. Chưa xác nhận hình học bằng trình duyệt thực tế; cần người dùng đối chiếu hiện tượng chồng viền đã báo.
4. **Số lượng quét:** dùng Input text + bàn phím numeric/decimal để wheel không đổi số; giữ dấu thập phân đang gõ. Chặn NaN, cú pháp mũ/hex, số âm và số lẻ sai precision; không tự làm tròn. PickSheet trả precision của ĐVT; API lấy hàng kiểm cùng precision. Đơn vị có phần lẻ vẫn dùng đúng độ chính xác cho phép (tối đa 2).
5. **Staff mobile-first:** màn lấy dùng các PickLineCard sẵn có ở màn nhỏ thay bảng rộng, khu quét đặt trước danh sách, nút thao tác cảm ứng. Kiểm nhận/cất giữ cards có sẵn; ô số lượng dùng bàn phím theo ĐVT, không wheel và chữ lớn trên điện thoại. Không thay business state theo kích thước màn hình.
6. **Lấy/xuất/giao việc:** aggregate dùng tracked Include một collection mỗi truy vấn, giảm 5 → 3 lượt đọc chung cho các handler. Giao nhận+cất dùng một snapshot kiểm phiên bản, API vẫn kiểm version/assignee từng task, chỉ refresh sau cùng. Giữ kết quả từng task và chỉ retry phần chưa thành công; không coi hai lệnh giao việc là một giao dịch atomic. Lấy hàng vẫn bắt buộc đọc mới trước khi chuyển dòng; hủy GET cũ trước-commit để không tiến từ snapshot cũ.
7. **Bảng hàng hóa đợt:** mở sẵn ở tab Thực hiện, dùng OperationalListPanel + Table chung; vẫn cho thu gọn chủ động. Không thêm công thức chiều cao viewport hoặc thanh cuộn kép.
8. **Scroll cất hàng:** vùng operational-list-body dùng data-scrollbar="slim" sẵn có, không tạo CSS riêng.
9. **Cất chậm:** bỏ lần load aggregate trùng giữa ReceiptSheet và PutAwaySheet; đọc slot/rack/zone bằng Include. Lệnh cất chỉ kiểm các slot đã chọn bằng cùng quy tắc kho/active/rack-level. Mutation chỉ đánh dấu stale, trang nhận/cất sở hữu một lần reload bắt buộc; màn đã có dữ liệu không đợi gợi ý theo quy tắc trước khi hiển thị. Log cất tách authorization/load, validation/plan, ledger, tasks/notifications, low-stock, commit và publish kèm transfer/shipment ID.

### Đo chỉ đọc, không tạo/cất phiếu deploy

Đo GetTransferPutAwaySheetQueryHandler trên cùng phiếu người dùng cung cấp, cùng shipment (1 dòng kiểm nhận, 1 dòng cất còn/đã xử lý, 1 dòng lịch sử). Bản trước là các DLL Release local đang chạy trước sửa; bản sau dùng DLL Release mới. Mỗi bản 1 lượt warm-up + 3 lượt đo, cùng harness EF SqlServer; policy harness chỉ cho View đúng kho đích, không đo middleware HTTP/authorization thực tế. DbCommandInterceptor chỉ cho SELECT, chặn NonQuery/Scalar/SaveChanges. Không Start host, Quartz, migration hay seed trong harness.

| Chỉ số                     | Trước                 | Sau                   |
| -------------------------- | --------------------- | --------------------- |
| SELECT mỗi GetPutAwaySheet | 26                    | 15                    |
| Handler, 3 mẫu sau warm-up | 5549 / 5553 / 5553 ms | 3157 / 3152 / 3141 ms |
| Trung vị handler           | 5553 ms               | 3152 ms               |

Giảm 11 SELECT (~42%) và trung vị handler ~43% trong mẫu này. Không suy ra SLA, POST cất <3 giây hay mức cải thiện cho kho nhiều dòng từ 3 mẫu. Bản đo Debug sơ bộ sau sửa là 3456 ms; số Release trong bảng là số so sánh cuối. Cần tiếp tục quan sát POST thực do người dùng thao tác bằng log từng giai đoạn; chưa benchmark lệnh ghi trên deploy.

### Kiểm chứng và giới hạn cuối đợt

- BE transfer: 245 passed / 4 skipped (không chạy SQL Server race). Bổ sung bài kiểm 3 lượt đọc aggregate vẫn tracked, 1 lượt lookup slot đúng kho/active, API số nguyên/phần lẻ và precision trả về.
- FE: toàn bộ transfer suite, production TypeScript, ESLint và production isolated build được chạy; kết quả cuối cập nhật ở docs/AI_REVIEW.md. Có test chống refetch trùng sau pick, bỏ GET trước commit, chặn số lẻ trước POST, giao hai task chỉ một GET, chống bấm đúp tạo, wheel-safe input và nhập phần lẻ.
- Không thay quyền/role, migration/schema, dữ liệu lịch sử hay các mốc ghi tồn. Không đưa side effect ra fire-and-forget/queue; giữ audit, cảnh báo và thông báo.
- Browser use trước đó bị tắt; cần người dùng kiểm tra trực tiếp hình học khung Việc tiếp theo, màn nhỏ/zoom, camera thật và thời gian POST. Không ghi nhận các mục này là đã QA trực quan.
- FE được tắt tạm và bật lại theo xác nhận. BE khởi động lại bằng build tối ưu khi được người dùng đồng ý, migrations/seed tắt. Chưa commit/push.
