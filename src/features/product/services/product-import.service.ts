import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  ProductImportInspect,
  ProductImportOptions,
  ProductImportPreview,
} from '../types/product-import.types'

export const productImportService = {
  inspect: (
    file: File,
    csvDelimiter: ProductImportOptions['csvDelimiter'],
    signal: AbortSignal
  ) => {
    const data = new FormData()
    data.append('file', file)
    data.append('csvDelimiter', csvDelimiter)
    return axiosClient
      .post<
        ApiResponse<ProductImportInspect>
      >(API_ENDPOINTS.products.importInspect, data, { signal, headers: { 'Content-Type': 'multipart/form-data' } })
      .then((response) => response.data.data)
  },
  preview: (file: File, options: ProductImportOptions, signal: AbortSignal) => {
    const data = new FormData()
    data.append('file', file)
    data.append('options', JSON.stringify(options))
    return axiosClient
      .post<
        ApiResponse<ProductImportPreview>
      >(API_ENDPOINTS.products.importPreview, data, { signal, headers: { 'Content-Type': 'multipart/form-data' } })
      .then((response) => response.data.data)
  },
  template: (variant: 'basic' | 'full') =>
    axiosClient
      .get<Blob>(API_ENDPOINTS.products.importTemplate, {
        params: { variant },
        responseType: 'blob',
      })
      .then((response) => response.data),
}
