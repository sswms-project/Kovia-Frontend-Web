'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { formatApiError } from '@/lib/api-error'
import type { ZoneResponse } from '@/types/warehouse'
import {
  WarehouseOverview,
  ZoneFormSheet,
  IsolationAreaDialog,
} from '../components/WarehouseDetailPage'
import {
  useWarehouseQuery,
  useWarehouseLayoutQuery,
  useCreateZoneMutation,
  useUpdateZoneMutation,
} from '../hooks/use-warehouse'
import {
  getWarehousePhysicalDetails,
  EMPTY_WAREHOUSE_PHYSICAL_DETAILS,
} from '../utils/warehouse-physical-details'
import type { ZoneFormValues } from '../schemas/warehouse.schema'

interface WarehouseDetailPageProps {
  readonly warehouseId: string
}

export function WarehouseDetailPage({ warehouseId }: WarehouseDetailPageProps) {
  const warehouseQuery = useWarehouseQuery(warehouseId)
  const layoutQuery = useWarehouseLayoutQuery(warehouseId, true)
  const meQuery = useMeQuery()
  const canConfigure = meQuery.data?.permissions?.includes(P.WAREHOUSES_CONFIGURE_LAYOUT) ?? false
  const [choosingArea, setChoosingArea] = useState(false)
  const [target, setTarget] = useState<{ zone: ZoneResponse | null } | null>(null)
  const createZone = useCreateZoneMutation()
  const updateZone = useUpdateZoneMutation()
  const isolationPoints = (layoutQuery.data ?? [])
    .filter((zone) => zone.status === 'Active')
    .flatMap((zone) =>
      zone.racks
        .filter((rack) => rack.status === 'Active')
        .filter(
          (rack) =>
            rack.isIsolationPoint ||
            rack.slots.some((slot) => slot.isActive && slot.isIsolationPoint)
        )
        .map(
          (rack) =>
            `Khu ${zone.zoneCode} - ${zone.zoneName} / ${rack.rackCode}${zone.isDefaultIsolationPoint ? ' · Mặc định' : ''}`
        )
    )

  async function saveIsolation(values: ZoneFormValues) {
    if (!target) return false
    try {
      if (target.zone)
        await updateZone.mutateAsync({
          warehouseId,
          zoneId: target.zone.id,
          request: { ...values, expectedRowVersion: target.zone.rowVersion ?? '' },
        })
      else await createZone.mutateAsync({ warehouseId, request: values })
      toast.success('Đã cập nhật điểm cách ly của kho.')
      setTarget(null)
      return true
    } catch (error) {
      toast.error(formatApiError(error))
      return false
    }
  }

  if (!warehouseQuery.data) {
    return <Skeleton className="h-72" />
  }

  return (
    <>
      <WarehouseOverview
        warehouse={warehouseQuery.data}
        isolationLabel={
          layoutQuery.isError
            ? 'Chưa tải được cấu hình. Vui lòng tải lại trang.'
            : layoutQuery.isFetching
              ? 'Đang tải cấu hình…'
              : isolationPoints.join('; ') || 'Chưa cấu hình'
        }
        canConfigureIsolation={canConfigure && Boolean(layoutQuery.data) && !layoutQuery.isFetching}
        onConfigureIsolation={() => setChoosingArea(true)}
      />
      <IsolationAreaDialog
        open={choosingArea}
        zones={layoutQuery.data ?? []}
        onOpenChange={setChoosingArea}
        onSelect={(zone) => {
          setChoosingArea(false)
          setTarget({ zone })
        }}
      />
      {target ? (
        <ZoneFormSheet
          open
          mode={target.zone ? 'update' : 'create'}
          isPending={createZone.isPending || updateZone.isPending}
          stagingDefaults={{ isolation: target.zone?.isDefaultIsolationPoint }}
          defaultValues={{
            ...(target.zone
              ? getWarehousePhysicalDetails(target.zone)
              : EMPTY_WAREHOUSE_PHYSICAL_DETAILS),
            zoneCode: target.zone?.zoneCode ?? '',
            zoneName: target.zone?.zoneName ?? '',
            description: target.zone?.description ?? '',
            createIsolationPoint: true,
            setAsDefaultStagingPoint: target.zone
              ? (target.zone.isDefaultIsolationPoint ?? false)
              : isolationPoints.length === 0,
          }}
          onOpenChange={(open) => {
            if (!open) setTarget(null)
          }}
          onSubmit={saveIsolation}
        />
      ) : null}
    </>
  )
}
