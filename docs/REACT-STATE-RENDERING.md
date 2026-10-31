# React: state, effect và hiệu năng render

> Rà soát: 31/10/2026. `package.json` khai báo React ^19.2.7 và Next ^16.2.7; react.dev có thể mô tả phiên bản mới hơn.
> Bổ sung [`.rules`](../.rules), [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md) và [CODING_GUIDELINES.md](CODING_GUIDELINES.md); không yêu cầu refactor toàn bộ code hiện hữu.

## 1. Phạm vi và mức bắt buộc

- **Bắt buộc:** giữ đúng dữ liệu, vòng đời, quyền, hydration và thao tác người dùng.
- **Nên:** áp dụng mặc định; giải thích khi chọn cách khác.
- **Có thể:** kỹ thuật tối ưu, chỉ dùng sau khi có vấn đề cụ thể.
- Đây là convention của dự án dựa trên nguồn chính thức; không phải mọi điều đều do React bắt buộc.
- Cache và API theo [TANSTACK-QUERY-DATA-FLOW.md](TANSTACK-QUERY-DATA-FLOW.md); ranh giới server/client theo [NEXTJS-RENDERING-PERFORMANCE.md](NEXTJS-RENDERING-PERFORMANCE.md).

## 2. Chọn owner cho state

| Dữ liệu                                       | Owner mặc định                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Dialog mở/đóng, hover, tab tạm                | State tại vùng UI cần nó                                                                                                                       |
| Filter/sort/page có thể chia sẻ hoặc quay lại | URL đã validate, kèm state nhập tạm khi cần                                                                                                    |
| Dữ liệu API trên browser                      | TanStack Query, không sao chép sang Zustand                                                                                                    |
| Draft form                                    | Một React Hook Form owner, có chính sách dirty/reset                                                                                           |
| State client dùng chung nhiều vùng            | Zustand trong `src/stores/` (vd. `useAiAssistantPanelStore` giữ `isOpen`, `width`, `isResizing` để khung trợ lý và bố cục trang cùng phản ứng) |
| Giá trị tính được từ input hiện tại           | Tính trong render hoặc hàm thuần ở `utils/`                                                                                                    |

Không tạo state riêng cho tổng số dòng, nhãn đã chọn hay `filteredRows` nếu tính được từ dữ liệu đang có. Khi nhiều boolean bắt đầu mâu thuẫn, cân nhắc union trạng thái. [R1]

Reset theo entity/mode phải có chủ đích: dùng key ổn định theo entity khi đúng UX, không dùng random key khiến remount mỗi render. Không để refetch nền ghi đè input dirty. Ví dụ: `AiAssistantPanel` đặt lại câu hỏi vào ô nhập khi gửi lỗi lúc khung còn mở thay vì làm mất chữ (callback `onError` của lời gọi `mutate`, chỉ chạy khi component còn sống).

## 3. Render thuần và sự kiện

- Render không gửi API ghi, không sửa store khác, không đăng ký subscription, không tạo timer, không mutate props hay dữ liệu query.
- Logic do click/submit gây ra đặt trong event/workflow handler; không dựng effect quan sát "đã bấm Lưu" để gửi mutation.
- Thay array/object bằng giá trị mới khi cập nhật; không `sort`/`splice` trực tiếp dữ liệu từ query cache (xem `appendAiChatTurn` trong `features/ai-assistant/utils/ai-conversation-cache.ts` trả cache mới thay vì sửa tại chỗ).
- Hàm chuyển đổi nghiệp vụ thuần đặt ở `utils/` (mapper, policy), không biến thành custom hook.
- Hook luôn ở top level; lazy load bằng `enabled` hoặc mount có điều kiện, không gọi hook trong `if`/vòng lặp/callback.
- Dùng id nghiệp vụ ổn định làm list key. Key ghép từ nội dung có thể trùng (vd. hai thẻ cùng `message`) sẽ gây cảnh báo và cập nhật sai; thêm index hoặc id khi dữ liệu có thể lặp.

Tổ chức page/orchestrator/view theo FOLDER_STRUCTURE.md; số dòng không quyết định số component cần tạo.

## 4. Effect phục vụ đồng bộ với bên ngoài

