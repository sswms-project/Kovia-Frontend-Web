'use client'

import { PutawayPlanNotice as SharedNotice } from '@/components/operations/putaway'
import { formatOperationalDateTime } from '@/features/inbound-request/utils/inbound-request-format'
import type { GoodsReceiptDetail } from '../../types/inbound.types'
import { formatPutawayQuantity } from '../../utils/putaway-units'
import { hasPutawayPlan } from '../../utils/putaway-plan'

export function PutawayPlanNotice({
  receipt,
  ...props
}: {
  readonly receipt: GoodsReceiptDetail
  readonly disabled: boolean
  readonly onApplyPlan: () => void
}) {
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
            .map(
              (line) =>
                `${line.isSystemDefaultSlot ? `Kệ ${line.rackCode}` : line.slotCode}: ${formatPutawayQuantity(item, line.quantity)}`
            )
            .join(' · '),
        }))}
    />
  )
}
