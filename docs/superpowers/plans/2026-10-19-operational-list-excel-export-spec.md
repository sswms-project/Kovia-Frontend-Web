# Kovia — Xuất Excel cho danh sách nghiệp vụ

- Ngày cập nhật: 19/10/2026, giờ Việt Nam.
- Trạng thái: `INV01_IMPLEMENTED_PENDING_ACCEPTANCE` — người dùng đã yêu cầu triển khai; đã làm mẫu INV-01, chưa nhân rộng sang các đợt sau.
- Phạm vi: cả `SSWMS-Frontend` và `SSWMS-Backend`. File này là bản theo dõi chung, không nhân bản spec sang BE.
- Yêu cầu đã xác nhận: nút chỉ có icon, không có label hiển thị; có tooltip “Xuất Excel”; đặt trước reload, reload ở ngoài cùng bên phải.
- Tài liệu này thay thế kế hoạch xuất Excel trong hội thoại trước đó. Không phải xác nhận tính năng đã có, đã được kiểm thử hoặc được phép thay đổi quyền trên host.

## 1. Mục tiêu và giới hạn

Cho phép người dùng tải danh sách nghiệp vụ thành `.xlsx`, đúng bộ lọc đã áp dụng, đúng quyền xem và đúng ý nghĩa của từng dòng. Không thay đổi tồn kho, trạng thái chứng từ, kết quả kiểm kê hay kết quả phân tích khi xuất.

Đợt đầu hoàn thiện **Tồn kho khả dụng** làm mẫu rồi mới nhân rộng. Không đồng loạt gắn nút vào mọi bảng hoặc mọi `OperationalListPanel`.

Chưa làm trong phạm vi này:

- Nhân sự, lời mời, thông báo, thanh toán, vai trò/phân quyền và nhật ký hoạt động.
- Trình tùy biến mẫu Excel, chọn cột tùy ý, xuất PDF/CSV hoặc cơ chế nhập lại file xuất.
- Job nền, lưu file lâu dài, link tải công khai, email file hoặc màn hình lịch sử xuất.
- Xuất toàn bộ chi tiết hàng hóa của nhiều chứng từ trong cùng một thao tác xuất danh sách.
- Chạy lại ABC, dự báo hay phép xử lý nghiệp vụ để tạo file.
- Thay đổi chính sách xem kho hoặc quyền của các endpoint xuất báo cáo/chi tiết kiểm kê hiện có.

## 2. Nền tảng đã kiểm tra trong code

| Thành phần       | Hiện trạng liên quan                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Báo cáo kho      | Có BE export riêng, dùng ClosedXML, xuất theo bộ lọc, giới hạn 10.000 dòng. Không dùng API báo cáo làm API xuất mặc định cho danh sách nghiệp vụ. |
| Chi tiết kiểm kê | Export đi qua `GetCycleCountQuery` để giữ kiểm tra quyền và quy tắc che tồn khi kiểm kê mù. Phải giữ nguyên hành vi này.                          |
| Tồn kho khả dụng | Truy vấn đọc tồn trong tenant; tập kho được phân công còn dùng xác định khả năng quản lý. Không được hiểu mọi màn đều chỉ xem kho được giao.      |
| API danh sách    | Có giới hạn phân trang; không thể đổi `PageSize` thành 10.001 rồi bỏ qua validator của API công khai.                                             |
| ABC              | Đọc snapshot phân tích đã lưu; FE có `analysisId`, `version`, `datasetFingerprint`. Không được xuất một lần phân tích khác lần đang xem.          |
| Công việc        | Có phạm vi `mine` và `managed`, đồng thời có công việc hiện tại và lịch sử. Không gom các phạm vi này khi xuất.                                   |
| FE               | Có sẵn Button, Tooltip, DropdownMenu, Skeleton, cơ chế tải Blob, OperationalListPanel và OperationalPagination. Không cần thư viện Excel ở FE.    |

Đường dẫn tham chiếu, tính từ root từng repo:

- BE: `Application/Features/Dashboard/GetWarehouseReport/ExportWarehouseReportQuery.cs`.
- BE: `Infrastructure/Services/WarehouseReportExporter.cs`.
- BE: `Application/Features/Inventory/GetInventory/GetInventoryQueryHandler.cs` và validator cùng thư mục.
- BE: `Application/Features/Inventory/GetABCClassification/GetABCClassificationQueryHandler.cs`.
- BE: `Application/Features/CycleCount/ExportCycleCount/ExportCycleCountQuery.cs`.
- FE: `src/features/reporting/services/warehouse-report.service.ts`.
- FE: `src/features/inventory/pages/InventoryAbcPage.tsx`.
- FE: `src/features/warehouse-task/services/warehouse-task.service.ts`.

## 3. Các finding của spec và quyết định sửa

“Đã sửa” trong bảng này nghĩa là đã sửa **đặc tả**, không phải đã sửa code.

