import type {
  GoodsReceiptItem,
  PutAwayDeviationReasonCode,
  PutAwayHeldSlot,
  SavePutAwayPlanRequest,
} from '../types/inbound.types'
import type { PutawayFormValues } from '../schemas/inbound.schema'
import { getHeldSlotWarning } from './putaway-plan-draft'
import { getPutawayRemainingInput } from './putaway-units'

export const PUTAWAY_REASON_MIN_LENGTH = 5
export const PUTAWAY_REASON_MAX_LENGTH = 500
export const PUTAWAY_EVIDENCE_MAX_COUNT = 3
export const PUTAWAY_EVIDENCE_MAX_BYTES = 5 * 1024 * 1024
export const PUTAWAY_EVIDENCE_ACCEPT = 'image/jpeg,image/png'

type AllocationLine = PutawayFormValues['lines'][number]

const toCents = (value: number) => Math.round(value * 100)

export function hasPutawayPlan(item: GoodsReceiptItem) {
  return item.putAwayPlan.length > 0
}

export function getPlannedQuantity(item: GoodsReceiptItem, slotId: string) {
  return (
    item.putAwayPlan
      .filter((line) => line.slotId === slotId)
      .reduce((sum, line) => sum + toCents(line.quantity), 0) / 100
  )
}

function remainderInput(item: GoodsReceiptItem, quantity: number) {
  return (
    getPutawayRemainingInput(item, quantity) ?? {
      enteredQuantity: quantity,
      enteredUnitId: item.baseUnitId,
    }
  )
}

/**
 * Điền sẵn phân bổ theo kế hoạch của quản lý: mỗi vị trí đã cấu hình một dòng, phần chưa được
 * cấu hình (nếu có) là một dòng chưa chọn vị trí để nhân viên tự quyết.
 */
export function buildPlannedAllocations(item: GoodsReceiptItem): AllocationLine[] {
  const remaining = toCents(item.remainingPutAwayQuantity)
  if (!hasPutawayPlan(item)) {
    return [
      {
        goodsReceiptItemId: item.id,
        slotId: '',
        ...remainderInput(item, item.remainingPutAwayQuantity),
      },
    ]
  }

  let planned = 0
  const lines: AllocationLine[] = []
  for (const planLine of item.putAwayPlan) {
    const cents = Math.min(toCents(planLine.quantity), remaining - planned)
    if (cents <= 0) continue
    planned += cents
    lines.push({
      goodsReceiptItemId: item.id,
      slotId: planLine.slotId,
      ...remainderInput(item, cents / 100),
    })
  }
  if (remaining - planned > 0) {
    lines.push({
      goodsReceiptItemId: item.id,
      slotId: '',
      ...remainderInput(item, (remaining - planned) / 100),
    })
  }
  return lines
}

export interface PutawayPlanDeviation {
  /** Chỉ số các dòng phân bổ đang khác kế hoạch. */
  readonly offPlanRows: ReadonlySet<number>
  readonly requiresReason: boolean
}

/**
 * Giống quy tắc của Backend: dòng hàng đã có kế hoạch mà số lượng cất vào một vị trí vượt phần được
 * cấu hình cho vị trí đó thì là khác kế hoạch; dòng hàng chưa có kế hoạch thì không bao giờ khác.
 */
export function getPutawayPlanDeviation(
  lines: readonly AllocationLine[],
  baseQuantities: readonly (number | null)[],
  items: readonly GoodsReceiptItem[]
): PutawayPlanDeviation {
  const groups = new Map<
    string,
    { item: GoodsReceiptItem; slotId: string; cents: number; rows: number[] }
  >()
  lines.forEach((line, index) => {
    const item = items.find((candidate) => candidate.id === line.goodsReceiptItemId)
    const baseQuantity = baseQuantities[index]
    if (!item || !hasPutawayPlan(item) || !line.slotId || baseQuantity == null) return
    const key = `${item.id}:${line.slotId}`
    const group = groups.get(key) ?? { item, slotId: line.slotId, cents: 0, rows: [] }
    group.cents += toCents(baseQuantity)
    group.rows.push(index)
    groups.set(key, group)
  })

  const offPlanRows = new Set<number>()
  for (const group of groups.values()) {
    if (group.cents > toCents(getPlannedQuantity(group.item, group.slotId)))
      group.rows.forEach((row) => offPlanRows.add(row))
  }
  return { offPlanRows, requiresReason: offPlanRows.size > 0 }
}

