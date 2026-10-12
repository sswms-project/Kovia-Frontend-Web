import type { DamageEvidenceFile } from '../../hooks/use-damage-evidence-upload'
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
  readonly damageReason: string | null
  readonly damageEvidenceIds: readonly string[]
}

export interface CycleCountDamageDraft {
  readonly reason: string
  readonly evidence: readonly DamageEvidenceFile[]
}

// Trang sở hữu các lệnh gọi API; component chỉ nhận callback.
export interface CycleCountEvidenceActions {
  readonly onUpload: (file: File) => Promise<DamageEvidenceFile | null>
  readonly onDownload: (id: string, fileName: string) => void
}
