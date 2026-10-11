import type { UseFormReturn } from 'react-hook-form'
import type { InventoryStock } from '@/features/inventory/types/inventory.types'
import type { CreateCycleCountFormValues } from '../../schemas/cycle-count.schema'

export interface SelectOption {
  readonly value: string
  readonly label: string
}

export type CycleCountFormApi = UseFormReturn<CreateCycleCountFormValues>
export type CycleCountItemInput = CreateCycleCountFormValues['items'][number]
export type SubmitMode = 'save' | 'saveAndAdd'
// Khóa phạm vi → dòng tồn, để vẫn hiển thị được các dòng đã chọn ở trang khác.
export type StockSelection = Readonly<Record<string, InventoryStock>>
