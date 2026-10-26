import type {
  WarehouseLayoutEditorRack,
  WarehouseLayoutEditorScene,
  WarehouseLayoutEditorZone,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'
import type {
  WarehouseLayoutCreatedPlacement,
  WarehouseLayoutDropPosition,
} from '../../../types/warehouse-layout-workspace.types'

export interface WarehouseDesignerWorkspaceProps {
  readonly warehouseId: string
  readonly warehouseName: string
  readonly sceneVersion: number
  readonly resetRevision: number
  readonly initialScene: WarehouseLayoutEditorScene
  readonly hasGeneratedGeometry: boolean
  readonly canConfigure: boolean
  readonly isSaving: boolean
  readonly isUpdatingRack: boolean
  readonly isDeactivatingZone: boolean
  readonly isDeactivatingRack: boolean
  readonly saveError: string | null
  readonly hasConflict: boolean
  readonly placementToApply: WarehouseLayoutCreatedPlacement | null
  readonly onPlacementApplied: () => void
  readonly onCreateZone: (position?: WarehouseLayoutDropPosition) => void
  readonly onCreateRack: (zoneId: string, position?: WarehouseLayoutDropPosition) => void
  readonly onOpenLocationDetails: (selection: WarehouseLayoutSelection) => void
  readonly onUpdateRackName: (rack: WarehouseLayoutEditorRack, rackName: string) => Promise<void>
  readonly onDeactivateZone: (zone: WarehouseLayoutEditorZone) => Promise<void>
  readonly onDeactivateRack: (rack: WarehouseLayoutEditorRack) => Promise<void>
  readonly onSave: (scene: WarehouseLayoutEditorScene, baseVersion: number) => void
  readonly onReload: () => void
  readonly isClosing: boolean
  readonly onClose: () => void
}
