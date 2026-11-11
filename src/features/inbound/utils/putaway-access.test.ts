import { describe, expect, it } from 'vitest'
import { getPutawayExecutionLockReason } from './putaway-access'

const base = {
  assignedTo: 'u-2',
  assignedToName: 'Nguyễn Văn B',
  currentUserId: 'u-1',
  isPlanning: false,
}

describe('getPutawayExecutionLockReason', () => {
  it('locks the form when the task is assigned to someone else', () => {
    expect(getPutawayExecutionLockReason(base)).toBe(
      'Nhiệm vụ cất hàng này đang giao cho Nguyễn Văn B. Chỉ người được giao mới ghi nhận cất hàng.'
    )
  })

  it('falls back to a generic name when the assignee name is missing', () => {
    expect(getPutawayExecutionLockReason({ ...base, assignedToName: ' ' })).toContain(
      'nhân viên khác'
    )
  })

  it.each([
    ['the assignee', { currentUserId: 'u-2' }],
    ['an unassigned task', { assignedTo: null }],
    ['planning mode', { isPlanning: true }],
  ])('does not lock for %s', (_, patch) => {
    expect(getPutawayExecutionLockReason({ ...base, ...patch })).toBeNull()
  })
})
