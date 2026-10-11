'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

export interface PickerOption {
  readonly id: string
  readonly name: string
}

interface StockIssuePickerAssignmentProps {
  readonly options: readonly PickerOption[]
  readonly currentStaffId: string | null
  readonly isPending: boolean
  readonly onAssign: (staffId: string) => void
}

export function StockIssuePickerAssignment({
  options,
  currentStaffId,
  isPending,
  onAssign,
}: StockIssuePickerAssignmentProps) {
  const [staffId, setStaffId] = useState(currentStaffId ?? '')
  const unchanged = !staffId || staffId === currentStaffId

  return (
    <div className="flex items-center gap-2">
      <NativeSelect
        aria-label="Chọn nhân viên lấy hàng"
        className="min-w-0 flex-1"
        value={staffId}
        disabled={isPending}
        onChange={(event) => setStaffId(event.target.value)}
      >
        <NativeSelectOption value="">Chọn nhân viên…</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.id} value={option.id}>
            {option.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Button
        type="button"
        size="sm"
        disabled={isPending || unchanged}
        onClick={() => onAssign(staffId)}
      >
        {isPending ? 'Đang giao…' : currentStaffId ? 'Đổi người' : 'Giao việc'}
      </Button>
    </div>
  )
}
