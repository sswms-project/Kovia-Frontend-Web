# TanStack Query: dữ liệu API, cache và workflow ghi

> Rà soát: 31/10/2026. `package.json` khai báo `@tanstack/react-query` ^5.101.0 và `axios` ^1.17.0; kiểm tra lockfile khi áp dụng API mới.
> Bổ sung [`.rules`](../.rules), [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md) và [CODING_GUIDELINES.md](CODING_GUIDELINES.md). Nếu khác nhau, `.rules` và FOLDER_STRUCTURE.md thắng.

## 1. Ownership và mục tiêu

Mỗi resource có một owner cho contract, query key, service và chính sách cache: service trong `features/<feature>/services/`, hook trong `features/<feature>/hooks/`, key trong `src/lib/query-keys.ts` (`queryKeys`), endpoint trong `src/routes/api-endpoints.ts` (`API_ENDPOINTS`). Page hoặc orchestrator gọi hook; view chỉ nhận dữ liệu và callback (xem `.rules` → Data Flow).

Không tạo tầng fetch/cache mới, service chỉ chuyển tiếp hay framework query-key toàn app chỉ để đồng nhất tên. Giữ convention hiện có và chỉ sửa vùng liên quan trong phạm vi task.

Mục tiêu: đủ dữ liệu đúng quyền, ít việc thừa, UI không mất input, lỗi và retry rõ ràng. Số request thấp không phải mục tiêu duy nhất. Các quyết định bắt buộc dưới đây là policy của dự án, không phải mặc định của thư viện.

## 2. Thiết kế kế hoạch tải theo workflow

| Vùng UI                  | Hành vi cần xác định                                   | Ví dụ trong code                                                                                               |
| ------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Nội dung chính cần ngay  | Query khởi đầu đủ để thao tác được                     | `useWarehouseLayoutSceneQuery` (`features/warehouse/hooks/use-warehouse-layout-scene.ts`)                      |
| Dialog/sheet chưa mở     | `enabled` theo điều kiện hoặc mount container khi dùng | `useUnitsQuery(enabled, status)` chỉ chạy khi form kệ/ô đang mở (`use-layout-location-editor.ts`)              |
| Dữ liệu chỉ cần khi chọn | `enabled` theo lựa chọn                                | `useLayoutViewerInventory` chỉ gọi tồn kho khi đã chọn khu/kệ/ô, không phải decoration                         |
| Lookup lớn               | Search/paging ở BE, giới hạn kết quả                   | `useWarehousesQuery` truyền `top`/`skip` cho `OperationalPagination`                                           |
| Dữ liệu đã có ở cha      | Truyền xuống thay vì gọi lại cùng resource             | `WarehouseDesignerPage` nhận `warehouseSummary` từ danh sách và tắt `useWarehouseQuery` bằng tham số `enabled` |

- Không tách API BE từ FE theo suy đoán; đối chiếu BE Command/Response trước (`.rules` → BE–FE Contract).
- Nhiều observer cùng key dùng chung dữ liệu và request đang chạy: số `useQuery` không bằng số request HTTP. Key khác nhau, kể cả cùng URL khác params, không tự được gộp.
- `useQueries`/`Promise.all` không giới hạn tải. Khi fan-out gây nghẽn, giảm công việc thừa trước rồi mới chọn giới hạn.
- Không bắt mọi trang chỉ có 2–3 request, cũng không ép mọi API chạy tuần tự. Đo critical path và tổng tải.

## 3. Query key biểu diễn đúng dữ liệu

Key là mảng serialize được, chứa resource và mọi input làm đổi response: filter, sort, page/cursor, entity, scope dữ liệu. [Q1]

- Dùng id/code ổn định, không dùng tên hiển thị làm identity. Ví dụ: `queryKeys.warehouses.layoutScene(warehouseId)`, `queryKeys.aiAssistant.messages(conversationId)`.
- Không đưa token, mật khẩu, file, function hay nguyên object auth vào key.
- Chuẩn hóa default/null/empty để cùng request logic tạo cùng key; không sort tại chỗ mảng input.
- Dùng một định nghĩa key/options cho consumer, prefetch và invalidation. Mẫu hiện có: `warehouseLayoutSceneQueryOptions(warehouseId)` (dùng `queryOptions`) được cả `useWarehouseLayoutSceneQuery` và `useWarehouseLayoutPrefetch` dùng lại, nên key và `queryFn` không bị sao chép.
- Không dùng chung key cho `useQuery` và `useInfiniteQuery` có data shape khác nhau.
- Khi kết quả phụ thuộc tenant/account/quyền, key hoặc vòng đời cache phải cách ly. Mẫu: `useWarehouseOverviewQuery` (`features/dashboard/hooks/use-warehouse-overview.ts`) đưa `tenantId`, `user.id` và `permissionKey` vào key. Hook này dựng key trực tiếp thay vì qua `queryKeys`; khi sửa vùng đó, cân nhắc đưa vào `queryKeys` mà vẫn giữ các thành phần scope. Key đúng không thay thế BE authorization.

