import type {
  WarehouseLayoutDecorationType,
  WarehouseLayoutEditorScene,
  WarehouseLayoutRackShape,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'

export interface DesignerToolboxProps {
  readonly scene: WarehouseLayoutEditorScene
  readonly selection: WarehouseLayoutSelection | null
  readonly canConfigure: boolean
  readonly mode?: 'designer' | 'viewer'
  readonly onCreateZone: () => void
  readonly onCreateRack: (shape?: WarehouseLayoutRackShape) => void
  readonly onCreateDecoration: (type: WarehouseLayoutDecorationType, label: string) => void
  readonly onSelect: (selection: WarehouseLayoutSelection) => void
  readonly onSelectUnplaced?: (selection: WarehouseLayoutSelection) => void
}

export type OutlineIdUpdater = (id: string, open: boolean) => void
