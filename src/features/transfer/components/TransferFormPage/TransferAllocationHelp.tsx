import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function TransferAllocationHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="min-h-11 min-w-11"
          aria-label="Cách phân bổ vị trí lấy hàng"
        >
          <Info aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-w-[calc(100vw-2rem)] motion-reduce:animate-none">
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">Hệ thống phân bổ như thế nào?</p>
          <p>FEFO: lấy lô hết hạn trước. Không có hạn dùng: lấy lô nhập trước (FIFO).</p>
          <p>Không chọn vị trí đi: hệ thống tự phân bổ khi gửi yêu cầu.</p>
          <p>Chọn vị trí đi: lấy tại đó trước, phần thiếu mới phân bổ theo FEFO/FIFO.</p>
          <p>Người ở kho xuất có thể điều chỉnh phân bổ tại trang chi tiết.</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
