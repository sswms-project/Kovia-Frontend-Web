# Điều chuyển: tối ưu sau test thực tế và bố cục quét mobile

Ngày: 21/10/2026, giờ Asia/Saigon. Trạng thái: **ĐÃ TRIỂN KHAI ĐỢT 1 — xem mục8; chưa xác nhận hết độ trễ trên DB deploy**.

Nguồn chính: feedback người dùng/screenshot và log API trong đợt11:44–11:55; raw số đo/TraceId tại workspace `outputs/transfer-api-monitor-20261021.md`. Xem kế hoạch trước `2026-10-20-transfer-test-feedback-performance-plan.md`, mục12–16 để tránh làm lại phần đã sửa.

## 1. Feedback cần xử lý

1. Mobile lấy hàng: khối SKU/tên hàng, nơi lấy theo FEFO, lô và lượng cần lấy đang ở dưới vùng quét. Đưa khối này lên trước vùng quét để nhân viên xác định vị trí trước, không phải cuộn xuống xem rồi quay lên quét.
2. Xác nhận xe rời kho còn chờ lâu.
3. Nộp phiếu **kiểm hàng điều chuyển** xong phải chờ lâu mới sang màn quét cất. Không nhầm với phân hệ kiểm kê kho/cycle count.
4. Xác nhận cất hàng còn rất chậm.
5. Các bước tạo phiếu/đợt, giao việc và các GET tải lại cũng phải được ghi nhận, không chỉ tối ưu riêng nút xác nhận.
6. Bổ sung theo feedback ngày21/10: khối **Thông tin phiếu** trên trang chi tiết điều chuyển có nút thu gọn/mở rộng và **mặc định mở**. Nhân viên mobile có thể đóng phần thông tin dài để đến các tab/thao tác phía dưới nhanh hơn. Yêu cầu này thay cho đề xuất cũ bỏ hoàn toàn khả năng thu gọn; không phải dropdown chọn dữ liệu.

Phạm vi lượt lập kế hoạch: chỉ đọc source/log và ghi tài liệu. Không sửa code, restart, gọi API nghiệp vụ hay chạy QA ghi DB deploy.

## 2. Số đo thực tế làm baseline

Đây là **HTTP của BE local đang dùng SQL Server deploy**, không phải benchmark LocalDB và không phải tổng thời gian render/trình duyệt. Ghép handler theo TraceId. Tất cả request liệt kê dưới đây trả200; chưa có bằng chứng về lỗi ghi trong phần log đã quan sát. Một mẫu thực tế mỗi lệnh không đủ suy ra P95/SLA.

| Thao tác               | Giờ kết thúc |          HTTP |       Handler |
| ---------------------- | ------------ | ------------: | ------------: |
| Lưu nháp               | 11:48:06     |         3.52s |         2.53s |
| Gửi yêu cầu            | 11:48:11     |         4.88s |         3.92s |
| Tạo đợt                | 11:48:44     |         8.47s |         7.46s |
| Giao việc lần đầu      | 11:49:06     |         5.82s |         4.87s |
| Xác nhận lấy một dòng  | 11:51:51     |         4.38s |         3.44s |
| Hoàn tất lấy           | 11:52:02     |         4.21s |         3.27s |
| Xác nhận xe rời kho    | 11:52:30     |         7.66s |         6.71s |
| Giao việc hai lượt sau | 11:53:16/20  | 4.58s / 4.43s | 3.63s / 3.50s |
| Bắt đầu nhận/kiểm hàng | 11:54:10     |         4.76s |         3.81s |
| Nộp phiếu kiểm hàng    | 11:54:25     |         5.52s |         4.54s |
| Xác nhận cất           | 11:55:43     |     **9.81s** |     **8.83s** |

Các lượt đọc đáng chú ý:

