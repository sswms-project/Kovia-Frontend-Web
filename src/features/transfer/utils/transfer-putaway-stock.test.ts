import { describe, expect, it } from 'vitest'
import { putAwayStockNote } from './transfer-putaway-stock'

describe('putAwayStockNote', () => {
  it('says put-away does not increase stock for receipt flow v2', () => {
    const note = putAwayStockNote(2)
    expect(note).toContain('không tăng tồn')
    expect(note).not.toContain('tồn kho nhận sẽ tăng')
  })

  it.each([0, 1, undefined, null])(
    'keeps the stock-increase note for legacy flow %s',
    (version) => {
      expect(putAwayStockNote(version)).toContain('tăng khi xác nhận cất')
    }
  )
})
