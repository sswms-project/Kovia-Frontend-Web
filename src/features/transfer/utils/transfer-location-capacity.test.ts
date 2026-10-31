import { expect, it } from 'vitest'
import { describeTransferLocationCapacity } from './transfer-location-capacity'

it('formats actual occupancy and capacity in one configured unit', () => {
  expect(describeTransferLocationCapacity({ occupied: 12, capacity: 50, unitName: 'Thùng' })).toBe(
    'Đang chứa 12 / 50 Thùng'
  )
  expect(
    describeTransferLocationCapacity({ occupied: 1.5, capacity: 50, unitName: 'Thùng' })
  ).toContain('1,5 / 50')
})
it('distinguishes unknown from a genuinely empty location', () => {
  expect(describeTransferLocationCapacity()).toBe('Chưa xác định sức chứa')
  expect(describeTransferLocationCapacity({ occupied: 0, capacity: 50, unitName: 'Thùng' })).toBe(
    'Đang chứa 0 / 50 Thùng'
  )
  expect(describeTransferLocationCapacity({ occupied: NaN, capacity: 50, unitName: 'Thùng' })).toBe(
    'Chưa xác định sức chứa'
  )
})
