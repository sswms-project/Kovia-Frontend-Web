'use client'

import { RefreshCw, TriangleAlert } from 'lucide-react'
import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { P } from '@/config/permissionCodes'
import { useListExport } from '@/features/list-export/hooks/use-list-export'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useUnitsQuery } from '@/features/product/hooks/use-products'
import { getCapacityFormValues, getCapacityUpdateValues } from '../utils/storage-capacity'
import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error'
import { APP_ROUTES } from '@/routes/app-routes'
import { useAuthStore } from '@/stores/auth.store'
import type { RackResponse, SlotResponse, ZoneResponse } from '@/types/warehouse'
import {
  RackFormSheet,
  SlotFormSheet,
  WarehouseLayoutView,
  WarehouseLocationDeactivateDialog,
  ZoneFormSheet,
} from '../components/WarehouseDetailPage'
import {
  useCreateRackMutation,
  useCreateSlotMutation,
  useCreateZoneMutation,
  useDeactivateRackMutation,
  useDeactivateSlotMutation,
  useDeactivateZoneMutation,
  useReactivateRackMutation,
  useReactivateSlotMutation,
  useReactivateZoneMutation,
  useUpdateRackMutation,
  useUpdateSlotMutation,
  useUpdateZoneMutation,
  useWarehouseLayoutQuery,
  useWarehouseQuery,
} from '../hooks/use-warehouse'
import type { RackFormValues, SlotFormValues, ZoneFormValues } from '../schemas/warehouse.schema'
import {
  EMPTY_WAREHOUSE_PHYSICAL_DETAILS,
  getWarehousePhysicalDetails,
} from '../utils/warehouse-physical-details'
import { getWarehouseCapabilities } from '../utils/warehouse-capabilities'
import {
  buildWarehouseLocationTree,
  filterWarehouseLocationTree,
  flattenExpandedLocationTree,
  getExpandableLocationIds,
  matchesWarehouseLocationTreeNode,
} from '../components/WarehouseLocationsPage/location-tree'
import {
  buildWarehouseLayoutHref,
  getWarehouseLayoutSelection,
} from '../utils/warehouse-layout-route'

interface WarehouseLayoutPageProps {
  readonly warehouseId: string
}

type ZoneFormTarget =
  | { readonly mode: 'create' }
  | { readonly mode: 'update'; readonly zone: ZoneResponse }
type RackFormTarget =
  | { readonly mode: 'create'; readonly zone: ZoneResponse }
  | { readonly mode: 'update'; readonly zone: ZoneResponse; readonly rack: RackResponse }
type SlotFormTarget =
  | { readonly mode: 'create'; readonly rack: RackResponse }
  | { readonly mode: 'update'; readonly rack: RackResponse; readonly slot: SlotResponse }
type DeactivateTarget =
  | { readonly type: 'Zone'; readonly zone: ZoneResponse }
  | { readonly type: 'Rack'; readonly zone: ZoneResponse; readonly rack: RackResponse }
  | { readonly type: 'Slot'; readonly rack: RackResponse; readonly slot: SlotResponse }

