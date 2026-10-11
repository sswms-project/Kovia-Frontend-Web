'use client'

import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { P } from '@/config/permissionCodes'
import { ForecastRunPanel } from '../components/InventoryForecastPage'
import { useForecastWorkspace } from '../hooks/use-forecast-workspace'

export default function InventoryForecastPage() {
  const meQuery = useMeQuery()
  const permissions = meQuery.data?.permissions ?? []
  const warehousesQuery = useWarehousesQuery({
    top: 100,
    skip: 0,
    needTotalCount: true,
    isActive: true,
  })
  const workspace = useForecastWorkspace()
  return (
    <ForecastRunPanel
      workspace={workspace}
      warehouseOptions={(warehousesQuery.data?.items ?? []).map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
      }))}
      warehousesLoading={warehousesQuery.isLoading}
      warehousesError={warehousesQuery.isError}
      retryWarehouses={() => void warehousesQuery.refetch()}
      canRun={permissions.includes(P.PRODUCTS_CONFIGURE_POLICY)}
      canReview={
        permissions.includes(P.PRODUCTS_CONFIGURE_POLICY) &&
        permissions.includes(P.INBOUND_REQUESTS_CREATE)
      }
      canViewInbound={
        permissions.includes(P.INBOUND_REQUESTS_VIEW) &&
        permissions.includes(P.INBOUND_REQUESTS_VIEW_DRAFT)
      }
      canCreateTransfer={permissions.includes(P.TRANSFERS_CREATE)}
      permissions={permissions}
    />
  )
}