export function isPutawayReasonValid(reason: string | null | undefined) {
  const length = (reason ?? '').trim().length
  return length >= PUTAWAY_REASON_MIN_LENGTH && length <= PUTAWAY_REASON_MAX_LENGTH
}

export function getPutawayEvidenceError(file: File, currentCount: number) {
  if (currentCount >= PUTAWAY_EVIDENCE_MAX_COUNT)
    return `Chỉ được đính kèm tối đa ${PUTAWAY_EVIDENCE_MAX_COUNT} ảnh.`
  if (!['image/jpeg', 'image/png'].includes(file.type)) return 'Chỉ chấp nhận ảnh JPG hoặc PNG.'
  if (file.size > PUTAWAY_EVIDENCE_MAX_BYTES) return 'Mỗi ảnh tối đa 5 MB.'
  return null
}

export const PUTAWAY_REASON_OPTIONS: readonly {
  readonly code: PutAwayDeviationReasonCode
  readonly label: string
}[] = [
  { code: 'SlotFull', label: 'Vị trí đã đầy' },
  { code: 'SlotBlocked', label: 'Vị trí hỏng hoặc bị chắn' },
  { code: 'LabelMismatch', label: 'Sai nhãn hoặc không tìm thấy vị trí' },
  { code: 'Consolidation', label: 'Gom cùng sản phẩm hoặc cùng lô' },
  { code: 'Other', label: 'Lý do khác' },
]

export function getPutawayReasonLabel(code: PutAwayDeviationReasonCode | null | undefined) {
  return PUTAWAY_REASON_OPTIONS.find((option) => option.code === code)?.label ?? null
}

/** Giống Backend: nhóm lý do có sẵn đã đủ; "Lý do khác" hoặc chưa chọn nhóm thì phải mô tả. */
export function isPutawayDeviationReasonValid(
  code: string | null | undefined,
  reason: string | null | undefined
) {
  if (code && code !== 'Other') return (reason ?? '').trim().length <= PUTAWAY_REASON_MAX_LENGTH
  return isPutawayReasonValid(reason)
}

export interface PutawayHeldRows {
  /** Cảnh báo theo chỉ số dòng phân bổ đang chọn vị trí chừa cho sản phẩm khác sắp về. */
  readonly warnings: ReadonlyMap<number, string>
  /** Có dòng dùng vị trí chừa trọn cho sản phẩm khác: chắc chắn cần lý do. */
  readonly requiresReason: boolean
}

export function getPutawayHeldRows(
  lines: readonly AllocationLine[],
  items: readonly GoodsReceiptItem[],
  heldSlots: readonly PutAwayHeldSlot[] | undefined
): PutawayHeldRows {
  const warnings = new Map<number, string>()
  let requiresReason = false
  lines.forEach((line, index) => {
    const item = items.find((candidate) => candidate.id === line.goodsReceiptItemId)
    if (!item || !line.slotId) return
    const warning = getHeldSlotWarning(heldSlots, line.slotId, item.productId)
    if (!warning) return
    warnings.set(index, warning)
    requiresReason ||= (heldSlots ?? []).some(
      (held) =>
        held.slotId === line.slotId &&
        held.productId !== item.productId &&
        held.heldQuantity === null
    )
  })
  return { warnings, requiresReason }
}

export type SlotCodeResolution =
  | { readonly status: 'confirmed'; readonly slotId: string; readonly code: string }
  | { readonly status: 'error'; readonly message: string }

/**
 * Đối chiếu mã vừa quét hoặc nhập với vị trí. Mã không có trong danh sách nhưng đã chọn vị trí thì
 * coi là mã vạch và để Backend đối chiếu, vì giao diện chỉ biết mã vị trí.
 */