| ID  | Mức    | Thiếu sót trước review                                                    | Quyết định trong spec này                                                                                                |
| --- | ------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| F1  | High   | Đánh đồng phạm vi xem với kho quản lý/phạm vi báo cáo                     | Export kế thừa quyền xem của đúng truy vấn danh sách; quyền xuất chỉ thu hẹp, không mở rộng quyền xem. Xem mục 5.        |
| F2  | High   | Không phân biệt cột ẩn do trình bày và trường bị che do bảo mật/nghiệp vụ | Mỗi dataset có allowlist cột; giữ nguyên masking và kiểm kê mù. Xem mục 5, 9.                                            |
| F3  | Medium | ABC có thể lấy snapshot mới nhất thay vì snapshot đang xem                | Gắn export với analysisId/fingerprint đang xem; không tự chạy lại. Xem mục 7.                                            |
| F4  | Medium | Chốt bộ lọc bị hiểu là đóng băng toàn bộ dữ liệu                          | Chốt điều kiện đã áp dụng; dữ liệu live được đọc lại khi BE xử lý; không hứa snapshot DB tại thời điểm click. Xem mục 6. |
| F5  | Medium | Khóa dòng, lựa chọn cũ và lỗi dòng được chọn chưa được chốt               | Khóa theo dataset, xóa lựa chọn khi đổi phạm vi, kiểm tra toàn bộ ở BE, không xuất thiếu âm thầm. Xem mục 8.             |
| F6  | Medium | Cách tái sử dụng query có thể vượt/bỏ validation phân trang               | Chia sẻ filter/scope/mapping; đường đọc export có giới hạn riêng; không nới giới hạn API list công khai. Xem mục 10.     |

## 4. Danh sách triển khai và đơn vị một dòng

| Mã      | Đợt | Danh sách              | Một dòng Excel                                                                                                         |
| ------- | --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| INV-01  | 1A  | Tồn kho khả dụng       | Một dòng tồn hiện có theo ID dòng tồn; không gộp khác kho/vị trí/lô/chất lượng/trạng thái.                             |
| INV-02  | 1B  | Điều chỉnh             | Một chứng từ điều chỉnh theo truy vấn danh sách đang dùng, không phải từng dòng hàng.                                  |
| INV-03  | 1B  | Lịch sử biến động      | Một biến động ghi sổ.                                                                                                  |
| INV-04  | 1B  | Tồn đang giữ           | Một bản ghi giữ hàng, không suy thành tổng tồn của sản phẩm.                                                           |
| INV-05  | 1B  | Hàng hỏng              | Một hồ sơ hàng hỏng theo danh sách.                                                                                    |
| INV-06  | 1B  | Tồn đầu                | Một chứng từ tồn đầu, không bung thành các dòng hàng.                                                                  |
| INV-07  | 1B  | Phân loại ABC          | Một dòng kết quả của đúng snapshot phân tích đang xem.                                                                 |
| INV-08  | 1B  | Chênh lệch             | Một báo cáo chênh lệch theo danh sách.                                                                                 |
| CAT-01  | 2   | Vật tư hàng hóa        | Một mặt hàng; quy đổi nhiều đơn vị không làm nhân dòng danh sách.                                                      |
| CAT-02  | 2   | Nhà cung cấp           | Một nhà cung cấp.                                                                                                      |
| CAT-03  | 2   | Khách hàng             | Một đối tượng khách hàng/người nhận theo danh sách hiện tại.                                                           |
| CAT-04  | 2   | Kho                    | Một kho.                                                                                                               |
| CAT-05  | 2   | Vị trí kho             | Một dòng của loại danh sách vị trí đang xem; không trộn khu/kệ/ô trong một dataset.                                    |
| DOC-01  | 3   | Các danh sách nhập kho | Mỗi tab là dataset riêng: yêu cầu/phiếu là một chứng từ; danh sách việc nhận/cất giữ đúng một dòng công việc như bảng. |
| DOC-02  | 3   | Các danh sách xuất kho | Mỗi tab là dataset riêng; một dòng theo chứng từ/công việc của đúng tab.                                               |
| DOC-03  | 3   | Điều chuyển            | Một phiếu chuyển; không nhân dòng theo đợt chuyển hoặc mặt hàng.                                                       |
| DOC-04  | 3   | Kiểm kê định kỳ        | Một phiếu kiểm kê; khác tính năng xuất chi tiết vật tư kiểm kê đã có.                                                  |
| TASK-01 | 4   | Công việc kho          | Một công việc thuộc đúng phạm vi mine/managed hiện tại.                                                                |
| TASK-02 | 4   | Lịch sử công việc kho  | Một công việc lịch sử thuộc đúng phạm vi hiện tại; không lấy thêm công việc đang mở.                                   |

Không xuất bảng chi tiết phía dưới trong master/detail chỉ vì người dùng đang chọn một phiếu. Tính năng xuất danh sách và xuất chi tiết phải có tên/phạm vi riêng.

### Hồ sơ contract bắt buộc cho mỗi dataset

Trước khi viết endpoint của từng dòng trong bảng, ghi bổ sung ngay tại mục 14 của file này:

1. Route/tab và truy vấn list nguồn thực tế.
2. Bộ lọc đã áp dụng, sort hiện tại, cách hiểu từng trường ngày và timezone.
3. Khóa dòng từ DTO/nguồn dữ liệu; không giả định mọi dataset có một Guid duy nhất.
4. Quyền xem, quyền xuất mới, chính sách tenant/kho/chủ sở hữu và masking.
5. Allowlist cột, kiểu ô, nhãn và đơn vị.
6. Có/không hỗ trợ xuất lựa chọn; cách xử lý dữ liệu live hoặc snapshot.
7. API export, validator, test parity và test quyền tương ứng.

Đây là checkpoint kỹ thuật theo đợt, không phải mặc định các chi tiết chưa kiểm tra đã được xác nhận. Không bật nút cho dataset chưa hoàn thành hồ sơ contract.

