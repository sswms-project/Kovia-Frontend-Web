import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function TransferReceiptHelp({
  receiptFlowVersion,
}: {
  readonly receiptFlowVersion?: number
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2">
      <h2 className="text-sm font-medium">Kiểm hàng trước khi cất</h2>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 touch-manipulation"
            aria-label="Hướng dẫn kiểm hàng trước khi cất"
          >
            <Info aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          aria-label="Hướng dẫn kiểm hàng"
          className="max-w-[calc(100vw-2rem)] text-sm motion-reduce:animate-none"
        >
          <p>Tốt, hỏng và thiếu phải khớp số đã xuất.</p>
          <p className="text-muted-foreground mt-2">
            {receiptFlowVersion === 1
              ? 'Đợt theo luồng cũ: nộp kiểm đếm chưa ghi tồn, cất là bước nhận tồn.'
              : 'Thực nhận được ghi tồn một lần tại điểm nhận. Hàng đạt có thể giữ tại khu nhận hoặc tiếp tục cất; hàng hỏng phải đặt riêng và được cách biệt.'}
          </p>
        </PopoverContent>
      </Popover>
    </div>
  )
}