Dùng effect để kết nối hệ thống ngoài React: subscription, browser API, timer, widget. Không dùng effect để giữ hai bản sao state đồng bộ hay tính giá trị hiển thị. [R2]

Mỗi effect phải trả lời được:

1. Đang đồng bộ với nguồn bên ngoài nào?
2. Dependency nào làm kết nối cần đổi?
3. Cleanup nào hoàn tác phần setup?
4. Điều gì xảy ra khi setup → cleanup → setup lại (Strict Mode bật trong `next.config.ts`)?
5. Response async muộn còn thuộc entity/scope hiện tại không?

Mẫu trong code:

- `useDebouncedValue` (`src/hooks`) đặt timer và `clearTimeout` trong cleanup.
- `useFrameThrottledScroll` (`features/warehouse/hooks`) giữ `requestAnimationFrame` và hủy ở cleanup, chỉ báo vị trí cuộn mới nhất một lần mỗi khung để canvas không dựng lại nhiều lần.
- `NotificationRealtimeProvider` mở kết nối SignalR trong effect, dùng cờ `disposed` và timer khởi động lại để bỏ qua sự kiện muộn sau khi gỡ.

Không tắt `react-hooks/exhaustive-deps` để ép effect "chỉ chạy một lần": sửa ownership hoặc dependency, hoặc tách logic thuần trước. Dữ liệu server dùng query hook, không tự `fetch` trong effect. Blob URL phải `revoke` khi hết dùng; listener/timer phải gỡ đúng đối tượng. [R3]

## 5. Ranh giới component và subscription

- Đặt state/subscription gần phần thật sự dùng. Thay một field không nên khiến cả màn nhiều vùng tính lại vì owner quá rộng.
- Chỉ truyền props cần dùng; không truyền cả store/form/query result nếu con chỉ cần một giá trị.
- Không đổi ownership chỉ để bớt props bằng một context chứa mọi thứ. Props đi qua 3+ lớp là tín hiệu review (`.rules`), không phải lệnh tách.
- Form field subscribe qua cơ chế sẵn có (`useWatch` gần field); tránh `watch` toàn form ở page.
- Với TanStack Query, đọc đúng trường cần dùng (chi tiết ở tài liệu data flow).
- Chọn selector Zustand theo giá trị dùng, ví dụ `useAuthStore((state) => state.user?.role ?? null)`; kiểm tra identity của object trả về.

Đây là điểm để review và profile, không phải yêu cầu mọi component phải memoize.

## 6. Memoization có điều kiện

Trước `memo`/`useMemo`/`useCallback`:

1. Bỏ state/effect thừa và đưa state về đúng owner.
2. Dùng React Profiler xác định render hoặc phép tính đắt.
3. Xác định prop/dependency làm cache mất hiệu lực.
4. Đo lại sau thay đổi.

`memo` là tối ưu, không bảo đảm component không render; không dùng `memo` để sửa lỗi correctness hay comparator sâu không giới hạn. [R4] Chỉ thêm `useMemo`/`useCallback` khi có lợi cụ thể: phép tính đắt hoặc identity quan trọng với consumer. Ví dụ có lý do rõ: canvas sơ đồ kho tính nhãn chỉ số từng kệ một lần bằng `useMemo` vì nhãn chỉ phụ thuộc dữ liệu và chế độ đo, không phụ thuộc zoom/cuộn (`features/warehouse/components/WarehouseDesigner/Canvas/WarehouseCanvas.tsx`).

React Compiler không bật: `next.config.ts` không khai báo `reactCompiler` và `package.json` không có plugin tương ứng. React 19 không có nghĩa compiler đang chạy; không xóa hay thêm memo hàng loạt dựa vào tên phiên bản.

`eslint-config-next` kèm các luật `react-hooks` mới (ví dụ cấm đọc `ref` trong lúc render). Khi hàm render cần gọi handle của một component con, giữ handle trong state qua `ref={setHandle}` thay vì đọc `ref.current` trong render; canvas sơ đồ kho làm đúng như vậy cho `CanvasHoverTooltip`.

## 7. UI phản hồi và request là hai vấn đề khác nhau

