'use client'

import { PutawayPlanNotice as SharedNotice } from '@/components/operations/putaway'
import { formatOperationalDateTime } from '@/features/inbound-request/utils/inbound-request-format'
import type { GoodsReceiptDetail } from '../../types/inbound.types'
import { formatPutawayQuantity } from '../../utils/putaway-units'
import { hasPutawayPlan } from '../../utils/putaway-plan'
import type { SlotOption } from './PutawayForm'

export function PutawayPlanNotice({
  receipt,
  slots,
  ...props
}: {
  readonly receipt: GoodsReceiptDetail
  readonly slots: readonly SlotOption[]
  readonly disabled: boolean
  readonly onApplyPlan: () => void
}) {
  const slotById = new Map(slots.map((slot) => [slot.id, slot]))
  return (
    <SharedNotice
      {...props}
      updatedLabel={
        receipt.putAwayPlanUpdatedAt
          ? formatOperationalDateTime(receipt.putAwayPlanUpdatedAt)
          : undefined
      }
      items={receipt.items
        .filter((item) => hasPutawayPlan(item) && item.remainingPutAwayQuantity > 0)
        .map((item) => ({
          id: item.id,
          label: `${item.productSKU} - ${item.productName}${item.lotNumber ? ` · Lô ${item.lotNumber}` : ''}`,
          locations: item.putAwayPlan
            .map((line) => {
              const zone = slotById.get(line.slotId)?.zoneLabel || 'Chưa xác định khu vực'
              const location = line.isSystemDefaultSlot
                ? `Kệ ${line.rackCode}`
                : `Kệ ${line.rackCode} / Vị trí ${line.slotCode}`
              return `${zone} / ${location}: ${formatPutawayQuantity(item, line.quantity)}`
            })
            .join(' · '),
        }))}
    />
  )
}
