# Cấu trúc thư mục và trách nhiệm mã nguồn — Kovia WMS FE

Tài liệu này sở hữu quy tắc tổ chức code, luồng dữ liệu, hooks, form và tiêu chí refactor. Quy tắc cốt lõi ở [`.rules`](../.rules); tái sử dụng, shadcn/ui và clean code ở [CODING_GUIDELINES.md](CODING_GUIDELINES.md); giao diện ở [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) và [LIST_TABLE_DESIGN_GUIDELINES.md](LIST_TABLE_DESIGN_GUIDELINES.md). Tài liệu này không quy định giao diện. Đối chiếu với `src/` ngày 28/10/2026.

## 1. Bản đồ thư mục

Đây là bản đồ các vùng làm việc, không phải danh sách đầy đủ mọi feature/file.

```text
FE/
├── .rules                               # Quy tắc cốt lõi + chỉ dẫn đọc tài liệu
├── AGENTS.md                            # Chỉ dẫn cho agent, quy tắc quyền
├── docs/                                # Mỗi tài liệu phụ trách một chủ đề
├── public/                              # Tài nguyên công khai
├── next.config.ts                       # Cấu hình build (typedRoutes, images)
├── vitest.config.mts                    # Vitest + jsdom, alias @ → src
└── src/
    ├── proxy.ts                         # Kiểm tra token/role sơ bộ theo route (thay middleware)
    ├── app/
    │   ├── (private)/                   # Màn nghiệp vụ; layout bọc ProtectedRoute, sidebar, header
    │   ├── (public)/                    # auth, pricing, invitations, payment-result, supplier-response
    │   ├── layout.tsx                   # Metadata, font, QueryProvider, ThemeProvider, Toaster
    │   ├── page.tsx / error.tsx / loading.tsx / not-found.tsx
    │   └── index.css                    # Tailwind v4 + design tokens (thuộc DESIGN_SYSTEM)
    ├── features/<feature>/
    │   ├── pages/                       # <Name>Page.tsx (default export) + index.ts tùy chọn
    │   ├── components/<PageName>/       # Views, dialogs, sheets, orchestrator có tên rõ + index.ts
    │   ├── hooks/                       # Query, mutation, form, behavior/workflow hooks
    │   ├── services/                    # HTTP services (plain object, axiosClient)
    │   ├── schemas/                     # Zod + type suy ra
    │   ├── types/                       # DTO/view-model/types riêng của feature
    │   ├── utils/                       # Hàm thuần: format, mapper, rules
    │   └── providers/                   # Chỉ khi feature cần context riêng (vd. platform-services)
    ├── components/
    │   ├── ui/                          # Primitives shadcn/Radix
    │   ├── layout/                      # AppHeader, AppSidebar, nav-config
    │   ├── operations/                  # OperationalListPanel, OperationalPagination, bulk import, scanning, putaway
    │   ├── forms/                       # BusinessCodeField, DatePickerField
    │   ├── barcode/                     # Lớp in mã vạch
    │   └── *.tsx                        # ErrorState, ProtectedRoute, AppRouteSkeleton, UserMenu…
    ├── config/                          # permissionCodes.ts, roles.ts, route-permissions.ts, test-setup.ts
    ├── routes/                          # app-routes.ts (APP_ROUTES), api-endpoints.ts (API_ENDPOINTS)
    ├── lib/                             # axios, logger, query-keys, query-client, api-error, date-format…
    ├── hooks/                           # Hooks dùng chung thật sự (use-code-suggestion, use-debounced-value…)
    ├── stores/                          # Zustand state dùng chung phía client (auth.store…)
    ├── providers/                       # query-provider, theme-provider
    ├── types/                           # Kiểu dùng chung: ApiResponse, QueryInfo, QueryResult…
    ├── schemas/ / services/             # Schema/service dùng chung nhiều feature (return-document)
    └── assets/                          # Font tự host
```

Các feature đang có gồm `warehouse`, `inventory`, `inventory-anomaly`, `inbound`, `inbound-request`, `stock-issue`, `stock-recipient`, `transfer`, `cycle-count`, `warehouse-task`, `product`, `supplier`, `supplier-return`, `staff`, `organization`, `access-control`, `reporting`, `dashboard`, `subscription`, `admin`, `auth`…

