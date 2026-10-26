'use client'

import { RefreshCw, TriangleAlert } from 'lucide-react'
import type { Route } from 'next'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useUnitsQuery } from '@/features/product/hooks/use-products'
import { getCapacityFormValues, getCapacityUpdateValues } from '../utils/storage-capacity'
import { useAuthStore } from '@/stores/auth.store'
import { RackFormSheet, SlotFormSheet, ZoneFormSheet } from '../components/WarehouseDetailPage'
import {
  WarehouseDesignerWorkspace,
  WarehouseLayoutViewerWorkspace,
} from '../components/WarehouseDesigner'
import type {
  WarehouseLayoutCreatedPlacement,
  WarehouseLayoutDropPosition,
} from '../components/WarehouseDesigner/WarehouseDesignerWorkspace'
import {
  useSaveWarehouseLayoutSceneMutation,
  useWarehouseLayoutSceneQuery,
} from '../hooks/use-warehouse-layout-scene'
import {
  useCreateRackMutation,
  useCreateZoneMutation,
  useDeactivateRackMutation,
  useDeactivateZoneMutation,
  useUpdateRackMutation,
  useUpdateSlotMutation,
  useUpdateZoneMutation,
  useWarehouseQuery,
} from '../hooks/use-warehouse'
import type { RackFormValues, SlotFormValues, ZoneFormValues } from '../schemas/warehouse.schema'
import { getLayoutLocationLabel } from '../utils/layout-placement'
import type {
  WarehouseLayoutEditorRack,
  WarehouseLayoutEditorScene,
  WarehouseLayoutEditorZone,
  WarehouseLayoutSelection,
  WarehouseLayoutSlotSceneResponse,
} from '../types/warehouse-layout-scene.types'
import { getWarehouseCapabilities } from '../utils/warehouse-capabilities'
import {
  EMPTY_WAREHOUSE_PHYSICAL_DETAILS,
  getWarehousePhysicalDetails,
} from '../utils/warehouse-physical-details'
import { mapEditorSceneToSaveRequest, mapWarehouseLayoutScene } from '../utils/layout-scene-mapper'
import { APP_ROUTES } from '@/routes/app-routes'

interface WarehouseDesignerPageProps {
  readonly warehouseId: string
  readonly viewOnly?: boolean
  readonly onClose?: () => void
  readonly onEdit?: () => void
  readonly onShowViewer?: () => void
}

type LocationEditTarget =
  | { readonly kind: 'zone'; readonly location: WarehouseLayoutEditorZone }
  | { readonly kind: 'rack'; readonly location: WarehouseLayoutEditorRack }
  | { readonly kind: 'slot'; readonly location: WarehouseLayoutSlotSceneResponse }

