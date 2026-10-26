import type {
  WarehouseLayoutEditorDecoration,
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'

export interface DesignerInspectorProps {
  readonly scene: WarehouseLayoutEditorScene
  readonly selection: WarehouseLayoutSelection
  readonly canConfigure: boolean
  readonly isUpdatingRack: boolean
  readonly isDeactivatingRack: boolean
  readonly onRackNameChange: (rackName: string) => Promise<boolean>
  readonly onDecorationChange: (
    decoration: Omit<WarehouseLayoutEditorDecoration, 'clientKey' | 'id' | 'color'>
  ) => void
  readonly onClose: () => void
}
