import type { PutawaySuggestions } from '@/types/putaway.types'
import type { TransferItem, TransferPutAwayPlanSuggestions } from '../types/transfer.types'

export interface TransferPlanDraftItem {
  itemId: string
  lines: { slotId: string; plannedTotal: number; path: string }[]
}

/** DB/API lưu tổng; chỉ trường Còn lại trong UI trừ phần đã nhận. */
export function planTotalFromRemaining(received: number, remaining: number) {
  return Number((received + remaining).toPrecision(15))
}

export function buildTransferPlanDraft(items: readonly TransferItem[]): TransferPlanDraftItem[] {
  return items.map((item) => ({
    itemId: item.id,
    lines: transferPlanLocations(item).map((line) => ({
      slotId: line.slotId,
      plannedTotal: Math.max(line.plannedTotal, line.receivedQuantity),
      path: line.path,
    })),
  }))
}

/** Vị trí đã nhận ngoài kế hoạch cũng phải được khóa khi quản lý sửa kế hoạch. */
export function transferPlanLocations(item: TransferItem) {
  const locations = new Map(
    (item.putAwayPlan ?? []).map((line) => [
      line.slotId,
      {
        slotId: line.slotId,
        path: line.path,
        plannedTotal: line.plannedTotal,
        receivedQuantity: line.receivedQuantity,
      },
    ])
  )
  for (const received of item.receivedPutAwayLocations ?? []) {
    const plan = locations.get(received.slotId)
    locations.set(received.slotId, {
      ...received,
      plannedTotal: plan?.plannedTotal ?? received.receivedQuantity,
    })
  }
  return [...locations.values()]
}

/** Không xóa ô đã nhận khi tải lại bản mới; giữ số lượng người dùng đang sửa để họ đối chiếu. */
export function reconcileTransferPlanDraft(
  draft: readonly TransferPlanDraftItem[],
  items: readonly TransferItem[]
) {
  return items.map((item) => {
    const old = draft.find((entry) => entry.itemId === item.id)
    const lines = old ? [...old.lines] : buildTransferPlanDraft([item])[0]!.lines
    for (const plan of transferPlanLocations(item)) {
      if (plan.receivedQuantity > 0 && !lines.some((line) => line.slotId === plan.slotId))
        lines.push({ slotId: plan.slotId, plannedTotal: plan.plannedTotal, path: plan.path })
    }
    return { itemId: item.id, lines }
  })
}

/** Gợi ý chỉ thay nháp phần còn lại, không bao giờ hạ tổng dưới số đã nhận. */
export function applyTransferPlanSuggestions(
  draft: readonly TransferPlanDraftItem[],
  items: readonly TransferItem[],
  suggestions: TransferPutAwayPlanSuggestions,
  only?: { itemId: string; slotId: string }
): TransferPlanDraftItem[] {
  return draft.map((entry) => {
    if (only && entry.itemId !== only.itemId) return entry
    const item = items.find((item) => item.id === entry.itemId)
    const proposal = suggestions.items.find((item) => item.itemId === entry.itemId)
    if (!item || !proposal) return entry
    const received = new Map(
      transferPlanLocations(item).map((line) => [line.slotId, line.receivedQuantity])
    )
    // Dòng còn trống vị trí chỉ là chỗ chờ chọn; không để số lượng của nó chặn việc áp dụng một gợi ý.
    const lines = only
      ? entry.lines.filter((line) => line.slotId).map((line) => ({ ...line }))
      : transferPlanLocations(item)
          .filter((line) => line.receivedQuantity > 0)
          .map((line) => ({
            slotId: line.slotId,
            path: line.path,
            plannedTotal: line.receivedQuantity,
          }))
    let available = Math.max(
      0,
      item.quantity - item.stoppedQuantity - lines.reduce((sum, line) => sum + line.plannedTotal, 0)
    )
    for (const slot of proposal.suggestions) {
      if (only && slot.slotId !== only.slotId) continue
      const existing = lines.find((line) => line.slotId === slot.slotId)
      const previousRemaining = existing
        ? Math.max(0, existing.plannedTotal - (received.get(slot.slotId) ?? 0))
        : 0
      const quantity = Math.min(Math.max(0, slot.suggestedQuantity), available + previousRemaining)
      if (quantity <= 0) continue
      const total = planTotalFromRemaining(received.get(slot.slotId) ?? 0, quantity)
      if (existing) existing.plannedTotal = total
      else lines.push({ slotId: slot.slotId, path: slot.path, plannedTotal: total })
      available = Math.max(0, available + previousRemaining - quantity)
    }
    return { ...entry, lines }
  })
}

export function adaptTransferPutawaySuggestions(
  source: TransferPutAwayPlanSuggestions
): PutawaySuggestions {
  return {
    ...source,
    aiNotice: source.notice,
    items: source.items.map((item) => ({
      ...item,
      suggestions: item.suggestions.map((slot) => ({ ...slot, availableQuantity: slot.available })),
    })),
  }
}
