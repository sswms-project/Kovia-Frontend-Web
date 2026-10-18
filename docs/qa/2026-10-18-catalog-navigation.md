# QA: Danh mục tập trung trên sidebar

Ngày: 18/10/2026. Nhánh: `screen/huytv`. Chưa commit/push.

## Phạm vi đã thực hiện

- Một Danh mục tenant với ba nhóm: Vật tư hàng hóa, Đối tượng, Kho & bố trí.
- Đối tượng chỉ có Khách hàng/Nhà cung cấp. Nhân viên vẫn thuộc Quản trị doanh nghiệp.
- Giữ nguyên route và quyền của bảy mục; không thay đổi menu SystemAdmin, guards, BE hoặc DB.
- Dùng Popover portal không modal trên desktop, Collapsible trong sidebar mobile hiện có và ScrollArea chung khi panel cần cuộn.
- Đóng menu khi điều hướng, thay đổi phiên/tenant/quyền hoặc breakpoint; không tự mở lại khi quay về route cũ.
- Giữ sidebar đang mở bằng hover khi con trỏ di chuyển sang panel. Không ghi trạng thái hover mở thành tùy chọn sidebar ghim trong localStorage.
- Không cài package, sửa UI primitives dùng chung, áp migration hoặc ghi dữ liệu nghiệp vụ.

## Kiểm tra tác động và skills

- GitNexus upstream: `SidebarNavigationSection` có một caller trực tiếp; `SidebarNavigation` có một caller trực tiếp và đi qua layout private; `AppSidebar` có một caller trực tiếp là private layout. Kết quả risk LOW. Vì nằm trên layout chung vẫn chạy test hồi quy navigation/permissions.
- Metadata `NavItem`/`NavSection` và component mới chưa được index nhận diện; đối chiếu source, callers và typecheck thay vì coi UNKNOWN là bằng chứng an toàn.
- `shadcn`: đọc docs qua CLI có sẵn và compose Sidebar/Popover/Collapsible/ScrollArea đang cài; không add/overwrite primitive.
- React/composition/ponytail: một cấu hình item/quyền, suy nhóm từ item đã lọc; không thêm store, request hoặc cấu trúc navigation đệ quy.
- web-design-guidelines: rà button/link semantics, keyboard/focus, hover/current, reduced motion và tokens theo design system.

## Automated: đạt

```text
pnpm exec vitest run src/components/layout src/config/route-permissions.test.ts src/components/operations src/features/dashboard/components/WarehouseOverview
18 files passed; 141 tests passed.

pnpm exec eslint src/components/layout/nav-config.ts src/components/layout/nav-config.test.ts src/components/layout/AppSidebar
Passed.

pnpm exec tsc --project tsconfig.production.json --noEmit --incremental false
Passed.

KOVIA_ISOLATED_BUILD=true pnpm build
Passed: compile, TypeScript, static generation 72/72, route optimization.
```

Build dùng lại `tmp/catalog-production` theo cấu hình repo, không tạo bản sao repo/worktree hay thư mục build mới; không dừng dev server.

Test bao gồm:

- Bảy route duy nhất, nhóm theo yêu cầu; từng quyền đơn lẻ và trường hợp không có quyền.
- Nhóm Quản trị doanh nghiệp giữ nguyên theo cả ba vai trò tenant; SystemAdmin không có Danh mục tenant.
- Các quy tắc điều hướng Nhập kho, Kiểm kê, lịch sử công việc và báo cáo vẫn đúng.
- Portal ngoài container sidebar; non-modal; Tab/Shift focus flow, Enter/Space, Escape, outside click và native modified-link behavior.
- Không lấy lại focus về trigger sau điều hướng; Escape trả focus và click ngoài giữ focus ở điểm vừa chọn.
- Nhóm rỗng bị bỏ, không có item thì không render trigger; mobile dùng danh sách inline, không overlay lồng.
- Sidebar hover/pinned; reset menu theo route/tenant/quyền/breakpoint; mobile chọn link đóng Sheet; loading/error/retry không lộ item chưa lọc quyền.
- Hồi quy Operations và WarehouseOverview hiện có.

