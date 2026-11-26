import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  LowStockAlert,
  LowStockAlertFilters,
  LowStockPage,
  LowStockWarehousePage,
} from '../types/low-stock-alert.types'
const endpoint = API_ENDPOINTS.inventory.lowStockAlerts
export const lowStockAlertService = {
  async list(params: LowStockAlertFilters, signal?: AbortSignal) {
    return (
      await axiosClient.get<ApiResponse<LowStockPage<LowStockAlert>>>(endpoint, { params, signal })
    ).data.data
  },
  async detail(id: string, signal?: AbortSignal) {
    return (
      await axiosClient.get<ApiResponse<LowStockAlert>>(`${endpoint}/${encodeURIComponent(id)}`, {
        signal,
      })
    ).data.data
  },
  async warehouses(
    params: {
      searchTerm?: string
      pageNumber: number
      pageSize: number
      selectedWarehouseId?: string
    },
    signal?: AbortSignal
  ) {
    return (
      await axiosClient.get<ApiResponse<LowStockWarehousePage>>(`${endpoint}/warehouse-options`, {
        params,
        signal,
      })
    ).data.data
  },
}
