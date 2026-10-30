import { describe, expect, it } from 'vitest'
import { buildAlertSpeech, hasUrgentAlerts } from './alert-speech'

describe('buildAlertSpeech', () => {
  it('đọc các nhóm có số lượng và bỏ nhóm bằng 0', () => {
    expect(buildAlertSpeech({ belowMinimum: 3, expiring: 0 }, 'Hà Nội')).toBe(
      'Cảnh báo tồn kho kho Hà Nội. 3 mặt hàng dưới mức tối thiểu. Vui lòng kiểm tra.'
    )
    expect(buildAlertSpeech({ belowMinimum: 3, expiring: 2, expired: 1 }, 'Hà Nội')).toBe(
      'Cảnh báo tồn kho kho Hà Nội. 3 mặt hàng dưới mức tối thiểu. 2 mặt hàng sắp hết hạn. 1 mặt hàng đã quá hạn. Vui lòng kiểm tra.'
    )
  })

  it('đọc tên mặt hàng, tối đa 5 tên rồi gộp phần còn lại', () => {
    expect(
      buildAlertSpeech({ belowMinimum: 2, expiring: 0, belowMinimumNames: ['Sữa', 'Gạo'] }, 'Kho A')
    ).toBe(
      'Cảnh báo tồn kho kho Kho A. 2 mặt hàng dưới mức tối thiểu: Sữa, Gạo. Vui lòng kiểm tra.'
    )
    expect(
      buildAlertSpeech({
        belowMinimum: 8,
        expiring: 0,
        belowMinimumNames: ['a', 'b', 'c', 'd', 'e', 'f'],
      })
    ).toBe(
      'Cảnh báo tồn kho. 8 mặt hàng dưới mức tối thiểu: a, b, c, d, e và 3 mặt hàng khác. Vui lòng kiểm tra.'
    )
  })

  it('báo không có cảnh báo khi tất cả bằng 0', () => {
    expect(buildAlertSpeech({ belowMinimum: 0, expiring: 0 })).toBe('Không có cảnh báo tồn kho')
  })

  it('chỉ coi dưới tối thiểu hoặc quá hạn là khẩn cấp', () => {
    expect(hasUrgentAlerts({ belowMinimum: 0, expiring: 5 })).toBe(false)
    expect(hasUrgentAlerts({ belowMinimum: 1, expiring: 0 })).toBe(true)
    expect(hasUrgentAlerts({ belowMinimum: 0, expiring: 0, expired: 2 })).toBe(true)
  })
})
