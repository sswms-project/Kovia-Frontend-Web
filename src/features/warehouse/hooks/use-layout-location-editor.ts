import { useState } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error'
import { useUnitsQuery } from '@/features/product/hooks/use-products'
import type { RackFormValues, SlotFormValues, ZoneFormValues } from '../schemas/warehouse.schema'
import type {
  LayoutLocationSheetState,
  LocationEditTarget,
  SceneRefetch,
} from '../types/warehouse-layout-designer-page.types'
import type {
  WarehouseLayoutCreatedPlacement,
  WarehouseLayoutDropPosition,
} from '../types/warehouse-layout-workspace.types'
import type {
  WarehouseLayoutEditorRack,
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../types/warehouse-layout-scene.types'
import { mapWarehouseLayoutScene } from '../utils/layout-scene-mapper'
import { getCapacityFormValues, getCapacityUpdateValues } from '../utils/storage-capacity'
import { getWarehousePhysicalDetails } from '../utils/warehouse-physical-details'
import {
  useCreateRackMutation,
  useCreateZoneMutation,
  useUpdateRackMutation,
  useUpdateSlotMutation,
  useUpdateZoneMutation,
} from './use-warehouse'

interface UseLayoutLocationEditorOptions {
  readonly warehouseId: string
  readonly refetchScene: SceneRefetch
}

export function useLayoutLocationEditor({
  warehouseId,
  refetchScene,
}: UseLayoutLocationEditorOptions) {
  const createZoneMutation = useCreateZoneMutation()
  const createRackMutation = useCreateRackMutation()
  const updateZoneMutation = useUpdateZoneMutation()
  const updateRackMutation = useUpdateRackMutation()
  const updateSlotMutation = useUpdateSlotMutation()
  const [isZoneFormOpen, setIsZoneFormOpen] = useState(false)
  const [rackZoneId, setRackZoneId] = useState<string | null>(null)
  const [locationEditTarget, setLocationEditTarget] = useState<LocationEditTarget | null>(null)
  const [locationConflictTarget, setLocationConflictTarget] = useState<string | null>(null)
  const unitsQuery = useUnitsQuery(
    Boolean(
      rackZoneId || locationEditTarget?.kind === 'rack' || locationEditTarget?.kind === 'slot'
    ),
    'Active'
  )
  const capacityFormProps = {
    units: unitsQuery.data ?? [],
    unitsLoading: unitsQuery.isPending,
    unitsError: unitsQuery.isError,
    onRetryUnits: () => void unitsQuery.refetch(),
  }
  const [pendingDrop, setPendingDrop] = useState<
    ({ kind: 'zone' | 'rack' } & WarehouseLayoutDropPosition) | null
  >(null)
  const [placementToApply, setPlacementToApply] = useState<WarehouseLayoutCreatedPlacement | null>(
    null
  )

  async function submitZone(values: ZoneFormValues) {
    try {
      const result = await createZoneMutation.mutateAsync({ warehouseId, request: values })
      if (pendingDrop?.kind === 'zone') {
        setPlacementToApply({ ...pendingDrop, entityId: result.data })
        setPendingDrop(null)
      }
      toast.success('Đã thêm khu vực. Đối tượng mới đã được đặt vào sơ đồ.')
      setIsZoneFormOpen(false)
      return true
    } catch (error) {
      logger.error(error)
      toast.error('Không thể thêm khu vực. Vui lòng thử lại.')
      return false
    }
  }

  async function submitRack(values: RackFormValues) {
    if (!rackZoneId) return false
    try {
      const result = await createRackMutation.mutateAsync({
        warehouseId,
        zoneId: rackZoneId,
        request: { ...values, description: values.description || null },
      })
      if (pendingDrop?.kind === 'rack') {
        setPlacementToApply({ ...pendingDrop, entityId: result.data })
        setPendingDrop(null)
      }
      toast.success('Đã thêm kệ hàng. Đối tượng mới đã được đặt vào sơ đồ.')
      setRackZoneId(null)
      return true
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể thêm kệ hàng. Vui lòng thử lại.'))
      return false
    }
  }

  function openLocationDetails(
    editorScene: WarehouseLayoutEditorScene,
    selection: WarehouseLayoutSelection
  ) {
    if (selection.kind === 'zone') {
      const location = editorScene.zones.find((zone) => zone.id === selection.id)
      if (location) setLocationEditTarget({ kind: 'zone', location })
      return
    }
    if (selection.kind === 'rack') {
      const location = editorScene.racks.find((rack) => rack.id === selection.id)
      if (location) setLocationEditTarget({ kind: 'rack', location })
      return
    }
    if (selection.kind === 'slot') {
      const location = editorScene.slots.find((slot) => slot.id === selection.id)
      if (location) setLocationEditTarget({ kind: 'slot', location })
    }
  }

  async function updateZoneDetails(values: ZoneFormValues) {
    if (locationEditTarget?.kind !== 'zone') return false
    try {
      await updateZoneMutation.mutateAsync({
        warehouseId,
        zoneId: locationEditTarget.location.id,
        request: {
          ...values,
          expectedRowVersion: locationEditTarget.location.rowVersion ?? '',
        },
      })
      toast.success('Đã cập nhật khu vực.')
      setLocationEditTarget(null)
      return true
    } catch (error) {
      logger.error(error)
      toast.error('Không thể cập nhật khu vực. Vui lòng thử lại.')
      return false
    }
  }

  async function updateRackDetails(values: RackFormValues, preserveLegacyCapacity = false) {
    if (locationEditTarget?.kind !== 'rack') return false
    try {
      await updateRackMutation.mutateAsync({
        warehouseId,
        zoneId: locationEditTarget.location.zoneId,
        rackId: locationEditTarget.location.id,
        request: {
          ...values,
          ...getCapacityUpdateValues(locationEditTarget.location, preserveLegacyCapacity),
          expectedRowVersion: locationEditTarget.location.rowVersion ?? '',
        },
      })
      toast.success('Đã cập nhật kệ hàng.')
      setLocationEditTarget(null)
      setLocationConflictTarget(null)
      return true
    } catch (error) {
      if (isApiErrorResponse(error) && error.statusCode === 409)
        setLocationConflictTarget(locationEditTarget.location.id)
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật kệ hàng. Vui lòng thử lại.'))
      return false
    }
  }

  async function updateSlotDetails(values: SlotFormValues, preserveLegacyCapacity = false) {
    if (locationEditTarget?.kind !== 'slot') return false
    try {
      await updateSlotMutation.mutateAsync({
        warehouseId,
        rackId: locationEditTarget.location.rackId,
        slotId: locationEditTarget.location.id,
        request: {
          ...values,
          ...getCapacityUpdateValues(locationEditTarget.location, preserveLegacyCapacity),
          expectedRowVersion: locationEditTarget.location.rowVersion ?? '',
        },
      })
      toast.success('Đã cập nhật vị trí lưu trữ.')
      setLocationEditTarget(null)
      setLocationConflictTarget(null)
      return true
    } catch (error) {
      if (isApiErrorResponse(error) && error.statusCode === 409)
        setLocationConflictTarget(locationEditTarget.location.id)
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật vị trí. Vui lòng thử lại.'))
      return false
    }
  }

  async function reloadLocationDetails() {
    const result = await refetchScene()
    if (result.isError || !result.data) {
      toast.error('Không thể tải dữ liệu mới. Bản nháp vẫn được giữ, vui lòng thử lại.')
      return false
    }
    const latest = mapWarehouseLayoutScene(result.data).editorScene
    if (locationEditTarget?.kind === 'rack') {
      const location = latest.racks.find((rack) => rack.id === locationEditTarget.location.id)
      if (location) {
        setLocationEditTarget({ kind: 'rack', location })
        setLocationConflictTarget(null)
        return true
      }
    }
    if (locationEditTarget?.kind === 'slot') {
      const location = latest.slots.find((slot) => slot.id === locationEditTarget.location.id)
      if (location) {
        setLocationEditTarget({ kind: 'slot', location })
        setLocationConflictTarget(null)
        return true
      }
    }
    toast.error('Vị trí không còn trong danh sách. Vui lòng đóng form và kiểm tra lại.')
    return false
  }

  async function updateRackName(rack: WarehouseLayoutEditorRack, rackName: string) {
    await updateRackMutation.mutateAsync({
      warehouseId,
      zoneId: rack.zoneId,
      rackId: rack.id,
      request: {
        rackCode: rack.rackCode,
        rackName,
        description: rack.description,
        storageMode: rack.storageMode ?? 'SlotLevel',
        allowsMixedProducts: rack.allowsMixedProducts ?? true,
        ...getCapacityFormValues(rack),
        ...(rack.requiresCapacityConfiguration
          ? { capacityType: undefined, capacity: rack.capacity ?? null }
          : {}),
        expectedRowVersion: rack.rowVersion ?? '',
        ...getWarehousePhysicalDetails(rack),
      },
    })
  }

  function openCreateZone(position?: WarehouseLayoutDropPosition) {
    setPendingDrop(position ? { kind: 'zone', ...position } : null)
    setIsZoneFormOpen(true)
  }

  function openCreateRack(zoneId: string, position?: WarehouseLayoutDropPosition) {
    setPendingDrop(position ? { kind: 'rack', ...position } : null)
    setRackZoneId(zoneId)
  }

  function closeZoneForm() {
    setIsZoneFormOpen(false)
    setPendingDrop(null)
  }

  function closeRackForm() {
    setRackZoneId(null)
    setPendingDrop(null)
  }

  function closeLocationEdit() {
    setLocationEditTarget(null)
    setLocationConflictTarget(null)
  }

  const sheetState: LayoutLocationSheetState = {
    isZoneFormOpen,
    rackZoneId,
    locationEditTarget,
    locationConflictTarget,
    isCreatingZone: createZoneMutation.isPending,
    isCreatingRack: createRackMutation.isPending,
    isUpdatingZone: updateZoneMutation.isPending,
    isUpdatingRack: updateRackMutation.isPending,
    isUpdatingSlot: updateSlotMutation.isPending,
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
  }

  return {
    sheetState,
    isUpdatingRack: updateRackMutation.isPending,
    placementToApply,
    onPlacementApplied: () => setPlacementToApply(null),
    openCreateZone,
    openCreateRack,
    openLocationDetails,
    updateRackName,
  }
}
