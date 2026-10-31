'use client'

import { useCrossDock } from '../../hooks/use-cross-dock'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import { CrossDockPanel } from './CrossDockPanel'
import { StockIssueSourceEditor } from './StockIssueSourceEditor'
import type { StockIssueManualSourceDraft } from '../../types/stock-issue.types'

interface Props {
  readonly order: StockIssueRequestSummary
  readonly draft?: StockIssueManualSourceDraft | null
  readonly onDraft?: (value: StockIssueManualSourceDraft | null) => void
}
// This subdomain owns its queries independently of the order's existing manual workflow.
export function CrossDockSection({ order, draft = null, onDraft }: Props) {
  const state = useCrossDock(order)
  const editable = state.canManage && onDraft
  const supported =
    order.canAdjustPickingSources === true &&
    ['Pending', 'ReleasedForPicking', 'Picking'].includes(order.status)
  const seed =
    order.status === 'Pending'
      ? (state.plan.data?.allocations ?? [])
      : order.items.flatMap((item) =>
          item.pickLocations.map((location) => ({
            itemId: item.id,
            inventoryStockId: location.inventoryStockId,
            quantity: location.reservedQuantity,
            sourcePath: `Khu ${location.zoneCode} / Kệ ${location.rackCode}${location.isSystemDefaultSlot || location.slotCode === '__SYSTEM_DEFAULT__' ? '' : ` / ${location.slotCode}`}`,
          }))
        )
  const demand = state.demand.data
  const autoPending = Boolean(
    demand &&
    !demand.completedAt &&
    !demand.revokedAt &&
    new Date(demand.validUntil).getTime() > state.now
  )
  return (
    <CrossDockPanel state={state} manualSelected={Boolean(draft)}>
      {editable && (
        <StockIssueSourceEditor
          order={order}
          seed={seed}
          scope={state.scope}
          draft={draft}
          onDraft={onDraft}
          supported={supported}
          disabled={!supported || !state.writeReady || autoPending || state.mutation.isPending}
        />
      )}
    </CrossDockPanel>
  )
}
