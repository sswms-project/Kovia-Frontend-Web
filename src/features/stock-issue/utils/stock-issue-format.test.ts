import { describe, expect, it } from 'vitest'
import { isPickAssignedToUser } from './stock-issue-format'

describe('isPickAssignedToUser', () => {
  it('cho phép khi phiếu chưa giao cho ai', () => {
    expect(isPickAssignedToUser({ assignedStaffId: null }, 'u1')).toBe(true)
  })

  it('cho phép người được giao', () => {
    expect(isPickAssignedToUser({ assignedStaffId: 'u1' }, 'u1')).toBe(true)
  })

  it('chặn người không được giao hoặc chưa xác định được người dùng', () => {
    expect(isPickAssignedToUser({ assignedStaffId: 'u1' }, 'u2')).toBe(false)
    expect(isPickAssignedToUser({ assignedStaffId: 'u1' }, null)).toBe(false)
  })
})
