import { Badge } from '@/components/ui/badge'

const labels: Readonly<Record<string, string>> = {
  Submit: 'Chờ gửi yêu cầu',
  CreateShipment: 'Chờ chia đợt',
  Pick: 'Chờ lấy hàng',
  Dispatch: 'Chờ xác nhận xuất',
  Receive: 'Chờ nhận hàng',
  ResolvePickEscalation: 'Chờ xử lý báo cáo lấy',
  ResolveDiscrepancy: 'Chờ xử lý chênh lệch',
  Completed: 'Đã hoàn tất',
  Cancelled: 'Đã hủy',
  ViewHistory: 'Chỉ xem lịch sử',
}
/** Tín hiệu cấp phiếu, không phải quyền hoặc nút thao tác của người xem. */
export function TransferNextActionChip({ code }: { readonly code?: string | null }) {
  const label = code ? labels[code] : undefined
  return label ? (
    <Badge
      variant="outline"
      className="h-auto min-h-5 py-1 text-left leading-snug whitespace-normal"
    >
      {label}
    </Badge>
  ) : null
}
