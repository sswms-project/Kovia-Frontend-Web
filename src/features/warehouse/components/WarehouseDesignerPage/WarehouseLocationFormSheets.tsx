'use client'

import type { LayoutLocationSheetState } from '../../types/warehouse-layout-designer-page.types'
import type { WarehouseLayoutEditorScene } from '../../types/warehouse-layout-scene.types'
import { getLayoutLocationLabel } from '../../utils/layout-placement'
import { getCapacityFormValues } from '../../utils/storage-capacity'
import {
  EMPTY_WAREHOUSE_PHYSICAL_DETAILS,
  getWarehousePhysicalDetails,
} from '../../utils/warehouse-physical-details'
import { RackFormSheet, SlotFormSheet, ZoneFormSheet } from '../WarehouseDetailPage'

interface WarehouseLocationFormSheetsProps {
  readonly editor: LayoutLocationSheetState
  readonly scene: WarehouseLayoutEditorScene
}

export function WarehouseLocationFormSheets({ editor, scene }: WarehouseLocationFormSheetsProps) {
  const {
    isZoneFormOpen,
    rackZoneId,
    locationEditTarget,
    locationConflictTarget,
    isCreatingZone,
    isCreatingRack,
    isUpdatingZone,
    isUpdatingRack,
    isUpdatingSlot,
    capacityFormProps,
    closeZoneForm,
    closeRackForm,
    closeLocationEdit,
    submitZone,
    submitRack,
    updateZoneDetails,
    updateRackDetails,
    updateSlotDetails,
    reloadLocationDetails,
  } = editor

  return (
    <>
      {isZoneFormOpen ? (
        <ZoneFormSheet
          open
          mode="create"
          isPending={isCreatingZone}
          defaultValues={{
            zoneCode: '',
            zoneName: '',
            description: '',
            ...EMPTY_WAREHOUSE_PHYSICAL_DETAILS,
          }}
          onOpenChange={(open) => {
            if (!open) closeZoneForm()
          }}
          onSubmit={submitZone}
        />
      ) : null}

      {rackZoneId ? (
        <RackFormSheet
          {...capacityFormProps}
          open
          mode="create"
          isPending={isCreatingRack}
          defaultValues={{
            rackCode: '',
            rackName: '',
            description: '',
            storageMode: 'SlotLevel',
            allowsMixedProducts: true,
            ...getCapacityFormValues(),
            ...EMPTY_WAREHOUSE_PHYSICAL_DETAILS,
          }}
          onOpenChange={(open) => {
            if (!open) closeRackForm()
          }}
          onSubmit={submitRack}
        />
      ) : null}

      {locationEditTarget?.kind === 'zone' ? (
        <ZoneFormSheet
          open
          mode="update"
          isPending={isUpdatingZone}
          stagingDefaults={{
            receiving: locationEditTarget.location.isDefaultReceivingPoint,
            outbound: locationEditTarget.location.isDefaultOutboundStagingPoint,
            isolation: locationEditTarget.location.isDefaultIsolationPoint,
          }}
          defaultValues={{
            zoneCode: locationEditTarget.location.zoneCode,
            zoneName: locationEditTarget.location.zoneName,
            description: locationEditTarget.location.description ?? '',
            ...getWarehousePhysicalDetails(locationEditTarget.location),
          }}
          onOpenChange={(open) => !open && closeLocationEdit()}
          onSubmit={updateZoneDetails}
        />
      ) : null}

      {locationEditTarget?.kind === 'rack' ? (
        <RackFormSheet
          locationPath={getLayoutLocationLabel(scene, {
            kind: 'rack',
            id: locationEditTarget.location.id,
          })}
          {...capacityFormProps}
          conflict={
            locationConflictTarget === locationEditTarget.location.id
              ? { reload: reloadLocationDetails }
              : undefined
          }
          location={locationEditTarget.location}
          open
          mode="update"
          isPending={isUpdatingRack}
          defaultValues={{
            rackCode: locationEditTarget.location.rackCode,
            rackName: locationEditTarget.location.rackName,
            description: locationEditTarget.location.description ?? '',
            storageMode: locationEditTarget.location.storageMode ?? 'SlotLevel',
            allowsMixedProducts: locationEditTarget.location.allowsMixedProducts ?? true,
            ...getCapacityFormValues(locationEditTarget.location),
            expectedRowVersion: locationEditTarget.location.rowVersion ?? '',
            ...getWarehousePhysicalDetails(locationEditTarget.location),
          }}
          onOpenChange={(open) => {
            if (!open) closeLocationEdit()
          }}
          onSubmit={updateRackDetails}
        />
      ) : null}

      {locationEditTarget?.kind === 'slot' ? (
        <SlotFormSheet
          {...capacityFormProps}
          conflict={
            locationConflictTarget === locationEditTarget.location.id
              ? { reload: reloadLocationDetails }
              : undefined
          }
          location={locationEditTarget.location}
          open
          mode="update"
          isPending={isUpdatingSlot}
          defaultValues={{
            slotCode: locationEditTarget.location.slotCode,
            slotName: locationEditTarget.location.slotName,
            description: locationEditTarget.location.description ?? '',
            allowsMixedProducts: locationEditTarget.location.allowsMixedProducts ?? true,
            ...getCapacityFormValues(locationEditTarget.location),
            expectedRowVersion: locationEditTarget.location.rowVersion ?? '',
            ...getWarehousePhysicalDetails(locationEditTarget.location),
          }}
          onOpenChange={(open) => {
            if (!open) closeLocationEdit()
          }}
          onSubmit={updateSlotDetails}
        />
      ) : null}
    </>
  )
}