| Đường đọc                         |                   HTTP ghi nhận | Ghi chú                                                       |
| --------------------------------- | ------------------------------: | ------------------------------------------------------------- |
| Chi tiết toàn phiếu               |                khoảng3.25–5.72s | Có nhiều lượt gần nhau, chưa chứng minh tất cả đến từ một tab |
| Pick sheet                        |                khoảng2.59–2.84s | Tải sau lấy/hoàn tất lấy và các lần cập nhật khác             |
| Receipt sheet                     |                khoảng2.89–2.98s | Nộp kiểm hàng xong vẫn tải lại                                |
| Put-away sheet                    | 3.93s trước cất / 4.10s sau cất | Handler3.19s / 3.41s                                          |
| Detail ngay sau cất               |       khoảng4.31–4.44s mỗi lượt | Có nhiều lượt gần nhau                                        |
| Gợi ý kế hoạch cất                |                           6.48s | Handler5.79s; chưa biết phần AI/DB chi tiết                   |
| Nhân viên có thể giao việc        |                khoảng3.96–4.49s | Không nhầm với assignment-snapshot                            |
| Assignment-snapshot               |                khoảng1.16–1.20s | Đã là đường đọc gọn; chỉ dành cho người có Manage tương ứng   |
| Công việc kho                     |                      4.53–5.64s | Handler3.82–3.89s                                             |
| Hàng kho xuất / kiểm tồn khả dụng |        khoảng2.47–2.61s / 2.91s | Availability dùng POST nhưng là query đọc                     |

**Không cộng các GET song song** hoặc cộng HTTP với handler/phase. Thời điểm log là kết thúc request; chưa có browser waterfall nên không tuyên bố tổng thời gian từ click tới màn sẵn sàng. Thời gian LocalDB12–31ms ở lượt trước không dự báo được các số HTTP này.

### Phân rã lần xác nhận cất

| Phase tuần tự của handler | Thời gian |
| ------------------------- | --------: |
| Authorization + load      |    1609ms |
| Validation + plan         |    1857ms |
| Stock ledger              |    2043ms |
| Tasks + notifications     |    1555ms |
| Low-stock                 |    1233ms |
| Commit                    |     510ms |
| Publish                   |       1ms |

Phase được ghép theo cùng phiếu/đợt và thời điểm, không có lần cất khác xen kẽ trong đoạn này. Phase logger hiện chưa mang TraceId. Thời gian rải ở nhiều nhóm đọc/xử lý; **commit và realtime publish không phải phần lớn của lần cất này**. Không dùng kết quả này để mặc định dispatch cũng có cùng phân bố.

## 3. Điều đã biết và điều cần xác minh

### Đã xác nhận bằng source/log

- `TransferPickTaskPage.tsx`: wrapper PickEntryWorkspace có `order-first` dưới lg nên vùng quét lên trước TransferPickLinesTable; đây là nguyên nhân thứ tự mobile hiện tại.
- `TransferReceiveTaskPage.tsx:reload(true)`: sau submit thành công, chờ `Promise.all(receiptSheet.refetch(), detail.refetch())`, kiểm trạng thái/người được giao/capability rồi mới điều hướng sang put-away. Đây là chuỗi đọc tuần tự quanh việc chuyển trang, không chỉ độ trễ POST.
- `TransferPutAwayPage.tsx`: trang đích lại cần detail + put-away sheet; rules chỉ chạy khi snapshot hoàn chỉnh và không có write/unknown result. Không xóa các guard này để hiển thị nhanh giả tạo.
- Mutation nhận/cất hiện đã đánh dấu stale với `refetchType:none`. Cần tìm tất cả chủ sở hữu refresh/realtime/page reload; không giả định mutation vẫn eager-refetch toàn bộ như bản cũ.
- `PutAwayTransferShipmentCommandHandler` đọc receipt/put-away của shipment, rồi `TransferPutAwayPlans.LoadAsync` đọc ngân sách toàn phiếu, gồm các dữ liệu có giao nhau. Cần dùng lại đúng snapshot/phạm vi, không bỏ ngân sách các đợt khác.
- Ledger đã có cache metadata theo request và PreloadAsync.5placement cùng sản phẩm/ô ở fixture không tăng SELECT trước tối ưu; không gọi mọi vòng lặp là N+1 và không bật preload mù quáng vì có thể làm chậm trường hợp1dòng.
- NotificationRecipientResolver hiện đã batch role/override/candidates. Còn các lượt đọc cố định để quyết định người nhận/ngữ cảnh; chưa có bằng chứng N+1 theo từng nhân viên ở đây.
- LowStockAlertEvaluator đã batch product/warehouse metadata, nhưng vẫn đọc availability và active alert theo scope. Availability có xử lý trạng thái đang pending trong ChangeTracker, không được thay bằng SUM DB đơn thuần.

### Chưa được chứng minh

