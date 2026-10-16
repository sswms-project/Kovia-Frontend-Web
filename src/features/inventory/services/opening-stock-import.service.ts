import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type { OpeningStockImportOptions } from '../schemas/opening-stock-import.schema'
import type {
  OpeningStockImportCommit,
  OpeningStockImportInspection,
  OpeningStockImportOperation,
  OpeningStockImportPreview,
  OpeningStockFormOptions,
  OpeningStockLookupQuery,
} from '../types/opening-stock-import.types'
import type { OpeningStockRecord } from '../types/inventory.types'

const base = API_ENDPOINTS.inventory.openingStockImport
function multipart(file: File, options?: unknown) {
  const form = new FormData()
  form.append('file', file)
  if (options) form.append('options', JSON.stringify(options))
  return form
}
const headers = { 'Content-Type': 'multipart/form-data' }

export const openingStockImportService = {
  formOptions: (params: OpeningStockLookupQuery) =>
    axiosClient
      .get<
        ApiResponse<OpeningStockFormOptions>
      >(API_ENDPOINTS.inventory.openingStockFormOptions, { params: { ...params, productId: params.productId || undefined } })
      .then((response) => response.data.data),
  inspect: (file: File, csvDelimiter: string) => {
    const form = multipart(file)
    form.append('csvDelimiter', csvDelimiter)
    return axiosClient
      .post<ApiResponse<OpeningStockImportInspection>>(`${base}/inspect`, form, { headers })
      .then((r) => r.data.data)
  },
  preview: (file: File, options: OpeningStockImportOptions) =>
    axiosClient
      .post<
        ApiResponse<OpeningStockImportPreview>
      >(`${base}/preview`, multipart(file, options), { headers })
      .then((r) => r.data.data),
  commit: (file: File, options: OpeningStockImportCommit) =>
    axiosClient
      .post<ApiResponse<string>>(`${base}/commit`, multipart(file, options), { headers })
      .then((r) => r.data.data),
  operation: (commandId: string) =>
    axiosClient
      .get<
        ApiResponse<OpeningStockImportOperation>
      >(API_ENDPOINTS.inventory.openingStockImportOperation(commandId))
      .then((r) => r.data.data),
  template: (variant: 'basic' | 'full') =>
    axiosClient
      .get<Blob>(`${base}/template`, { params: { variant }, responseType: 'blob' })
      .then((r) => r.data),
  detail: (id: string) =>
    axiosClient
      .get<ApiResponse<OpeningStockRecord>>(API_ENDPOINTS.inventory.updateOpeningStock(id))
      .then((r) => r.data.data),
}
