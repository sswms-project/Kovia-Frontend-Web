import type { StaffResponse } from '@/features/staff/types/staff.types'

export interface StockIssuePickerOption {
  readonly id: string
  readonly name: string
  readonly fullName: string
  readonly email: string
}

// Callers pass the warehouse-staff directory only: the backend rejects managers as pickers.
export function buildStockIssuePickerOptions(
  staffDirectory: readonly StaffResponse[],
  warehouseId: string | null | undefined
): StockIssuePickerOption[] {
  if (!warehouseId) return []
  const seen = new Set<string>()
  return staffDirectory
    .filter((staff) => {
      if (staff.status !== 'Active' || !staff.assignedWarehouseIds.includes(warehouseId))
        return false
      if (seen.has(staff.id)) return false
      seen.add(staff.id)
      return true
    })
    .map((staff) => ({
      id: staff.id,
      name: staff.fullName,
      fullName: staff.fullName,
      email: staff.email,
    }))
}
