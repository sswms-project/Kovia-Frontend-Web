import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import {
  stockExpiryAlertsSchema,
  stockExpiryDistributionSchema,
  stockThresholdAlertsSchema,
  type StockAlertParams,
} from '../schemas/stock-alert.schema'

export const stockAlertService = {
  getAlerts: async (params: StockAlertParams, signal?: AbortSignal) => {
    const threshold = params.kind === 'below-minimum' || params.kind === 'above-maximum'
    const response = await axiosClient.get<ApiResponse<unknown>>(
      threshold
        ? API_ENDPOINTS.dashboard.stockThresholdAlerts
        : API_ENDPOINTS.dashboard.stockExpiryAlerts,
      {
        signal,
        params: {
          kind: params.kind,
          warehouseIds: params.warehouseId ? [params.warehouseId] : undefined,
          expiringDays: params.kind === 'expiring' ? params.expiringDays : undefined,
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
          search: params.search?.trim() || undefined,
        },
        paramsSerializer: { indexes: null },
      }
    )
    return threshold
      ? stockThresholdAlertsSchema.parse(response.data.data)
      : stockExpiryAlertsSchema.parse(response.data.data)
  },
  getExpiryDistribution: async (
    params: { readonly warehouseId?: string; readonly expiringDays: number },
    signal?: AbortSignal
  ) => {
    const response = await axiosClient.get<ApiResponse<unknown>>(
      API_ENDPOINTS.dashboard.stockExpiryDistribution,
      {
        signal,
        params: {
          warehouseIds: params.warehouseId ? [params.warehouseId] : undefined,
          expiringDays: params.expiringDays,
        },
        paramsSerializer: { indexes: null },
      }
    )
    return stockExpiryDistributionSchema.parse(response.data.data)
  },
}
