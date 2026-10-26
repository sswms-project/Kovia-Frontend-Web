import type { QueryObserverResult } from '@tanstack/react-query'
import type { UnitResponse } from '@/features/product/types/product.types'
import type { ApiErrorResponse } from '@/types/api'
import type { RackFormValues, SlotFormValues, ZoneFormValues } from '../schemas/warehouse.schema'
import type {
  WarehouseLayoutEditorRack,
  WarehouseLayoutEditorZone,
  WarehouseLayoutSceneResponse,
  WarehouseLayoutSlotSceneResponse,
} from './warehouse-layout-scene.types'

export interface WarehouseDesignerSummary {
  readonly warehouseName: string
  readonly status: string
}

export type SceneRefetch = () => Promise<
  QueryObserverResult<WarehouseLayoutSceneResponse, ApiErrorResponse>
>

export type LocationEditTarget =
  | { readonly kind: 'zone'; readonly location: WarehouseLayoutEditorZone }
  | { readonly kind: 'rack'; readonly location: WarehouseLayoutEditorRack }
  | { readonly kind: 'slot'; readonly location: WarehouseLayoutSlotSceneResponse }

export interface LayoutCapacityFormProps {
  readonly units: readonly UnitResponse[]
  readonly unitsLoading: boolean
  readonly unitsError: boolean
  readonly onRetryUnits: () => void
}

export interface LayoutLocationSheetState {
  readonly isZoneFormOpen: boolean
  readonly rackZoneId: string | null
  readonly locationEditTarget: LocationEditTarget | null
  readonly locationConflictTarget: string | null
  readonly isCreatingZone: boolean
  readonly isCreatingRack: boolean
  readonly isUpdatingZone: boolean
  readonly isUpdatingRack: boolean
  readonly isUpdatingSlot: boolean
  readonly capacityFormProps: LayoutCapacityFormProps
  readonly closeZoneForm: () => void
  readonly closeRackForm: () => void
  readonly closeLocationEdit: () => void
  readonly submitZone: (values: ZoneFormValues) => Promise<boolean>
  readonly submitRack: (values: RackFormValues) => Promise<boolean>
  readonly updateZoneDetails: (values: ZoneFormValues) => Promise<boolean>
  readonly updateRackDetails: (
    values: RackFormValues,
    preserveLegacyCapacity?: boolean
  ) => Promise<boolean>
  readonly updateSlotDetails: (
    values: SlotFormValues,
    preserveLegacyCapacity?: boolean
  ) => Promise<boolean>
  readonly reloadLocationDetails: () => Promise<boolean>
}
