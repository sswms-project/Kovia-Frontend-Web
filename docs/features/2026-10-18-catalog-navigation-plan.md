# Kế hoạch UI/UX: Danh mục tập trung trên sidebar

Trạng thái: đã triển khai ngày 18/10/2026 trên nhánh `screen/huytv`, chưa commit/push. Kết quả và giới hạn kiểm thử tại `../qa/2026-10-18-catalog-navigation.md`.

Cập nhật mới nhất: thời gian chờ đóng Danh mục là **400ms (0,4 giây)**, thay thế các mốc 500ms trong kế hoạch ban đầu bên dưới. Nhóm đầu sidebar gồm Dashboard và Vật tư hàng hóa, có separator phía dưới; công việc kho/lịch sử vẫn giữ ngay sau nhóm này. Danh mục vẫn theo luồng menu, không ghim đáy.

## 1. Mục tiêu và phạm vi đã chốt

- Gom master data của tenant vào một mục **Danh mục**, tham khảo cách chia cột của AMIS.
- Giữ ngôn ngữ thiết kế xanh, font, token màu và UI primitives của Kovia.
- **Đối tượng chỉ có Khách hàng và Nhà cung cấp.**
- **Quản trị doanh nghiệp giữ nguyên** cấu trúc, nhãn, đường dẫn, thứ tự con và quyền hiện có. Nhân viên không chuyển vào Danh mục.
- Không thay đổi menu SystemAdmin, quyền BE, route guards, URL hoặc nghiệp vụ CRUD.
- Không thêm API, migration, dữ liệu mẫu, package UI hoặc trang danh mục trung gian.
- Cập nhật yêu cầu: nhóm đầu sidebar gồm Dashboard và shortcut Vật tư hàng hóa, có đường phân cách bên dưới. Giữ lối vào Vật tư hàng hóa trong Danh mục; cả hai dùng cùng route và quyền hiện có.

## 2. Cấu trúc thông tin

| Nhóm trong Danh mục | Mục hiển thị         | Đích đến hiện có     | Quyền hiện có             |
| ------------------- | -------------------- | -------------------- | ------------------------- |
| Vật tư hàng hóa     | Vật tư hàng hóa      | `/products`          | `P.PRODUCTS_VIEW`         |
| Vật tư hàng hóa     | Nhóm vật tư hàng hóa | `/categories`        | `P.CATEGORIES_VIEW`       |
| Vật tư hàng hóa     | Đơn vị tính          | `/units`             | `P.UNITS_VIEW`            |
| Đối tượng           | Khách hàng           | `/stock-recipients`  | `P.STOCK_RECIPIENTS_VIEW` |
| Đối tượng           | Nhà cung cấp         | `/suppliers`         | `P.SUPPLIERS_VIEW`        |
| Kho & bố trí        | Kho hàng             | `/warehouses`        | `P.WAREHOUSES_VIEW`       |
| Kho & bố trí        | Sơ đồ kho            | `/warehouse-layouts` | `P.WAREHOUSES_VIEW`       |

Khi triển khai dùng `APP_ROUTES` và `P`, không chép literal URL/quyền vào component.

- Thay ba nhóm tenant hiện có (Quản lý kho, Đối tượng, Danh mục) bằng một mục Danh mục ngay sau các nhóm menu khác (sau Hệ thống), theo chiều cao nội dung; không ghim hoặc đẩy sát đáy sidebar. Có đường phân cách ngang phía trên. Giữ thứ tự tương đối các nhóm khác.
- Menu Danh mục là menu điều hướng, không phải form, bảng dữ liệu hoặc trang mới.
- Các route trong Danh mục không trùng nhau; riêng Vật tư hàng hóa có thêm shortcut ở nhóm đầu sidebar theo yêu cầu mới.
- Các tên VTHH được viết đầy đủ trong menu mới; không đổi tiêu đề, nhãn hay form ở các trang đích ngoài phạm vi này.

## 3. Thiết kế desktop