- Route và feature không trùng tên 1–1. Xác định màn đích trước khi chọn feature: `/inventory/cycle-counts` → `features/cycle-count`, `/goods-return-requests` → `features/stock-issue`, `/tasks` → `features/warehouse-task`, `/inventory/anomalies` → `features/inventory-anomaly`.
- `inbound-request` là phiếu yêu cầu nhập; `inbound` là nhận hàng, phiếu nhập và putaway.
- `routes/app-routes.ts` là URL FE; `routes/api-endpoints.ts` là endpoint; `config/permissionCodes.ts` là mã quyền FE; `config/route-permissions.ts` là quyền theo route; `components/layout/nav-config.ts` là menu.
- Không tạo một tầng mới chỉ để đủ cây thư mục. Feature nhỏ chỉ có những thư mục thực sự dùng. Chỉ đưa code ra thư mục dùng chung khi có use case thứ hai thật.

## 2. Đặt tên, exports và imports

| Loại                      | Quy ước                                                                        |
| ------------------------- | ------------------------------------------------------------------------------ |
| Feature/thư mục nghiệp vụ | kebab-case (`stock-issue`, `inbound-request`)                                  |
| Page của feature          | `<Name>Page.tsx`, **default export**                                           |
| Orchestrator              | PascalCase, tên nói rõ phạm vi (`TaskAssignmentScoring`, `FormerStaff`)        |
| View/component            | PascalCase, named export                                                       |
| Hook                      | `use-kebab-case.ts`                                                            |
| Service                   | `kebab-case.service.ts`                                                        |
| Helper/mapper thuần       | `kebab-case.ts` trong `utils/`, đặt theo hành vi (`layout-scene-mapper.ts`)    |
| Schema / store / types    | `kebab-case.schema.ts` / `kebab-case.store.ts` / `kebab-case.types.ts`         |
| Entry Next.js             | Theo Next.js: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`…            |
| Barrel của nhóm component | `index.ts` với named exports                                                   |
| Barrel pages (tùy chọn)   | `pages/index.ts`: `export { default as InventoryPage } from './InventoryPage'` |

Page nhập từ barrel của nhóm component. Bên trong cùng nhóm dùng đường dẫn tương đối trực tiếp, không import ngược barrel của chính mình. Trong feature ưu tiên relative; dùng `@/` cho `components`, `lib`, `config`, `routes`, `hooks`, `stores`, `types` và feature khác.

Một sub-view đủ lớn có thể có thư mục riêng với `index.tsx`, các component con và `types.ts` cục bộ (vd. `organization/components/OrganizationPage/TaskAssignmentScoring/`). Đây là lựa chọn tổ chức khi có trách nhiệm rõ, không phải yêu cầu tách vì vượt đúng một số dòng.

Type chỉ dùng trong một nhóm đặt cạnh nhóm. Hằng nghiệp vụ đặt ở module có tên rõ, tái dùng vị trí đã có; không tạo hai nguồn cho cùng một giá trị.

## 3. Luồng dữ liệu và nơi sở hữu

```text
app/(private)/.../page.tsx
  └─ features/<feature>/pages/<Name>Page
       ├─ <Name>View / dialogs / sheets           (props + callbacks)
       └─ <Domain> orchestrator (khi cần vòng đời độc lập)
            └─ <Domain>View