export function WarehouseLayoutPage({ warehouseId }: WarehouseLayoutPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = useAuthStore((state) => state.user?.role ?? null)
  const meQuery = useMeQuery()
  const capabilities = getWarehouseCapabilities(role, meQuery.data?.permissions)
  const warehouseQuery = useWarehouseQuery(warehouseId)
  const layoutQuery = useWarehouseLayoutQuery(warehouseId, true)
  const createZoneMutation = useCreateZoneMutation()
  const updateZoneMutation = useUpdateZoneMutation()
  const deactivateZoneMutation = useDeactivateZoneMutation()
  const createRackMutation = useCreateRackMutation()
  const updateRackMutation = useUpdateRackMutation()
  const deactivateRackMutation = useDeactivateRackMutation()
  const createSlotMutation = useCreateSlotMutation()
  const updateSlotMutation = useUpdateSlotMutation()
  const deactivateSlotMutation = useDeactivateSlotMutation()
  const reactivateZoneMutation = useReactivateZoneMutation()
  const reactivateRackMutation = useReactivateRackMutation()
  const reactivateSlotMutation = useReactivateSlotMutation()
  const [zoneFormTarget, setZoneFormTarget] = useState<ZoneFormTarget | null>(null)
  const [rackFormTarget, setRackFormTarget] = useState<RackFormTarget | null>(null)
  const [slotFormTarget, setSlotFormTarget] = useState<SlotFormTarget | null>(null)
  const [rackConflictTarget, setRackConflictTarget] = useState<string | null>(null)
  const [slotConflictTarget, setSlotConflictTarget] = useState<string | null>(null)
  const unitsQuery = useUnitsQuery(Boolean(rackFormTarget || slotFormTarget), 'Active')
  const capacityFormProps = {
    units: unitsQuery.data ?? [],
    unitsLoading: unitsQuery.isPending,
    unitsError: unitsQuery.isError,
    onRetryUnits: () => void unitsQuery.refetch(),
  }
  const [deactivateTarget, setDeactivateTarget] = useState<DeactivateTarget | null>(null)
  const [deactivateErrorMessage, setDeactivateErrorMessage] = useState<string | null>(null)
  const zones = layoutQuery.data ?? []
  const [locationSearchText, setLocationSearchText] = useState('')
  const [locationStatus, setLocationStatus] = useState<'' | 'Active' | 'Inactive'>('')
  const exportRowCount = useMemo(() => {
    const tree = filterWarehouseLocationTree(
      buildWarehouseLocationTree(layoutQuery.data ?? []),
      locationSearchText,
      locationStatus
    )
    return flattenExpandedLocationTree(tree, getExpandableLocationIds(tree)).filter((node) =>
      matchesWarehouseLocationTreeNode(node, locationSearchText, locationStatus)
    ).length
  }, [layoutQuery.data, locationSearchText, locationStatus])
  const listExport = useListExport({
    dataset: 'locations',
    filters: {
      warehouseId,
      ...(locationSearchText.trim() ? { searchText: locationSearchText.trim() } : {}),
      ...(locationStatus ? { lifecycleStatus: locationStatus } : {}),
    },
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: P.WAREHOUSES_VIEW,
    totalCount: exportRowCount,
    isFetching: layoutQuery.isFetching || warehouseQuery.isFetching || meQuery.isFetching,
    isError: layoutQuery.isError || warehouseQuery.isError || meQuery.isError,
  })
  const selection = getWarehouseLayoutSelection(
    zones,
    searchParams.get('zone'),
    searchParams.get('rack')
  )

  if (layoutQuery.isLoading || warehouseQuery.isLoading || meQuery.isLoading)
    return <Skeleton className="h-[32rem]" />

  if (
    (layoutQuery.isError &&
      (!layoutQuery.data ||
        layoutQuery.error.statusCode === 401 ||
        layoutQuery.error.statusCode === 403)) ||
    warehouseQuery.isError ||
    meQuery.isError ||
    !warehouseQuery.data
  ) {
    return (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert className="text-destructive" aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Không thể tải vị trí vật tư, hàng hóa</EmptyTitle>
          <EmptyDescription>
            Dữ liệu chưa sẵn sàng hoặc bạn không có quyền truy cập.
          </EmptyDescription>
        </EmptyHeader>
        <Button
          type="button"
          onClick={() => void Promise.all([layoutQuery.refetch(), warehouseQuery.refetch()])}
        >
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          Thử lại
        </Button>
      </Empty>
    )
  }

  const isWarehouseActive = warehouseQuery.data.status === 'Active'

  function navigate(zoneId: string | null, rackId: string | null) {
    router.push(buildWarehouseLayoutHref(warehouseId, zoneId, rackId), { scroll: false })
  }

  function openDeactivate(target: DeactivateTarget) {
    setDeactivateErrorMessage(null)
    setDeactivateTarget(target)
  }

  async function submitZone(values: ZoneFormValues) {
    if (!zoneFormTarget) return false
    try {
      if (zoneFormTarget.mode === 'create') {
        await createZoneMutation.mutateAsync({ warehouseId, request: values })
        toast.success('Đã thêm khu vực.')
      } else {
        await updateZoneMutation.mutateAsync({
          warehouseId,
          zoneId: zoneFormTarget.zone.id,
          request: { ...values, expectedRowVersion: zoneFormTarget.zone.rowVersion ?? '' },
        })
        toast.success('Đã cập nhật khu vực.')
      }
      setZoneFormTarget(null)
      return true
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lưu khu vực. Vui lòng thử lại.'))
      return false
    }
  }

  async function submitRack(values: RackFormValues, preserveLegacyCapacity = false) {
    if (!rackFormTarget) return false
    try {
      if (rackFormTarget.mode === 'create') {
        await createRackMutation.mutateAsync({
          warehouseId,
          zoneId: rackFormTarget.zone.id,
          request: {
            rackCode: values.rackCode,
            rackName: values.rackName,
            description: values.description || null,
            storageMode: values.storageMode,
            allowsMixedProducts: values.allowsMixedProducts,
            capacity: values.capacity,
            capacityType: values.capacityType,
            capacityUnitId: values.capacityUnitId,
            storageCapacity: values.storageCapacity,
            storageCapacityUnit: values.storageCapacityUnit,
            physicalLength: values.physicalLength,
            physicalLengthUnit: values.physicalLengthUnit,
            physicalWidth: values.physicalWidth,
            physicalWidthUnit: values.physicalWidthUnit,
            physicalHeight: values.physicalHeight,
            physicalHeightUnit: values.physicalHeightUnit,
          },
        })
        toast.success('Đã thêm kệ hàng.')
      } else {
        await updateRackMutation.mutateAsync({
          warehouseId,
          zoneId: rackFormTarget.zone.id,
          rackId: rackFormTarget.rack.id,
          request: {
            ...values,
            ...getCapacityUpdateValues(rackFormTarget.rack, preserveLegacyCapacity),
            expectedRowVersion: rackFormTarget.rack.rowVersion ?? '',
          },
        })
        toast.success('Đã cập nhật kệ hàng.')
      }
      setRackFormTarget(null)
      setRackConflictTarget(null)
      return true
    } catch (error) {
      if (isApiErrorResponse(error) && error.statusCode === 409 && rackFormTarget.mode === 'update')
        setRackConflictTarget(rackFormTarget.rack.id)
      toast.error(getApiErrorMessage(error, 'Không thể lưu kệ hàng. Vui lòng thử lại.'))
      return false
    }
  }

  async function submitSlot(values: SlotFormValues, preserveLegacyCapacity = false) {
    if (!slotFormTarget) return false
    try {
      if (slotFormTarget.mode === 'create') {
        await createSlotMutation.mutateAsync({
          warehouseId,
          rackId: slotFormTarget.rack.id,
          request: {
            slotCode: values.slotCode,
            slotName: values.slotName,
            description: values.description || null,
            allowsMixedProducts: values.allowsMixedProducts,
            capacity: values.capacity,
            capacityType: values.capacityType,
            capacityUnitId: values.capacityUnitId,
            storageCapacity: values.storageCapacity,
            storageCapacityUnit: values.storageCapacityUnit,
            physicalLength: values.physicalLength,
            physicalLengthUnit: values.physicalLengthUnit,
            physicalWidth: values.physicalWidth,
            physicalWidthUnit: values.physicalWidthUnit,
            physicalHeight: values.physicalHeight,
            physicalHeightUnit: values.physicalHeightUnit,
          },
        })
        toast.success('Đã thêm vị trí lưu trữ.')
      } else {
        await updateSlotMutation.mutateAsync({
          warehouseId,
          rackId: slotFormTarget.rack.id,
          slotId: slotFormTarget.slot.id,
          request: {
            ...values,
            ...getCapacityUpdateValues(slotFormTarget.slot, preserveLegacyCapacity),
            expectedRowVersion: slotFormTarget.slot.rowVersion ?? '',
          },
        })
        toast.success('Đã cập nhật vị trí lưu trữ.')
      }
      setSlotFormTarget(null)
      setSlotConflictTarget(null)
      return true
    } catch (error) {
      if (isApiErrorResponse(error) && error.statusCode === 409 && slotFormTarget.mode === 'update')
        setSlotConflictTarget(slotFormTarget.slot.id)
      toast.error(getApiErrorMessage(error, 'Không thể lưu vị trí. Vui lòng thử lại.'))
      return false
    }
  }

  async function reloadLocationForm(kind: 'rack' | 'slot') {
    const result = await layoutQuery.refetch()
    if (result.isError || !result.data) {
      toast.error('Không thể tải dữ liệu mới. Bản nháp vẫn được giữ, vui lòng thử lại.')
      return false
    }
    if (kind === 'rack' && rackFormTarget?.mode === 'update') {
      const zone = result.data.find((item) =>
        item.racks.some((rack) => rack.id === rackFormTarget.rack.id)
      )
      const rack = zone?.racks.find((item) => item.id === rackFormTarget.rack.id)
      if (zone && rack) {
        setRackFormTarget({ mode: 'update', zone, rack })
        setRackConflictTarget(null)
        return true
      }
    }
    if (kind === 'slot' && slotFormTarget?.mode === 'update') {
      const rack = result.data
        .flatMap((zone) => zone.racks)
        .find((item) => item.slots.some((slot) => slot.id === slotFormTarget.slot.id))
      const slot = rack?.slots.find((item) => item.id === slotFormTarget.slot.id)
      if (rack && slot) {
        setSlotFormTarget({ mode: 'update', rack, slot })
        setSlotConflictTarget(null)
        return true
      }
    }
    toast.error('Vị trí không còn trong danh sách. Vui lòng đóng form và kiểm tra lại.')
    return false
  }

  async function confirmLifecycle(reason: string | null, cascadeToChildren: boolean) {
    if (!deactivateTarget) return
    const request = {
      reason,
      cascadeToChildren,
      expectedRowVersion:
        deactivateTarget.type === 'Zone'
          ? (deactivateTarget.zone.rowVersion ?? '')
          : deactivateTarget.type === 'Rack'
            ? (deactivateTarget.rack.rowVersion ?? '')
            : (deactivateTarget.slot.rowVersion ?? ''),
    }
    const isReactivation =
      deactivateTarget.type === 'Zone'
        ? deactivateTarget.zone.status === 'Inactive'
        : deactivateTarget.type === 'Rack'
          ? deactivateTarget.rack.status === 'Inactive'
          : !deactivateTarget.slot.isActive
    try {
      if (deactivateTarget.type === 'Zone') {
        const variables = { warehouseId, zoneId: deactivateTarget.zone.id, request }
        await (isReactivation
          ? reactivateZoneMutation.mutateAsync(variables)
          : deactivateZoneMutation.mutateAsync(variables))
      } else if (deactivateTarget.type === 'Rack') {
        const variables = {
          warehouseId,
          zoneId: deactivateTarget.zone.id,
          rackId: deactivateTarget.rack.id,
          request,
        }
        await (isReactivation
          ? reactivateRackMutation.mutateAsync(variables)
          : deactivateRackMutation.mutateAsync(variables))
      } else {
        const variables = {
          warehouseId,
          rackId: deactivateTarget.rack.id,
          slotId: deactivateTarget.slot.id,
          request,
        }
        await (isReactivation
          ? reactivateSlotMutation.mutateAsync(variables)
          : deactivateSlotMutation.mutateAsync(variables))
      }
      toast.success(
        isReactivation
          ? `Đã kích hoạt lại ${deactivateLabel}.`
          : `Đã ngừng hoạt động ${deactivateLabel}.`
      )
      setDeactivateTarget(null)
      setDeactivateErrorMessage(null)
    } catch (error) {
      setDeactivateErrorMessage(
        getApiErrorMessage(
          error,
          isReactivation
            ? `Không thể kích hoạt lại ${deactivateLabel}. Vui lòng thử lại.`
            : `Không thể ngừng hoạt động ${deactivateLabel}. Vui lòng thử lại.`
        )
      )
    }
  }

  const isDeactivating =
    deactivateZoneMutation.isPending ||
    deactivateRackMutation.isPending ||
    deactivateSlotMutation.isPending ||
    reactivateZoneMutation.isPending ||
    reactivateRackMutation.isPending ||
    reactivateSlotMutation.isPending
  const isReactivation =
    deactivateTarget?.type === 'Zone'
      ? deactivateTarget.zone.status === 'Inactive'
      : deactivateTarget?.type === 'Rack'
        ? deactivateTarget.rack.status === 'Inactive'
        : deactivateTarget?.type === 'Slot'
          ? !deactivateTarget.slot.isActive
          : false
  const deactivateCode =
    deactivateTarget?.type === 'Zone'
      ? deactivateTarget.zone.zoneCode
      : deactivateTarget?.type === 'Rack'
        ? deactivateTarget.rack.rackCode
        : (deactivateTarget?.slot.slotCode ?? '')
  const deactivateLabel =
    deactivateTarget?.type === 'Zone'
      ? 'khu vực'
      : deactivateTarget?.type === 'Rack'
        ? 'kệ hàng'
        : 'vị trí lưu trữ'
  const cascadeDescription = (() => {
    if (isReactivation || !deactivateTarget) return null
    if (deactivateTarget.type === 'Rack') {
      const activeSlotCount = deactivateTarget.rack.slots.filter((slot) => slot.isActive).length
      return activeSlotCount > 0
        ? `Kệ này có ${activeSlotCount} vị trí lưu trữ đang hoạt động.`
        : null
    }
    if (deactivateTarget.type === 'Zone') {
      const activeRacks = deactivateTarget.zone.racks.filter((rack) => rack.status === 'Active')
      const activeSlotCount = deactivateTarget.zone.racks
        .flatMap((rack) => rack.slots)
        .filter((slot) => slot.isActive).length
      return activeRacks.length > 0 || activeSlotCount > 0
        ? `Khu vực này có ${activeRacks.length} kệ và ${activeSlotCount} vị trí lưu trữ đang hoạt động.`
        : null
    }
    return null
  })()

  return (
    <>
      <WarehouseLayoutView
        searchText={locationSearchText}
        lifecycleStatus={locationStatus}
        onSearchTextChange={setLocationSearchText}
        onLifecycleStatusChange={setLocationStatus}
        exportAction={
          listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
        }
        zones={zones}
        selectedZoneId={selection.selectedZoneId}
        selectedRackId={selection.selectedRackId}
        onSelectZone={(zoneId) => navigate(zoneId, null)}
        onSelectRack={(rackId) => navigate(selection.selectedZoneId, rackId)}
        onBackToZones={() => navigate(null, null)}
        onBackToRacks={() => navigate(selection.selectedZoneId, null)}
        canConfigure={capabilities.canConfigureLayout}
        canGenerateBarcode={capabilities.canGenerateLocationBarcode}
        isWarehouseActive={isWarehouseActive}
        onCreateZone={() => setZoneFormTarget({ mode: 'create' })}
        onImport={() => router.push(APP_ROUTES.warehouseLocationImport(warehouseId))}
        onCreateRack={(zone) => setRackFormTarget({ mode: 'create', zone })}
        onCreateSlot={(rack) => setSlotFormTarget({ mode: 'create', rack })}
        onEditZone={(zone) => setZoneFormTarget({ mode: 'update', zone })}
        onEditRack={(zone, rack) => setRackFormTarget({ mode: 'update', zone, rack })}
        onEditSlot={(rack, slot) => setSlotFormTarget({ mode: 'update', rack, slot })}
        onDeactivateZone={(zone) => openDeactivate({ type: 'Zone', zone })}
        onDeactivateRack={(zone, rack) => openDeactivate({ type: 'Rack', zone, rack })}
        onDeactivateSlot={(rack, slot) => openDeactivate({ type: 'Slot', rack, slot })}
        onReactivateZone={(zone) => openDeactivate({ type: 'Zone', zone })}
        onReactivateRack={(zone, rack) => openDeactivate({ type: 'Rack', zone, rack })}
        onReactivateSlot={(rack, slot) => openDeactivate({ type: 'Slot', rack, slot })}
        onBarcode={(type, locationId) =>
          router.push(APP_ROUTES.warehouseLocationBarcode(warehouseId, type, locationId) as Route)
        }
      />

      {zoneFormTarget ? (
        <ZoneFormSheet
          open
          mode={zoneFormTarget.mode}
          stagingDefaults={
            zoneFormTarget.mode === 'update'
              ? {
                  receiving: zoneFormTarget.zone.isDefaultReceivingPoint,
                  outbound: zoneFormTarget.zone.isDefaultOutboundStagingPoint,
                }
              : undefined
          }
          isPending={createZoneMutation.isPending || updateZoneMutation.isPending}
          defaultValues={
            zoneFormTarget.mode === 'update'
              ? {
                  zoneCode: zoneFormTarget.zone.zoneCode,
                  zoneName: zoneFormTarget.zone.zoneName,
                  description: zoneFormTarget.zone.description ?? '',
                  ...getWarehousePhysicalDetails(zoneFormTarget.zone),
                }
              : {
                  zoneCode: '',
                  zoneName: '',
                  description: '',
                  ...EMPTY_WAREHOUSE_PHYSICAL_DETAILS,
                }
          }
          onOpenChange={(open) => !open && setZoneFormTarget(null)}
          onSubmit={submitZone}
        />
      ) : null}

      {rackFormTarget ? (
        <RackFormSheet
          {...capacityFormProps}
          conflict={
            rackFormTarget.mode === 'update' && rackConflictTarget === rackFormTarget.rack.id
              ? { reload: () => reloadLocationForm('rack') }
              : undefined
          }
          location={rackFormTarget.mode === 'update' ? rackFormTarget.rack : undefined}
          open
          mode={rackFormTarget.mode}
          isPending={createRackMutation.isPending || updateRackMutation.isPending}
          defaultValues={
            rackFormTarget.mode === 'update'
              ? {
                  rackCode: rackFormTarget.rack.rackCode,
                  rackName: rackFormTarget.rack.rackName,
                  description: rackFormTarget.rack.description ?? '',
                  storageMode: rackFormTarget.rack.storageMode ?? 'SlotLevel',
                  allowsMixedProducts: rackFormTarget.rack.allowsMixedProducts ?? true,
                  ...getCapacityFormValues(rackFormTarget.rack),
                  expectedRowVersion: rackFormTarget.rack.rowVersion ?? '',
                  ...getWarehousePhysicalDetails(rackFormTarget.rack),
                }
              : {
                  rackCode: '',
                  rackName: '',
                  description: '',
                  storageMode: 'SlotLevel',
                  allowsMixedProducts: true,
                  ...getCapacityFormValues(),
                  ...EMPTY_WAREHOUSE_PHYSICAL_DETAILS,
                }
          }
          onOpenChange={(open) => {
            if (!open) {
              setRackFormTarget(null)
              setRackConflictTarget(null)
            }
          }}
          onSubmit={submitRack}
        />
      ) : null}

      {slotFormTarget ? (
        <SlotFormSheet
          {...capacityFormProps}
          conflict={
            slotFormTarget.mode === 'update' && slotConflictTarget === slotFormTarget.slot.id
              ? { reload: () => reloadLocationForm('slot') }
              : undefined
          }
          location={slotFormTarget.mode === 'update' ? slotFormTarget.slot : undefined}
          open
          mode={slotFormTarget.mode}
          isPending={createSlotMutation.isPending || updateSlotMutation.isPending}
          defaultValues={
            slotFormTarget.mode === 'update'
              ? {
                  slotCode: slotFormTarget.slot.slotCode,
                  slotName: slotFormTarget.slot.slotName,
                  description: slotFormTarget.slot.description ?? '',
                  allowsMixedProducts: slotFormTarget.slot.allowsMixedProducts ?? true,
                  ...getCapacityFormValues(slotFormTarget.slot),
                  expectedRowVersion: slotFormTarget.slot.rowVersion ?? '',
                  ...getWarehousePhysicalDetails(slotFormTarget.slot),
                }
              : {
                  slotCode: '',
                  slotName: '',
                  description: '',
                  allowsMixedProducts: true,
                  ...getCapacityFormValues(),
                  ...EMPTY_WAREHOUSE_PHYSICAL_DETAILS,
                }
          }
          onOpenChange={(open) => {
            if (!open) {
              setSlotFormTarget(null)
              setSlotConflictTarget(null)
            }
          }}
          onSubmit={submitSlot}
        />
      ) : null}

      <WarehouseLocationDeactivateDialog
        open={Boolean(deactivateTarget)}
        locationLabel={deactivateLabel}
        locationCode={deactivateCode}
        isPending={isDeactivating}
        errorMessage={deactivateErrorMessage}
        isReactivation={isReactivation}
        cascadeDescription={cascadeDescription}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null)
            setDeactivateErrorMessage(null)
          }
        }}
        onConfirm={(reason, cascadeToChildren) => void confirmLifecycle(reason, cascadeToChildren)}
      />
    </>
  )
}