```text
SIDEBAR                    MENU DANH MỤC
Quản trị doanh nghiệp
Hoạt động kho
Báo cáo & phân tích
...
Hệ thống                   ┌───────────────────────────────────────────────────────────┐
──────────────────────     │ Vật tư hàng hóa     Đối tượng         Kho & bố trí        │
Danh mục              >    │ Vật tư hàng hóa     Khách hàng        Kho hàng            │
                           │ Nhóm vật tư         Nhà cung cấp      Sơ đồ kho           │
                           │ hàng hóa                                                  │
                           │ Đơn vị tính                                               │
                           └───────────────────────────────────────────────────────────┘
```

- Trigger dùng `SidebarMenuButton`, icon Danh mục và mũi tên sang phải. Theo yêu cầu cập nhật: desktop mở ngay khi hover/focus, không cần click; Enter/Space vẫn dùng được. Mobile giữ bấm để mở/đóng.
- Dùng `SidebarSeparator` chung cho đường phân cách. Danh mục theo luồng nội dung với khoảng cách gọn phía trên, không dùng margin tự động hoặc vùng navigation tự giãn; khi menu dài vẫn cuộn trong SidebarContent hiện có, không thêm vùng cuộn hay chiều cao viewport cố định.
- Panel nền `bg-popover`, chữ `text-popover-foreground`, border đủ bốn cạnh theo token; độ nổi nhẹ, không gradient hoặc shadow nặng.
- Ba cột khi đủ chỗ; mục tiêu chiều rộng khoảng 720px, giới hạn theo vùng trống thực tế, cách mép viewport ít nhất 12px. Không cố giữ ba cột nếu bị ép hẹp.
- Padding khoảng 16px, gap giữa cột khoảng 24px; tiêu đề nhóm 14px semibold cùng icon Lucide hiện có; liên kết 14px, vùng tương tác cao tối thiểu 40px.
- Không dùng card riêng cho từng liên kết, số đếm, mô tả phụ hoặc ô tìm kiếm cho bảy mục này.
- Hover dùng nền nhạt; mục hiện tại có nền và chữ nhấn theo token, không chỉ dựa vào màu chữ. Focus có ring rõ.
- Panel được portal ra ngoài vùng scroll/overflow của sidebar. Dùng collision handling của primitive, không tự tính tọa độ bằng listener scroll hoặc công thức viewport.
- Menu mở cạnh trigger, dịch lên nếu gần đáy; không che topbar hoặc đẩy nội dung trang.
- Chiều cao bị giới hạn theo vùng khả dụng; nếu thật sự cần cuộn, dùng ScrollArea chung, không tạo hai vùng cuộn lồng nhau.
- Theme sáng/tối kế thừa token hiện có. Animation nhẹ khoảng 200ms theo `.rules`, tôn trọng reduced motion; không sửa primitive dùng chung chỉ để phục vụ panel này.

## 4. Responsive và sidebar thu gọn

- Desktop sidebar mở: panel cạnh mục Danh mục.
- Sidebar chỉ icon: icon có accessible name/tooltip; click mở panel với nhãn nhóm đầy đủ. Giữ trạng thái sidebar ổn định trong suốt lúc panel mở.
- Tablet/vùng trống hẹp: giảm số cột theo chiều rộng khả dụng; không tạo thanh cuộn ngang hoặc cắt tên liên kết.
- Mobile: dùng chính Sheet sidebar hiện có. Danh mục mở nội dung dọc trong Sheet bằng Collapsible, ba nhóm có tiêu đề; không mở thêm Sheet hay Popover lồng bên ngoài Sheet.
- Chọn liên kết trên mobile đóng Sheet qua callback điều hướng hiện có. Nếu chỉ đóng nhóm Danh mục, Sheet vẫn mở.
- Chuyển breakpoint phải đóng panel desktop cũ, tránh portal/focus trap còn sót trên mobile.

## 5. Quy tắc tương tác và accessibility