Đăng xuất chủ động gọi `queryClient.clear()` trong `components/UserMenu.tsx` và `features/settings/pages/SecurityPage.tsx`. `useAuthStore.clearAuth` chỉ xóa token và `user`, không xóa cache. `redirectToLogin` trong `src/lib/axios.ts` điều hướng bằng `window.location.href` nên tải lại trang. Luồng mới làm mất phiên hay đổi quyền mà không qua các điểm này cần policy dọn cache riêng; không mặc định key theo user là đủ.

## 4. Freshness khác thời gian giữ cache

| Cấu hình                         | Ý nghĩa thực tế                                                    |
| -------------------------------- | ------------------------------------------------------------------ |
| `staleTime`                      | Khoảng dữ liệu được xem là fresh; hết hạn không tự tạo timer fetch |
| `gcTime`                         | Thời gian giữ query không còn observer trước khi thu gom           |
| `refetchOnMount/Focus/Reconnect` | Các trigger làm mới tùy trạng thái stale và option                 |
| `refetchInterval`                | Polling riêng, không phải `staleTime`                              |
| `invalidateQueries`              | Đánh dấu stale, thường refetch query active đủ điều kiện           |

Không đồng nhất "cache 5 phút" với "API chỉ chạy một lần trong 5 phút": refetch thủ công hoặc invalidation có thể tạo request sớm hơn. Query `enabled: false` không tự fetch. [Q2]

Mặc định hiện tại ở `src/lib/query-client.ts`: `networkMode: 'always'` (query vẫn chạy khi trình duyệt báo offline), `staleTime` 5 phút, `gcTime` 10 phút, `retry: 1`, `refetchOnWindowFocus: false`; mutation `retry: 0`. Đây là implementation hiện tại, không phải khuyến nghị cho mọi resource. Ví dụ override có chủ đích: `useUnitsQuery` đặt `staleTime` 5 phút riêng; `usePrefetchCycleCount` (`features/cycle-count/hooks/use-cycle-count.ts`) đặt `staleTime` 30 giây cho dữ liệu nạp sẵn.

Chọn policy theo độ mới nghiệp vụ: danh mục, số liệu tồn kho và dữ liệu duyệt không nhất thiết cùng `staleTime`. Không đặt `Infinity` chỉ để giảm Network.

## 5. Cancellation phải tới request thật

Query function nhận `signal`, service phải chuyển tiếp vào request config. Chỉ gọi `cancelQueries` mà service không dùng signal thì network chưa chắc dừng. [Q3]

```text
queryFn({ signal }) → service(params, signal) → axiosClient.get(url, { params, signal })
```

Mẫu hiện có: `useWarehouseOverviewQuery` truyền `signal` xuống `warehouseOverviewService.getOverview`. Các service `transfer`, `stock-issue`, `inbound`, `reporting`, `dashboard` cũng nhận signal ở một số hàm. Nhiều service khác, gồm `ai-assistant.service.ts`, chưa chuyển tiếp signal.

- Xét đổi filter/entity, rời trang, đổi phiên.
- Debounce giảm số lần bắt đầu request (`useDebouncedValue` trong `src/hooks`); cancellation xử lý request đã bắt đầu. Hai cơ chế khác nhau.
- Signal không nằm trong query key. Không báo cancellation thành lỗi server hay toast.
- Key riêng cho input khác vẫn cần để phản hồi cũ không ghi nhầm resource.
- `NotificationRealtimeProvider` gọi `cancelQueries` rồi `invalidateQueries` khi có sự kiện, để snapshot cũ đang bay không đè dữ liệu mới.
- Browser abort không bảo đảm transaction/SQL trên BE dừng ngay.

## 6. Loading, placeholder và đổi scope

Với v5, `isLoading` là `isFetching && isPending`; `isPending` một mình có thể đúng khi query bị tắt và chưa có dữ liệu. Cần nhánh "chưa đủ điều kiện" thay vì spinner vô hạn. [Q4]