## 5. Quyền, phạm vi và masking

### Quy tắc bất biến

- BE là nguồn thực thi quyền; ẩn nút FE chỉ phục vụ UX.
- Điều kiện xuất: có quyền xem tương ứng **và** quyền chung `lists:export` **và** được xem dataset/phạm vi được yêu cầu. Quyền chung không cho xem thêm danh sách, kho hoặc dữ liệu ngoài phạm vi.
- Tenant lấy từ user context, không tin tenantId do client gửi.
- Phạm vi export bằng phạm vi được phép xem của đúng list nguồn sau khi áp dụng bộ lọc, không tự dùng quyền quản lý thay cho quyền xem.
- Nếu list cho phép xem toàn tenant nhưng chỉ quản lý kho được giao, export không được tự thu hẹp về kho được quản lý. Ngược lại, list giới hạn kho/người nhận việc thì export không được mở rộng.
- Không dùng `reports:view` làm quyền thay thế cho export danh sách. Giữ riêng quyền và hợp đồng của export báo cáo hiện có.
- Không cấp quyền theo tên vai trò trong component/handler. Permission constants và đồng bộ Owner dùng cơ chế tập trung hiện có.

### Bổ sung quyền

- Theo yêu cầu mới ngày 19/10/2026, dùng một quyền chung `lists:export` — “Xuất Excel danh sách”, nhóm Hệ thống → Xuất dữ liệu. Các đợt sau tái sử dụng quyền này, không tạo thêm quyền export theo từng phân hệ.
- Chốt code quyền, metadata tiếng Việt, scope và cách phân phối quyền trong hồ sơ contract trước khi triển khai endpoint.
- Không tự cấp quyền mới cho tất cả tài khoản/role đang có quyền xem; không hard-code grant cho Manager/Staff.
- Export công việc vẫn kiểm tra quyền xem và phạm vi của tôi/quản lý tương ứng; quyền chung `lists:export` không cho vượt từ mine sang managed.
- Không thay quyền của endpoint xuất kiểm kê/báo cáo cũ trong nhiệm vụ này nếu chưa có đánh giá tác động và phê duyệt riêng.
- Không sửa trực tiếp dữ liệu phân quyền trên DB dùng chung để phục vụ QA.

### Cột được phép

- Ẩn vì responsive/tùy chọn trình bày: không tự động loại khỏi file; dùng schema cột export đã chốt.
- Bị che do quyền hoặc nghiệp vụ: tuyệt đối không được xuất giá trị gốc.
- Kiểm kê mù: giữ nguyên quy tắc che tồn hệ thống/chênh lệch; không gọi thẳng repository để bỏ qua truy vấn masking hiện có.
- Không xuất token, row version kỹ thuật, ID nội bộ không cần thiết, đường dẫn file bằng chứng riêng tư hoặc trường nhạy cảm không nằm trong contract.

## 6. Bộ lọc và thời điểm đọc

- `allFiltered` xuất toàn bộ kết quả của **tab/dataset đang mở**, không giới hạn bởi pageNumber/pageSize và không gộp tab khác.
- Mặc định khi không có lựa chọn: click icon trực tiếp xuất allFiltered, không thêm bước xác nhận không cần thiết.
- Request lấy từ cùng nguồn normalized/applied query đã tạo bảng, không đọc text đang nhập chưa được áp dụng.
- Đang debounce hoặc bộ lọc draft khác applied query: tạm vô hiệu hóa export và nêu lý do; người dùng đợi áp dụng hoặc áp dụng bộ lọc trước khi xuất.
- Giữ mọi bộ lọc có tác dụng, kể cả trạng thái mặc định, loại công việc, kho xuất/nhận, nhóm hàng và phạm vi mine/managed.
- Chụp bộ lọc/sort/snapshot key lúc bắt đầu export. Không lấy state mới sau await để đổi phạm vi hoặc đặt tên file.
- Khi request đang chạy, đổi bộ lọc không thay đổi file đang tạo. Thông báo kết quả dùng tên dataset/phạm vi đã chốt để không gây nhầm với màn hình mới.
- Logout, đổi tenant hoặc đổi tài khoản phải hủy/bỏ kết quả tải cũ; không tải file của phiên trước. BE vẫn kiểm tra quyền ở request, không dựa vào guard client.
- Ngày tạo, ngày ghi sổ, ngày hoàn tất không hoán đổi cho nhau. Giữ nguyên ranh giới ngày/timezone của list nguồn; ghi rõ trong sheet thông tin.
- Dữ liệu live được đọc khi BE xử lý, có thể khác số liệu đã xem trước đó. Chốt filter không đồng nghĩa tạo database snapshot ở thời điểm click.
- Không cam kết số dòng của file luôn bằng totalCount FE đã nhận trước đó. Số dòng trong metadata file phải đúng dữ liệu thực sự đã xuất.
- Không bổ sung isolation/migration hoặc job chỉ để hứa dữ liệu live giống tuyệt đối ảnh chụp UI; nếu cần tính nhất quán nghiệp vụ mạnh hơn phải tách yêu cầu riêng.

## 7. Quy tắc riêng cho ABC

