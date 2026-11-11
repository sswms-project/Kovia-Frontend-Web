import type {
  GoodsReturnLineSuggestion,
  GoodsReturnSlotSuggestion,
} from '../types/stock-issue.types'
import { formatStockIssueQuantity } from './stock-issue-format'

export function formatSlotSuggestionLabel(suggestion: GoodsReturnSlotSuggestion): string {
  const room =
    suggestion.availableQuantity === null ? '' : ` · còn nhận ${suggestion.availableQuantity}`
  return `${suggestion.isOriginalSlot ? '★ ' : ''}${suggestion.path}${room}`
}

/** Lời giải thích dưới ô chọn vị trí: vì sao vị trí đang chọn được đề xuất, hoặc vì sao chưa có đề xuất. */
export function describeSlotSuggestion(
  line: GoodsReturnLineSuggestion | undefined,
  selectedSlotId: string
): string {
  if (!line) return ''
  if (line.condition === 'Scrap') return 'Hàng hủy bỏ không nhập lại kho.'
  const selected = line.suggestions.find((suggestion) => suggestion.slotId === selectedSlotId)
  if (selected) {
    const warnings = selected.warnings.length > 0 ? ` Lưu ý: ${selected.warnings.join('; ')}.` : ''
    return `Đề xuất: ${selected.reason}${warnings}`
  }
  if (line.suggestions.length === 0)
    return 'Chưa có vị trí nào đủ điều kiện nhận hàng này, hãy chọn vị trí khác.'
  return 'Vị trí đang chọn không nằm trong đề xuất; hệ thống sẽ kiểm tra lại khi tạo yêu cầu.'
}

/** Dòng nguồn của một dòng trả hàng: lô, vị trí đã lấy và số lượng đã xuất từ lần lấy đó. */
export function describeReturnLineSource(line: {
  readonly sku?: string | null
  readonly lotNumber: string | null
  readonly sourceSlotCode?: string | null
  readonly issuedQuantity?: number | null
}): string {
  return [
    line.sku,
    line.lotNumber ? `Lô ${line.lotNumber}` : 'Không theo lô',
    line.sourceSlotCode ? `Lấy tại ${line.sourceSlotCode}` : null,
    line.issuedQuantity == null ? null : `Đã xuất ${formatStockIssueQuantity(line.issuedQuantity)}`,
  ]
    .filter(Boolean)
    .join(' · ')
}