| Tình huống                  | Policy UI/data                                                                   |
| --------------------------- | -------------------------------------------------------------------------------- |
| Tải đầu, chưa có dữ liệu    | Skeleton đúng vùng                                                               |
| Refetch cùng resource/scope | Giữ dữ liệu dùng được, chỉ báo nền                                               |
| Chuyển trang cùng scope     | Có thể `placeholderData: (previous) => previous` (xem `useWarehousesQuery`)      |
| Đổi user/tenant/quyền       | Không hiện placeholder của scope cũ                                              |
| Đổi filter nghiệp vụ        | Xác định giữ dữ liệu cũ có gây hiểu sai nhãn không; reset hoặc gắn trạng thái rõ |
| Lỗi khi còn dữ liệu cũ      | Phân biệt lỗi refresh với chưa từng tải                                          |
| Lỗi quyền                   | Không cho thao tác tiếp trên dữ liệu đã bị thu hồi                               |

Không lấy `totalCount`, `hasMore` hay cho chọn/thao tác theo dữ liệu placeholder như kết quả mới (xem `ViewerInventoryPanel` dùng `isPlaceholderData` để hiện skeleton khi đổi trang). [Q5]

Không dùng `initialData` giả làm cache thật. Khi một query bị tắt vì dữ liệu đã có ở cha, gate loading phải bỏ qua query đó: `WarehouseDesignerPage` tính `warehouse = warehouseSummary ?? warehouseQuery.data` thay vì chờ query bị tắt.

## 7. Phân trang, search và infinite query

- Filter/sort/paging ở BE cho tập có thể lớn; phân trang bằng `OperationalPagination`, state `page`/`pageSize` nằm ở page.
- Filter đổi thì đưa page về đầu; validate URL trước khi thành params.
- Debounce giá trị search áp vào query, không làm input gõ bị trễ (`useLayoutViewerInventory` debounce 300ms).
- Offset/cursor theo BE contract; FE không tự sinh cursor.
- Không lấy cả list để đếm hoặc suy tổng từ số dòng một trang.
- Infinite query cần `initialPageParam`, `getNextPageParam` và điều kiện dừng đúng response. Mẫu: `useInfiniteNotificationsQuery` (`features/platform-services/hooks/use-platform-services.ts`).
- Chặn load-more lặp khi đang fetch; xem `hasNextPage` và `isFetchingNextPage`.

## 8. Retry, deadline và refresh token

Query mặc định `retry: 1`, mutation `retry: 0`; chưa có phân loại lỗi toàn cục. Một số hook tự tắt retry (`useWarehouseOverviewQuery` đặt `retry: false`). Khi thêm policy mới, dùng bảng sau làm chuẩn:

| Loại thất bại        | Policy                                                                            |
| -------------------- | --------------------------------------------------------------------------------- |
| Hủy request          | Không retry nghiệp vụ, không toast lỗi                                            |
| 400/403/validation   | Không retry tự động                                                               |
| 401                  | Interceptor ở `src/lib/axios.ts` xử lý refresh; query không tạo vòng refresh khác |
| 404                  | Không retry mặc định                                                              |
| 409                  | Xử lý conflict, không lặp mù                                                      |
| Network/lỗi tạm thời | Retry giới hạn                                                                    |
| Mutation ghi         | Không auto retry nếu chưa có idempotency phù hợp                                  |

Lỗi từ `axiosClient` đã được chuẩn hóa thành `ApiErrorResponse` (`statusCode`, `message`, `errors`) bởi interceptor; dùng `getApiErrorMessage` từ `@/lib/api-error` để hiển thị.

Luồng refresh token tại `src/lib/axios.ts`: một lần refresh duy nhất, các request 401 khác xếp hàng trong `pendingRequests` rồi resolve/reject cùng kết quả; các endpoint đăng nhập/verify-2fa/refresh/logout không bị retry; thất bại thì `redirectToLogin`. Lưu ý khi sửa: lời gọi refresh dùng `axios.post` thô, không đi qua `axiosClient` nên không có `timeout` 30 giây của instance; query `retry` nhân với interceptor có thể tạo nhiều vòng ngoài dự kiến; request đã hủy không nên replay sau refresh.

## 9. Mutation và invalidation theo dữ liệu bị ảnh hưởng

Trước mutation, xác định detail, list, summary và cache liên quan nào có thể đổi. Không chỉ invalidate màn vừa sửa, cũng không invalidate toàn app.

