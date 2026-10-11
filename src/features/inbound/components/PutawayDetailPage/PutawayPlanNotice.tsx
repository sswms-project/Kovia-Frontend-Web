'use client'

import { ClipboardList, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatOperationalDateTime } from '@/features/inbound-request/utils/inbound-request-format'
import type { GoodsReceiptDetail, GoodsReceiptItem } from '../../types/inbound.types'
import { formatPutawayQuantity } from '../../utils/putaway-units'
import { hasPutawayPlan } from '../../utils/putaway-plan'

interface PutawayPlanNoticeProps {
  readonly receipt: GoodsReceiptDetail
  readonly disabled: boolean
  readonly onApplyPlan: () => void
}

function locationLabel(line: GoodsReceiptItem['putAwayPlan'][number]) {
  return line.isSystemDefaultSlot ? `Kệ ${line.rackCode}` : line.slotCode
}

export function PutawayPlanNotice({ receipt, disabled, onApplyPlan }: PutawayPlanNoticeProps) {
  const plannedItems = receipt.items.filter(
    (item) => hasPutawayPlan(item) && item.remainingPutAwayQuantity > 0
  )
  if (plannedItems.length === 0) return null

  return (
    <section
      className="bg-card animate-in fade-in-0 slide-in-from-top-2 animation-duration-250 border motion-reduce:animate-none"
      aria-labelledby="putaway-plan-title"
    >
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center">
            <ClipboardList aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 id="putaway-plan-title" className="text-sm font-semibold">
              Vị trí cất do quản lý cấu hình
            </h2>
            <p className="text-muted-foreground text-xs">
              Hệ thống đã điền sẵn theo kế hoạch. Cất khác vị trí hoặc số lượng vẫn được, nhưng cần
              nhập lý do (có thể kèm ảnh).
              {receipt.putAwayPlanUpdatedAt
                ? ` Cập nhật lúc ${formatOperationalDateTime(receipt.putAwayPlanUpdatedAt)}.`
                : ''}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onApplyPlan}>
          <RotateCcw aria-hidden="true" data-icon="inline-start" />
          Làm theo kế hoạch
        </Button>
      </div>
      <ul className="divide-y">
        {plannedItems.map((item) => (
          <li key={item.id} className="flex flex-col gap-1 px-4 py-2 text-xs sm:flex-row sm:gap-4">
            <span className="min-w-0 font-medium break-words sm:w-1/3">
              {item.productSKU} - {item.productName}
              {item.lotNumber ? ` · Lô ${item.lotNumber}` : ''}
            </span>
            <span className="text-muted-foreground min-w-0 break-words tabular-nums">
              {item.putAwayPlan
                .map(
                  (line) => `${locationLabel(line)}: ${formatPutawayQuantity(item, line.quantity)}`
                )
                .join(' · ')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
