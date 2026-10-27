export interface WarehouseResponse {
  id: string
  warehouseCode: string
  warehouseName: string
  address: string | null
  status: string
  createdAt: string
  rowVersion?: string | null
  managerId?: string | null
  managerName?: string | null
}

export interface WarehouseDetailResponse extends WarehouseResponse {
  zoneCount: number
  quarantineSlotId?: string | null
  quarantineSlotCode?: string | null
  modifiedAt: string | null
}

import type {
  StorageCapacityResponse,
  WarehousePhysicalDetailsResponse,
} from '@/features/warehouse/types/warehouse.types'

export interface SlotResponse extends WarehousePhysicalDetailsResponse, StorageCapacityResponse {
  id: string
  slotCode: string
  slotName: string
  description: string | null
  status: string
  isActive: boolean
  isOutboundStaging?: boolean
  isIsolationPoint?: boolean
  allowsMixedProducts?: boolean
  capacity: number | null
  currentOccupancy: number
  barcodeValue: string | null
  rowVersion?: string | null
}

export interface RackResponse extends WarehousePhysicalDetailsResponse, StorageCapacityResponse {
  isIsolationPoint?: boolean
  id: string
  rackCode: string
  rackName: string
  description: string | null
  status: string
  storageMode?: 'RackLevel' | 'SlotLevel'
  allowsMixedProducts?: boolean
  capacity?: number | null
  defaultSlotId?: string | null
  currentOccupancy?: number | null
  rowVersion?: string | null
  slots: SlotResponse[]
}

export interface ZoneResponse extends WarehousePhysicalDetailsResponse {
  isDefaultReceivingPoint?: boolean
  isDefaultIsolationPoint?: boolean
  isDefaultOutboundStagingPoint?: boolean
  id: string
  zoneCode: string
  zoneName: string
  description: string | null
  status: string
  rowVersion?: string | null
  racks: RackResponse[]
}