| Thao tác (ví dụ trong code)                                                      | Cache cần đánh giá                                                                                                                                    |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lưu sơ đồ kho (`useSaveWarehouseLayoutSceneMutation`)                            | `layoutScene(warehouseId)` và `layout(warehouseId)`                                                                                                   |
| Tạo/sửa/ngừng dùng khu, kệ, ô (`use-warehouse.ts`)                               | `detail`, `layout`, `layoutScene` và `locationsAll` của kho, qua `useInvalidateWarehouseStructure`                                                    |
| Xác nhận bản nháp AI (`useConfirmAiActionMutation`)                              | Cache tin nhắn của hội thoại và danh sách phiếu mà `ACTION_RESULT_QUERY_KEYS` ánh xạ                                                                  |
| Hoàn tất bản nháp AI sau khi tạo phiếu bằng form (`useCompleteAiActionMutation`) | Mọi cache tin nhắn AI (`aiAssistant.messagesAll`) và `aiAssistant.actionDraft(id)`; danh sách phiếu đã được mutation tạo phiếu của chính form làm mới |
| Gửi tin nhắn AI (`useSendAiChatMessageMutation`)                                 | Tin nhắn hội thoại (qua `setQueryData`) và `aiAssistant.conversations`                                                                                |

- Tái dùng key owner; kiểm tra active/inactive và phạm vi prefix.
- `invalidateQueries` không có nghĩa mọi cache được fetch ngay. Return/await Promise khi mutation phải còn pending tới lúc cache cập nhật xong.
- `setQueryData` chỉ dùng khi response đủ và shape chính xác; không đoán total/trang/filter từ một bản ghi. [Q7]
- Không thay invalidation TanStack bằng `router.refresh` (hai cache khác nhau). Hiện `src` không gọi `router.refresh`.
- Với lưu một phần, cập nhật/invalidate phần đã ghi thật kể cả khi workflow báo lỗi; giữ ID và retry bước còn thiếu.

### Báo lỗi và callback của mutation

Mỗi hành động của người dùng có một owner báo kết quả: mutation hoặc workflow hook (`.rules` → Error Handling). Toast thành công/thất bại và `logger.error` đặt trong `onSuccess`/`onError` của `useMutation`. Callback truyền vào lời gọi `mutate(variables, { onSuccess, onError })` ở component là callback theo từng lần gọi, và TanStack Query v5 không gọi chúng nếu component đã unmount trước khi mutation xong. Những gì phải xảy ra dù người dùng đóng panel (toast, ghi `conversationId`, đồng bộ cache) vì vậy không đặt ở callback `mutate`. Callback `mutate` chỉ dành cho việc thuần UI của component còn sống (xóa ô nhập, đóng dialog, focus).

## 10. Optimistic update và ghi đồng thời

Chỉ optimistic khi có semantics rõ và rollback/reconcile an toàn. Duyệt, thanh toán, biến động kho không mặc định optimistic.

- Trong `onMutate`, `await queryClient.cancelQueries` đúng key trước khi `setQueryData`, nếu không một refetch đang bay có thể ghi đè bản lạc quan. Một số luồng chuyển kho đã dùng `cancelQueries` (`use-transfer-pick-actions.ts`, `use-transfer-putaway-plan.ts`).
- Snapshot đúng phạm vi. Nếu nhiều mutation chồng lấn, rollback không được khôi phục snapshot cũ đè lần thành công mới; có thể invalidate sau settle hoặc serialize theo resource.
- Mẫu hiện có: `onMutate` của `useSetTransferPutAwayPlanMutation` (`use-transfer-putaway-plan.ts`) và của mutation nhập hàng ở `use-transfer-receipt.ts` trả về Promise của `cancelQueries`; TanStack chờ `onMutate` xong mới chạy `mutationFn`, nên request gợi ý đang bay không ghi đè kết quả sau khi ghi. Hiện `src` chưa có mutation optimistic dùng `setQueryData`.
- Nút busy chặn submit trùng ở UI nhưng không thay idempotency/unique constraint ở BE.

## 11. Polling, realtime và subscription

- Chỉ polling khi cần độ mới; xét visibility, online, phiên và consumer. Hiện có `refetchInterval` dạng hàm theo trạng thái dữ liệu (`useForecastRunQuery` dừng khi lượt tính xong; `use-inbound.ts`, `use-subscription.ts`, `use-inventory-anomalies.ts`) và chu kỳ cố định 30 giây ở `use-cross-dock.ts`.
- Realtime: `NotificationRealtimeProvider` giữ kết nối SignalR (`@microsoft/signalr`), invalidate cache thông báo và các key theo `getNotificationQueryKeys` khi có sự kiện, gom burst bằng cờ và `shownEventsRef`. Không xóa polling dự phòng chỉ vì đã có realtime nếu còn nguy cơ lỡ message.
- Không tạo interval/subscription mới mỗi render; cleanup đúng vòng đời.

