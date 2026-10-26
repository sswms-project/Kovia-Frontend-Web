import type {
  WarehouseLayoutCanvas,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'
import type { RackOperation } from '../../../utils/layout-rack-operations'

export interface DesignerToolbarProps {
  readonly title: string
  readonly canvas: WarehouseLayoutCanvas
  readonly isGridVisible: boolean
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly isReadOnly: boolean
  readonly onUndo: () => void
  readonly onRedo: () => void
  readonly onToggleGrid: () => void
  readonly onCanvasChange: (canvas: WarehouseLayoutCanvas) => void
  readonly onClose: () => void
}

export interface DesignerFooterProps {
  readonly zoomPercent: number
  readonly canSave: boolean
  readonly isSaving: boolean
  readonly isReadOnly: boolean
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
  readonly onZoomTo: (zoomPercent: number) => void
  readonly onFit: () => void
  readonly onCancel: () => void
  readonly onSave: () => void
}

export interface ToolbarIconButtonProps {
  readonly label: string
  readonly disabled?: boolean
  readonly pressed?: boolean
  readonly onClick: () => void
  readonly children: React.ReactNode
}

export interface DesignerContextToolbarProps {
  readonly selection: WarehouseLayoutSelection
  readonly color: string | null
  readonly canConfigure: boolean
  readonly canCreateRack: boolean
  readonly canDuplicate: boolean
  readonly canRemove: boolean
  readonly removeDisabled?: boolean
  readonly removeDisabledReason?: string
  readonly removeLabel: string
  readonly onOpenDetails: () => void
  readonly onPlacePending?: () => void
  readonly onCreateRack: () => void
  readonly onColorChange: (color: string | null) => void
  readonly onRotate: () => void
  readonly onDuplicate: () => void
  readonly onRemove: () => void
}

export interface DesignerRackToolsProps {
  readonly count: number
  readonly referenceCode?: string
  readonly snapObjects: boolean
  readonly disabled: boolean
  readonly canArrange: (operation: RackOperation) => boolean
  readonly onToggleSnap: () => void
  readonly onArrange: (operation: RackOperation) => void
  readonly onFit: () => void
  readonly onClear: () => void
}