- Request phải xác định analysisId và fingerprint của kết quả đang xem; version dùng theo contract của snapshot đã kiểm tra.
- BE kiểm tra tenant, quyền xem kho và sự phù hợp của snapshot. Không đổi sang bản latest khi đang xử lý.
- Nếu snapshot lịch sử còn được lưu và được phép đọc, xuất chính snapshot đó dù đã có phân tích mới hơn. Nếu không thể cung cấp đúng snapshot, trả lỗi yêu cầu tải lại; không tự thay kết quả.
- Không gọi RunABCClassificationCommand từ export; không tính lại ngưỡng hoặc phân lớp từ tập con đã chọn.
- File ghi thời điểm phân tích, kho, metric, kỳ lịch sử và ngưỡng của snapshot đã lưu, không lấy các ô thiết lập người dùng vừa sửa nhưng chưa chạy.
- Phân trang FE không giới hạn dòng export. Tập con được chọn vẫn giữ phân lớp/tỷ lệ của snapshot gốc, không phân loại lại.

## 8. Xuất các dòng được chọn

- Chỉ bật `selected` ở dataset có cơ chế chọn dòng hiện có và khóa dòng đã được xác nhận. Không thêm checkbox hàng loạt chỉ để có chức năng này.
- Có lựa chọn: icon mở DropdownMenu gồm “Toàn bộ kết quả theo bộ lọc” và “Các dòng đã chọn (N)”. Không có lựa chọn: dùng nút xuất trực tiếp.
- Chỉ chọn dòng ở trang hiện tại trong phiên bản đầu; chuyển trang, đổi pageSize, filter, sort, tab hoặc scope phải xóa lựa chọn. Không ngầm hiểu chọn tất cả các trang.
- FE không chỉ gửi số thứ tự dòng hay mã hiển thị có thể trùng. Khóa công việc có thể cần taskType + taskId; ABC có thể cần analysisId + khóa dòng kết quả.
- BE xác thực và loại trùng khóa trước khi đếm; kiểm tra tất cả khóa thuộc đúng dataset, tenant, phạm vi xem và bộ lọc đã chốt.
- Khóa ngoài quyền: từ chối chung, không tiết lộ dòng thuộc tenant/kho nào. Dòng không còn tồn tại hoặc không còn khớp điều kiện: trả lỗi yêu cầu tải lại lựa chọn; không xuất phần còn lại rồi báo thành công.
- Empty selected, khóa sai định dạng hoặc vượt giới hạn: lỗi validation, không tạo file.
- Bộ lọc + tập khóa lựa chọn được giữ cố định cho request; áp dụng sort của danh sách, không coi thứ tự click checkbox là thứ tự file.

## 9. Định dạng file

### Workbook

- Sheet `Danh sách`: chỉ chứa dataset đã chọn; tiêu đề tiếng Việt, cố định hàng đầu, auto-filter, độ rộng đọc được và định dạng số phù hợp.
- Sheet `Thông tin xuất`: tên dataset/tab, phạm vi xuất allFiltered/selected, kho/phạm vi được phép đã áp dụng, filter, sort, thời điểm bắt đầu đọc/đọc xong có timezone, số dòng thực tế và thông tin snapshot nếu có. Không gọi timestamp trước serialization là thời điểm tạo tệp hoàn tất.
- Metadata không liệt kê tài nguyên ngoài quyền; không chứa connection string hoặc thông tin kỹ thuật nhạy cảm.
- Tên file: `<Tên-doanh-nghiệp>-<dataset>-<yyyyMMdd-HHmmss>.xlsx`, ví dụ `Công-ty-ABC-Ton-kho-kha-dung-20261019-203045.xlsx`. BE đọc tên doanh nghiệp theo TenantId hiện tại do hệ thống xác định, không nhận tên/tenant từ payload. Thời điểm theo server, giờ Việt Nam (UTC+07:00).
- Chuẩn hóa tên Unicode, thay khoảng trắng/ký tự ngoài chữ và số bằng dấu gạch nối, bỏ gạch nối đầu/cuối, giới hạn phần tên doanh nghiệp 100 ký tự để giữ toàn bộ filename dưới giới hạn FE 180 ký tự. Tên trống/sau làm sạch không còn chữ/số dùng `Doanh-nghiep`; không dùng tên một doanh nghiệp khác. INV-01 áp dụng trước, các dataset sau tuân thủ cùng quy tắc.
- Filename trả từ BE phải được FE đọc/chuẩn hóa an toàn; nếu FE/BE khác origin cần cấu hình expose header tương ứng. Không bắt buộc mở rộng CORS origin.

### Kiểu dữ liệu

- Mã hàng, mã chứng từ, mã vị trí, barcode, số điện thoại: text, giữ số 0 đầu.
- Số lượng và giá trị số: typed numeric cell theo độ chính xác contract; không biến tất cả thành chuỗi đã format trên UI hoặc âm thầm làm tròn mất dữ liệu.
- Với số không thể giữ độ chính xác trong ô Excel, quy định biểu diễn bảo toàn và ghi chú rõ, không tự ép kiểu mất độ chính xác.
- Giá trị thiếu để trống, không biến null thành 0 hoặc ngày mặc định.
- Trạng thái/loại nghiệp vụ hiển thị nhãn tiếng Việt đã thống nhất.
- Chuỗi do người dùng nhập ghi dạng text, không diễn giải thành công thức; thêm test chuỗi bắt đầu bằng ký tự công thức.
- Không cộng nhiều SKU/đơn vị thành một số tổng không có ý nghĩa. Không bổ sung quy đổi đơn vị hoặc tính lại lượng khả dụng bằng công thức khác list nguồn.
- File xuất là dữ liệu đọc/đối soát, không mặc định là template import hợp lệ.

