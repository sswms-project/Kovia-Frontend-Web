import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type { ActivityDateRange } from '../schemas/activity-period.schema'
import {
  reportingWarehouseSchema,
  warehouseActivitySchema,
  warehouseOverviewSchema,
} from '../schemas/warehouse-overview.schema'

function checkActivityRange(
  data: { activityDateFrom: string; activityDateTo: string },
  range: ActivityDateRange
) {
  if (data.activityDateFrom !== range.dateFrom || data.activityDateTo !== range.dateTo) {
    throw new Error('API chưa trả đúng kỳ hoạt động đã chọn. Vui lòng cập nhật backend và tải lại.')
  }
}

export const warehouseOverviewService = {
  getOverview: async (
    warehouseId: string | undefined,
    activityRange: ActivityDateRange,
    signal?: AbortSignal
  ) => {
    const response = await axiosClient.get<ApiResponse<unknown>>(API_ENDPOINTS.dashboard.overview, {
      params: {
        warehouseIds: warehouseId ? [warehouseId] : undefined,
        ...activityRange,
        includeActivity: false,
      },
      paramsSerializer: { indexes: null },
      signal,
    })
    const data = warehouseOverviewSchema.parse(response.data.data)
    checkActivityRange(data, activityRange)
    return data
  },
  getActivity: async (
    warehouseId: string | undefined,
    activityRange: ActivityDateRange,
    signal?: AbortSignal
  ) => {
    const response = await axiosClient.get<ApiResponse<unknown>>(API_ENDPOINTS.dashboard.activity, {
      params: { warehouseIds: warehouseId ? [warehouseId] : undefined, ...activityRange },
      paramsSerializer: { indexes: null },
      signal,
    })
    const data = warehouseActivitySchema.parse(response.data.data)
    checkActivityRange(data, activityRange)
    return data
  },
  getWarehouses: async () => {
    const response = await axiosClient.get<ApiResponse<unknown>>(API_ENDPOINTS.dashboard.warehouses)
    return reportingWarehouseSchema.array().parse(response.data.data)
  },
}
