import { describe, expect, it } from 'vitest'
import type {
  GoodsReturnLineSuggestion,
  GoodsReturnSlotSuggestion,
} from '../types/stock-issue.types'
import { describeSlotSuggestion, formatSlotSuggestionLabel } from './goods-return-suggestion'

const suggestion = (
  overrides: Partial<GoodsReturnSlotSuggestion> = {}
): GoodsReturnSlotSuggestion => ({
  slotId: 'slot-a',
  slotCode: 'A-01',
  path: 'Khu A / Kệ 1 / A-01',
  suggestedQuantity: 5,
  availableQuantity: 12,
  isOriginalSlot: true,
  reason: 'Vị trí lấy hàng cũ.',
  warnings: [],
  ...overrides,
})

const line = (
  suggestions: GoodsReturnSlotSuggestion[],
  condition: GoodsReturnLineSuggestion['condition'] = 'Good'
): GoodsReturnLineSuggestion => ({
  stockIssuePickDetailId: 'detail-1',
  condition,
  suggestions,
  unallocatedQuantity: 0,
})

describe('goods return suggestion text', () => {
  it('marks the original slot and shows the remaining room', () => {
    expect(formatSlotSuggestionLabel(suggestion())).toBe('★ Khu A / Kệ 1 / A-01 · còn nhận 12')
    expect(
      formatSlotSuggestionLabel(suggestion({ isOriginalSlot: false, availableQuantity: null }))
    ).toBe('Khu A / Kệ 1 / A-01')
  })

  it('explains the selected suggestion with its warnings', () => {
    expect(describeSlotSuggestion(line([suggestion()]), 'slot-a')).toBe(
      'Đề xuất: Vị trí lấy hàng cũ.'
    )
    expect(
      describeSlotSuggestion(
        line([suggestion({ warnings: ['Đang chứa sản phẩm khác'] })]),
        'slot-a'
      )
    ).toContain('Lưu ý: Đang chứa sản phẩm khác.')
  })

  it('tells the user when nothing fits or the pick is outside the suggestions', () => {
    expect(describeSlotSuggestion(line([]), '')).toContain('Chưa có vị trí nào')
    expect(describeSlotSuggestion(line([suggestion()]), 'other')).toContain(
      'không nằm trong đề xuất'
    )
    expect(describeSlotSuggestion(line([], 'Scrap'), '')).toBe('Hàng hủy bỏ không nhập lại kho.')
    expect(describeSlotSuggestion(undefined, '')).toBe('')
  })
})