- Chênh HTTP–handler khoảng0.7–1s ở nhiều request chưa được phân rã auth/middleware/cache/khác; không khẳng định tất cả là mạng hay token.
- Nhiều GET detail gần nhau có thể từ page reload, cache mount, realtime, nhiều tab hoặc nhiều người test. Log route template không đủ chứng minh chỉ một client gọi trùng.
- Chưa có query-count/DB-time theo từng HTTP thật và phase của dispatch/submit receipt. Không quyết định thêm index, Redis cache hay queue trước khi có số liệu.
- Cảnh báo MARS mất savepoint tự động là warning, không phải bằng chứng transaction đã ghi lỗi. Không đổi MARS hoặc gây lỗi có chủ ý trên deploy.

## 4. Kế hoạch triển khai theo từng gói

### A — Chốt phép đo và chủ sở hữu refresh

1. Giữ HTTP route/status/elapsed/TraceId và handler timing hiện có. Bổ sung TraceId cho phase cất; thêm phase tương tự cho dispatch và submit receipt.
2. Đếm SELECT/SQL command và thời gian DB theo request khi bật chẩn đoán local, chỉ ghi số lượng/thời gian; không SQL text, params, token hay payload. Phân biệt thời gian chờ lock nếu xuất hiện, không suy từ tổng ledger.
3. Dùng correlation tab/origin đã có để đối chiếu GET lặp; không thêm cơ chế nhận dạng bằng cửa sổ5giây hay bỏ foreign events. Không bật log nhận dạng lâu dài ở production.
4. Lập bảng click → POST hoàn tất → fresh read → điều hướng → scanner sẵn sàng. Chỉ browser/device trace mới kết luận được thời gian end-to-end.

Điều kiện qua gói: có baseline riêng cho PUT/POST và GET; xác định owner nào khởi phát mỗi lần fetch trong một tab. Không đụng nghiệp vụ tồn/quyền ở bước đo.

### B — Ưu tiên cao nhất: xác nhận cất hàng

1. Gộp/reuse receipt/put-away/plan reads trong cùng request; bỏ query có tập ID rỗng. Ngân sách vẫn bao phủ tất cả đợt/lô/legacy-modern liên quan của dòng hàng, không chỉ shipment đang cất.
2. Giảm metadata/stock reads trùng ở handler và ledger. Đánh giá sử dụng PreloadAsync hiện có theo bộ dữ liệu1dòng và nhiều sản phẩm/ô/lô; không thêm abstraction hoặc threshold tùy ý khi chưa đo. Slot/stock dùng cho mutation phải tracked và chịu concurrency/capacity validation đúng như cũ.
3. Tái sử dụng metadata/ngữ cảnh thông báo trong request, gộp query có thể gộp; giữ active users, role ceiling, personal deny và warehouse scope. Vẫn stage đúng thông báo trong cùng transaction.
4. Batch low-stock scopes/alerts nếu cần thiết theo số đo; giữ pending-aware stock, thresholds, unique active alert, audit và trạng thái Open/Acknowledged/Resolved. Không chuyển low-stock ra sau commit tùy tiện.
5. Giữ một SaveChanges nghiệp vụ, capacity lock/transaction, rowversion, CommandId/hash/replay, đối chiếu kế hoạch và giới hạn lượng thực nhận. Không chạy nhiều query đồng thời trên cùng DbContext.

Điều kiện qua gói: SQL reads giảm trên mẫu đại diện, không tăng vô lý ở1dòng; tồn, reservation, movement, task, notification, journal giống baseline. HTTP thực tế đo lại; không chỉ báo giảm số SELECT.

### C — Xác nhận xe rời kho

1. Đo riêng load/authorization, reservation consumption, ledger, task creation, notification/low-stock, commit/publish trước khi chọn sửa.
2. Handler đã batch InventoryStock, vì vậy tập trung các đọc reservation theo pick detail và metadata ledger còn lặp. Reuse active reservations theo đúng tenant/item/stock/reference/status trong một request; giữ phân biệt consumed/released và lượng giữ của đợt khác.
3. Giữ consume reservation + giảm tồn + movement + tạo task nhận/cất + trạng thái shipment trong cùng commit. Không chuyển sang InTransit trước khi transaction thành công.
4. Đánh giá notification/low-stock theo trace, tái sử dụng phần sửa góiB nếu thực sự cùng semantics. Không coi publish1ms ở cất là bằng chứng dispatch publish cũng nhanh/chậm.

