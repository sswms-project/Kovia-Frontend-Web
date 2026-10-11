import { History } from 'lucide-react'
import { LifecycleTimeline } from '@/components/operations/LifecycleTimeline'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { LifecycleEvent } from '@/features/inbound-request/types/inbound-request.types'

const RECEIPT_ACTION_LABELS: Readonly<Record<string, string>> = {
  Approve: 'Phê duyệt phiếu nhận hàng',
  ApproveInspection: 'Duyệt kết quả kiểm hàng',
  SelfApproveInspection: 'Tự duyệt kết quả kiểm hàng',
  RejectInspection: 'Yêu cầu kiểm hàng lại',
  ReturnInspectionForCorrection: 'Trả kết quả kiểm hàng để chỉnh sửa',
  ResubmitInspection: 'Gửi lại kết quả kiểm hàng',
  SelfRejectInspection: 'Tự yêu cầu kiểm hàng lại',
  CorrectInspectionClassification: 'Điều chỉnh phân loại hàng đạt và hàng hỏng',
  CreatePutAwayTask: 'Tạo nhiệm vụ cất hàng',
  ConfirmPhysicalArrival: 'Xác nhận hàng đến',
  SelfConfirmPhysicalArrival: 'Tự xác nhận hàng đến',
  AssignPutAwayTask: 'Phân công nhiệm vụ cất hàng',
  SavePutAwayPlan: 'Cấu hình vị trí cất hàng',
  CancelPutAwayRemaining: 'Hủy phần cất hàng còn lại',
  CompletePutAwayCancellationReconciliation: 'Hoàn tất đối soát hủy cất hàng',
  Create: 'Tạo phiếu nhận hàng',
  PauseForPutAwayReconciliation: 'Tạm dừng để đối soát cất hàng',
  PauseWarehouseTask: 'Tạm dừng nhiệm vụ cất hàng',
  PutAway: 'Cất hàng',
  ReassignPutAwayTask: 'Phân công lại nhiệm vụ cất hàng',
  Reject: 'Trả phiếu nhận hàng để chỉnh sửa',
  ReturnWarehouseTask: 'Trả nhiệm vụ cất hàng về hàng đợi',
  StartWarehouseTask: 'Bắt đầu nhiệm vụ cất hàng',
  Submit: 'Gửi phiếu nhận hàng duyệt',
  Update: 'Cập nhật phiếu nhận hàng',
}

interface ReceiptHistorySheetProps {
  readonly events: readonly LifecycleEvent[]
  readonly receiptCode: string
}

export function ReceiptHistorySheet({ events, receiptCode }: ReceiptHistorySheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label="Xem lịch sử xử lý">
          <History aria-hidden="true" />
          Lịch sử
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[460px]">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Lịch sử xử lý</SheetTitle>
          <p className="text-muted-foreground text-xs">{receiptCode}</p>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <LifecycleTimeline events={events} actionLabels={RECEIPT_ACTION_LABELS} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
