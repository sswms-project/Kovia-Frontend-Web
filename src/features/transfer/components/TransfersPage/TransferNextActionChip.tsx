import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { APP_ROUTES } from '@/routes/app-routes'

const labels: Readonly<Record<string, string>> = {
  Submit: 'Chờ gửi yêu cầu',
  CreateShipment: 'Chuẩn bị xuất',
  Pick: 'Chờ lấy hàng',
  Dispatch: 'Chờ xác nhận xuất',
  Receive: 'Chờ nhận hàng',
  ResolvePickEscalation: 'Chờ xử lý báo cáo lấy',
  ResolveDiscrepancy: 'Chờ xử lý chênh lệch',
  Completed: 'Đã hoàn tất',
  Cancelled: 'Đã hủy',
  ViewHistory: 'Chỉ xem lịch sử',
}
/** Chỉ điều hướng tới việc của phiếu; không thực hiện lệnh ghi hoặc tự suy diễn quyền. */
export function TransferNextActionChip({
  code,
  transferId,
}: {
  readonly code?: string | null
  readonly transferId?: string
}) {
  const label = code ? labels[code] : undefined
  if (!label) return null
  const chip = (
    <Badge
      variant="outline"
      className="h-auto min-h-5 py-1 text-left leading-snug whitespace-normal"
    >
      {label}
    </Badge>
  )
  return transferId ? (
    <Link
      href={`${APP_ROUTES.transferDetail(transferId)}?tab=${code === 'ViewHistory' || code === 'Completed' || code === 'Cancelled' ? 'history' : 'execution'}`}
      className="focus-visible:ring-ring inline-flex rounded-sm underline-offset-4 hover:underline focus-visible:ring-2"
      aria-label={`${label} · mở phiếu điều chuyển`}
      data-preview-ignore
    >
      {chip}
    </Link>
  ) : (
    chip
  )
}