## 10. Kiến trúc và hiệu năng

### Frontend

- Dùng Button icon-only và Tooltip của dự án; icon Excel nhất quán, có aria-label; spinner khi đang xuất, chống click lặp, hỗ trợ bàn phím.
- Tooltip “Xuất Excel”; menu khi có lựa chọn như mục 8. Tooltip/lý do disable phải truy cập được bằng cách phù hợp với primitive sẵn có.
- Đặt trong toolbar, trước reload; không đổi bố cục cố định của OperationalListPanel/Pagination hay đưa nút xuống vùng body cuộn.
- Component chỉ nhận capability, callback và trạng thái; page/orchestrator sở hữu mutation và applied filters.
- Thêm nút dùng chung và helper tải file từ phần đã có khi có nhu cầu tái sử dụng; không tạo export engine ở FE.
- Không scrape HTML/DOM, không tải tuần tự toàn bộ trang bằng getAllInventory, không cài thư viện Excel phía client.
- Không disable chỉ vì items của trang hiện tại rỗng; dựa trên tổng kết quả thành công và lựa chọn hợp lệ. Không export khi query đang lỗi hoặc chưa xác định đúng bộ lọc.
- Hủy request/lỗi/hết phiên phải dọn trạng thái pending và Blob URL, không tạo toast thành công giả.

### Backend

- Mỗi phân hệ có query/endpoint export rõ ràng; không endpoint nhận tên bảng/property tùy ý.
- Reuse filter, scope và mapping của list nguồn ở mức cần thiết, không sao chép logic tính lượng khả dụng hay masking sang một biến thể khác.
- Public list giữ nguyên validator/giới hạn trang. Export có validator riêng cho filter, scope, lựa chọn và giới hạn; không skip toàn bộ pipeline validation để tái sử dụng handler.
- Dùng ClosedXML sẵn có và phần tạo/tải workbook chung vừa đủ; không ép các dataset khác nghiệp vụ thành một DTO tổng quát hoặc reflection export mọi trường.
- Cho phép sort từ allowlist; nếu list không có sort tùy chọn, giữ thứ tự mặc định và tie-breaker ổn định. Không dùng raw SQL/order expression từ client.
- Giới hạn ban đầu 10.000 dòng dữ liệu xuất, không tính dòng tiêu đề/metadata. Cần xác định vượt giới hạn mà không tải toàn bộ dataset không giới hạn vào memory.
- Thứ tự logic: quyền/scope/filter → tính toán hoặc đọc snapshot đúng nghiệp vụ → lựa chọn nếu có → sort → kiểm tra giới hạn → định dạng workbook. Không cắt 10.000 dòng nguồn trước khi tổng hợp/phân loại.
- Không âm thầm cắt file. Vượt giới hạn trả thông báo thu hẹp bộ lọc, không trả XLSX lỗi hoặc JSON được tải dưới đuôi .xlsx.
- Có CancellationToken cho query; kiểm tra hủy trước tạo workbook và trước trả kết quả. Không tuyên bố serialize ClosedXML đang chạy luôn hủy tức thời; đo thực tế với giới hạn đã chốt.
- Không chạy song song nhiều EF query trên cùng DbContext. Chỉ lấy dữ liệu/cột cần thiết, tránh N+1 và đọc bằng chứng không phục vụ export.
- Không tạo background job/cache/file storage ở phiên bản đầu. Đo thời gian/RAM với dataset giới hạn trước khi cân nhắc mở rộng.

## 11. Lỗi và phản hồi

| Tình huống                         | Hành vi                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Không có quyền xuất/xem/phạm vi    | BE từ chối theo cơ chế bảo mật hiện có; FE không giả tải file.           |
| Filter/khóa/sort không hợp lệ      | Lỗi validation tiếng Việt, không tạo workbook.                           |
| Kết quả thành rỗng khi BE đọc      | Báo không còn dữ liệu phù hợp; không trả file lỗi hoặc toast thành công. |
| Vượt 10.000 dòng                   | Báo thu hẹp bộ lọc; không tải file thiếu.                                |
| Lựa chọn/snapshot không còn hợp lệ | Báo tải lại danh sách/kết quả và chọn lại; không tự chuyển dataset.      |
| Hủy hoặc đổi phiên                 | Dừng/bỏ kết quả, không tải file hay báo lỗi hệ thống không cần thiết.    |
| Timeout/mạng/lỗi server            | Thông báo lỗi có thể thử lại; không giữ spinner hoặc khóa nút vĩnh viễn. |

HTTP status và envelope lỗi phải theo exception/middleware hiện có của BE; định nghĩa cụ thể trong contract của từng endpoint, không tạo hệ mã lỗi riêng ở FE.

## 12. Kiểm thử và điều kiện nghiệm thu

