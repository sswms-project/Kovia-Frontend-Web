import { APP_ROUTES } from '@/routes/app-routes'

const GENERAL_PROMPTS = [
  'Kho nào đang có nhiều sản phẩm sắp hết hàng?',
  'Trong tháng này có bao nhiêu yêu cầu xuất kho đã hoàn tất?',
  'Có yêu cầu kho nào đang bị trễ xử lý không?',
  'Sản phẩm nào nên nhập thêm hàng?',
  'Trang dự báo tồn kho ở đâu?',
] as const

const GUID_SEGMENT = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/|$)/i

interface PagePrompts {
  readonly pathPrefix: string
  /** Gợi ý về đúng đối tượng đang mở chỉ có nghĩa ở trang chi tiết (đường dẫn có ID). */
  readonly detailOnly: boolean
  readonly prompts: readonly string[]
}

const PAGE_PROMPTS: readonly PagePrompts[] = [
  {
    pathPrefix: APP_ROUTES.stockIssueRequests,
    detailOnly: true,
    prompts: ['Phiếu xuất này đang kẹt ở bước nào?', 'Phiếu này còn thiếu hàng gì?'],
  },
  {
    pathPrefix: APP_ROUTES.inboundRequests,
    detailOnly: true,
    prompts: ['Yêu cầu nhập này đang chờ ai xử lý?', 'Bao giờ hàng của yêu cầu này về?'],
  },
  {
    pathPrefix: APP_ROUTES.goodsReceipts,
    detailOnly: true,
    prompts: ['Phiếu nhận hàng này đang ở bước nào?', 'Phiếu này còn dòng hàng nào chưa nhận đủ?'],
  },
  {
    pathPrefix: APP_ROUTES.transfers,
    detailOnly: true,
    prompts: ['Phiếu chuyển kho này đang kẹt ở đâu?', 'Hàng của phiếu này đã xuất đi chưa?'],
  },
  {
    pathPrefix: APP_ROUTES.warehouses,
    detailOnly: true,
    prompts: ['Kho này còn gì sắp hết hàng?', 'Kho này cần nhập thêm hàng gì?'],
  },
  {
    pathPrefix: APP_ROUTES.inventory,
    detailOnly: false,
    prompts: [
      'Sản phẩm nào đang dưới ngưỡng tồn tối thiểu?',
      'Tồn kho tuần này biến động thế nào?',
    ],
  },
]

/** Câu hỏi gợi ý: ưu tiên câu hỏi về trang người dùng đang mở, sau đó tới câu hỏi chung. */
export function getSuggestedPrompts(pathname: string | null): readonly string[] {
  const path = pathname ?? ''
  const page = PAGE_PROMPTS.find(
    (entry) =>
      (path === entry.pathPrefix || path.startsWith(`${entry.pathPrefix}/`)) &&
      (!entry.detailOnly || GUID_SEGMENT.test(path))
  )
  if (!page) return GENERAL_PROMPTS
  return [...page.prompts, ...GENERAL_PROMPTS.slice(0, 3)]
}