Điều kiện qua gói: không xuất dư/thiếu, không tiêu giữ chỗ hai lần, không tạo task trùng; stale/concurrent dispatch chỉ một bên thành công. Không thêm tự retry POST khi mất response.

### D — Chuyển từ kiểm hàng sang quét cất

Mục tiêu: sau POST thành công, không chờ một vòng full detail + receipt sheet rồi vào trang đích lặp lại toàn bộ dữ liệu đó.

1. Bổ sung ngữ cảnh thực hiện gọn vào read sheet phù hợp nếu thiếu: shipment status/version, task nhận/cất, assignee, task version và scope/capability cần thiết. Ưu tiên mở rộng DTO/query hiện có thay vì dựng thêm hệ thống read model tổng quát; BE trước FE. Giữ commands trả Unit/Guid theo `.rules`.
2. Sau submit thành công, thực hiện một fresh read của dữ liệu màn cất có ngữ cảnh mới để xác định **đúng người được giao**. Tận dụng cùng query key/cache để trang đích dùng snapshot vừa tải; không fetch full detail chỉ để tìm một assignee nếu dữ liệu gọn đã đủ.
3. Nếu cùng người được giao cất và còn hàng tốt: sang trang cất, hiện skeleton đúng vùng còn tải. Nếu người cất khác: báo đã nộp/đang chờ người được giao, không tự mở luồng ghi của người khác. Nếu không có hàng tốt: giữ luồng hoàn tất/chênh lệch, không đưa sang scanner trống.
4. Snapshot/version/capability phải mới và đúng scope; không dùng assignment-snapshot dành cho Manage để phục vụ staff. Không lấy quyền từ tên role hoặc chỉ từ dữ liệu trước submit.
5. Rules/gợi ý AI không nằm trong critical path mở camera/nhập mã nếu không bắt buộc. Trước khi cho ghi vẫn xác minh kế hoạch/phạm vi/sức chứa/scan đúng; AI không phải nguồn quyền hoặc vị trí hợp lệ.
6. Unknown result vẫn khóa ghi; đối chiếu bằng đọc hoặc replay cùng intent theo cơ chế hiện có. Reload lỗi sau POST thành công phải hiển thị “đã ghi nhận, chưa tải được dữ liệu mới”, không báo nhầm lệnh ghi thất bại.

Điều kiện qua gói: tối đa một owner fresh read per key cho mỗi chuyển bước trong một tab; không mất chuyển giao khi manager đổi assignee trong lúc nộp; không tự nộp lại phiếu.

### E — Giảm tải lại lặp mà không làm mất realtime

1. Map page reload, mutation onSuccess, mount/refetch và realtime tới cùng query key trước khi sửa.
2. Một bước chỉ có một owner tải dữ liệu thực hiện cần thiết; dữ liệu phụ/list/history đánh dấu stale và tải khi thực sự cần. Các sheet độc lập có thể chạy song song qua React Query, không Promise.all trên shared DbContext BE.
3. Trong cùng tab, dedup các read đang chạy cùng key; nếu foreign event tới trong lúc đọc, đánh dấu cần đọc lại sau đó thay vì bỏ sự kiện. Chỉ bỏ echo đúng origin của chính tab theo cơ chế hiện có.
4. Dùng AbortSignal cho GET lỗi thời; không hủy hoặc retry lệnh ghi, không auto-rebase form đang dirty bằng phiên bản mới.
5. Chưa làm endpoint detail tổng quát mới chỉ để giảm spinner. Sau khi xác định màn staff chỉ cần execution context, giảm phụ thuộc full detail theo góiD.

### F — Mobile: vị trí nằm trước vùng quét

Đích giao diện: **Header → khối hàng/vị trí cần lấy → camera hoặc nhập mã → số lượng/xác nhận**; các dòng khác vẫn có đường chọn rõ ràng. Desktop giữ bố cục hai cột đang dùng.