export function WarehouseDesignerPage({
  warehouseId,
  viewOnly = false,
  onClose,
  onEdit,
  onShowViewer,
}: WarehouseDesignerPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = useAuthStore((state) => state.user?.role ?? null)
  const meQuery = useMeQuery()
  const capabilities = getWarehouseCapabilities(role, meQuery.data?.permissions)
  const warehouseQuery = useWarehouseQuery(warehouseId)
  const sceneQuery = useWarehouseLayoutSceneQuery(warehouseId)
  const saveMutation = useSaveWarehouseLayoutSceneMutation()
  const createZoneMutation = useCreateZoneMutation()
  const createRackMutation = useCreateRackMutation()
  const updateZoneMutation = useUpdateZoneMutation()
  const updateRackMutation = useUpdateRackMutation()
  const updateSlotMutation = useUpdateSlotMutation()
  const deactivateZoneMutation = useDeactivateZoneMutation()
  const deactivateRackMutation = useDeactivateRackMutation()
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
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasConflict, setHasConflict] = useState(false)
  const [resetRevision, setResetRevision] = useState(0)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mappedScene = useMemo(
    () => (sceneQuery.data ? mapWarehouseLayoutScene(sceneQuery.data) : null),
    [sceneQuery.data]
  )

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    },
    []
  )

  function closeLayout() {
    if (isClosing) return
    setIsClosing(true)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    closeTimerRef.current = setTimeout(
      () => {
        if (onClose) onClose()
        else router.replace(APP_ROUTES.warehouseLayouts)
      },
      reduceMotion ? 0 : 180
    )
  }

  if (warehouseQuery.isLoading || sceneQuery.isLoading || meQuery.isLoading) {
    return (
      <section
        className="bg-surface-container-lowest fixed inset-0 z-40 flex min-h-0 flex-col overflow-hidden"
        aria-label="Đang tải sơ đồ kho"
      >
        <header className="flex min-h-16 shrink-0 items-center border-b px-5">
          <Skeleton className="h-6 w-56" />
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(16rem,30%)_1fr]">
          <div className="space-y-3 border-r p-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="m-5 h-[calc(100%-2.5rem)] w-[calc(100%-2.5rem)]" />
        </div>
      </section>
    )
  }

  if (
    warehouseQuery.isError ||
    (sceneQuery.isError &&
      (!sceneQuery.data ||
        sceneQuery.error.statusCode === 401 ||
        sceneQuery.error.statusCode === 403)) ||
    meQuery.isError ||
    !warehouseQuery.data ||
    !sceneQuery.data ||
    !mappedScene ||
    !meQuery.data
  ) {
    return (
      <Empty className="min-h-80 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert className="text-destructive" aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Không thể tải trình thiết kế</EmptyTitle>
          <EmptyDescription>
            Dữ liệu scene chưa sẵn sàng hoặc bạn không còn quyền truy cập kho này.
          </EmptyDescription>
        </EmptyHeader>
        <Button
          type="button"
          onClick={() => void Promise.all([warehouseQuery.refetch(), sceneQuery.refetch()])}
        >
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          Thử lại
        </Button>
      </Empty>
    )
  }

  const persistedScene = sceneQuery.data
  const { editorScene, hasGeneratedGeometry } = mappedScene
  const hasConfigurePermission =
    capabilities.canConfigureLayout &&
    meQuery.data.permissions.includes(P.WAREHOUSES_CONFIGURE_LAYOUT) &&
    warehouseQuery.data.status === 'Active'
  const isViewMode = viewOnly || searchParams.get('mode') === 'view'
  const canConfigure = !isViewMode && hasConfigurePermission

  if (isViewMode) {
    return (
      <WarehouseLayoutViewerWorkspace
        warehouseId={warehouseId}
        warehouseName={warehouseQuery.data.warehouseName}
        scene={editorScene}
        canConfigure={hasConfigurePermission}
        isClosing={isClosing}
        onClose={closeLayout}
        onEdit={onEdit}
      />
    )
  }

  async function saveScene(scene: WarehouseLayoutEditorScene, baseVersion: number) {
    setSaveError(null)
    setHasConflict(false)
    try {
      await saveMutation.mutateAsync({
        warehouseId,
        request: mapEditorSceneToSaveRequest(warehouseId, baseVersion, scene),
      })
      toast.success('Đã lưu bố cục kho.')
      if (onShowViewer) onShowViewer()
      else router.replace(APP_ROUTES.warehouseLayoutViewer(warehouseId) as Route)
    } catch (error) {
      const statusCode =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? error.statusCode
          : null
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Không thể lưu bố cục kho. Vui lòng thử lại.'
      setHasConflict(statusCode === 409)
      setSaveError(
        statusCode === 409
          ? 'Phiên bản trên máy chủ mới hơn bản bạn đang chỉnh sửa. Tải bản mới trước khi tiếp tục.'
          : message
      )
    }
  }

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

  function openLocationDetails(selection: WarehouseLayoutSelection) {
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
    const result = await sceneQuery.refetch()
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

  async function reloadScene() {
    setSaveError(null)
    setHasConflict(false)
    const result = await sceneQuery.refetch()
    if (result.data) setResetRevision((revision) => revision + 1)
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

  async function deactivateRack(rack: WarehouseLayoutEditorRack) {
    await deactivateRackMutation.mutateAsync({
      warehouseId,
      zoneId: rack.zoneId,
      rackId: rack.id,
      request: {
        reason: 'Gỡ kệ trống khỏi sơ đồ kho',
        expectedRowVersion: rack.rowVersion ?? '',
        cascadeToChildren: true,
      },
    })
  }

  async function deactivateZone(zone: WarehouseLayoutEditorZone) {
    await deactivateZoneMutation.mutateAsync({
      warehouseId,
      zoneId: zone.id,
      request: {
        reason: 'Gỡ khu vực trống khỏi sơ đồ kho',
        expectedRowVersion: zone.rowVersion ?? '',
        cascadeToChildren: true,
      },
    })
  }

  return (
    <>
      <WarehouseDesignerWorkspace
        warehouseId={warehouseId}
        warehouseName={warehouseQuery.data.warehouseName}
        sceneVersion={persistedScene.version}
        resetRevision={resetRevision}
        initialScene={editorScene}
        hasGeneratedGeometry={hasGeneratedGeometry}
        canConfigure={canConfigure}
        isSaving={saveMutation.isPending}
        isUpdatingRack={updateRackMutation.isPending}
        isDeactivatingZone={deactivateZoneMutation.isPending}
        isDeactivatingRack={deactivateRackMutation.isPending}
        saveError={saveError}
        hasConflict={hasConflict}
        placementToApply={placementToApply}
        onPlacementApplied={() => setPlacementToApply(null)}
        onCreateZone={(position) => {
          setPendingDrop(position ? { kind: 'zone', ...position } : null)
          setIsZoneFormOpen(true)
        }}
        onCreateRack={(zoneId, position) => {
          setPendingDrop(position ? { kind: 'rack', ...position } : null)
          setRackZoneId(zoneId)
        }}
        onOpenLocationDetails={openLocationDetails}
        onUpdateRackName={updateRackName}
        onDeactivateZone={deactivateZone}
        onDeactivateRack={deactivateRack}
        onSave={(scene, baseVersion) => void saveScene(scene, baseVersion)}
        onReload={() => void reloadScene()}
        isClosing={isClosing}
        onClose={closeLayout}
      />

      {isZoneFormOpen ? (
        <ZoneFormSheet
          open
          mode="create"
          isPending={createZoneMutation.isPending}
          defaultValues={{
            zoneCode: '',
            zoneName: '',
            description: '',
            ...EMPTY_WAREHOUSE_PHYSICAL_DETAILS,
          }}
          onOpenChange={(open) => {
            if (!open) {
              setIsZoneFormOpen(false)
              setPendingDrop(null)
            }
          }}
          onSubmit={submitZone}
        />
      ) : null}

      {rackZoneId ? (
        <RackFormSheet
          {...capacityFormProps}
          open
          mode="create"
          isPending={createRackMutation.isPending}
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
            if (!open) {
              setRackZoneId(null)
              setPendingDrop(null)
            }
          }}
          onSubmit={submitRack}
        />
      ) : null}

      {locationEditTarget?.kind === 'zone' ? (
        <ZoneFormSheet
          open
          mode="update"
          isPending={updateZoneMutation.isPending}
          stagingDefaults={{
            receiving: locationEditTarget.location.isDefaultReceivingPoint,
            outbound: locationEditTarget.location.isDefaultOutboundStagingPoint,
          }}
          defaultValues={{
            zoneCode: locationEditTarget.location.zoneCode,
            zoneName: locationEditTarget.location.zoneName,
            description: locationEditTarget.location.description ?? '',
            ...getWarehousePhysicalDetails(locationEditTarget.location),
          }}
          onOpenChange={(open) => !open && setLocationEditTarget(null)}
          onSubmit={updateZoneDetails}
        />
      ) : null}

      {locationEditTarget?.kind === 'rack' ? (
        <RackFormSheet
          locationPath={getLayoutLocationLabel(editorScene, {
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
          isPending={updateRackMutation.isPending}
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
            if (!open) {
              setLocationEditTarget(null)
              setLocationConflictTarget(null)
            }
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
          isPending={updateSlotMutation.isPending}
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
            if (!open) {
              setLocationEditTarget(null)
              setLocationConflictTarget(null)
            }
          }}
          onSubmit={updateSlotDetails}
        />
      ) : null}
    </>
  )
}