- Dùng Popover không modal cho desktop, các liên kết `Link` thật trong một vùng navigation có tên; không gán `role=menu` nếu không triển khai đủ quy tắc keyboard menu.
- Tab/Shift+Tab đi theo thứ tự nhóm rồi từng liên kết; không tự viết xử lý phím mũi tên hoặc roving focus không cần thiết.
- Escape đóng ngay và trả focus về trigger còn tồn tại nếu trước đó focus nằm trong menu/nút; bấm ngoài đóng mà không giành lại focus khỏi phần tử vừa chọn. Desktop click theo sau hover chỉ giữ mở; mobile bấm trigger lần nữa để đóng.
- Điều hướng thành công đóng panel; không đưa focus ngược về sidebar sau khi đã chuyển trang.
- Link giữ Ctrl/Cmd-click, middle-click và mở tab mới như liên kết thông thường.
- Mục hiện tại dùng `aria-current="page"`, trigger phản ánh trạng thái mở. Trang con như chi tiết/sửa vẫn đánh dấu đúng mục cha theo logic route hiện có.
- Không tự bật panel khi tải trang chỉ vì route thuộc Danh mục; chỉ đánh dấu trigger và mục hiện tại.
- Desktop: trigger và bảng menu là một vùng tương tác. Rời cả hai vùng thì chờ 500ms trước khi đóng; quay lại nút/bảng hoặc focus vào menu sẽ hủy hẹn giờ. Focus vẫn ở trong một trong hai vùng thì giữ mở. Hover không lấy focus của trang; đóng do hết hover không trả focus về trigger. Escape đóng ngay và chỉ trả focus khi focus trước đó nằm trong menu/nút.
- Hủy hẹn giờ khi điều hướng, đóng menu, đổi breakpoint hoặc unmount; không để timer của route trước đóng menu mới.
- Icon trang trí có `aria-hidden`; nút chỉ icon có accessible name.

## 6. Quyền, loading và lỗi

- Dùng effective permissions từ luồng `useMeQuery` hiện tại. Không suy quyền từ tên Owner/Manager/Staff.
- Lọc liên kết trước, sau đó bỏ nhóm rỗng; tất cả nhóm rỗng thì ẩn trigger Danh mục.
- Khi chỉ còn một hoặc hai nhóm, layout co lại tương ứng, không giữ cột trống.
- Giữ cơ chế loading/error/retry navigation hiện tại; không render menu master data chưa lọc trong lúc chờ quyền.
- Khi đổi phiên/tenant hoặc quyền thay đổi, menu đang mở phải cập nhật/đóng, không giữ route của phiên cũ.
- Giữ nguyên định nghĩa route guard và bảo vệ BE. Việc chuyển chỗ menu không cấp thêm quyền.

## 7. Hướng triển khai tối thiểu

1. Kiểm tra GitNexus index, chạy impact trước khi sửa từng symbol liên quan; báo blast radius và cảnh báo HIGH/CRITICAL nếu có.
2. Cập nhật `src/components/layout/nav-config.ts`: gom bảy item tenant vào Danh mục và thêm metadata nhóm tối thiểu. Giữ một nguồn item/permission/route; không tạo danh sách riêng cho desktop và mobile.
3. Ưu tiên giữ `NavSection.items` phẳng để `getNavItems`, lọc quyền và active matching tiếp tục dùng được; nhóm hiển thị được suy ra từ metadata của item đã lọc. Không refactor toàn bộ navigation sang cây đệ quy chỉ cho ba nhóm.
4. Tạo composition nhỏ trong `src/components/layout/AppSidebar/` cho Danh mục, dùng Popover/Collapsible/ScrollArea/Sidebar hiện có. Không thay renderer của các nhóm còn lại.
5. Tích hợp với `SidebarNavigation.tsx` và `AppSidebar.tsx`: khi panel đang mở, không để `onMouseLeave` của sidebar tự thu gọn làm mất trigger/đóng panel lúc con trỏ đi vào portal. Sau khi đóng, khôi phục đúng trạng thái ghim/hover ban đầu, không ghi đè tùy chọn sidebar đã lưu.
6. Kiểm tra API/docs shadcn bằng CLI của dự án trước khi compose primitive; chỉ dùng package đã có. Không chạy preset, add/overwrite primitive hoặc cập nhật dependency trong đợt này.
7. Bổ sung test navigation và tương tác, rồi kiểm UI thực tế trên trình duyệt.

