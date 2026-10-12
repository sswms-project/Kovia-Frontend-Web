import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'
import type { TransferPutAwaySlotSuggestion } from '../types/transfer.types'

/** Gợi ý của hệ thống thành lựa chọn có dòng phụ giải thích vì sao nên cất ở đó. */
export function suggestionToOption(suggestion: TransferPutAwaySlotSuggestion): LookupOption {
  const room =
    suggestion.available === null
      ? 'không giới hạn sức chứa'
      : `còn nhận được ${suggestion.available.toLocaleString('vi-VN')}`
  const parts = [`Gợi ý: ${suggestion.reason.replace(/\.$/, '')}`, room, ...suggestion.warnings]
  return { value: suggestion.slotId, label: suggestion.path, description: parts.join(' · ') }
}

/** Gợi ý đứng đầu danh sách, sau đó là các vị trí khác của kho nhập (bỏ trùng). */
export function mergePutAwayOptions(
  suggestions: readonly LookupOption[],
  others: readonly LookupOption[]
): LookupOption[] {
  const suggested = new Set(suggestions.map((option) => option.value))
  return [...suggestions, ...others.filter((option) => !suggested.has(option.value))]
}
