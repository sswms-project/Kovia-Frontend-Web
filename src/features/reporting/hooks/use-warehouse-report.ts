import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage, formatApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { useAuthStore } from '@/stores/auth.store'
import { warehouseReportService } from '../services/warehouse-report.service'
import type { WarehouseReportQuery } from '../types/warehouse-report.types'

export function useExportWarehouseReport() {
  return useMutation({
    mutationFn: ({ type, query }: { type: string; query: WarehouseReportQuery }) =>
      warehouseReportService.exportExcel(type, query),
    onSuccess: () => toast.success('Đã tải báo cáo Excel.'),
    onError: (error: unknown) => {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể xuất báo cáo. Vui lòng thử lại.'))
    },
  })
}

export function useWarehouseReportCatalog(enabled: boolean, permissionKey: string) {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: ['report-catalog', user?.tenantId, user?.id, permissionKey],
    queryFn: warehouseReportService.getCatalog,
    enabled: enabled && Boolean(user?.tenantId),
    retry: false,
  })
}
export function useWarehouseReportOptions(
  enabled: boolean,
  permissionKey: string,
  warehouseId?: string,
  search?: string
) {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: ['report-options', user?.tenantId, user?.id, permissionKey, warehouseId, search],
    queryFn: () => warehouseReportService.getOptions(warehouseId, search),
    enabled: enabled && Boolean(user?.tenantId),
    retry: false,
  })
}
export function useWarehouseReport(
  type: string,
  query: WarehouseReportQuery | null,
  enabled: boolean,
  permissionKey: string
) {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: ['warehouse-report', user?.tenantId, user?.id, permissionKey, type, query],
    queryFn: () => warehouseReportService.getReport(type, query ?? { pageNumber: 1, pageSize: 25 }),
    enabled: enabled && Boolean(user?.tenantId && query),
    retry: false,
  })
}
