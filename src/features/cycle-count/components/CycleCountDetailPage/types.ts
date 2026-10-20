import type { DamageEvidenceFile } from '../../hooks/use-damage-evidence-upload'
import type { CycleCountItem, CycleCountMethod } from '../../types/cycle-count.types'

export type CycleCountDialog = 'start' | 'recount' | 'adjustment' | 'cancel'
export type CycleCountItemFilter = 'all' | 'uncounted' | 'counted' | 'variance'
// overview: tổng quan phiếu cho người duyệt; lines: trang làm việc với bảng dòng kiểm đếm.
export type CycleCountDetailMode = 'overview' | 'lines'

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

// Dữ liệu đã tính sẵn cho một dòng; danh sách thẻ trên điện thoại chỉ hiển thị, không tự tính lại.
export interface CycleCountItemRowModel {
  readonly item: CycleCountItem
  readonly state: {
    readonly label: string
    readonly variant: 'secondary' | 'destructive' | 'outline'
  }
  readonly recordable: boolean
  readonly selected: boolean
  readonly quantity: string
  readonly quantityInvalid: boolean
  readonly damaged: string
  readonly damagedInvalid: boolean
  readonly hasDamage: boolean
  readonly damageIncomplete: boolean
  readonly note: string
  readonly liveDifference: number | null
  readonly hasVariance: boolean
  readonly recountBlockReason: string | null
}
