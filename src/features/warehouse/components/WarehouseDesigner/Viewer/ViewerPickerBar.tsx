import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { WarehouseLayoutSelection } from '../../../types/warehouse-layout-scene.types'
import type { WarehouseLayoutPicker } from './types'

export function ViewerPickerBar({
  picker,
  summary,
  canConfirm,
  selection,
  onClose,
}: {
  readonly picker: WarehouseLayoutPicker
  readonly summary: ReactNode
  readonly canConfirm: boolean
  readonly selection: WarehouseLayoutSelection | null
  readonly onClose: () => void
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
      <div className="min-w-0 text-sm">{summary}</div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onClose}>
          Hủy
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={!canConfirm || !selection}
          onClick={() => selection && picker.onConfirm(selection)}
        >
          Chọn
        </Button>
      </div>
    </div>
  )
}