- [ ] Parity list/export: cùng filter/sort/scope cho cùng fixture, export đầy đủ kết quả qua nhiều trang.
- [ ] Ranh giới 0, 1, 10.000, 10.001 dòng; không bỏ thừa hoặc cắt ngầm.
- [ ] Có quyền xem nhưng thiếu quyền xuất; có quyền xuất nhưng thiếu quyền xem; thu hồi quyền; thiếu tenant; cross-tenant; kho ngoài phạm vi.
- [ ] Tồn kho chỉ xem toàn tenant không bị biến thành chỉ xem kho quản lý; các list giới hạn kho vẫn giữ giới hạn.
- [ ] Công việc mine/managed và current/history không bị trộn; khóa ghép xử lý đúng.
- [ ] Cột nhạy cảm/masking/kiểm kê mù không bị bỏ qua.
- [ ] Selected: khóa trùng, rỗng, sai dataset, ngoài quyền, bị xóa, đổi trạng thái; không thành công một phần âm thầm.
- [ ] Đổi page/pageSize/filter/sort/tab/scope xóa lựa chọn; count trong menu đúng tập hợp hợp lệ.
- [ ] Debounce/draft/applied filter và các ngày đầu/cuối kỳ/timezone được xử lý đúng.
- [ ] ABC giữ analysisId/fingerprint và thông số snapshot; phân tích mới xuất hiện không thay file cũ; export không chạy lại analysis.
- [ ] Đổi filter trong khi xuất không thay request; đổi tenant/logout không tải kết quả cũ.
- [ ] File mở được, metadata đúng số dòng/filter; mã 0 đầu, tiếng Việt, null, số thập phân/độ chính xác, ngày giờ và chuỗi công thức an toàn.
- [ ] Lỗi JSON không tải thành XLSX; filename/header được xử lý an toàn; click lặp, retry, cancel và dọn Blob URL.
- [ ] Icon-only, tooltip, aria-label, loading/error/empty; laptop, màn hẹp, zoom 200%, điều khiển bằng bàn phím.
- [ ] Đo query/time/memory ở phạm vi tối đa; không FE loop qua các trang và không N+1 bất thường.
- [ ] Export không thay tồn kho, chứng từ, hồ sơ hỏng/chênh lệch, phân tích hoặc tạo bản ghi nghiệp vụ mới.
- [ ] Giữ xuất báo cáo và xuất chi tiết kiểm kê cũ hoạt động đúng; không thay quyền cũ ngoài phạm vi.

Chỉ nghiệm thu dataset khi hồ sơ contract và các test liên quan hoàn thành, lint/typecheck/build hoặc kiểm tra tương đương có kết quả được ghi lại. Không coi toàn bộ checklist đã pass chỉ vì dataset mẫu pass.

## 13. Lộ trình thực hiện

1. **Chuẩn bị:** đọc lại rules/AGENTS, kiểm tra Git và thay đổi local; GitNexus impact trước sửa symbol; chốt hồ sơ INV-01 và quyền tương ứng.
2. **Đợt 1A:** endpoint INV-01, workbook tối thiểu, icon/tooltip/tải file, parity/security tests; nghiệm thu mẫu trước khi nhân rộng.
3. **Đợt 1B:** từng tab tồn kho còn lại, giữ đặc thù chứng từ/ABC/giữ hàng, bổ sung contract và test theo dataset.
4. **Đợt 2:** danh mục chính; khóa dòng/cột/khác biệt search-paging phải được đối chiếu từng API.
5. **Đợt 3:** danh sách chứng từ và các tab; không trộn với export chi tiết có sẵn.
6. **Đợt 4:** công việc hiện tại/lịch sử, mine/managed và khóa ghép.
7. **Kết thúc mỗi đợt:** review, sửa finding, ghi AI_REVIEW và kết quả kiểm tra; chỉ commit/push/PR khi người dùng yêu cầu.

Không làm cả bốn đợt trong một thay đổi lớn chưa được kiểm tra. Không tự đổi nhánh, pull/merge hoặc thay trạng thái triển khai chỉ vì tài liệu có lộ trình.

## 14. Theo dõi tiến độ và contract

| Hạng mục                      | Trạng thái             | Ghi chú                                                                     |
| ----------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| Sửa spec theo F1–F6           | Hoàn tất đặc tả        | Chưa phải sửa code.                                                         |
| Review/phê duyệt spec này     | Đã cho phép triển khai | Người dùng yêu cầu thực hiện và sửa các điểm chưa hợp lý ngày 19/10.        |
| Hồ sơ contract INV-01         | Đã ghi bên dưới        | API, quyền, cột và bộ lọc đã đối chiếu code.                                |
| Đợt 1A                        | Chờ nghiệm thu mẫu     | Đã code FE/BE và test cô lập; chưa bật quyền trên DB thật.                  |
| Đợt 1B                        | Chưa bắt đầu           | Theo từng dataset INV-02…INV-08.                                            |
| Đợt 2                         | Chưa bắt đầu           | CAT-01…CAT-05.                                                              |
| Đợt 3                         | Chưa bắt đầu           | DOC-01…DOC-04, tách riêng mỗi tab.                                          |
| Đợt 4                         | Chưa bắt đầu           | TASK-01/TASK-02, theo scope.                                                |
| Kiểm tra hồi quy liên phân hệ | Một phần               | Có test inventory và báo cáo kho; không coi mọi dataset đã được nghiệm thu. |

Mẫu ghi contract ngay tại mục này: `Dataset / route-tab / query nguồn / khóa dòng / applied filters & sort / quyền & scope / masking / cột & kiểu / snapshot / selected / API & validator / test & kết quả / trạng thái review`.

### INV-01 — Tồn kho khả dụng