## 12. Render của query và SSR

`select` chọn/biến đổi dữ liệu cho consumer, không làm payload nhỏ hơn; bỏ field ở BE mới giảm truyền tải. Không dùng `select` để biến lỗi thành success.

Query result object không ổn định như `data`; chỉ đọc thuộc tính cần dùng, tránh destructure toàn bộ. Không tắt structural sharing hay đặt `notifyOnChangeProps` theo cảm giác. [Q8]

`providers/query-provider.tsx` bọc app bằng `queryClient` module-level từ `src/lib/query-client.ts` (browser singleton), kèm `MutationTopLoader` dùng `useIsMutating`. Hiện `src` chưa có server prefetch, `dehydrate` hay `HydrationBoundary`. Khi thêm, QueryClient chứa dữ liệu riêng tư phải tạo theo request, không dùng singleton này trên server; đồng bộ key, `staleTime` và shape giữa prefetch và client. [Q9] Ranh giới server/client: xem [NEXTJS-RENDERING-PERFORMANCE.md](NEXTJS-RENDERING-PERFORMANCE.md). Không import `axiosClient` (đọc `localStorage`) vào Server Component.

## 13. Điểm cần kiểm chứng khi sửa code hiện có

Ghi nhận từ đọc code ngày 31/10/2026, chưa benchmark:

- Nhiều service chưa chuyển tiếp `signal` (ví dụ `ai-assistant.service.ts`); chỉ một phần service `transfer`, `stock-issue`, `inbound`, `reporting`, `dashboard` có.
- Retry mặc định 1 chưa phân loại lỗi; lời gọi refresh token chưa có timeout riêng.
- `useWarehouseOverviewQuery` dựng key inline, không qua `queryKeys`.
- Đã có: debounce, `enabled` theo điều kiện, prefetch khi rê chuột (`usePrefetchCycleCount`, `useWarehouseLayoutPrefetch`), `queryOptions` dùng chung (`warehouseLayoutSceneQueryOptions`), `placeholderData` khi phân trang, `refetchInterval` theo trạng thái.
- Các điểm trên là đầu việc cần kiểm chứng khi sửa vùng liên quan, không phải chức năng đã có sẵn nhờ tài liệu này.

## 14. Mẫu review ngắn

```text
Workflow / route:
Dữ liệu cần ngay / dữ liệu tải khi dùng:
Query key / scope / service:
Cancellation / timeout / retry:
Freshness / gc / polling:
Mutation ảnh hưởng cache nào / khi nào invalidate:
Ai báo lỗi (mutation hay caller), có chạy khi unmount không:
Placeholder khi đổi page/filter/scope:
Network trước/sau: số request HTTP, trùng/hủy/retry, bytes, timing hoặc CHƯA ĐO:
Kiểm tra: scope, cache miss, lỗi, dirty form, submit trùng, lưu một phần:
Kết luận / phần chưa xác minh:
```

Chạy `pnpm typecheck`, `pnpm lint` và test liên quan khi sửa code; riêng tài liệu thì kiểm tra link và mâu thuẫn. Không tuyên bố giảm tải BE hay render nhanh hơn chỉ từ số dòng code.

## 15. Nguồn chính thức

- **Q1:** [Query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys).
- **Q2:** [Important defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults).
- **Q3:** [Query cancellation, gồm Axios signal](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation).
- **Q4:** [Disabling/lazy queries](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries).
- **Q5:** [Paginated queries](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries).
- **Q6:** [Query retries](https://tanstack.com/query/latest/docs/framework/react/guides/query-retries).
- **Q7:** [Invalidations from mutations](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations).
- **Q8:** [Render optimizations](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations).
- **Q9:** [Advanced server rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr).
- [Mutations (callback theo từng lần gọi và unmount)](https://tanstack.com/query/latest/docs/framework/react/guides/mutations).
- [Axios request configuration](https://axios-http.com/docs/req_config).

Nguồn `latest` của v5 có thể có option mới hơn bản đang cài; không coi sự tồn tại trên docs là bằng chứng repository đã cấu hình.
