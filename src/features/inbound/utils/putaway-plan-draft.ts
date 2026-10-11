import type {
  GoodsReceiptItem,
  PutAwayHeldSlot,
  PutAwaySlotSuggestion,
  SavePutAwayPlanRequest,
} from '../types/inbound.types'

export interface PlanDraftLine {
  /** Khóa ổn định cho React; không gửi lên Backend. */
  readonly key: string
  readonly slotId: string
  readonly quantity: number
}

export type PlanDrafts = Readonly<Record<string, readonly PlanDraftLine[]>>

interface PlanSlot {
  readonly id: string
  readonly unavailableReason?: string
}

export interface PlanDraftValidation {
  /** Lỗi theo `${itemId}:${key}` của dòng. */
  readonly lineErrors: ReadonlyMap<string, string>
  /** Cảnh báo không chặn lưu, ví dụ vị trí đã đầy. */
  readonly lineWarnings: ReadonlyMap<string, string>
  readonly itemErrors: ReadonlyMap<string, string>
  readonly plannedByItem: ReadonlyMap<string, number>
  readonly canSave: boolean
}

const toCents = (value: number) => Math.round(value * 100)

export function getPlannableItems(items: readonly GoodsReceiptItem[]) {
  return items.filter((item) => item.inboundRequestItemId && item.remainingPutAwayQuantity > 0)
}

export function buildPlanDrafts(items: readonly GoodsReceiptItem[]): PlanDrafts {
  return Object.fromEntries(
    getPlannableItems(items).map((item) => [
      item.id,
      item.putAwayPlan.map((line) => ({
        key: line.id,
        slotId: line.slotId,
        quantity: line.quantity,
      })),
    ])
  )
}

export function validatePlanDrafts(
  items: readonly GoodsReceiptItem[],
  drafts: PlanDrafts,
  slots: readonly PlanSlot[]
): PlanDraftValidation {
  const slotById = new Map(slots.map((slot) => [slot.id, slot]))
  const lineErrors = new Map<string, string>()
  const lineWarnings = new Map<string, string>()
  const itemErrors = new Map<string, string>()
  const plannedByItem = new Map<string, number>()

  for (const item of getPlannableItems(items)) {
    const lines = drafts[item.id] ?? []
    const seen = new Set<string>()
    let planned = 0
    for (const line of lines) {
      const key = `${item.id}:${line.key}`
      const slot = slotById.get(line.slotId)
      if (!line.slotId || !slot) lineErrors.set(key, 'Vui lòng chọn vị trí lưu trữ.')
      else if (seen.has(line.slotId))
        lineErrors.set(key, 'Vị trí này đã được cấu hình cho sản phẩm. Hãy sửa dòng đã có.')
      else if (slot.unavailableReason) lineWarnings.set(key, slot.unavailableReason)
      seen.add(line.slotId)

      if (!Number.isFinite(line.quantity) || line.quantity <= 0)
        lineErrors.set(key, lineErrors.get(key) ?? 'Số lượng phải lớn hơn 0.')
      else if (toCents(line.quantity) / 100 !== line.quantity)
        lineErrors.set(key, lineErrors.get(key) ?? 'Số lượng chỉ có tối đa hai chữ số thập phân.')
      else planned += toCents(line.quantity)
    }
    plannedByItem.set(item.id, planned / 100)
    if (planned > toCents(item.remainingPutAwayQuantity))
      itemErrors.set(
        item.id,
        `Chỉ còn ${item.remainingPutAwayQuantity} ${item.baseUnitName} chưa cất; đang cấu hình ${planned / 100}.`
      )
  }

  return {
    lineErrors,
    lineWarnings,
    itemErrors,
    plannedByItem,
    canSave: lineErrors.size === 0 && itemErrors.size === 0,
  }
}

export function toSavePlanRequest(
  items: readonly GoodsReceiptItem[],
  drafts: PlanDrafts,
  expectedVersion: string
): SavePutAwayPlanRequest {
  return {
    expectedVersion,
    items: getPlannableItems(items).map((item) => ({
      goodsReceiptItemId: item.id,
      slots: (drafts[item.id] ?? []).map((line) => ({
        slotId: line.slotId,
        quantity: line.quantity,
      })),
    })),
  }
}

/**
 * Phân bổ theo gợi ý: mỗi vị trí kèm số lượng đề xuất, cắt bớt để không vượt `limit`.
 * Phản hồi không có số lượng nào thì dồn toàn bộ vào vị trí đầu tiên.
 */
export function getSuggestedQuantities(
  item: GoodsReceiptItem,
  suggestions: readonly PutAwaySlotSuggestion[],
  limit = item.remainingPutAwayQuantity
) {
  const allocated = suggestions.filter((suggestion) => suggestion.suggestedQuantity > 0)
  const source = allocated.length > 0 ? allocated : suggestions.slice(0, 1)
  let left = toCents(limit)
  const quantities: { slotId: string; quantity: number }[] = []
  for (const suggestion of source) {
    const cents = Math.min(
      left,
      allocated.length > 0 ? toCents(suggestion.suggestedQuantity) : left
    )
    if (cents <= 0) break
    quantities.push({ slotId: suggestion.slotId, quantity: cents / 100 })
    left -= cents
  }
  return quantities
}

/** Cảnh báo khi vị trí đang được chừa cho sản phẩm khác sắp về; không chặn người dùng. */
export function getHeldSlotWarning(
  heldSlots: readonly PutAwayHeldSlot[] | undefined,
  slotId: string,
  productId: string
) {
  const held = heldSlots?.find(
    (candidate) => candidate.slotId === slotId && candidate.productId !== productId
  )
  if (!held) return undefined
  const expected = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(
    new Date(held.expectedDate)
  )
  return `Vị trí đang chừa cho ${held.sku} dự kiến về ${expected} (yêu cầu ${held.inboundRequestCode}). Nếu vẫn chọn, hàng sắp về có thể thiếu chỗ.`
}

/** Phần còn phải cất của dòng hàng chưa được cấu hình vị trí nào (đơn vị gốc). */
export function getUnplannedQuantity(item: GoodsReceiptItem, lines: readonly PlanDraftLine[]) {
  const planned = lines.reduce(
    (sum, line) => sum + toCents(Number.isFinite(line.quantity) ? line.quantity : 0),
    0
  )
  return Math.max(0, toCents(item.remainingPutAwayQuantity) - planned) / 100
}