- Route FE: `/inventory`; nguồn: `GetInventoryQuery`, đọc chung bằng `InventoryListReader`. Một dòng theo `InventoryStock.Id`; không gộp lô/vị trí/trạng thái.
- Bộ lọc API: `warehouseId`, `zoneId`, `rackId`, `slotId`, `productId`, `categoryId`, `searchTerm`, `inStockOnly`. FE lấy cùng applied query của bảng, loại page/pageSize/includeLastCount. UI hiện có tìm kiếm, kho, vị trí, sản phẩm; không tự thêm filter mới chỉ để export.
- Sort cố định: tên sản phẩm tăng dần, ID dòng tồn tăng dần, như list. Không nhận biểu thức sort tùy ý.
- Quyền: `inventory:view` AND `lists:export`; tenant từ user context. Xem toàn tenant như list, không thu hẹp về kho quản lý. `CanManageWarehouse`, row version và LastCount không xuất. Quyền dùng chung nằm ở Hệ thống → Xuất dữ liệu, scope TenantDelegatable, có thể tích cho Manager qua phân quyền hiện có; không tự grant theo tên vai trò.
- API: `POST /api/inventory/export`, body chỉ có các filter trên; trả XLSX với Content-Disposition. CORS chỉ expose header này, không thêm origin. JSON lỗi theo middleware sẵn có; FE không tải JSON/HTML thành XLSX.
- Validator: ID nullable nhưng không Guid.Empty; search tối đa 500 ký tự; giới hạn 10.000 dòng. 0 hoặc >10.000 dòng trả BadRequest, không tạo tệp một phần. Giới hạn page công khai vẫn 100.
- Dữ liệu live, không snapshot nghiệp vụ; metadata ghi bắt đầu đọc/đọc xong UTC+07:00 và số dòng thực tế. Không hứa số dòng bằng totalCount FE trước đó.
- Chỉ `allFiltered`: bảng hiện tại không có checkbox chọn dòng; không bổ sung selected ở mẫu.
- Sheet `Danh sách`: Mã hàng, Tên hàng, Kho, Khu vực, Kệ, Vị trí, Số lô, Chất lượng, Trạng thái tồn, Đơn vị, Tồn thực tế, Đặt trước, Đang giữ, Khả dụng, Ngày sản xuất, Hạn dùng, Cập nhật (UTC+07:00).
- Mã/nhãn là text; số lượng typed number nếu giữ được độ chính xác 15 chữ số, nếu không giữ nguyên decimal dạng text và ghi chú. Ngày typed DateTime, null để trống. Vị trí hệ thống ghi “Theo kệ”; không lộ mã ô kỹ thuật. Chuỗi công thức là text, không FormulaA1.
- FE: icon-only “Xuất Excel” trước reload; chờ debounce/query thành công, disable có lý do khi rỗng/vượt giới hạn/filter lỗi. Giữ focus khi đang xuất bằng aria-disabled và khóa callback; nút vẫn không thể gửi lặp. Đổi phiên/logout/unmount/thu hồi capability hủy hoặc bỏ kết quả; filter đã chốt không đổi trong request.
- Trạng thái runtime: FE 3000 và BE Debug 7070 đã nạp quyền chung `lists:export`; không chạy migration/seed. Đã xác minh SQL Server / db71143.public.databaseasp.net / db71143 và thêm đúng một dòng danh mục quyền theo yêu cầu người dùng; đọc lại có 1 dòng `lists:export`, 0 dòng `inventory:export`. Không tự thay đổi RolePermissions hay user overrides. Admin cần cấp quyền mới cho Owner trong phân quyền nền tảng; Owner mới có thể tích cho Manager theo trần phân quyền hiện có. Chưa nghiệm thu tải tệp qua tài khoản thật; không coi fixture UI là E2E đã triển khai.
- Xác minh cuối đợt: 52 test BE inventory/export/reporting; toàn bộ FE trong `src` có 248 file / 1.538 test pass, gồm 171 test inventory. Build API Release 0 warning/error, TypeScript cấu hình production và scoped ESLint pass. Sau khi người dùng cho phép tắt tạm FE, production build FE cũng hoàn tất thành công với cấu hình build cô lập có sẵn. Fixture 10.000 dòng tạo/mở lại đầy đủ, serialization khoảng 1.708 ms, cấp phát managed tổng khoảng 192 MiB, tệp khoảng 520 KB. Không phải RAM đỉnh/API SLA/SQL benchmark. Không sửa các fixture tmp cũ gây lỗi ở plain tsconfig.
- QA trình duyệt: dùng component thật + dữ liệu mẫu, không API/DB; kiểm tra viewport 1280 và 390, icon trước reload, không tràn ngang trang, Enter/pending/focus/Tab. Chưa chứng nhận toàn bộ browser zoom/theme/device matrix.
- Review: self-verification, chưa độc lập; chưa nghiệm thu mẫu hoặc triển khai các đợt 1B–4.

Mọi thay đổi quyết định trong spec phải ghi ngày và lý do bên dưới; không tự đổi phạm vi triển khai khi gặp API khác dự kiến.

## 15. An toàn dữ liệu và vận hành

