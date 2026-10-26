import type { ReactNode } from 'react'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'
import type { LayoutViewerInventoryState } from '../../../types/warehouse-layout-viewer.types'

/** Dùng sơ đồ kho để chọn một vị trí cho màn khác: thêm thanh xác nhận và gợi ý các ô nên chọn. */
export interface WarehouseLayoutPicker {
  readonly description: string
  readonly quickPicksTitle?: string
  readonly quickPicks?: readonly { readonly slotId: string; readonly label: string }[]
  /** Nội dung tóm tắt ô đang chọn và việc có bấm Chọn được hay không. */
  readonly evaluate: (selection: WarehouseLayoutSelection | null) => {
    readonly summary: ReactNode
    readonly canConfirm: boolean
  }
  readonly onConfirm: (selection: WarehouseLayoutSelection) => void
}

export interface WarehouseLayoutViewerWorkspaceProps {
  readonly warehouseId: string
  readonly warehouseName: string
  readonly title?: string
  readonly picker?: WarehouseLayoutPicker
  readonly inventoryState: LayoutViewerInventoryState
  readonly scene: WarehouseLayoutEditorScene
  readonly canConfigure: boolean
  readonly isClosing: boolean
  readonly onClose: () => void
  readonly onEdit?: () => void
}
