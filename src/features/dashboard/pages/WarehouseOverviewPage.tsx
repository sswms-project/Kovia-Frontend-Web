'use client'

import { useState } from 'react'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/api-error'
import { APP_ROUTES } from '@/routes/app-routes'
import { WarehouseOverviewView } from '../components/WarehouseOverview'
import {
  useReportingWarehousesQuery,
  useWarehouseOverviewQuery,
} from '../hooks/use-warehouse-overview'

export default function WarehouseOverviewPage() {
  const [warehouseId, setWarehouseId] = useState('')
  const [activityDays, setActivityDays] = useState(30)
  const me = useMeQuery()
  const permissions = me.data?.permissions ?? []
  const permissionKey = [...permissions].sort().join('|')
  const canView = permissions.includes(P.DASHBOARD_VIEW)
  const options = useReportingWarehousesQuery(canView, permissionKey)
  const overview = useWarehouseOverviewQuery(
    warehouseId || undefined,
    canView,
    permissionKey,
    activityDays
  )
  const inventoryLink = permissions.includes(P.INVENTORY_VIEW)
    ? { pathname: APP_ROUTES.inventory, query: warehouseId ? { warehouseId } : {} }
    : undefined
  return (
    <WarehouseOverviewView
      data={canView ? overview.data : undefined}
      warehouses={options.data ?? []}
      warehouseId={warehouseId}
      activityDays={activityDays}
      onActivityDaysChange={setActivityDays}
      isLoading={me.isPending || (canView && overview.isPending)}
      isFetching={overview.isFetching}
      errorMessage={
        me.isError
          ? getApiErrorMessage(me.error)
          : !me.isPending && !canView
            ? 'Bạn không có quyền xem tổng quan kho.'
            : overview.isError
              ? getApiErrorMessage(overview.error)
              : options.isError
                ? getApiErrorMessage(options.error)
                : undefined
      }
      links={{
        forecast: permissions.includes(P.INVENTORY_VIEW)
          ? { pathname: APP_ROUTES.reportForecast }
          : undefined,
        inventory: inventoryLink,
        reports: permissions.includes(P.REPORTS_VIEW)
          ? { pathname: APP_ROUTES.reports }
          : undefined,
        lowStock: permissions.includes(P.REPORTS_VIEW)
          ? {
              pathname: `${APP_ROUTES.reports}/replenishment`,
              query: { warehouseId, autoRun: '1' },
            }
          : undefined,
        tasks:
          permissions.includes(P.WAREHOUSE_TASKS_VIEW_ALL) ||
          permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN)
            ? {
                pathname: APP_ROUTES.myTasks,
                query: { deadlineStatus: 'Overdue', ...(warehouseId ? { warehouseId } : {}) },
              }
            : undefined,
      }}
      onWarehouseChange={setWarehouseId}
      onRefresh={() => {
        void overview.refetch()
        void options.refetch()
      }}
    />
  )
}
