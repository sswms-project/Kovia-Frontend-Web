import type { StorageCapacityResponse, WarehousePhysicalDetailsResponse } from './warehouse.types'

export type WarehouseLayoutDecorationType =
  | 'Door'
  | 'DoubleDoor'
  | 'Aisle'
  | 'DirectionArrow'
  | 'Exit'
  | 'Forklift'
  | 'Receiving'
  | 'Packing'
  | 'Picking'
  | 'Damaged'
  | 'Office'
  | 'Other'
  | 'Gate'
  | 'DoubleGate'
  | 'PalletTruck'

export type WarehouseLayoutRackShape = 'Standard' | 'Vertical' | 'CrossBraced' | 'Pallet'

export interface WarehouseLayoutCanvas {
  width: number
  height: number
  gridSize: number
}

export interface WarehouseLayoutGeometry {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
}

export interface WarehouseLayoutZoneSceneResponse extends WarehousePhysicalDetailsResponse {
  isDefaultReceivingPoint?: boolean
  isDefaultOutboundStagingPoint?: boolean
  id: string
  zoneCode: string
  zoneName: string
  description?: string | null
  status: string
  rowVersion?: string | null
  x: number | null
  y: number | null
  width: number | null
  height: number | null
  rotation: number
  zIndex: number
  color?: string | null
}

export interface WarehouseLayoutRackSceneResponse
  extends WarehousePhysicalDetailsResponse, StorageCapacityResponse {
  id: string
  zoneId: string
  zoneCode: string
  rackCode: string
  rackName: string
  description: string | null
  status: string
  storageMode?: 'RackLevel' | 'SlotLevel'
  /** Ô mặc định của kệ quản lý theo kệ; không nằm trong danh sách ô. */
  defaultSlotId?: string | null
  layoutShape?: WarehouseLayoutRackShape | null
  allowsMixedProducts?: boolean
  capacity?: number | null
  currentOccupancy?: number | null
  /** Tổng tồn thực tế và số mã hàng của cả kệ; thiếu khi BE chưa trả (bản cũ). */
  onHandQuantity?: number
  skuCount?: number
  rowVersion?: string | null
  x: number | null
  y: number | null
  width: number | null
  height: number | null
  rotation: number
  zIndex: number
  color?: string | null
}

export interface WarehouseLayoutSlotSceneResponse
  extends WarehousePhysicalDetailsResponse, StorageCapacityResponse {
  id: string
  zoneId: string
  rackId: string
  slotCode: string
  slotName: string
  description: string | null
  occupancyStatus: string
  isActive: boolean
  isOutboundStaging?: boolean
  allowsMixedProducts?: boolean
  capacity: number | null
  currentOccupancy: number
  onHandQuantity?: number
  skuCount?: number
  rowVersion?: string | null
}

export interface WarehouseLayoutDecorationResponse extends WarehouseLayoutGeometry {
  id: string
  type: WarehouseLayoutDecorationType
  label: string
  color?: string | null
}

export interface WarehouseLayoutSceneResponse {
  warehouseId: string
  version: number
  canvas: WarehouseLayoutCanvas
  zones: WarehouseLayoutZoneSceneResponse[]
  racks: WarehouseLayoutRackSceneResponse[]
  slots: WarehouseLayoutSlotSceneResponse[]
  decorations: WarehouseLayoutDecorationResponse[]
}

export interface WarehouseLayoutGeometryRequest extends WarehouseLayoutGeometry {
  entityId: string
  color?: string | null
  layoutShape?: WarehouseLayoutRackShape | null
}

export interface WarehouseLayoutDecorationRequest extends WarehouseLayoutGeometry {
  id: string | null
  type: WarehouseLayoutDecorationType
  label: string
  color?: string | null
}

export interface SaveWarehouseLayoutSceneRequest {
  warehouseId: string
  version: number
  canvas: WarehouseLayoutCanvas
  zones: WarehouseLayoutGeometryRequest[]
  racks: WarehouseLayoutGeometryRequest[]
  decorations: WarehouseLayoutDecorationRequest[]
}

export interface WarehouseLayoutEditorZone
  extends
    Omit<WarehouseLayoutZoneSceneResponse, keyof WarehouseLayoutGeometry>,
    WarehouseLayoutGeometry {
  /** Derived UI metadata only; never serialized as saved geometry. */
  placementPending?: boolean
}

export interface WarehouseLayoutEditorRack
  extends
    Omit<WarehouseLayoutRackSceneResponse, keyof WarehouseLayoutGeometry>,
    WarehouseLayoutGeometry {
  placementPending?: boolean
}

export interface WarehouseLayoutEditorDecoration extends WarehouseLayoutDecorationResponse {
  clientKey: string
}

export interface WarehouseLayoutEditorScene {
  canvas: WarehouseLayoutCanvas
  zones: WarehouseLayoutEditorZone[]
  racks: WarehouseLayoutEditorRack[]
  slots: WarehouseLayoutSlotSceneResponse[]
  decorations: WarehouseLayoutEditorDecoration[]
}

export type WarehouseLayoutSelection =
  | { kind: 'zone'; id: string }
  | { kind: 'rack'; id: string }
  | { kind: 'slot'; id: string }
  | { kind: 'decoration'; id: string }

export type WarehouseLayoutTool = 'select' | 'pan'

export type WarehouseLayoutGeometryTarget = 'zone' | 'rack' | 'decoration'