1. Chỉnh thứ tự mobile trong TransferPickTaskPage; bỏ việc buộc workspace quét lên trước card cần đọc. Dùng lại PickLineCard/formatTransferLocation, không tạo nguồn state số lượng/vị trí thứ hai.
2. Với nhiều dòng, làm rõ dòng đang chọn và ngữ cảnh của nó ngay trước scanner; không đẩy toàn bộ danh sách dài lên trước camera khiến nhân viên lại phải cuộn qua mọi dòng. Dữ liệu nhắc vị trí trong scanner lấy từ cùng selected line/suggestion, không cache một bản cũ độc lập.
3. Giữ FEFO/lô/HSD/đơn vị, lượng còn cần lấy và khả năng đổi vị trí/lô/báo quản lý/trả hàng. Khi đổi vị trí hoặc tự chuyển dòng, ngữ cảnh phải đổi cùng lúc và reset scan theo cơ chế hiện có.
4. Khối vị trí dễ đọc, đường dẫn dài xuống dòng; camera và nhập mã đều còn dùng được. Không dùng card sticky cao che video/input hay footer. Không thay global scroll primitive.
5. Trạng thái đang ghi/unknown/stale giữ khóa đúng như cũ. Nút disabled có lý do; focus và thứ tự DOM phù hợp thao tác, footer không che phần đang nhập. Theo các kiểm tra liên quan của [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), ưu tiên nhãn, focus nhìn thấy, safe-area và bố cục không che nội dung; không biến lượt này thành redesign toàn hệ thống.

Điều kiện qua gói: ở320/375/430px, nhìn được đúng vị trí trước lúc quét; chọn dòng/đổi lô không hiển thị nhầm; thao tác nhập tay, máy quét bàn phím và camera đều giữ nguyên. DOM tests không thay thế QA camera/viewport thật.

### G — Sau các điểm chính: tạo đợt/giao việc/dropdown

Tạo đợt8.47s, assignment4.43–5.82s, staff3.96–4.49s là baseline còn lại. Đo tiếp từng phase rồi reuse tối ưu góiB/C khi đúng semantics; không gộp/tách command hay giảm kiểm tra quyền chỉ để cắt thời gian. Draft+submit hiện là hai lệnh; không âm thầm đổi nghiệp vụ đó trong gói chính.

### H — Thông tin phiếu: mặc định mở, cho phép thu gọn

Phạm vi là card trong screenshot có tuyến **Kho xuất → Kho nhập**, tiêu đề **Thông tin phiếu**, trạng thái, metadata và tiến độ. Không áp dụng việc thu gọn này cho khối vị trí cần quét của góiF.

1. Thêm nút thu gọn/mở rộng cạnh tiêu đề, dùng component disclosure/collapsible có sẵn trong dự án nếu phù hợp; mặc định mở khi vào một phiếu mới, áp dụng cả desktop và mobile. Không thêm dependency hay lưu thiết lập dài hạn cho yêu cầu này.
2. Khi đóng, giữ tuyến kho, tiêu đề, trạng thái và nút mở lại dễ thấy; thu phần metadata chi tiết và bảng tiến độ trong card. Không ẩn các tab Thực hiện/Hàng hóa/Lịch sử, nút nghiệp vụ hoặc cảnh báo hành động bắt buộc ở ngoài card. Nếu có thông báo bắt buộc trong phần chi tiết, đưa ra vùng luôn thấy trước khi cho thu gọn.
3. Đóng/mở chỉ thay đổi giao diện, không gọi API hoặc reload trang, không reset form/trạng thái thao tác, không điều hướng. Refetch/realtime không tự mở lại card người dùng vừa đóng khi vẫn ở cùng phiếu.
4. Dùng button có nhãn rõ, `aria-expanded`/`aria-controls`, hỗ trợ bàn phím và focus nhìn thấy. Nội dung đóng không còn nhận focus; nút đủ dễ chạm trên mobile và không chồng lên badge/trạng thái khi tiêu đề xuống dòng.
5. Kiểm tra320/375/430px và desktop: vào phiếu thấy mặc định mở; đóng giảm chiều dài cuộn và đưa phần thực hiện lên gần hơn; mở lại hiển thị đầy đủ dữ liệu mới nhất. Chuyển sang phiếu khác trở về mặc định mở; đóng/mở không phát sinh request, không mất dữ liệu đang nhập hoặc quyền thao tác.

Điều kiện qua gói: nhân viên chủ động thu gọn thông tin dài trên mobile nhưng vẫn nhận diện đúng phiếu/trạng thái; không ảnh hưởng scanner, bảng hàng hoặc luồng xác nhận. Đây là yêu cầu kế hoạch, chưa triển khai code.

