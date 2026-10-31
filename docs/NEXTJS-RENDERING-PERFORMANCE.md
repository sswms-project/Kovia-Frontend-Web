# Next.js App Router: rendering và hiệu năng

> Rà soát: 31/10/2026. `package.json` khai báo Next ^16.2.7 và React ^19.2.7 (cài đặt hiện là Next 16.2.7).
> nextjs.org có thể hiển thị bản 16.x mới hơn; không sao chép mặc định từ Next 13/14 hay tính năng mới khi chưa kiểm tra phiên bản. Đọc `node_modules/next/dist/docs/` trước khi dựa vào API Next (xem `AGENTS.md`).

Đọc cùng [`.rules`](../.rules), [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md), [REACT-STATE-RENDERING.md](REACT-STATE-RENDERING.md), [TANSTACK-QUERY-DATA-FLOW.md](TANSTACK-QUERY-DATA-FLOW.md) và [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Quy tắc tổ chức là convention dự án; không đổi kiến trúc auth/data chỉ để chạy theo ví dụ trong docs.

## 1. Chọn nơi chạy theo dữ liệu và tương tác

| Nhu cầu                                | Phương án để đánh giá                                                  |
| -------------------------------------- | ---------------------------------------------------------------------- |
| Layout/khung không cần state browser   | Giữ Server Component                                                   |
| Nội dung công khai cần HTML sớm        | Server loading có chủ đích, xét độ mới/cache                           |
| Form, bộ lọc, dialog, canvas tương tác | Client entry hẹp nhất hợp lý (thường là feature page)                  |
| Dữ liệu cần token của browser          | Giữ luồng HTTP/query hiện tại cho tới khi có thiết kế auth phía server |
| Server prefetch cùng client tương tác  | Cô lập QueryClient theo request, hydrate nhất quán, tránh hai owner    |
| Thư viện chỉ cần khi mở/xuất           | Dynamic import tại điểm dùng                                           |

`'use client'` đặt ranh giới module phía client; không có nghĩa mọi component con phải ghi lại directive. Client Component vẫn có thể được prerender thành HTML ban đầu, nên API trình duyệt không tự an toàn trong render. [N1]

Không chuyển cả route/layout sang client chỉ để dùng một hook con. Cũng không ép màn tương tác hiện có thành Server Components khi auth và data lifecycle chưa được thiết kế.

## 2. Ranh giới kiến trúc trong repository

- `app/**/page.tsx` mỏng theo `.rules`: forward `params`/`searchParams`, redirect, metadata, render feature page.
- Feature page là client boundary; page gọi hook theo pattern hiện tại, view không tự gọi HTTP.
- Nếu cần server loading, đặt ở server module có owner rõ; không import hook hay `axiosClient` (đọc `localStorage`) để chạy trên server.
- Route Handler/BFF/Server Action chỉ thêm khi task có nhu cầu rõ. Server Action vẫn là endpoint cần authentication, authorization và validate input; `'use server'` không tự cấp quyền.
- Props qua ranh giới RSC phải serializable; giữ DTO nhỏ, không chuyển token, form instance, Axios response hay callback thường từ server sang client.
- Cấu hình hiện tại (`next.config.ts`): `typedRoutes: true`, `reactStrictMode: true`, cấu hình `images` (`qualities`, `formats`). Chưa khai báo `reactCompiler` hay `cacheComponents`.

Chính sách auth hiện tại: token lưu `localStorage` và cookie `access_token` (`src/lib/axios.ts`, `useAuthStore`); `src/proxy.ts` đọc cookie, giải mã role và chuyển hướng sơ bộ theo route; `ProtectedRoute` trong `app/(private)/layout.tsx` kiểm tra phía client. Không mô tả hệ thống như đã có session HttpOnly/BFF. Proxy và FE gating không thay BE authorization.

## 3. Loading theo vùng và tránh waterfall

`loading.tsx`/`Suspense` cho phép trình bày vùng chờ theo vòng đời render. Chúng không tự biến query `useQuery` trong client thành lazy. [N2]

- Đặt boundary theo vùng dữ liệu người dùng dùng độc lập được.
- Không `await` dữ liệu phụ khiến cả màn phải chờ.
- Request độc lập có thể khởi đầu độc lập; fan-out lớn vẫn cần cân nhắc tải BE.
- Request phụ thuộc id/scope từ bước trước phải chờ đúng input; không chạy với input thiếu.
- Tab/dialog ẩn dùng `enabled` hoặc mount container; CSS ẩn không ngăn hook gọi API (`useUnitsQuery` trong form kệ/ô chỉ `enabled` khi form mở).
- `loading.tsx` của route không thay skeleton/error/retry của query đã mount: màn sơ đồ kho dựng `WarehouseDesignerSkeleton` trong lúc chờ.

Khi đo, tách thời gian HTML/route sẵn sàng, hydration và lúc dữ liệu hữu ích xuất hiện.

## 4. Phân biệt các lớp cache

| Lớp                         | Sở hữu gì                                            | Không được nhầm                              |
| --------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| TanStack Query (browser)    | Server state phía client (`src/lib/query-client.ts`) | Không bị xóa bởi `router.refresh`            |
| Next server data cache      | Kết quả server loading theo cache policy             | Không tự nhận invalidation từ mutation Axios |
| Next Router Cache/prefetch  | RSC/navigation theo cơ chế App Router                | Không phải cache của `queryFn`               |
| Browser/CDN/BE output cache | HTTP response theo header/policy                     | Cần scope và invalidation riêng              |
| React memoization           | Tái dùng trong phạm vi API tương ứng                 | Không phải cache dùng chung có TTL           |

Với Next hiện tại, không dựa vào quy tắc "mọi `fetch` bị cache bền mặc định" từ bài viết cũ. Chọn policy theo version và config; fetch không cache không có nghĩa mọi route chắc chắn dynamic. [N3] `next.config.ts` chưa bật `cacheComponents`; không thêm `'use cache'`, `cacheLife`, `cacheTag` hay đổi rendering mode toàn app chỉ để cải thiện cảm giác tốc độ.

Dữ liệu server theo quyền phải có thiết kế cách ly; không đưa vào cache dùng chung thiếu tenant/user/scope.

`router.refresh` làm mới payload route theo cơ chế Next; không phải `invalidateQueries`. Sau mutation, cập nhật đúng cache owner (hiện `src` không gọi `router.refresh`). Không hard reload để sửa thiết kế thiếu invalidation. [N4]

## 5. SSR/prefetch với TanStack Query

Chỉ thực hiện khi có lợi và có nguồn auth/data hợp lệ trên server. Hiện `src` chưa có `dehydrate` hay `HydrationBoundary`.

- QueryClient chứa dữ liệu riêng tư trên server phải cô lập theo request; không dùng singleton chứa dữ liệu nhiều user.
- QueryClient browser giữ reference ổn định; không tạo mới mỗi render.
- Prefetch và consumer dùng cùng key, params và data shape; đồng bộ `staleTime` để tránh fetch lại ngay.
- Chỉ serialize dữ liệu user được phép xem; không đưa secret hay field nội bộ vào payload hydrate.
- Không dựng hai nguồn độc lập cho cùng resource rồi kỳ vọng `router.refresh` và `invalidateQueries` tự đồng bộ.

`queryClient` export từ `src/lib/query-client.ts` là browser singleton; không dùng nó làm mẫu cho server prefetch. [N5]

## 6. Bundle và lazy import

- Chọn ranh giới client hợp lý trước khi thêm memo hay dynamic import.
- Ứng viên cần kiểm tra bundle: canvas Konva, cảnh 3D (`three`), biểu đồ (`recharts`), PDF (`@react-pdf/renderer`), quét camera, xuất Excel.
- Dynamic import chỉ hữu ích nếu code thật sự bị trì hoãn; import tĩnh ở chỗ khác khiến nó vẫn nằm trên critical path.
- Mẫu hiện có: `WarehouseLayoutDirectoryPage` nạp `WarehouseDesignerPage` bằng `next/dynamic` (`ssr: false`, skeleton làm fallback) để Konva không vào bundle ban đầu; `HeroSection` nạp cảnh 3D; `ScanInput` nạp `CameraScanDialog`; các workspace sơ đồ nạp `WarehouseCanvas` riêng.
- Cặp "lazy component" và "lazy query" là hai việc: mount có điều kiện thiếu một nửa vẫn tải code hoặc dữ liệu sớm. [N6]
- `ssr: false` chỉ cho dependency chỉ chạy trên client; không dùng để che lỗi hydration.
- Không dynamic import mọi nút/ô nhập hay tạo quá nhiều chunk nhỏ.

React Compiler chưa được khai báo trong `next.config.ts`; Next 16/React 19 không phải bằng chứng code đã tự memoize.

## 7. Navigation, URL và prefetch

- Dùng `Link` (hoặc `Button asChild`) cho điều hướng thuần với `APP_ROUTES`; router imperative chỉ cho hoàn tất hành động, xác nhận bỏ thay đổi, redirect auth hoặc đồng bộ URL (`.rules` → Routing).
- Validate params và URL quay lại; không đưa URL không tin cậy vào `push`/`replace`.
- Filter/search/page trên URL theo UI; tránh `replace` lặp mỗi render.
- Prefetch mặc định của Next có điều kiện theo route và môi trường; kiểm tra Network ở production. Bảng nhiều `Link` có thể tạo thêm lưu lượng prefetch; chỉ điều chỉnh tại vùng có bằng chứng.
- Prefetch route của Next và `queryClient.prefetchQuery` là hai thao tác khác nhau; phối hợp để không tải cùng dữ liệu hai lần. Mẫu hiện có: `usePrefetchCycleCount` nạp chi tiết khi rê chuột lên dòng; `useWarehouseLayoutPrefetch` nạp chunk của màn sơ đồ và scene khi rê chuột, focus hoặc bấm nút mở sơ đồ. [N4]

`src/proxy.ts` là convention thay cho `middleware.ts` ở Next 16; không tự rename hay chạy codemod trong task hiệu năng hoặc tài liệu.

## 8. Ảnh, font và tài nguyên

- Dùng cơ chế ảnh/font của Next khi phù hợp nguồn và layout; cấu hình `images` nằm ở `next.config.ts`.
- Ảnh có kích thước hoặc aspect ratio ổn định để tránh nhảy bố cục; `sizes` đúng viewport khi responsive.
- Chỉ ưu tiên tải (preload/priority) ảnh quan trọng cho nội dung đầu.
- Không tải nhiều font/weight không dùng; không đổi font/theme trong task về hiệu năng dữ liệu (tokens thuộc DESIGN_SYSTEM.md).
- Đánh giá chi phí tài nguyên ở Network và ảnh hưởng LCP/CLS, không chỉ dung lượng file. [N7]

## 9. Đo ở production mode

Development có Strict Mode, HMR và hành vi prefetch/debug khác production. Đo production build trên môi trường phù hợp, ghi cache cold/warm và loại navigation. `app/layout.tsx` gắn `@vercel/speed-insights`; kiểm tra cấu hình triển khai trước khi dựa vào số liệu đó.

| Góc nhìn   | Bằng chứng                                                       |
| ---------- | ---------------------------------------------------------------- |
| Người dùng | LCP/INP/CLS, gõ, mở dialog, thời gian thấy dữ liệu chính         |
| Network    | Số request HTTP, trùng/hủy/retry/prefetch, bytes, waterfall      |
| Render     | React Profiler, browser trace, long task, hydration              |
| Bundle     | JS tải trước khi thao tác; chunk dynamic nào thật sự bị trì hoãn |
| Backend    | Tải/RPS/query tương ứng workflow, không chỉ request FE           |

Chọn mục tiêu theo màn, thiết bị và nghiệp vụ; không áp một ngưỡng KB, số request hay số lần render cho mọi route. Đo trước/sau cùng dữ liệu, scope, route, filter và môi trường. Không load-test môi trường dùng chung khi chưa có quyền. [N8]

## 10. Checklist

- [ ] Ownership server/client rõ; route mỏng; ranh giới auth đúng.
- [ ] Không import service/secret sai môi trường; props qua RSC nhỏ và hợp lệ.
- [ ] Không dùng cache policy cũ hay mới không hợp phiên bản/config.
- [ ] TanStack cache, server cache và router cache có invalidation đúng owner.
- [ ] Hydration nhất quán; fallback theo vùng; không dùng `ssr: false` để che lỗi.
- [ ] Tab/dialog ẩn không gọi dữ liệu thừa; dynamic import thật sự giảm critical path.
- [ ] Navigation/prefetch/search không tạo request không cần thiết.
- [ ] Đã phân biệt quan sát code với đo runtime.

## 11. Nguồn chính thức

- **N1:** [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components).
- **N2:** [Fetching data và streaming](https://nextjs.org/docs/app/getting-started/fetching-data).
- **N3:** [Caching guide](https://nextjs.org/docs/app/guides/caching).
- **N4:** [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router).
- **N5:** [TanStack advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr).
- **N6:** [Lazy loading](https://nextjs.org/docs/app/guides/lazy-loading).
- **N7:** [Image optimization](https://nextjs.org/docs/app/getting-started/images), [font optimization](https://nextjs.org/docs/app/getting-started/fonts).
- **N8:** [Production checklist](https://nextjs.org/docs/app/guides/production-checklist).

Cập nhật tài liệu không bật SSR, prefetch, compiler hay cache components và không đổi cấu hình triển khai.
