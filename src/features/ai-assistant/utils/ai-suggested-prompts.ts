import type { LucideIcon } from 'lucide-react'
import {
  AlarmClock,
  BookOpen,
  Copy,
  Gauge,
  ListChecks,
  MapPin,
  PackageMinus,
  PackagePlus,
  Route as RouteIcon,
  Users,
} from 'lucide-react'
import { P, type PermissionCode } from '@/config/permissionCodes'
import { APP_ROUTES } from '@/routes/app-routes'

/**
 * Thao tác nhanh khi khung chat trống. Mỗi mục chỉ hiện khi tài khoản có ít nhất một quyền trong `anyOf`
 * (quyền lấy từ `/auth/me` do BE trả, không suy từ tên vai trò) và câu hỏi tương ứng có tool thật ở Kovia AI.
 * BE vẫn kiểm quyền lại khi Kovia tra dữ liệu.
 */
export interface AiQuickAction {
  readonly id: string
  readonly title: string
  readonly prompt: string
  readonly icon: LucideIcon
  readonly anyOf: readonly PermissionCode[]
}

interface PageContext {
  readonly pathPrefix: string
  /** Gợi ý về đúng đối tượng đang mở chỉ có nghĩa ở trang chi tiết (đường dẫn có ID). */
  readonly detailOnly: boolean
  readonly actions: readonly AiQuickAction[]
}

const MAX_ACTIONS = 4
const GUID_SEGMENT = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/|$)/i

const action = (
  id: string,
  title: string,
  prompt: string,
  icon: LucideIcon,
  anyOf: readonly PermissionCode[]
): AiQuickAction => ({ id, title, prompt, icon, anyOf })

const ACTIONS = {
  overview: action(
    'overview',
    'Tình hình các kho hôm nay',
    'Hôm nay tôi cần ưu tiên xử lý việc gì trong kho?',
    Gauge,
    [P.INVENTORY_VIEW]
  ),
  warehouseWork: action(
    'warehouse-work',
    'Việc cần xử lý trong kho',
    'Hôm nay kho của tôi có những công việc nào cần xử lý?',
    ListChecks,
    [P.WAREHOUSE_TASKS_VIEW_ALL]
  ),
  myWork: action(
    'my-work',
    'Việc của tôi hôm nay',
    'Hôm nay tôi có những công việc gì?',
    ListChecks,
    [P.WAREHOUSE_TASKS_VIEW_OWN]
  ),
  overdue: action(
    'overdue',
    'Phiếu đang trễ xử lý',
    'Có yêu cầu kho nào đang bị trễ xử lý không?',
    AlarmClock,
    [P.STOCK_ISSUE_REQUESTS_VIEW]
  ),
  staff: action(
    'staff',
    'Nhân viên được phân công',
    'Mỗi kho của tôi có bao nhiêu nhân viên được phân công?',
    Users,
    [P.STAFF_VIEW]
  ),
  lowStock: action(
    'low-stock',
    'Sản phẩm sắp hết',
    'Kho nào đang có nhiều sản phẩm sắp hết hàng?',
    PackageMinus,
    [P.INVENTORY_VIEW]
  ),
  replenish: action(
    'replenish',
    'Nên nhập bổ sung gì',
    'Sản phẩm nào nên nhập thêm hàng?',
    PackagePlus,
    [P.INVENTORY_VIEW]
  ),
  locate: action(
    'locate',
    'Tìm vị trí sản phẩm',
    'Tôi muốn tìm vị trí lưu trữ của một sản phẩm.',
    MapPin,
    [P.INVENTORY_VIEW]
  ),
  receiveGuide: action(
    'receive-guide',
    'Hướng dẫn nhận hàng',
    'Hướng dẫn tôi các bước nhận hàng.',
    BookOpen,
    [P.GOODS_RECEIPTS_CREATE]
  ),
  putawayGuide: action(
    'putaway-guide',
    'Hướng dẫn cất hàng',
    'Hướng dẫn tôi các bước cất hàng.',
    BookOpen,
    [P.GOODS_RECEIPTS_PUTAWAY]
  ),
}

/** Người quản lý toàn doanh nghiệp (có quyền tạo kho) cần tổng quan trước; người khác cần việc của mình trước. */
const TENANT_ORDER = [
  ACTIONS.overview,
  ACTIONS.overdue,
  ACTIONS.staff,
  ACTIONS.lowStock,
  ACTIONS.replenish,
]
const WAREHOUSE_ORDER = [
  ACTIONS.warehouseWork,
  ACTIONS.myWork,
  ACTIONS.overdue,
  ACTIONS.staff,
  ACTIONS.lowStock,
  ACTIONS.locate,
  ACTIONS.receiveGuide,
  ACTIONS.putawayGuide,
]