## 5. Rào chắn không được thay đổi

- Đúng tenant, đúng kho xuất/nhập, người được giao và effective permission; grant/deny/revocation phải còn hiệu lực. Không cache quyền dài hơn hay dùng role-name shortcut mới.
- Giữ FEFO, lot/quality, base-unit precision, reserved/available, capacity và phần giữ chỗ đợt khác.
- Trạng thái/expectedVersion, CommandId/hash/replay, atomic commit và rollback nguyên khối. Không cập nhật lạc quan tồn hoặc trạng thái thành công trước server.
- Không bỏ thông báo/cảnh báo/audit; không fire-and-forget. Publish hiện1ms ở mẫu cất không phải ưu tiên làm outbox/queue mới.
- Không migrations/index/DB setting changes ở đợt đầu. Nếu cần schema mới, tách đề xuất tên migration/tác động và chờ phép trước khi áp dụng db71143. Không reset/xóa DB deploy hay DB QA đã tạo.
- Theo dõi live hiện chỉ đọc log tới12:45 cùng ngày; không tự kéo dài hoặc sửa hệ thống qua heartbeat. Việc triển khai cần một lượt được người dùng yêu cầu riêng.

## 6. Kiểm chứng và điều kiện nhận

1. Làm từng gói nhỏ: GitNexus impact trước sửa symbol, kiểm caller trực tiếp và báo HIGH/CRITICAL; preserve dirty instruction/config/output files. Không thêm dependency khi chưa cần.
2. Kiểm thử function với1dòng, nhiều dòng, nhiều slot/lô, một phần, hỏng/thiếu, legacy/modern, hết hàng, kế hoạch đổi và reassignment. So sánh **kết quả nghiệp vụ**, không chỉ thời gian.
3. Mỗi gói BE: chạy nhóm transfer/task/storage-capacity/ledger và bật5test SQL Server race/lock trên LocalDB riêng. Baseline hiện tại **354/354 đạt,0bỏ qua** sau sửa fixture. Bổ sung race liên quan dispatch/reservation nếu thay phần đó;5test có sẵn không chứng minh mọi race của dispatch.
4. Nếu sửa low-stock/permission/notification dùng chung: chạy thêm các nhóm parity/RBAC/notification/low-stock và callers ngoài transfer; không giới hạn test vào luồng happy path.
5. FE: fetch-count per query key, foreign realtime trong lúc write/read, own echo, unknown result, double-click, chuyển phiếu/assignee, snapshot stale, manual/camera/keyboard và thứ tự mobile. Kiểm tra disclosure Thông tin phiếu mặc định mở, đóng/mở không fetch/reset form, giữ trạng thái đóng khi refetch cùng phiếu và reset mở khi đổi phiếu. Build/typecheck/lint theo repo; không tự tắt FE đang test để build khi chưa được đồng ý.
6. Benchmark trên fixture SQL thật: ít nhất1warmup+5mẫu cho median, tách1dòng và nhiều distinctproduct/slot/lot. Đo trước/sau tuần tự khi không build cạnh tranh; không chọn riêng mẫu nhanh để báo. Nếu cần P95 phải có tập mẫu đủ và phương pháp riêng.
7. App thật dùng hành động người dùng bình thường, ghép HTTP/handler/SQL/phase/browser và GET reload; không tự tạo dữ liệu benchmark deploy. Báo riêng cold/warm nếu đo được.
8. Mục tiêu đợt đầu: giảm median POST chính có thể đo được (định hướng25–30%, **không cam kết** trước đo), giảm duplicate GET trong cùng tab, không tăng query budget vô lý cho1dòng và không có hồi quy đã xác nhận. Nếu thời gian không cải thiện nhất quán thì ghi rõ, không coi giảm SELECT là hoàn thành vấn đề5–10giây.

## 7. Thứ tự thực hiện đề xuất

**A đo/correlation → B cất → C dispatch → D chuyển màn + E refresh → F mobile + H thu gọn thông tin → G các bước phụ.**

GóiF/H là thay đổi giao diện tách biệt, có thể thực hiện sớm sauA nếu người dùng muốn thấy ngay. Không cần chờ sửa hết BE, nhưng không trộn với thay đổi khóa/numeric/scanner state để giảm rủi ro. Các mục trên là tiêu chí thiết kế; mục8 ghi trạng thái triển khai thực tế.

