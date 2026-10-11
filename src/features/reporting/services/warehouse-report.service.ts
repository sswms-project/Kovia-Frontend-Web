import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import {
  reportDefinitionSchema,
  reportOptionsSchema,
  reportResponseSchema,
} from '../schemas/warehouse-report.schema'
import type { WarehouseReportQuery } from '../types/warehouse-report.types'

export const warehouseReportService = {
  getCatalog: async () => {
    const response = await axiosClient.get<ApiResponse<unknown>>(API_ENDPOINTS.reports.catalog)
    return reportDefinitionSchema.array().parse(response.data.data)
  },
  getOptions: async (warehouseId?: string, search?: string) => {
    const response = await axiosClient.get<ApiResponse<unknown>>(API_ENDPOINTS.reports.options, {
      params: { warehouseIds: warehouseId ? [warehouseId] : undefined, search },
      paramsSerializer: { indexes: null },
    })
    return reportOptionsSchema.parse(response.data.data)
  },
  getReport: async (type: string, params: WarehouseReportQuery) => {
    const response = await axiosClient.get<ApiResponse<unknown>>(API_ENDPOINTS.reports.view(type), {
      params,
      paramsSerializer: { indexes: null },
    })
    return reportResponseSchema.parse(response.data.data)
  },
  exportExcel: async (type: string, params: WarehouseReportQuery) => {
    const response = await axiosClient.get<ArrayBuffer>(API_ENDPOINTS.reports.export(type), {
      params,
      paramsSerializer: { indexes: null },
      responseType: 'arraybuffer',
      transformResponse: [
        (data: unknown, headers, status) => {
          if (
            data instanceof ArrayBuffer &&
            status &&
            status >= 400 &&
            String(headers['content-type']).includes('json')
          ) {
            try {
              return JSON.parse(new TextDecoder().decode(data)) as unknown
            } catch {
              return data
            }
          }
          return data
        },
      ],
    })
    const url = URL.createObjectURL(
      new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `kovia-${type}.xlsx`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    // Keep the object URL alive until the browser has consumed the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}
