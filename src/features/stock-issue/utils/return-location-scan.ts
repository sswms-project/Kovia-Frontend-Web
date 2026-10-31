import type { GoodsReturnSlotSuggestion } from '../types/stock-issue.types'

export function matchesReturnLocationCode(
  code: string,
  slot: GoodsReturnSlotSuggestion | undefined
): boolean {
  const normalized = code.trim().toLowerCase()
  if (!slot || !normalized || normalized.length > 100 || normalized === '__system_default__')
    return false
  const codes = slot.scanCodes ?? [`KOVIA:LOC:SLOT:${slot.slotId}`, slot.slotCode]
  return codes.some((candidate) => candidate.trim().toLowerCase() === normalized)
}