## 8. Kết quả triển khai đợt1 — 21/10/2026

Người dùng đã yêu cầu triển khai, đồng ý tắt tạm FE để kiểm tra rồi bật lại, và khởi động lại BE khi kiểm tra đạt. Lịch theo dõi đã xóa theo yêu cầu trước đó, không tự tạo lại.

### Đã làm

- **A:** thêm TraceId cho phase cất; thêm phase load/validation hoặc reservation-ledger/task-notification/low-stock/commit/publish cho submit receipt và dispatch. Chưa thêm interceptor SQL chạy trên production hoặc chẩn đoán browser/origin mới.
- **B:** TransferPutAwayPlans trả cùng snapshot actual modern put-away dùng cho ngân sách và handler/sheet; chỉ hàng Good tiêu ngân sách, giữ toàn bộ đợt và nhận bổ sung, giữ lịch sử khác quality cho phần hiển thị. Không hỏi legacy receipt khi tập dòng legacy rỗng, không hỏi actual modern khi tập modern rỗng. Không bỏ khóa/capacity/journal/rowversion/permission hoặc chuyển notification/low-stock ra ngoài transaction.
- **C:** giữ chỗ Active của các item trong đợt xuất được đọc tracked một lần, Consume dùng trạng thái pending của cùng batch thay vì Find cho từng pick detail. Tiêu thụ một phần vẫn tách lịch sử Consumed; đợt khác còn phần giữ chỗ của nó. Một dòng không được hứa giảm SELECT ở bước này; lợi ích chính là tránh tăng truy vấn theo số detail.
- **D:** receipt sheet có thêm Execution gọn (kho nhập/tên kho và người được giao nhận/cất), tenant/reference/type/warehouse được giới hạn ở BE. FE dùng context này thay full detail cho màn kiểm hàng và fresh handoff; BE cũ không có field vẫn dùng đường đọc cũ. Vẫn đọc mới sau submit, kiểm đúng assignee/quyền/kho rồi mới điều hướng. Lỗi đọc sau ghi thành công có thông báo rõ, không nộp lại. Product+Unit và pick+stock/lot được join, tránh các lượt đọc tách; thiếu/sai tenant/mất dòng qua navigation filter hoặc tổng dispatch không khớp bị từ chối, không âm thầm giảm lượng phải nhận. Màn cất chưa phụ thuộc context mới nên đường receipt nội bộ của nó không đọc thêm task/warehouse chỉ để trả field không dùng.
- **F:** trên mobile, card hàng/vị trí đang chọn nằm trước scanner; những dòng khác ở bên dưới, không nhân bản card đang chọn trong danh sách mobile. Dùng lại PickLineCard và selected line hiện có; desktop vẫn hai cột, DOM mobile đi theo thứ tự card → scanner → các dòng khác. Không sửa logic quét, số lượng, FEFO, camera hoặc state ghi.
- **H:** Thông tin phiếu dùng Collapsible có sẵn, mặc định mở, thu phần metadata/tiến độ; tuyến kho, trạng thái và cảnh báo legacy vẫn thấy. Đóng/mở không fetch, giữ lựa chọn khi refetch cùng phiếu, mở mặc định khi đổi phiếu.

### Kiểm chứng

- FE: toàn nhóm transfer **73 file /489 test đạt**; sau chỉnh thứ tự DOM cuối cùng, chạy lại2file/8test liên quan, đều đạt. ESLint phần thay đổi và TypeScript theo tsconfig.production đạt; production build cô lập với KOVIA_ISOLATED_BUILD=true đạt. Build mặc định vẫn vướng fixture cũ dưới tmp/excel-export-qa và tmp/opening-stock-ui, không sửa fixture ngoài phạm vi hay tắt type-check để báo xanh. File .next/dev/types sinh tự động bị hỏng được chuyển dự phòng sang outputs/transfer-live-optimization-20261021/next-dev-types-backup rồi sinh lại, không xóa.
- BE: **381 đạt /0 lỗi /0 bỏ qua** trong nhóm transfer/task/storage-capacity/ledger. Bật đủ6test SQL Server thật:5race/lock có sẵn + race dispatch mới chứng minh một bên commit, trừ tồn/consume một lần, chỉ một cặp task nhận/cất và giữ phần reservation còn lại. Có test một-query expected lot và guard thiếu/foreign/mismatch; mixed legacy/modern/late receipt/Good-vs-Damaged budget; context assignee mới và denied destination; FE có fallback/khác assignee/sai kho/lỗi đọc/mất context.
- Tất cả QA ghi dùng InMemory hoặc LocalDB riêng `(localdb)\\MSSQLLocalDB`; hai catalog race/lock suffix20261021_123019_507 được giữ lại. Không migrations/seed/SQL QA write lên db71143, không xóa/reset DB nào. Các lần build lỗi trước khi chạy test cũng được ghi nhận, không tính là test đạt.
- GitNexus đã chạy impact; loader plan HIGH vì dùng chung legacy receive/modern put-away/set plan. Detect-changes tổng working tree báo BE CRITICAL/FE HIGH (gồm cả thay đổi từ trước); đã rà trực tiếp callers và các guard. Một số symbol mới không có trong index, truy vết bổ sung bằng source. Đây là tự review của implementer, không phải review độc lập.

