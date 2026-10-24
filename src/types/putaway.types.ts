export const PUTAWAY_DEVIATION_REASONS = [
  'SlotFull',
  'SlotBlocked',
  'LabelMismatch',
  'Consolidation',
  'Other',
] as const
export type PutawayDeviationReason = (typeof PUTAWAY_DEVIATION_REASONS)[number]
/** Nhóm lý do được phép khi không quét được mã vị trí (nhãn hỏng/mất hoặc lý do khác kèm ghi chú). */
export const UNREADABLE_SLOT_REASONS = [
  'LabelMismatch',
  'Other',
] as const satisfies readonly PutawayDeviationReason[]
export const PUTAWAY_REASON_OPTIONS = [
  { code: 'SlotFull', label: 'Vị trí đã đầy' },
  { code: 'SlotBlocked', label: 'Vị trí hỏng hoặc bị chắn' },
  { code: 'LabelMismatch', label: 'Sai nhãn hoặc không tìm thấy vị trí' },
  { code: 'Consolidation', label: 'Gom cùng sản phẩm hoặc cùng lô' },
  { code: 'Other', label: 'Lý do khác' },
] as const

export interface PutawaySlotSuggestion {
  slotId: string
  slotCode: string
  rackCode?: string | null
  zoneName: string | null
  source?: 'Ai' | 'Rules'
  reason: string
  warnings: string[]
  suggestedQuantity: number
  availableQuantity: number | null
}
export interface PutawayItemSuggestions {
  itemId: string
  suggestions: PutawaySlotSuggestion[]
  unallocatedQuantity: number
}
export interface PutawaySuggestions {
  items: PutawayItemSuggestions[]
  isAiAssisted: boolean
  aiNotice?: string | null
  summary?: string | null
  risks: string[]
}
export interface PutawayProductLabel {
  id: string
  productSKU: string
  productName: string
  baseUnitName: string | null
}