Page / Orchestrator → feature hooks → service → axiosClient → BE
Form owner          → schema + utils (mapper thuần) → mutation/workflow hook
```

| Nơi                 | Được sở hữu                                                                    | Không dồn vào đây                                   |
| ------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------- |
| Route entry         | Await/forward `params`/`searchParams`, redirect, metadata, render feature page | Hooks, form lifecycle, API, nghiệp vụ               |
| Feature page        | Query/mutation hooks của màn, ghép vùng màn hình, cờ quyền (`canCreate`…)      | Mọi state/query/mutation của sub-domain đã có owner |
| Orchestrator        | Một sub-domain hoặc một luồng thao tác; hooks dữ liệu/form của riêng vùng đó   | Mọi luồng không liên quan trên màn hình             |
| View/field          | JSX, props, UI state cục bộ, focus/ID, subscribe vào form nhận qua props       | React Query, HTTP service, toàn bộ quy trình lưu    |
| Query/mutation hook | Resource/action cụ thể, query key, cache/invalidation, báo lỗi được phân công  | State mở dialog hoặc điều hướng không liên quan     |
| Form/behavior hook  | Một form hoặc một hành vi stateful                                             | Controller trả toàn bộ màn hình                     |
| Utils/schema        | Quy tắc, validation, chuyển đổi DTO ↔ form                                     | React state, HTTP, toast, router                    |
| Service             | Endpoint (`API_ENDPOINTS`), request, bóc response envelope                     | Form state, JSX, điều hướng, nuốt lỗi               |

Mặc định page gọi các query/mutation hook rồi truyền dữ liệu và callbacks xuống. Orchestrator nằm trong `components/<PageName>/` và chỉ được gọi hooks cho sub-domain của nó khi page không quản lý cùng dữ liệu. View trong cùng thư mục không có quyền đó. Quyền: page tính capability flags từ `permissionCodes.ts`; component chỉ render theo props (xem `AGENTS.md`).

## 4. Hooks: tách hành vi, không chuyển nguyên khối

- Query hook có key dạng mảng chứa đủ tham số, lấy từ `queryKeys` ở `src/lib/query-keys.ts`. Không định nghĩa lại cùng query ở nhiều nơi.
- Mutation hook sở hữu một hành động và invalidation liên quan, luôn có `onError`. Workflow hook chỉ phối hợp các bước của cùng một thao tác có ý nghĩa (vd. tạo phiếu xuất kho rồi tải tệp đính kèm).
- Form hook có thể giữ instance, field dependencies, khởi tạo/reset theo chính sách rõ. Quyết định đổi trang/đóng dialog thuộc UI owner.
- Trả về API nhỏ, có ý nghĩa: dữ liệu, trạng thái, lệnh cần dùng. Không trả hàng chục setter/results không liên quan trong một `controller`.
- Hàm tính thuần (định dạng số lượng tồn, lựa chọn dropdown, mapping payload) đặt ở `utils/`, không mang tiền tố `use`.
- Custom hook chia sẻ logic, không chia sẻ instance state. Gọi form/workflow hook một lần tại owner, truyền phần cần thiết xuống.
- Gọi hook ở top level. Dùng `enabled: isOpen && Boolean(warehouseId)` hoặc mount orchestrator khi mở; không gọi hook bên trong `if`/callback.
- Giữ dependency đúng; effect subscription/timer có cleanup. Không tắt `exhaustive-deps` để ép vòng đời theo ý mình.
- Chỉ dùng `useMemo`/`useCallback` khi có mục đích cụ thể; bọc mọi giá trị không phải là tách kiến trúc.

## 5. State và form

### Một owner cho mỗi state/form

State ở owner thấp nhất cần phối hợp nó. View có thể giữ trạng thái trình bày; page/orchestrator giữ trạng thái điều khiển dữ liệu của vùng. State dùng chung toàn ứng dụng mới vào Zustand (`src/stores/`); dữ liệu API ở React Query.

Không giữ bản sao derived/query data chỉ để đồng bộ bằng effects. Bản nháp form là ngoại lệ có chủ đích: khởi tạo từ dữ liệu đã tải và có chính sách reset/dirty riêng.

### Form lifecycle

1. Đọc BE Command/Validator/Response trước; Zod schema + inferred type là nguồn của form values.
2. Một logical form có một `useForm`, đặt ở page, orchestrator hoặc form hook được owner gọi một lần.
3. Component nhận `form` qua props và không gọi `useForm`. Không tạo instance thứ hai cho cùng form.
4. Subscribe (`useWatch`) gần field cần thay đổi; không watch toàn bộ form tại page nếu chỉ một vùng cần dữ liệu.
5. Phân biệt create/edit/duplicate. Entity/mode đổi thì reset/remount có chủ đích; refetch nền và defaults tải muộn không được ghi đè field dirty.
6. Quy tắc cross-field nằm trong schema/hàm thuần; owner/hook áp dụng kết quả. Payload chỉ gửi field thuộc BE contract.
7. Dòng động (vd. dòng hàng phiếu xuất, dòng điều chuyển) phải hợp lệ trước khi ghi; giữ giá trị đã sửa và loại dòng không còn áp dụng khỏi payload.
8. Field errors ở form state; lỗi BE chỉ gắn vào field hợp lệ. Mã gợi ý dùng `BusinessCodeField` + `useCodeSuggestion` theo CODING_GUIDELINES.

### Lưu nhiều bước và nhiều form

Các form khác nhau có thể có instance riêng; khi cùng nút Lưu, một workflow owner phải tổng hợp validation, dirty/busy và kết quả.

- Validate tất cả phần bắt buộc trước request ghi đầu tiên.
- Chặn Enter/click lặp xuyên suốt các bước, không chỉ `isPending` của mutation đầu.
- Nếu bản ghi chính lưu được nhưng bước sau (tệp đính kèm, ảnh bằng chứng) lỗi: trả kết quả lưu một phần, giữ ID đã lưu và phần còn thiếu, cho thử lại đúng bước. Không tạo lại bản ghi hoặc reset như thành công toàn bộ.
- Báo lỗi có một owner (mutation/workflow hook với `logger.error` + toast); caller vẫn có thể gắn lỗi vào field nhưng không toast lặp.
- Chỉ reset/điều hướng theo kết quả thực tế. Save-and-add phải xử lý cả lỗi lấy mã gợi ý mới.
- Discard guard lấy tổng dirty state, khóa thoát khi đang lưu; dùng `UnsavedChangesDialog` sẵn có.

## 6. Runtime, API và cấu hình

- Mặc định Server Component; route `page.tsx` là server, feature page là client boundary (`'use client'`). Không chuyển form instance/callback thường từ server sang client.
- Services dùng `axiosClient` của `src/lib/axios.ts`, đường dẫn từ `API_ENDPOINTS`. Feature không tự gắn token, không tạo Axios instance khác, không hardcode host.
- Bóc đúng response envelope: endpoint JSON trả `ApiResponse<T>` → `response.data.data`; endpoint tệp trả Blob. Không áp một kiểu bóc cho mọi API.
- DTO truyền trên mạng khớp BE, cùng tên field (không alias).
- Danh sách lọc tại BE, phân trang bằng `OperationalPagination`; bố cục bảng theo LIST_TABLE_DESIGN_GUIDELINES.
- Chỉ tải dữ liệu đang hiển thị/cần dùng; lookup nặng tách riêng và tải khi mở bộ lọc/dialog. Cache không có nghĩa là không bao giờ refetch; `staleTime`/invalidation quyết định làm mới.
- Lỗi tải giữ nguyên `unknown` cho `ErrorState`/`OperationalState`. Phân biệt loading/error/empty/success; không coi lỗi HTTP bất kỳ là “chưa có dữ liệu”.
- Biến môi trường phía client có tiền tố `NEXT_PUBLIC_` (`NEXT_PUBLIC_API_BASE_URL`); bí mật không đặt trong biến trình duyệt.

### Hydration

Render server và lần render client đầu phải khớp: không đọc window/document/storage, không sinh ngày hiện tại/random hoặc đổi JSX theo `typeof window` trong render dùng chung. Giá trị trình duyệt đọc trong effect/event (xem cách `ProtectedRoute` chờ `useAuthStore` hydrate bằng `useSyncExternalStore`). `useId` cho ID accessibility.

`suppressHydrationWarning` chỉ cho phần tử có khác biệt được chủ đích chấp nhận (vd. thuộc tính theme của `html`), không dùng để che sai lệch cả subtree.

## 7. Khi nào phải refactor?

**Phải sửa trước khi thêm hành vi hoặc giao phần thay đổi** nếu có workflow không liên quan chung một owner; một form có nhiều owner; HTTP/mapping phức tạp trong view hoặc page gọi service trực tiếp; hoặc một hook/orchestrator chỉ là bản sao nguyên page.

| Tín hiệu cần review                      | Cách xử lý                                          |
| ---------------------------------------- | --------------------------------------------------- |
| Page/orchestrator >~250 dòng không trắng | Kiểm tra các trách nhiệm và vòng đời độc lập        |
| Hook hoặc view/sub-view >~150 dòng       | Tìm hành vi/khối UI có tên và ranh giới rõ          |
| >~10 input/output cấp đầu                | Xem lại API; không giấu tất cả trong một object lớn |
| Props đi qua 3+ lớp chỉ để truyền tiếp   | Đặt lại owner, dùng slots hoặc context đúng phạm vi |
| Nhiều effect đồng bộ cùng dữ liệu        | Bỏ state thừa, derive thay vì đồng bộ               |

Ngưỡng là tín hiệu review, không tự động chia file. Form khai báo nhiều field nhưng cùng trách nhiệm có thể dài hơn; ghi lý do ngắn trong mô tả thay đổi. File ngắn nhưng trộn trách nhiệm vẫn phải sửa.

Thứ tự ưu tiên: bỏ state thừa → tách rules/mapper thuần vào `utils/` → tách UI theo vùng có nghĩa → đưa vòng đời độc lập vào orchestrator/hook. Không tạo wrapper một dòng hoặc hook “mọi thứ của page”.

## 8. Quy trình thêm/sửa một màn hình

1. Xác định feature, route, quyền, BE contract và phần UI đã có.
2. Đọc tài liệu đúng chủ đề từ bảng trong `.rules`; kiểm tra callers/props/exports/query keys bị ảnh hưởng.
3. Đặt schema/type/utils/service/hook đúng trách nhiệm, tái dùng nguồn chung.
4. Page ghép các vùng; chỉ thêm orchestrator khi cần owner/vòng đời độc lập.
5. Route entry import page (default hoặc qua `pages/index.ts`), forward params/redirect cần thiết; đăng ký URL trong `APP_ROUTES`, endpoint trong `API_ENDPOINTS`, quyền trong `permissionCodes.ts`/`route-permissions.ts`, menu trong `nav-config.ts`.
6. Kiểm tra gate dưới đây. Không copy một page lớn đang có làm mẫu kiến trúc mặc định.

## 9. Architecture quality gate

- [ ] Route mỏng; page/orchestrator/hook có một trách nhiệm giải thích được; view không gọi HTTP/query/mutation.
- [ ] Một owner cho state/form; không duplicate form instance/query definitions hoặc mirror API data vào store.
- [ ] Rules/mapper thuần không phụ thuộc render; hooks có inputs/outputs gọn, dependencies và cleanup đúng.
- [ ] Lazy queries đúng điều kiện; request ban đầu và khi mở tab/dialog được kiểm tra; không lấy cả danh sách chỉ để đếm.
- [ ] Loading/empty/error/success và retry ở đúng vùng; báo lỗi không bị lặp giữa hook và caller.
- [ ] Form giữ dirty values; create/edit/duplicate, đổi entity, defaults muộn, refetch, discard, save-and-add được kiểm tra khi liên quan.
- [ ] Lưu nhiều bước chặn gửi lặp, thể hiện lưu một phần và retry đúng bước, không làm mất dữ liệu.
- [ ] Không phá permission checks, server/client boundary, hydration, keyboard/focus.
- [ ] Callers, schema/types, utils/service, props, exports, query keys và tests đã cập nhật cùng nhau.
- [ ] Ngưỡng review đã được xét; ngoại lệ có lý do, không dùng số dòng làm điểm đạt.
- [ ] Chạy `pnpm typecheck`, `pnpm lint` và `pnpm test` liên quan; logic mới không tầm thường có kiểm chứng nhỏ. Ghi rõ kiểm tra không chạy.

Chỉ sửa tài liệu: kiểm tra đường dẫn, nội dung không mâu thuẫn và đúng phạm vi; không cần chạy build ứng dụng. Không tuyên bố đã refactor code chỉ vì đã cập nhật quy định.