## Browser local: đã quan sát trực tiếp

Edge, session Tenant Owner đang đăng nhập, viewport 1910 × 857:

- Menu Danh mục mở ba cột, rộng 720px. Đo DOM: x=262..982, y=376..566; nằm trong viewport.
- Bốn cạnh border đều 1px; đủ bảy link với href chính xác.
- Quản trị doanh nghiệp vẫn hiển thị Doanh nghiệp, Phân quyền, Nhân viên.
- Tab từ panel đi tới Vật tư hàng hóa. Escape đóng và trả focus về trigger Danh mục.
- Bấm Vật tư hàng hóa đóng panel và mở `/products`; mở lại menu có đúng một `aria-current="page"` ở liên kết đó.
- Ảnh thực tế: `2026-10-18-catalog-sidebar-desktop.png` trong thư mục này.
- Không nhập, tạo, sửa hoặc xóa dữ liệu qua các form trong quá trình kiểm tra.

## Giới hạn kiểm thử cần ghi nhận

- Chưa có kiểm tra trực quan trên mobile/tablet thực hoặc nhiều mức zoom: trình điều khiển Edge hiện không cung cấp viewport emulation và phím zoom thử nghiệm không thay đổi viewport. Không đánh dấu các mục visual này là đã qua. Hành vi mobile/breakpoint được kiểm bằng test tự động.
- Chưa kiểm trực quan theme tối hoặc tương tác bằng con trỏ thực ở cạnh đáy viewport; dùng tokens/collision handling có sẵn và test hành vi, vẫn cần smoke test trực quan bổ sung khi có thiết bị/viewport phù hợp.
- Typecheck cấu hình mặc định `tsconfig.json` còn lỗi có sẵn trong `tmp/opening-stock-ui` (fixture thiếu `isFetching`, kiểu `fieldErrors`, truy cập có thể undefined). Không sửa fixture ngoài phạm vi; typecheck production và build đã qua.
- Có các thay đổi dashboard/footer, AGENTS/CLAUDE từ trước trong worktree. Không gộp, reset hoặc commit các thay đổi đó trong lượt này.

## Smoke test người dùng

1. Bấm Danh mục: kiểm ba nhóm, chỉ Khách hàng/NCC trong Đối tượng.
2. Chọn một mục và mở lại: đúng trang, đúng active; Quản trị doanh nghiệp không đổi.
3. Thu gọn sidebar, rê vào và mở Danh mục, di con trỏ sang panel: menu không biến mất. Đóng panel: trạng thái sidebar hợp lý.
4. Thử cửa sổ hẹp/mobile và zoom 125–200%: liên kết không bị cắt, không cuộn ngang; mobile chọn mục đóng sidebar.

## Cập nhật hover/focus và đóng trễ 500ms

Theo yêu cầu tiếp theo của người dùng, desktop mở ngay khi hover/focus, không cần click. Chỉ đóng sau khi rời cả trigger và panel được 500ms, và không có focus nằm trong hai vùng. Quay lại vùng tương tác thì hủy timer. Hover không lấy focus khỏi trang, click theo sau hover không làm menu bật/tắt nhấp nháy. Escape/click ngoài/điều hướng vẫn đóng ngay; mobile giữ tap-to-toggle.

Đã bổ sung test bằng fake timers cho biên 499ms/500ms, đi từ trigger sang portal, rời panel, quay lại trigger, giữ focus, focus rời menu, Escape không tự mở lại, Escape khi hover không chiếm focus, touch không mở hover, unmount hủy callback, timer route cũ không đóng menu route mới và đóng đúng sidebar đang mở bằng hover. Đây là kiểm thử logic Kovia, không phải phép đo độ trễ của AMIS. Chưa đo được hover thực tế của AMIS do công cụ trình duyệt không có thao tác di chuyển chuột/hover.

