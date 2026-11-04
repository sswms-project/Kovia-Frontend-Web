import { axiosClient } from '@/lib/axios'
import { downloadInventoryExport, inventoryExportFileName } from '@/lib/excel-download'
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
  getOptions: async (
    warehouseId?: string,
    search?: string,
    categoryId?: string,
    signal?: AbortSignal
  ) => {
    const response = await axiosClient.get<ApiResponse<unknown>>(API_ENDPOINTS.reports.options, {
      params: { warehouseIds: warehouseId ? [warehouseId] : undefined, search, categoryId },
      paramsSerializer: { indexes: null },
      signal,
    })
    return reportOptionsSchema.parse(response.data.data)
  },
  getReport: async (type: string, params: WarehouseReportQuery, signal?: AbortSignal) => {
    const response = await axiosClient.get<ApiResponse<unknown>>(API_ENDPOINTS.reports.view(type), {
      params,
      paramsSerializer: { indexes: null },
      signal,
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
    downloadInventoryExport(
      new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      inventoryExportFileName(response.headers['content-disposition'])
    )
  },
}
