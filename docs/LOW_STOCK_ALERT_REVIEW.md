# Cảnh báo tồn thấp — kế hoạch UI và hướng dẫn review FE

Cập nhật: 26/11/2026. PR: [#322](https://github.com/sswms-project/Kovia-Frontend-Web/pull/322).
BE đi kèm: [#366](https://github.com/sswms-project/Kovia-Backend/pull/366).
Đây là phạm vi cuối sau feedback; tài liệu không phụ thuộc các file `outputs` trên máy người triển khai.

## 1. Kế hoạch thiết kế và nghiệp vụ

1. Thêm tab **Cảnh báo tồn thấp** trong không gian Tồn kho, route `/inventory/low-stock-alerts`; không thêm sidebar trùng.
2. Tái sử dụng toolbar/search, bộ chọn kho, Button, Tooltip, Sheet, Table và các trạng thái loading/empty/error của dự án.
3. Đưa kho, trạng thái, khoảng ngày ra thanh lọc; giữ bộ lọc trên URL và có chip xóa điều kiện.
4. Chi tiết bằng panel bên phải, nút X và bảng hai cột rõ nhãn/giá trị.
5. Icon lịch sử đặt ở header **Khả dụng dưới mức tối thiểu**, sau “Xem tất cả”, trước làm mới; có tooltip và aria-label. Không đặt ở “Sắp hết hạn”.
6. Sau khi list/detail/filter ổn định mới tích hợp liên kết tồn kho/dự báo giữ phạm vi kho và sản phẩm; không tự chạy AI khi đọc lịch sử.
7. Theo feedback bổ sung: thêm tiếp nhận, đồng bộ cache sau sửa chính sách, sửa trang vượt giới hạn sau refetch.

Một dòng là một **đợt cảnh báo**, không phải mỗi lần thông báo. Không sửa số tồn, tự đóng cảnh báo hoặc khẳng định đã bổ sung hàng khi chỉ tiếp nhận.

| Giá trị                      | Tiếng Việt/ý nghĩa                                 |
| ---------------------------- | -------------------------------------------------- |
| Open                         | Đang cảnh báo                                      |
| Acknowledged                 | Đã tiếp nhận; chưa kết thúc                        |
| Resolved                     | Đã kết thúc                                        |
| Bộ lọc Active                | Chưa kết thúc, gồm Open và Acknowledged            |
| CurrentQuantity/MinThreshold | Tồn ghi nhận/Ngưỡng ghi nhận; có thể khác hiện tại |

Ngày/người tiếp nhận là kết quả thao tác tiếp nhận; ngày/người kết thúc do BE ghi khi nghiệp vụ đánh giá lại. Các ô này không phải input để điền thủ công. Ngừng áp dụng chính sách có thể kết thúc đợt mà không có hàng nhập thêm.
Nếu sản phẩm/kho ngừng hoạt động, vẫn thể hiện trạng thái đã lưu cùng thông tin ngừng hoạt động; không suy ra đã phục hồi tồn.

## 2. Bản đồ code

| Vùng       | Đường dẫn trong repo                                                                           | Cần review                                                       |
| ---------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Điều phối  | `src/features/inventory/hooks/use-low-stock-alerts.ts`                                         | URL, query keys có scope, enabled, invalidation, page clamp      |
| Page       | `src/features/inventory/pages/LowStockAlertsPage.tsx`                                          | Quyền và truyền callback/data; lỗi/empty/loading                 |
| Chi tiết   | `src/features/inventory/components/LowStockAlertsPage/`                                        | Bảng, X, nhãn lịch sử, tiếp nhận pending/error                   |
| API/types  | `src/features/inventory/services/low-stock-alert.service.ts`, `types/low-stock-alert.types.ts` | Hợp đồng BE, không lọc toàn bộ dữ liệu trên client               |
| Dashboard  | `src/features/dashboard/pages/WarehouseOverviewPage.tsx` và `components/WarehouseOverview/`    | Vị trí icon và truyền kho được chọn                              |
| Chính sách | `src/features/product/hooks/use-products.ts`                                                   | Làm mới inventory/history/dashboard sau mutation thành công      |
| Dự báo     | `src/features/inventory/hooks/use-forecast-workspace.ts`                                       | Khởi tạo deep link kho/sản phẩm không ghi đè lựa chọn người dùng |

FE chỉ kiểm soát UX. BE kiểm tra quyền Inventory View và tenant/warehouse scope; không dùng việc ẩn nút để khẳng định API an toàn.

## 3. Checklist thao tác và tiêu chí nghiệm thu

Chỉ dùng môi trường đã được phép. Ca ghi chính sách/tiếp nhận cần dữ liệu QA đã chuẩn bị; không sửa/xóa dữ liệu ngoài phạm vi được giao.

| Bước                                                       | Mong đợi                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Dashboard chọn một kho rồi bấm icon lịch sử                | Mở tab cảnh báo, đúng kho, mặc định Chưa kết thúc                                     |
| Hover/focus icon                                           | Có mô tả “Xem lịch sử cảnh báo tồn thấp” và tên trợ năng                              |
| Tìm SKU/tên; đổi kho, trạng thái, khoảng ngày              | Query tương ứng; về trang 1 khi đổi điều kiện; không lọc riêng dữ liệu trang hiện tại |
| Reload/Back/Forward URL hợp lệ                             | Giữ điều kiện đúng; không tự mở rộng scope                                            |
| URL sai GUID/ngày/trạng thái/trang                         | Thông báo lỗi; không tự chuyển sang tất cả kho để né lỗi                              |
| Mở chi tiết rồi bấm X                                      | Bỏ alertId, giữ bộ lọc và danh sách                                                   |
| Xem số tồn/ngưỡng và thông tin người xử lý                 | Nhãn lịch sử đúng; thiếu dữ liệu không suy đoán người/ngày                            |
| Tiếp nhận Open                                             | Pending chặn thao tác lặp; thành công hiển thị Đã tiếp nhận và metadata từ BE         |
| Đang lọc Open, tiếp nhận dòng cuối trang 2, total 21 -> 20 | Tự về trang 1, giữ bộ lọc/chi tiết; không để 2/1                                      |
| Tổng dữ liệu về 0                                          | Trang 1 và empty state; không hiển thị trang vượt giới hạn                            |
| Đổi ngưỡng/bật tắt chính sách                              | Invalidate danh sách/chi tiết/tồn/dashboard, không giữ dữ liệu cũ sau refetch         |
| Mất quyền, hết phiên, API lỗi                              | Nội dung phù hợp, không coi lỗi là danh sách rỗng; có thử lại phù hợp                 |
| Chuyển sang tồn kho/dự báo                                 | Giữ product/kho, theo quyền; không tự khởi tạo dự báo AI chỉ vì mở lịch sử            |
| Màn nhỏ, tên dài, số thập phân/đơn vị dài                  | Không chồng nút/chữ; số và đơn vị rõ; panel cuộn dùng được                            |

Các bước này là hướng dẫn tái kiểm tra, không khẳng định toàn bộ tổ hợp browser/role/responsive đã chạy trong lần preflight cuối.

## 4. Bằng chứng và cách chạy lại

- Preflight mới nhất: **20/20 test trong 6 file** đạt; scoped ESLint đạt.
- `next typegen` và TypeScript theo `tsconfig.production.json` đạt.
- BE đi kèm: **591/591** gồm 9 ca SQL thật. Xem tài liệu review BE để biết giới hạn FK, deadlock setup và phạm vi hồi quy.
- Nhật ký các vòng trước: [AI_REVIEW.md](AI_REVIEW.md). Không gọi self-review là review độc lập.

```powershell
pnpm exec vitest run src/features/inventory/components/LowStockAlertsPage src/features/inventory/hooks/use-low-stock-alerts.test.tsx src/features/inventory/pages/LowStockAlertsPage.test.tsx src/features/inventory/utils/low-stock-alert.test.ts src/features/inventory/hooks/use-forecast-workspace.test.tsx
pnpm exec next typegen
pnpm exec tsc --project tsconfig.production.json --noEmit --incremental false
```

Chạy ESLint trên các file TS/TSX trong diff PR. Full Next production build không được chạy lại trong preflight do hạn chế tài nguyên; không tuyên bố build đã được chạy ở bước này. Vercel báo success ở commit chức năng trước commit tài liệu.
Raw `tsc` theo cấu hình mặc định có thể quét các fixture cũ không track trong `outputs`/`tmp` tại máy triển khai; đó không phải kết quả kiểm tra clean checkout. Không đưa các artifact đó vào PR, không xóa file người khác để làm check xanh.

## 5. Reviewer cần ưu tiên

- Không để lỗi lookup kho làm nới quyền/phạm vi; query key tách tenant/user.
- Page clamp chỉ sau refetch thành công; không dựa vào total cũ khi đang tải.
- Tiếp nhận không làm mất metadata đầu tiên; cache chi tiết/danh sách phải đồng bộ.
- Đổi ngưỡng/ngừng chính sách làm mới đúng các cache; không sửa công thức tồn trên FE.
- GitNexus FE **MEDIUM**. Liên kết dự báo và khởi tạo bộ lọc là vùng cần hồi quy.
- **Merge/triển khai BE trước FE** để có API đầy đủ. Không migration. PR chưa được agent merge.
