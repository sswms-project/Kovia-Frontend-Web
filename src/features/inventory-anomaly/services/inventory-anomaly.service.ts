import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  InventoryAnomaly,
  InventoryAnomalyListQuery,
  InventoryAnomalyListResponse,
  InventoryAnomalyScan,
  InventoryAnomalySummary,
  ReviewInventoryAnomalyRequest,
} from '../types/inventory-anomaly.types'

export const inventoryAnomalyService = {
  getAnomalies: (params: InventoryAnomalyListQuery) =>
    axiosClient
      .get<
        ApiResponse<InventoryAnomalyListResponse>
      >(API_ENDPOINTS.inventoryAnomalies.list, { params })
      .then((response) => response.data),

  getSummary: (warehouseId: string) =>
    axiosClient
      .get<ApiResponse<InventoryAnomalySummary>>(API_ENDPOINTS.inventoryAnomalies.summary, {
        params: warehouseId ? { warehouseId } : undefined,
      })
      .then((response) => response.data),

  getScans: (warehouseId: string) =>
    axiosClient
      .get<ApiResponse<InventoryAnomalyScan[]>>(API_ENDPOINTS.inventoryAnomalies.scans, {
        params: { warehouseId },
      })
      .then((response) => response.data),

  // Chỉ tạo lượt quét; mô hình chạy nền, trạng thái đọc lại qua summary.
  startScan: (warehouseId: string) =>
    axiosClient
      .post<
        ApiResponse<InventoryAnomalyScan>
      >(API_ENDPOINTS.inventoryAnomalies.scans, { warehouseId })
      .then((response) => response.data),

  review: (id: string, request: ReviewInventoryAnomalyRequest) =>
    axiosClient
      .post<ApiResponse<InventoryAnomaly>>(API_ENDPOINTS.inventoryAnomalies.review(id), request)
      .then((response) => response.data),
}
