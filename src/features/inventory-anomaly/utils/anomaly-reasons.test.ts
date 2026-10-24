import { describe, expect, it } from 'vitest'
import { formatAnomalyReason } from './anomaly-reasons'

const anomaly = {
  movementType: 'Pick',
  unitName: 'cái',
  // 19:14 UTC = 02:14 Chủ nhật giờ Việt Nam
  occurredAt: '2026-10-17T19:14:00Z',
  performedByName: 'Nguyễn Văn A',
}

describe('formatAnomalyReason', () => {
  it('explains a quantity deviation as a multiple of the usual quantity', () => {
    expect(formatAnomalyReason({ code: 'QTY_DEVIATION', value: 480, baseline: 12 }, anomaly)).toBe(
      'Số lượng 480 cái, gấp 40 lần mức thường gặp (≈ 12 cái) của sản phẩm này với loại lấy hàng.'
    )
  })

  it('shows the local business time and how rare that hour is', () => {
    const text = formatAnomalyReason({ code: 'UNUSUAL_HOUR', value: 2, baseline: 0.0004 }, anomaly)

    expect(text).toContain('02:14')
    expect(text).toMatch(/chủ nhật/i)
    expect(text).toContain('0,04%')
  })

  it.each([
    [
      'SHARE_OF_STOCK',
      0.95,
      0.2,
      'Lấy 95% tồn của vị trí trong một lần, trong khi thường chỉ khoảng 20%.',
    ],
    [
      'RARE_TYPE_FOR_PRODUCT',
      0,
      0.08,
      'Lần đầu sản phẩm có giao dịch lấy hàng trong 90 ngày, dù loại này chiếm 8% giao dịch của kho.',
    ],
    [
      'UNFAMILIAR_USER',
      0,
      54,
      'Nguyễn Văn A chưa từng lấy hàng sản phẩm này trong 54 lần trước đó của kho.',
    ],
    [
      'BURST',
      11,
      1.3,
      '11 giao dịch lấy hàng cùng người, cùng sản phẩm trong một ngày (thường ≈ 1,3).',
    ],
    [
      'IRREGULAR_GAP',
      21.5,
      1.2,
      'Sản phẩm không có biến động trong 21,5 ngày trước đó (thường ≈ 1,2 ngày).',
    ],
    ['NEGATIVE_ADJUSTMENT', -300, null, 'Điều chỉnh giảm 300 cái.'],
    ['CORRECTION', -5, null, 'Đây là giao dịch sửa sai một biến động trước đó.'],
  ])('explains %s with its numbers', (code, value, baseline, expected) => {
    expect(formatAnomalyReason({ code, value, baseline }, anomaly)).toBe(expected)
  })

  it('never breaks on a reason code it does not know', () => {
    expect(formatAnomalyReason({ code: 'SOMETHING_NEW', value: 1, baseline: null }, anomaly)).toBe(
      'Mô hình ghi nhận đặc điểm khác thường so với lịch sử của kho.'
    )
  })
})
