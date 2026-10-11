import { axiosClient } from '@/lib/axios'
import type { ApiResponse } from '@/types/api'
import type {
  WarehouseLocationImportMode,
  WarehouseLocationImportOptions,
  WarehouseLocationImportSelection,
} from '../schemas/warehouse-location-import.schema'
import type {
  WarehouseLocationImportInspection,
  WarehouseLocationImportPreview,
  WarehouseLocationImportResult,
} from '../types/warehouse-location-import.types'

const basePath = (warehouseId: string) =>
  `/warehouses/${encodeURIComponent(warehouseId)}/locations/import`

export const warehouseLocationImportService = {
  inspect: (
    warehouseId: string,
    file: File,
    mode: WarehouseLocationImportMode,
    csvDelimiter: string
  ) => {
    const form = new FormData()
    form.append('file', file)
    form.append('mode', mode)
    form.append('csvDelimiter', csvDelimiter)
    return axiosClient
      .post<
        ApiResponse<WarehouseLocationImportInspection>
      >(`${basePath(warehouseId)}/inspect`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((response) => response.data.data)
  },
  preview: (warehouseId: string, file: File, options: WarehouseLocationImportOptions) => {
    const form = new FormData()
    form.append('file', file)
    form.append('options', JSON.stringify(options))
    return axiosClient
      .post<ApiResponse<WarehouseLocationImportPreview>>(`${basePath(warehouseId)}/preview`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response) => response.data.data)
  },
  commit: (
    warehouseId: string,
    file: File,
    options: WarehouseLocationImportOptions,
    selection: WarehouseLocationImportSelection
  ) => {
    const form = new FormData()
    form.append('file', file)
    form.append('options', JSON.stringify(options))
    form.append('selection', JSON.stringify(selection))
    return axiosClient
      .post<ApiResponse<WarehouseLocationImportResult>>(`${basePath(warehouseId)}/commit`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response) => response.data.data)
  },
  template: (warehouseId: string, mode: WarehouseLocationImportMode) =>
    axiosClient
      .get<Blob>(`${basePath(warehouseId)}/template`, { params: { mode }, responseType: 'blob' })
      .then((response) => response.data),
}
