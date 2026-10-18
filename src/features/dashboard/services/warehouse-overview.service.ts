import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type { ActivityDateRange } from '../schemas/activity-period.schema'
import {
  reportingWarehouseSchema,
  warehouseOverviewSchema,
} from '../schemas/warehouse-overview.schema'

export const warehouseOverviewService = {
  getOverview: async (warehouseId: string | undefined, activityRange: ActivityDateRange) => {
    const response = await axiosClient.get<ApiResponse<unknown>>(API_ENDPOINTS.dashboard.overview, {
      params: { warehouseIds: warehouseId ? [warehouseId] : undefined, ...activityRange },
      paramsSerializer: { indexes: null },
    })
    const data = warehouseOverviewSchema.parse(response.data.data)
    if (
      data.activityDateFrom !== activityRange.dateFrom ||
      data.activityDateTo !== activityRange.dateTo
    ) {
      throw new Error(
        'API chưa trả đúng kỳ hoạt động đã chọn. Vui lòng cập nhật backend và tải lại.'
      )
    }
    return data
  },
  getWarehouses: async () => {
    const response = await axiosClient.get<ApiResponse<unknown>>(API_ENDPOINTS.dashboard.warehouses)
    return reportingWarehouseSchema.array().parse(response.data.data)
  },
}