## 8. Kiểm thử và điều kiện nghiệm thu

### Automated

- Cả ba vai trò tenant dùng cùng cấu trúc nhóm nhưng chỉ thấy item có quyền; SystemAdmin không đổi.
- Test quyền đơn lẻ từng item, quyền hỗn hợp, không có quyền, nhóm rỗng và route không trùng.
- Snapshot/assert riêng nhóm Quản trị doanh nghiệp để chứng minh Nhân viên, Phân quyền, Doanh nghiệp giữ nguyên theo từng vai trò.
- Regression `getNavItems`, `getVisibleNavSections`, active route trang con; giữ ngoại lệ điều hướng Nhập kho và loại trừ route Kiểm kê hiện có.
- Test mở/đóng bằng click và keyboard, focus restore đúng lý do, đóng khi điều hướng, quyền thay đổi và mobile navigation.
- Test hover sidebar thu gọn → mở Danh mục → di chuột vào panel không bị đóng; không thay đổi preference ghim sidebar.
- Chạy lint, typecheck, test liên quan; production build nếu dung lượng và môi trường cho phép, báo rõ nếu chưa chạy.

### Visual/browser

- Desktop 1366px và 1920px; sidebar mở/thu gọn; trigger gần đáy; viewport thấp.
- Tablet 768–1024px; mobile 375–390px; kiểm chạm không cần hover.
- Zoom 80%, 100%, 125%, 150% và 200%: không mất border, cắt liên kết, tràn ngang hoặc che focus.
- Light/dark, Tab/Shift+Tab/Enter/Space/Escape, reduced motion.
- Chọn đủ bảy route và ít nhất một trang chi tiết; menu đóng đúng, trang hiện tại và trigger active đúng.
- Không có API write, migration, thay đổi permission hoặc lỗi console mới do navigation.

## 9. Thứ tự bàn giao

1. Chốt bản thiết kế và checklist này.
2. Triển khai config + renderer desktop/mobile + xử lý hover/focus trong một thay đổi giới hạn.
3. Chạy test, rà UI/UX theo web-design-guidelines, chụp ảnh kết quả desktop/mobile.
4. Báo file thay đổi, kết quả kiểm tra và hạn chế còn lại. Không tự commit/push hoặc đụng các thay đổi dashboard đang chưa commit.

## 10. Tài liệu và skill áp dụng

- Ưu tiên `AGENTS.md`, `.rules`, `docs/AI_WORKFLOW.md`, `docs/CODING_GUIDELINES.md`, `docs/DESIGN_SYSTEM.md` và token runtime.
- `shadcn`: reuse primitive và kiểm API trước khi compose.
- `vercel-react-best-practices`: suy state trong render khi đủ, không thêm request hay effect dư thừa.
- `vercel-composition-patterns`: composition nhỏ, không thêm hàng loạt boolean điều khiển renderer tổng quát.
- `web-design-guidelines`: kiểm focus, ngữ nghĩa link/button, responsive, theme, motion và input mode.
- `ponytail`: giữ metadata/config đơn giản; không dựng framework mega-menu, store hoặc dependency mới.
- Không áp dụng design-taste-frontend cho navigation nghiệp vụ theo lựa chọn skill của dự án.
- Tham khảo: https://amisapp.misa.vn/warehouse/overview ; https://ui.shadcn.com/docs/components/radix/popover ; https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
- `../docs/BUSINESS_RULES.md` được AGENTS tham chiếu nhưng không có tại đường dẫn đó ở lần khảo sát này; cần kiểm tra lại trước triển khai nếu tài liệu được bổ sung. Không suy diễn thêm business rule từ tài liệu thiếu.
