import type { CycleCountMethod } from '../../types/cycle-count.types'

export type CycleCountDialog = 'start' | 'recount' | 'adjustment' | 'cancel'
export type CycleCountItemFilter = 'all' | 'uncounted' | 'counted' | 'variance'

export interface CycleCountRecordEntry {
  readonly itemId: string
  readonly quantity: number
  readonly damagedQuantity: number | null
  readonly note: string | null
  readonly countMethod: CycleCountMethod
  readonly scannedBarcode: string | null
}
