import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { stockAlertService } from '../services/stock-alert.service'
import type { StockAlertParams } from '../schemas/stock-alert.schema'

export function useStockAlertsQuery(
  params: StockAlertParams,
  enabled: boolean,
  permissionKey: string
) {
  const user = useAuthStore((state) => state.user)
  const normalized = {
    ...params,
    expiringDays: params.kind === 'expiring' ? (params.expiringDays ?? 5) : undefined,
    search: params.search?.trim() || undefined,
  }
  return useQuery({
    queryKey: ['stock-alerts', user?.tenantId, user?.id, permissionKey, normalized],
    queryFn: ({ signal }) => stockAlertService.getAlerts(normalized, signal),
    enabled: enabled && Boolean(user?.tenantId),
    staleTime: 30_000,
    retry: false,
  })
}
