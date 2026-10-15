# QA: tab chi tiết điều chuyển trên màn nhỏ

Ngày 2026-10-15; người triển khai tự kiểm. Không commit/push.

## Nguyên nhân và cách sửa

- Tái hiện trên route `/transfers/cf874e79-2f18-4221-b310-2805bdaf48c6?tab=putaway`. TabsList bật flex-wrap nhưng TabsTrigger vẫn kế thừa `height: calc(100% - 1px)` từ primitive. Khi xuống ba hàng, nút cao khoảng 96,29px, nằm ngoài thanh tab và chồng vào panel. Flex parent còn cho thanh tab co chiều cao.
- Override tại TransferDetailPage: trigger dùng h-auto/min-h-11, list h-auto/w-full/min-w-0/shrink-0/flex-wrap/justify-start, root w-full/min-w-0. Không sửa primitive tabs.tsx hoặc global CSS. Giữ nhãn, số đếm, URL, liên kết tab/panel và hành vi bàn phím Radix.
- Kiểm liền kề phát hiện panel Hàng hóa bị ép còn 1,78px ở 360px khi phần thông tin trên cao. Thêm min-h-64 trên panel hàng hóa (256px tối thiểu, không phải công thức viewport) để giữ vùng bảng/pagination đọc được. Các tab dạng thẻ tiếp tục chảy theo nội dung.
- Ponytail ưu tiên sửa CSS tại caller thay vì thêm component, hook đo kích thước hay thư viện; shadcn/React và Web Interface Guidelines dùng để kiểm semantic tabs, vùng bấm và responsive. GitNexus impact LOW (graph không có upstream); route App Router và barrel đã kiểm trực tiếp, không coi graph rỗng là không có caller. Index làm mới --index-only, không ghi instruction files.

## Kiểm trực tiếp trên Edge

Phiên browser hiện là Tenant Owner; không đổi tài khoản của người dùng. Thanh tab cùng component/cùng class ở staff. Test tự động dùng viewer không phải owner, không có quyền quản lý và fixture rỗng giống ảnh báo lỗi; chưa chứng nhận phiên staff thật ở vòng này.

| CSS viewport               | Kết quả                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 360×800                    | Sáu nút đều 44px; thanh tab cao 146px, chứa đủ ba hàng; panel cách dưới 8px, không chồng. Document scrollWidth = 360. |
| 769px (gần breakpoint 768) | Sáu nút 44px, nằm trong list; panel cách 8px; document width = 769.                                                   |
| 1280px                     | Sáu nút 44px, nằm trong list; panel cách 8px; document width = 1280.                                                  |

- ArrowRight từ Chờ cất hàng chuyển sang Chênh lệch / Phản hồi, đúng selected state và panel.
- Click Hàng hóa: tab không bị co; bảng cao 256px, dữ liệu/pagination hiện; cuộn ngang ở bảng, không tràn document. Quay lại Chờ cất hàng hoạt động.
- Browser zoom đang 90%; viewport override vật lý 324/692/1152px tương ứng số đo CSS trong bảng, không thay zoom hệ thống. Đã reset override.
- Ảnh: `D:/Kovia-QA/Transfer-Plan-UI-20261014/transfer-detail-tabs-mobile-360-20261015.jpg`.
- Chỉ xem/chuyển tab, không lưu/giao việc/nhận/cất, không ghi DB hoặc chạy migration/seed.

## Kiểm thử

- Bản sao riêng `D:/Kovia-QA/Transfer-Plan-UI-20261014/FE`, không dùng output server dev.
- Test regression kiểm CSS override, viewer staff với danh sách rỗng, số đếm khi có đợt cất, routing/aria association và chiều cao tối thiểu bảng. Mock các hook API/dialog; dùng Tabs và TransferShipmentsPanel thật. JSDOM không kiểm geometry, số đo phía trên lấy từ Edge.
- Lượt đầu hai assertion của test mới sai (EmptyTitle là text, Radix kích hoạt tab bằng mousedown); sửa test theo component thực, không đổi production để làm test đạt.
- Bộ focused cuối **13/13 đạt** (5 file), scoped ESLint/TypeScript và whitespace đạt. Report: `responsive-tabs-tests-20261015.json` tại QA root. Không chạy lại full suite, production build hoặc BE cho thay đổi CSS cục bộ này.

State: READY_FOR_CODEX_REVIEW; không phải nghiệm thu độc lập, không chứng nhận đầy đủ luồng nghiệp vụ/camera/screen reader.