| Mục tiêu                              | Công cụ cần cân nhắc                                           |
| ------------------------------------- | -------------------------------------------------------------- |
| Giảm request khi gõ                   | Debounce input tạo query (`useDebouncedValue`) và cancellation |
| Gõ mượt khi kết quả render nặng       | `useDeferredValue`/transition, sau khi xác định chi phí render |
| Cập nhật theo khung hình (cuộn, kéo)  | Gom theo `requestAnimationFrame` như `useFrameThrottledScroll` |
| Giảm DOM quá lớn                      | Phân trang; virtualization khi có bằng chứng và vẫn giữ a11y   |
| Chỉ tải editor/canvas/export khi dùng | Dynamic import có chủ đích (xem tài liệu Next.js)              |
| Giảm tải BE khi đổi filter            | Bounded query, lazy data, hủy request cũ, retry phù hợp        |

`useDeferredValue` không phải debounce và không giảm số request. Không dùng transition cho giá trị input cần cập nhật tức thì. [R5] Tới ngày rà soát, `src` chưa dùng `useDeferredValue`, `useTransition` hay `startTransition`.

Không áp virtualization cho bảng 10/25/50 dòng. Đo số DOM node, thời gian render và tương tác trước.

## 8. Hydration và browser-only state

Client Component vẫn có thể prerender trên server; lần render client đầu phải khớp HTML đã tạo.

- Không đọc `window`, `document`, storage, random hay thời gian hiện tại để tạo JSX khác nhau trong render dùng chung. Giá trị trình duyệt đọc trong effect hoặc event. Ngày "hôm nay" của nghiệp vụ lấy từ `operationalToday()` (`src/lib/operational-date-time.ts`, múi giờ `Asia/Ho_Chi_Minh`) để khớp giờ BE thay vì giờ máy. Form tạo phiếu được điền sẵn từ bản nháp AI (`?aiDraft=`) gọi `form.reset` trong effect khi dữ liệu về, đúng một lần cho mỗi bản nháp và bỏ qua nếu người dùng đã gõ; không điền giá trị trong lúc render.
- `useId` phục vụ liên kết accessibility (`aria-describedby`, `htmlFor`); không dùng làm id nghiệp vụ hay list key.
- `useSyncExternalStore` dành cho external store thật sự và cần server snapshot nhất quán. Đã dùng ở `app/(public)/layout.tsx` (chờ `useAuthStore` hydrate) và `components/operations/scanning/CameraScanControl.tsx`.
- `suppressHydrationWarning` chỉ cho sai khác cục bộ có chủ đích, không áp cả subtree. Không tắt SSR cả màn để che mismatch.

## 9. Kiểm chứng trước khi kết luận

Với thay đổi render: ghi thao tác chậm, dữ liệu, môi trường, Profiler hoặc browser trace và kết quả trước/sau. Đo gõ, mở dialog, đổi filter, cuộn khi liên quan.

- [ ] Render không có side effect; state có một owner, không mirror server data.
- [ ] Effect có dependency/cleanup đúng; Strict Mode không lặp tác dụng phụ nguy hiểm.
- [ ] Dirty input không mất khi refetch, khi gửi lỗi hay khi đóng/mở lại khung.
- [ ] Không remount do key bất ổn; không mutate dữ liệu query trực tiếp.
- [ ] Memo/defer/virtualization có lý do; không thay thế cho tối ưu network.
- [ ] Server/client render đầu nhất quán; không dùng blanket hydration suppression.
- [ ] Keyboard, focus và a11y vẫn đúng (liên kết lỗi với input, trạng thái đang chọn, live region không lồng nhau).

Nếu chỉ đọc code, ghi "nghi vấn cần profile"; không kết luận số lần render hay thời gian đã giảm.

## 10. Nguồn chính thức

- **R1:** [Choosing the state structure](https://react.dev/learn/choosing-the-state-structure).
- **R2:** [You might not need an Effect](https://react.dev/learn/you-might-not-need-an-effect).
- **R3:** [useEffect](https://react.dev/reference/react/useEffect).
- **R4:** [memo](https://react.dev/reference/react/memo).
- **R5:** [useDeferredValue](https://react.dev/reference/react/useDeferredValue).
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).
- [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore).
- [Profiler](https://react.dev/reference/react/Profiler).
