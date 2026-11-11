import { describe, expect, it } from 'vitest'
import type { StaffResponse } from '@/features/staff/types/staff.types'
import { buildStockIssuePickerOptions } from './stock-issue-picker-options'

const staff = (overrides: Partial<StaffResponse>): StaffResponse => ({
  id: 'staff-1',
  fullName: 'Nguyễn Văn A',
  email: 'a@example.test',
  phone: null,
  role: 'WarehouseStaff',
  status: 'Active',
  lastLoginAt: null,
  assignedWarehouseIds: ['wh-1'],
  ...overrides,
})

describe('stock issue picker options', () => {
  it('lists active staff assigned to the warehouse', () => {
    expect(buildStockIssuePickerOptions([staff({})], 'wh-1')).toEqual([
      { id: 'staff-1', name: 'Nguyễn Văn A', fullName: 'Nguyễn Văn A', email: 'a@example.test' },
    ])
  })

  it('skips inactive staff and staff of another warehouse', () => {
    const options = buildStockIssuePickerOptions(
      [
        staff({ id: 'inactive', status: 'Inactive' }),
        staff({ id: 'other', assignedWarehouseIds: ['wh-2'] }),
        staff({ id: 'ok' }),
      ],
      'wh-1'
    )

    expect(options.map((option) => option.id)).toEqual(['ok'])
  })

  it('keeps each person once', () => {
    expect(buildStockIssuePickerOptions([staff({}), staff({})], 'wh-1')).toHaveLength(1)
  })

  it('returns nothing until a warehouse is known', () => {
    expect(buildStockIssuePickerOptions([staff({})], null)).toEqual([])
  })
})
