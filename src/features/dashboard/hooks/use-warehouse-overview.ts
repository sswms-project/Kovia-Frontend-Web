import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { warehouseTaskService } from '@/features/warehouse-task/services/warehouse-task.service'
import { warehouseOverviewService } from '../services/warehouse-overview.service'
import type { ActivityDateRange } from '../schemas/activity-period.schema'

export function useWarehouseOverviewQuery(
  warehouseId: string | undefined,
  enabled: boolean,
  permissionKey: string,
  activityRange: ActivityDateRange | undefined,
  section: 'current' | 'activity' = 'activity'
) {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: [
      'warehouse-overview',
      section,
      user?.tenantId,
      user?.id,
      permissionKey,
      warehouseId,
      activityRange?.dateFrom,
      activityRange?.dateTo,
    ],
    queryFn: () => {
      if (!activityRange)
        throw new Error('Khoảng thời gian không hợp lệ. Vui lòng chọn lại kỳ hoạt động.')
      return warehouseOverviewService.getOverview(warehouseId, activityRange)
    },
    enabled: enabled && Boolean(user?.tenantId) && Boolean(activityRange),
    retry: false,
  })
}

export function useReportingWarehousesQuery(enabled: boolean, permissionKey: string) {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: ['reporting-warehouses', user?.tenantId, user?.id, permissionKey],
    queryFn: warehouseOverviewService.getWarehouses,
    enabled: enabled && Boolean(user?.tenantId),
    retry: false,
  })
}

export function usePersonalWorkOverviewQuery(enabled: boolean, permissionKey: string) {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: ['personal-work-overview', user?.tenantId, user?.id, permissionKey],
    queryFn: () =>
      warehouseTaskService
        .getCurrent({ pageNumber: 1, pageSize: 5 }, 'mine')
        .then((response) => response.data),
    enabled: enabled && Boolean(user?.tenantId),
    retry: false,
  })
}
