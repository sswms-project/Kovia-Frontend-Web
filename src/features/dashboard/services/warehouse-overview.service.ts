import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import {
  reportingWarehouseSchema,
  warehouseOverviewSchema,
} from '../schemas/warehouse-overview.schema'

export const warehouseOverviewService = {
  getOverview: async (warehouseId?: string, activityDays = 30) => {
    const response = await axiosClient.get<ApiResponse<unknown>>(API_ENDPOINTS.dashboard.overview, {
      params: { warehouseIds: warehouseId ? [warehouseId] : undefined, activityDays },
      paramsSerializer: { indexes: null },
    })
    return warehouseOverviewSchema.parse(response.data.data)
  },
  getWarehouses: async () => {
    const response = await axiosClient.get<ApiResponse<unknown>>(API_ENDPOINTS.dashboard.warehouses)
    return reportingWarehouseSchema.array().parse(response.data.data)
  },
}
