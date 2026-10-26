import type { ReactNode } from 'react'
import { CircleCheck, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferPutAwaySheet } from '../../types/transfer-receipt.types'

export function TransferPutAwayStatus({
  sheet,
  remaining,
  canResume,
  children,
}: {
  readonly sheet: TransferPutAwaySheet
  readonly remaining: number
  readonly canResume: boolean
  readonly children?: ReactNode
}) {
  const { receipt } = sheet
  const unmovable = sheet.rows.some((row) => (row.keptAtReceivingQuantity ?? 0) > 0)
  const completed =
    (receipt.status === 'Received' || receipt.status === 'ReceivedWithDiscrepancy') &&
    remaining <= 0 &&
    !unmovable
  let title = `Còn cần cất: ${formatQuantity(remaining)}`
  let description = ''
  if (receipt.status === 'Cancelled') {
    title = 'Đợt đã hủy'
    description = 'Lịch sử cất hàng được giữ nguyên.'
  } else if (receipt.status === 'InTransit' || receipt.status === 'Receiving') {
    title = 'Chưa đến bước cất hàng'
    description = 'Nộp phiếu kiểm nhận trước khi cất hàng.'
  } else if (completed) {
    title = 'Đã hoàn tất cất hàng'
    description = 'Xem vị trí đã cất trong lịch sử bên dưới.'
  } else if (receipt.keptAtReceiving) {
    title =
      remaining > 0
        ? `Có thể cất từ khu nhận: ${formatQuantity(remaining)}`
        : 'Không còn hàng khả dụng để cất'
    description =
      remaining <= 0
        ? 'Hàng có thể đã được lấy hoặc giữ cho công việc khác.'
        : receipt.status === 'AwaitingPutAway'
          ? ''
          : canResume
            ? 'Tiếp tục nhiệm vụ để đưa hàng vào kệ.'
            : 'Liên hệ người được giao cất hoặc quản lý kho để tiếp tục.'
  } else if (remaining <= 0 && receipt.status === 'AwaitingPutAway') {
    title = 'Đã cất đủ hàng'
    description = 'Bấm Hoàn tất cất hàng để kết thúc nhiệm vụ.'
  }
  return (
    <Alert role="status">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 self-center">
          <AlertTitle className="flex items-center gap-2">
            {completed && (
              <CircleCheck className="text-primary size-5 shrink-0" aria-hidden="true" />
            )}
            {title}
          </AlertTitle>
          {description && <AlertDescription className="mt-1">{description}</AlertDescription>}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 shrink-0 touch-manipulation"
              aria-label="Thông tin về tồn kho khi cất hàng"
            >
              <Info aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={4}
            aria-label="Cách ghi nhận tồn khi cất hàng"
            className="max-w-[calc(100vw-2rem)] text-sm motion-reduce:animate-none"
          >
            <p>
              {receipt.receiptFlowVersion === 2
                ? 'Hàng đã được ghi nhận vào tồn. Cất chỉ chuyển hàng đạt sang vị trí lưu trữ, không tăng tồn lần nữa.'
                : 'Theo luồng cũ, bước cất ghi tăng tồn kho nhận.'}
            </p>
            <p className="text-muted-foreground mt-2">
              Chỉ cất phần còn khả dụng. Hàng hỏng được giữ cách biệt.
            </p>
          </PopoverContent>
        </Popover>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </Alert>
  )
}
