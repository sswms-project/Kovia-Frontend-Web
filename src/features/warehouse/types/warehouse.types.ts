import type { QueryInfo } from '@/types/api'

export interface WarehouseListQuery extends QueryInfo {
  top: number
  skip: number
  needTotalCount: true
}

export interface CreateWarehouseRequest {
  warehouseCode: string
  warehouseName: string
  address: string | null
}

export interface UpdateWarehouseRequest {
  warehouseName: string
  address: string
  expectedRowVersion: string
}

export interface WarehouseLifecycleRequest {
  reason: string | null
  expectedRowVersion: string
  cascadeToChildren?: boolean
}

export type WarehouseLocationType = 'Zone' | 'Rack' | 'Slot'
export type LocationLifecycleStatus = 'Active' | 'Inactive'
export type SlotOccupancyStatus = 'Vacant' | 'Occupied' | 'Reserved' | 'Full'
export type StorageMassUnit = 'Ton' | 'Kilogram' | 'Gram'
export type StorageLengthUnit = 'Kilometer' | 'Meter' | 'Decimeter' | 'Centimeter'

export interface WarehousePhysicalDetails {
  storageCapacity: number | null
  storageCapacityUnit: StorageMassUnit | null
  physicalLength: number | null
  physicalLengthUnit: StorageLengthUnit | null
  physicalWidth: number | null
  physicalWidthUnit: StorageLengthUnit | null
  physicalHeight: number | null
  physicalHeightUnit: StorageLengthUnit | null
}

export interface WarehousePhysicalDetailsResponse {
  storageCapacity?: number | null
  storageCapacityUnit?: StorageMassUnit | null
  physicalLength?: number | null
  physicalLengthUnit?: StorageLengthUnit | null
  physicalWidth?: number | null
  physicalWidthUnit?: StorageLengthUnit | null
  physicalHeight?: number | null
  physicalHeightUnit?: StorageLengthUnit | null
}

export interface WarehouseLocationQuery extends QueryInfo {
  top: number
  skip: number
  needTotalCount: true
  type?: WarehouseLocationType
  lifecycleStatus?: LocationLifecycleStatus
  occupancyStatus?: SlotOccupancyStatus
  zoneId?: string
  rackId?: string
}

export interface LocationSearchResponse extends StorageCapacityResponse {
  id: string
  type: WarehouseLocationType
  code: string
  name: string | null
  description: string | null
  lifecycleStatus: LocationLifecycleStatus
  occupancyStatus: SlotOccupancyStatus | null
  zoneId: string | null
  zoneCode: string | null
  rackId: string | null
  rackCode: string | null
  capacity: number | null
  currentOccupancy: number | null
  barcodeValue: string | null
  isOutboundStaging: boolean
  rowVersion?: string | null
}

export interface LocationFilterState {
  type: WarehouseLocationType | ''
  lifecycleStatus: LocationLifecycleStatus | ''
  occupancyStatus: SlotOccupancyStatus | ''
  zoneId: string
  rackId: string
}

export interface CreateZoneRequest extends WarehousePhysicalDetails {
  createReceivingPoint?: boolean
  zoneCode: string
  zoneName: string
  description: string
}

export interface UpdateZoneRequest extends Omit<CreateZoneRequest, 'createReceivingPoint'> {
  expectedRowVersion: string
}

export type RackStorageMode = 'RackLevel' | 'SlotLevel'

export type StorageCapacityType = 'None' | 'Quantity'

export interface StorageCapacityResponse {
  capacityType?: StorageCapacityType | null
  capacityUnitId?: string | null
  capacityUnitName?: string | null
  capacityUnitSymbol?: string | null
  capacityUsed?: number | null
  remainingCapacity?: number | null
  utilizationPercent?: number | null
  requiresCapacityConfiguration?: boolean
}

export interface CreateRackRequest extends WarehousePhysicalDetails {
  rackCode: string
  rackName: string
  description: string | null
  storageMode: RackStorageMode
  allowsMixedProducts: boolean
  capacity: number | null
  capacityType: StorageCapacityType
  capacityUnitId: string | null
}

export interface UpdateRackRequest extends Omit<CreateRackRequest, 'capacityType'> {
  // Rename-only updates preserve a pending legacy policy by omitting CapacityType.
  capacityType?: StorageCapacityType
  expectedRowVersion: string
}

export interface CreateSlotRequest extends WarehousePhysicalDetails {
  slotCode: string
  slotName: string
  description: string | null
  allowsMixedProducts: boolean
  capacity: number | null
  capacityType: StorageCapacityType
  capacityUnitId: string | null
}

export interface UpdateSlotRequest extends Omit<CreateSlotRequest, 'capacityType'> {
  capacityType?: StorageCapacityType
  expectedRowVersion: string
}

export interface LocationBarcodeResponse {
  locationId: string
  locationType: WarehouseLocationType
  locationCode: string
  barcodeValue: string
  displayPath?: string
  symbology: 'Code128'
}