const PAGE_CONTEXTS: readonly PageContext[] = [
  {
    pathPrefix: APP_ROUTES.stockIssueRequests,
    detailOnly: true,
    actions: [
      action(
        'issue-copy',
        'Tạo phiếu mới giống phiếu này',
        'Tạo một phiếu xuất mới giống phiếu này.',
        Copy,
        [P.STOCK_ISSUE_REQUESTS_CREATE]
      ),
      action(
        'issue-stuck',
        'Phiếu đang ở bước nào',
        'Phiếu xuất này đang kẹt ở bước nào?',
        RouteIcon,
        [P.STOCK_ISSUE_REQUESTS_VIEW]
      ),
    ],
  },
  { pathPrefix: APP_ROUTES.stockIssueRequests, detailOnly: false, actions: [ACTIONS.overdue] },
  {
    pathPrefix: APP_ROUTES.inboundRequests,
    detailOnly: true,
    actions: [
      action('inbound-who', 'Đang chờ ai xử lý', 'Yêu cầu nhập này đang chờ ai xử lý?', RouteIcon, [
        P.INBOUND_REQUESTS_VIEW,
      ]),
    ],
  },
  {
    pathPrefix: APP_ROUTES.goodsReceipts,
    detailOnly: true,
    actions: [
      action(
        'receipt-why',
        'Vì sao chưa xử lý được',
        'Vì sao phiếu nhận hàng này chưa xử lý được?',
        RouteIcon,
        [P.GOODS_RECEIPTS_VIEW]
      ),
    ],
  },
  {
    pathPrefix: APP_ROUTES.transfers,
    detailOnly: true,
    actions: [
      action(
        'transfer-stuck',
        'Phiếu đang kẹt ở đâu',
        'Phiếu chuyển kho này đang kẹt ở đâu?',
        RouteIcon,
        [P.TRANSFERS_VIEW]
      ),
    ],
  },
  {
    pathPrefix: APP_ROUTES.warehouses,
    detailOnly: true,
    actions: [
      action(
        'warehouse-staff',
        'Nhân viên của kho này',
        'Kho này có bao nhiêu nhân viên được phân công?',
        Users,
        [P.STAFF_VIEW]
      ),
      action('warehouse-low', 'Kho này sắp hết gì', 'Kho này còn gì sắp hết hàng?', PackageMinus, [
        P.INVENTORY_VIEW,
      ]),
    ],
  },
  {
    pathPrefix: APP_ROUTES.inventory,
    detailOnly: false,
    actions: [ACTIONS.locate, ACTIONS.lowStock],
  },
  {
    pathPrefix: APP_ROUTES.myTasks,
    detailOnly: false,
    actions: [
      ACTIONS.myWork,
      action('task-first', 'Nên làm việc nào trước', 'Tôi nên xử lý việc nào trước?', AlarmClock, [
        P.WAREHOUSE_TASKS_VIEW_OWN,
      ]),
    ],
  },
]

const matchesPage = (path: string, page: PageContext) =>
  (path === page.pathPrefix || path.startsWith(`${page.pathPrefix}/`)) &&
  (!page.detailOnly || GUID_SEGMENT.test(path))

/** Thao tác nhanh theo quyền thật và trang đang mở: gợi ý của trang trước, rồi gợi ý chung theo phạm vi. */
export function getQuickActions(
  pathname: string | null,
  permissions: readonly string[] | undefined
): readonly AiQuickAction[] {
  const granted = new Set(permissions ?? [])
  const path = pathname ?? ''
  const pageActions = PAGE_CONTEXTS.filter((page) => matchesPage(path, page)).flatMap(
    (page) => page.actions
  )
  const general = granted.has(P.WAREHOUSES_CREATE) ? TENANT_ORDER : WAREHOUSE_ORDER
  const seen = new Set<string>()
  return [...pageActions, ...general]
    .filter((candidate) => candidate.anyOf.some((permission) => granted.has(permission)))
    .filter((candidate) => !seen.has(candidate.prompt) && Boolean(seen.add(candidate.prompt)))
    .slice(0, MAX_ACTIONS)
}