export function resolveSlotCode(
  rawCode: string,
  slots: readonly { readonly id: string; readonly code: string }[],
  selectedSlotId: string
): SlotCodeResolution {
  const code = rawCode.trim()
  if (!code) return { status: 'error', message: 'Vui lòng quét hoặc nhập mã vị trí.' }
  const matched = slots.find((slot) => slot.code.toLowerCase() === code.toLowerCase())
  if (matched && selectedSlotId && matched.id !== selectedSlotId)
    return {
      status: 'error',
      message: `Mã ${matched.code} không phải vị trí đang chọn. Kiểm tra lại nơi bạn đang đứng.`,
    }
  if (matched) return { status: 'confirmed', slotId: matched.id, code }
  if (selectedSlotId) return { status: 'confirmed', slotId: selectedSlotId, code }
  return { status: 'error', message: 'Không tìm thấy vị trí có mã này trong kho.' }
}

/**
 * Chuyển các dòng phân bổ trên màn cất hàng thành kế hoạch cất cho quản lý lưu. Dòng chưa chọn vị
 * trí hoặc chưa quy đổi được thì bỏ qua; sản phẩm không còn dòng nào sẽ được xóa kế hoạch.
 */
export function buildPlanRequestFromAllocations(
  lines: readonly AllocationLine[],
  baseQuantities: readonly (number | null)[],
  items: readonly GoodsReceiptItem[],
  expectedVersion: string
): SavePutAwayPlanRequest {
  const plannable = items.filter(
    (item) => item.inboundRequestItemId && item.remainingPutAwayQuantity > 0
  )
  return {
    expectedVersion,
    items: plannable.map((item) => {
      const centsBySlot = new Map<string, number>()
      lines.forEach((line, index) => {
        const baseQuantity = baseQuantities[index]
        if (line.goodsReceiptItemId !== item.id || !line.slotId || baseQuantity == null) return
        centsBySlot.set(line.slotId, (centsBySlot.get(line.slotId) ?? 0) + toCents(baseQuantity))
      })
      return {
        goodsReceiptItemId: item.id,
        slots: Array.from(centsBySlot, ([slotId, cents]) => ({ slotId, quantity: cents / 100 })),
      }
    }),
  }
}

export interface ScannableLine {
  readonly index: number
  readonly slotId: string
  readonly confirmedSlotCode?: string
}

export type ScannedSlotMatch =
  | {
      readonly status: 'confirmed'
      readonly index: number
      readonly code: string
      readonly slotCode: string
    }
  | { readonly status: 'error'; readonly message: string }

/**
 * Tìm dòng phân bổ ứng với mã vị trí vừa quét ở ô quét chung. Mã của vị trí không nằm trong phân
 * bổ nghĩa là người cất đang đứng sai chỗ.
 */
export function matchScannedSlotCode(
  rawCode: string,
  slots: readonly { readonly id: string; readonly code: string }[],
  lines: readonly ScannableLine[]
): ScannedSlotMatch {
  const code = rawCode.trim()
  if (!code) return { status: 'error', message: 'Vui lòng quét hoặc nhập mã vị trí.' }
  const slot = slots.find((candidate) => candidate.code.toLowerCase() === code.toLowerCase())
  if (!slot)
    return {
      status: 'error',
      message: `Không có vị trí nào mang mã ${code} trong kho này.`,
    }
  const matching = lines.filter((line) => line.slotId === slot.id)
  if (matching.length === 0)
    return {
      status: 'error',
      message: `Vị trí ${slot.code} không nằm trong phân bổ của phiếu này. Kiểm tra lại nơi bạn vừa cất hàng.`,
    }
  const pending = matching.find((line) => !line.confirmedSlotCode)
  if (!pending)
    return { status: 'error', message: `Vị trí ${slot.code} đã được quét xác nhận rồi.` }
  return { status: 'confirmed', index: pending.index, code, slotCode: slot.code }
}

/** Dòng bắt buộc quét mã: sản phẩm đã được quản lý giao vị trí. */
export function getRequiredScanRows(
  lines: readonly AllocationLine[],
  items: readonly GoodsReceiptItem[]
) {
  const required: number[] = []
  const missing: number[] = []
  lines.forEach((line, index) => {
    const item = items.find((candidate) => candidate.id === line.goodsReceiptItemId)
    if (!item || !hasPutawayPlan(item) || !line.slotId) return
    required.push(index)
    if (!line.confirmedSlotCode) missing.push(index)
  })
  return { required, missing }
}