Bộ kiểm tra mở rộng sau cập nhật: **18 files, 152 tests passed**. Không chạy lại build production cho riêng thay đổi tương tác này; kết quả build ở phần trước thuộc lượt triển khai menu ban đầu. Các giới hạn kiểm thử trực quan ở trên vẫn còn áp dụng.

## Cập nhật vị trí Danh mục ở đáy sidebar

- Chuyển Danh mục xuống cuối cấu hình navigation của cả ba vai trò tenant, sau Hệ thống; không đổi thứ tự tương đối hoặc nội dung các nhóm khác.
- Dùng `SidebarSeparator` chung tạo đường ngang phía trên. Flex + margin tự động đẩy mục xuống đáy khi sidebar còn chỗ, không dùng absolute hoặc công thức chiều cao. Menu dài/mobile vẫn dùng vùng cuộn sidebar hiện có.
- Không hiển thị đường phân cách khi không có quyền truy cập Danh mục. Menu SystemAdmin không đổi.
- Test mới xác nhận thứ tự cuối cùng và separator trên desktop/mobile, cùng trường hợp không có quyền. Các test hover/focus/500ms vẫn đạt.
- Kiểm tra lượt này: **5 files / 83 tests passed**, eslint và typecheck production đạt. Không chạy lại full build cho thay đổi bố cục nhỏ này.
- Quan sát trực tiếp trên Edge local `/warehouses`: Danh mục nằm gần đáy, trên nút thu gọn, có đường ngang phía trên. Panel mở đủ ba cột và tự dịch lên để không vượt mép dưới viewport. Đã cập nhật ảnh `2026-10-18-catalog-sidebar-desktop.png` tại cùng đường dẫn, không tạo bản sao ảnh mới. Các tọa độ và trang quan sát ở phần browser ban đầu phía trên thuộc phiên khảo sát trước thay đổi vị trí này.
- Chưa commit/push; không thay đổi BE/DB hoặc hành vi hover 500ms.

## Điều chỉnh: Danh mục theo luồng menu

### Cập nhật tiếp theo: 400ms và nhóm Tổng quan

- Độ trễ đóng mới là 400ms, thay cho 500ms trong các lượt kiểm tra lịch sử bên dưới. Các test xác nhận menu còn mở ở 399ms, đóng ở 400ms, quay lại vùng tương tác thì hủy đóng.
- Nhóm đầu sidebar của ba vai trò tenant gồm Dashboard và shortcut Vật tư hàng hóa, separator chung phía dưới. Công việc và lịch sử tách thành nhóm kế tiếp, không bị xóa hoặc đổi quyền. SystemAdmin không đổi.
- Shortcut sản phẩm tuân theo `P.PRODUCTS_VIEW`; khi nhóm đầu không có mục được phép xem thì không để lại separator rỗng. Danh mục vẫn giữ đường dẫn sản phẩm theo yêu cầu giống AMIS.
- Kiểm tra: **5 files / 86 tests passed**, lint các file nguồn thay đổi đạt. Chưa kiểm tra trực quan lại trên browser; ảnh hiện tại vẫn thuộc bố trí trước.

- Theo yêu cầu mới, thay thế cách đẩy sát đáy ở lượt trước: bỏ `mt-auto` của mục Danh mục và `flex-1` của navigation. Danh mục nằm ngay sau các nhóm menu khác, có separator phía trên; khoảng trống còn lại nằm bên dưới, không chen giữa các mục.
- Giữ nguyên phân quyền, thứ tự các nhóm, hover/focus và đóng trễ 500ms. Không thay đổi footer hoặc tạo vùng cuộn mới.
- Kiểm tra sau điều chỉnh: **5 files / 83 tests passed**, eslint hai file thay đổi đạt. Test desktop/mobile xác nhận không còn các class tự giãn. Chưa kiểm tra trực quan lại trên browser; ảnh trong tài liệu thuộc lượt bố trí trước, không phải bằng chứng cho vị trí mới.
- Chưa commit/push; không thay đổi BE/DB.
