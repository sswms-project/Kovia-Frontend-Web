import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { warehouseTaskService } from '@/features/warehouse-task/services/warehouse-task.service'
import { warehouseOverviewService } from '../services/warehouse-overview.service'

export function useWarehouseOverviewQuery(
  warehouseId: string | undefined,
  enabled: boolean,
  permissionKey: string,
  activityDays = 30
) {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: [
      'warehouse-overview',
      user?.tenantId,
      user?.id,
      permissionKey,
      warehouseId,
      activityDays,
    ],
    queryFn: () => warehouseOverviewService.getOverview(warehouseId, activityDays),
    enabled: enabled && Boolean(user?.tenantId),
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