### Đo SQL/HTTP fixture riêng (không phải API production)

Giữ probe có sẵn, dùng assembly trước đợt này trong current/ làm baseline, build assembly mới vào outputs/transfer-live-optimization-20261021/probe. Mỗi nhóm1warmup loại khỏi thống kê +5mẫu;1sản phẩm/ô,1hoặc5placement cùng ô; real ledger/SQL nhưng quyền, audit, notification, low-stock dùng test doubles. Không đại diện nhiều sản phẩm/ô/lô hoặc HTTP/auth/network thật.

| Thao tác           | SELECT trước → sau | HTTP median fixture1placement | HTTP median fixture5placement |
| ------------------ | -----------------: | ----------------------------: | ----------------------------: |
| Xác nhận cất       |             19 →17 |                16.32 →16.21ms |                17.70 →17.54ms |
| Tải put-away sheet |             15 →10 |                 11.97 →9.90ms |                 11.49 →9.96ms |

Kết quả nghiệp vụ cuối mỗi scenario kiểm tồn đích đúng lượng và shipment Received. Chênh thời gian xác nhận cất nhỏ, chưa đủ kết luận nhanh hơn nhất quán. Lượt đo trung gian after-live còn chậm hơn nhẹ dù SELECT giảm; không bỏ số liệu đó. Lượt before-live/after-live có TypeScript chạy gần thời điểm đo nên chỉ dùng làm bằng chứng query count, không lấy phần trăm để dự đoán deploy. Lượt after-joined chạy sau build; vẫn không phải SLA/P95 hoặc mức giảm đã xác nhận trên remote DB.

Artifacts tại workspace outputs/transfer-live-optimization-20261021: joined-receipt-regression.trx, final-regression-sql.trx, probe/after-live-results.json và probe/after-joined-results.json; baseline tại outputs/transfer-confirmation-probe-20261021/current/before-live-results.json. Các DB perf suffix20261021_053333_470,20261021_053414_496,20261021_053815_789 được giữ, không xóa.

### Còn cần đo hoặc triển khai có điều kiện

- Chưa tuyên bố hoàn thành vấn đề HTTP5–10giây: cần thao tác thật của người dùng trên bản mới để đối chiếu POST/handler/phase và GET. Không tự sinh dữ liệu benchmark lên deploy.
- GóiD hiện bỏ full detail ở màn kiểm hàng, **chưa** cache/reuse một put-away sheet xuyên navigation; màn cất vẫn có detail riêng. Không đặt staleTime tùy ý hoặc bỏ kiểm assignee để giả lập chuyển màn nhanh.
- GóiE chưa sửa global invalidation/realtime: chưa có bằng chứng các GET sát nhau cùng một tab. Không bỏ foreign event, không hủy/retry lệnh ghi và không tải đè form dirty.
- Metadata ledger, notification resolver và low-stock chưa refactor dùng chung; cần phase/query count trên mẫu thật và distinct products/slots/lots trước khi đổi. Không bật Preload mù quáng cho1dòng. GóiG tiếp tục theo số đo, không đổi mô hình command.
- Chưa QA camera/viewport trên điện thoại thật; DOM/component tests không thay thế được bước này. BE7070/FE3000 đã bật lại để người dùng kiểm tra; ApplyMigrationsOnStartup=false, không startup migration/seed. Giữ các thay đổi AGENTS/CLAUDE/appsettings/output có trước; chưa commit/push.