- Dự kiến không cần thay schema DB. Nếu phát sinh migration, báo tên/tác động và dừng trước khi áp dụng để chờ người dùng cho phép.
- Khởi động local dùng DB triển khai phải đặt `Database__ApplyMigrationsOnStartup=false`; không dùng startup để kiểm tra migration.
- Không seed, sửa dữ liệu phân quyền trực tiếp, cleanup, reset hay thực hiện SQL write để tạo fixture trên `db71143`.
- Test quyền/dữ liệu lớn và ranh giới dùng fixture cô lập; không tạo hàng loạt chứng từ hoặc tồn giả trên DB dùng chung.
- Không drop/reset/truncate/EnsureDeleted hay destructive rollback `db71143` dưới bất kỳ bước nào của spec.
- Tính năng export chỉ đọc dữ liệu nghiệp vụ. Nếu bổ sung audit export, phải dùng cơ chế audit hiện có, không lưu nội dung file hoặc dữ liệu nhạy cảm trong log và phải đánh giá riêng tác động ghi dữ liệu.
- File chỉ được trả qua request đã xác thực; không thêm public URL hoặc lưu lâu dài để “tiện tải lại”.

## 16. Lịch sử quyết định

- 19/10/2026: hợp nhất kế hoạch và review thành một spec; chốt icon-only trước reload; xử lý F1–F6; bổ sung checkpoint contract, parity/security tests và lộ trình mẫu INV-01 trước khi nhân rộng. Chưa sửa source, quyền, schema hay runtime.
- 19/10/2026 — Triển khai INV-01 theo yêu cầu người dùng. Repository phân trang luôn cắt ở 100 dòng dù Top cao hơn; bổ sung `GetBoundedAsync` opt-in đọc tối đa 10.001 dòng để phát hiện overflow, không nới list cap hoặc FE loop. Tách reader dùng chung thay vì sao chép logic tồn khả dụng.
- 19/10/2026 — Sửa diễn đạt timestamp workbook từ “kết thúc tạo tệp” thành “đọc xong”, vì thời điểm serialize hoàn tất chưa biết khi đang viết metadata. Không giả timestamp hoàn tất.
- 19/10/2026 — Search export giới hạn 500 ký tự, UI giải thích khi vượt, không truncate từ khóa và không đổi search list. GUID FE dùng format Guid như .NET, không ép version UUID riêng. Metadata tên kho dài dùng số kho và dẫn về cột Kho, tránh vượt giới hạn ký tự ô khi có nhiều kho; không cắt dòng dữ liệu xuất.
- 19/10/2026 — Trong QA bàn phím phát hiện native disabled làm rơi focus lúc bắt đầu xuất. Dùng aria-disabled + chặn callback trong trạng thái pending, giữ native disabled + tooltip focusable cho các lý do không thể xuất. Test bảo vệ cả chống lặp và giữ focus.
- 19/10/2026 — Không tạo quyền chưa dùng cho các đợt sau; không thêm engine tổng quát/Excel client dependency. Giữ component export trong feature cho đến khi có dataset thứ hai thật sự dùng chung. Quyền trên DB dùng chung và dịch vụ đang chạy chưa thay đổi.
- 19/10/2026 — Test phát hiện ClosedXML tự bỏ dấu nháy đơn đầu chuỗi; bảo toàn bằng QuotePrefix đúng cách cho cả dữ liệu và metadata, không biến chuỗi thành công thức. Bổ sung kiểm tra mã vị trí legacy `__SYSTEM_DEFAULT__` để file không lộ mã kỹ thuật khi FE đang hiển thị vị trí theo kệ.
- 19/10/2026 — Người dùng cho phép tắt tạm FE cổng 3000 để hoàn tất kiểm tra. Đã xác minh và dừng đúng hai tiến trình Next dev/server của repo, giữ BE 7070 nguyên PID. Chạy `KOVIA_ISOLATED_BUILD=true pnpm build` thành công, không sửa cấu hình source hay DB/migration/seed. FE tạm giữ tắt sau kiểm tra.
- 19/10/2026 — Kiểm thử hồi quy toàn bộ FE trong `src` với 2 worker: 248 file / 1.538 test đều pass, mất khoảng 298 giây. Không phát sinh sửa code. Chưa thay đổi bước nghiệm thu mẫu hoặc kích hoạt quyền trên DB thật.
- 19/10/2026 — Người dùng đổi yêu cầu: quyền xuất Excel là quyền chung để sau này tích một lần cho Manager và dùng ở các danh sách đã hỗ trợ. Thay `inventory:export` bằng `lists:export`; thêm metadata Hệ thống → Xuất dữ liệu; giữ quyền xem/phạm vi riêng của từng dataset. Quyết định này thay chính sách quyền export theo phân hệ ở bản spec đầu, không thay quyền báo cáo/kiểm kê chi tiết cũ. Chỉ bổ sung danh mục quyền, không tự cấp cho Manager/Staff hoặc chạy seed tổng.
- 19/10/2026 — Provision đúng một bản ghi Permission `lists:export` trên `db71143`, UTC 13:24:24 (20:24 giờ Việt Nam), sau kiểm tra provider/server/database hiệu lực và preview không có khóa mới/cũ. Transaction chỉ INSERT danh mục, không update/delete/grant/migration/seed; commit 1 dòng, SELECT lại 1 dòng. Restart BE Debug để danh mục nhận mã mới, vẫn tắt migration/seed. Kiểm tra đợt sửa quyền: 85 test BE inventory/RBAC và 197 test FE inventory/access-control pass, production-config TypeScript và scoped ESLint pass; chưa lặp lại full-suite/full FE build sau đợt đổi quyền.
