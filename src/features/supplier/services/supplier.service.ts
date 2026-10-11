import { axiosClient } from '@/lib/axios'
import type {
  SpreadsheetImportInspection,
  SpreadsheetImportPreviewInput,
} from '@/components/operations/spreadsheet-import.types'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  ImportSuppliersRequest,
  SaveSupplierRequest,
  Supplier,
  SupplierListQuery,
  SupplierImportPreview,
  SupplierListResponse,
} from '../types/supplier.types'

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export const supplierService = {
  downloadImportTemplate: async () => {
    const response = await axiosClient.get<Blob>(API_ENDPOINTS.suppliers.importTemplate, {
      responseType: 'blob',
    })
    downloadBlob(response.data, 'kovia-mau-nhap-nha-cung-cap.xlsx')
  },

  inspectImport: (input: { file: File; csvDelimiter: string }) => {
    const form = new FormData()
    form.append('file', input.file)
    form.append('csvDelimiter', input.csvDelimiter)
    return axiosClient
      .post<ApiResponse<SpreadsheetImportInspection>>(API_ENDPOINTS.suppliers.importInspect, form, {
        headers: { 'Content-Type': null },
      })
      .then((response) => response.data)
  },

  previewImport: (input: File | SpreadsheetImportPreviewInput) => {
    const { file, options } = input instanceof File ? { file: input, options: undefined } : input
    const form = new FormData()
    form.append('file', file)
    if (options) form.append('options', JSON.stringify(options))
    return axiosClient
      .post<ApiResponse<SupplierImportPreview>>(API_ENDPOINTS.suppliers.importPreview, form, {
        headers: { 'Content-Type': null },
      })
      .then((response) => response.data)
  },

  getNextSupplierCode: () =>
    axiosClient
      .get<ApiResponse<string>>(API_ENDPOINTS.suppliers.nextCode)
      .then((response) => response.data),

  getSuppliers: (params: SupplierListQuery) =>
    axiosClient
      .get<ApiResponse<SupplierListResponse>>(API_ENDPOINTS.suppliers.list, { params })
      .then((response) => response.data),

  getSupplier: (supplierId: string) =>
    axiosClient
      .get<ApiResponse<Supplier>>(API_ENDPOINTS.suppliers.detail(supplierId))
      .then((response) => response.data),

  createSupplier: (request: SaveSupplierRequest) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.suppliers.create, request)
      .then((response) => response.data),

  importSuppliers: (request: ImportSuppliersRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.suppliers.import, request)
      .then((response) => response.data),

  updateSupplier: (supplierId: string, request: SaveSupplierRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.suppliers.update(supplierId), request)
      .then((response) => response.data),

  // BE tra ve 204 No Content nen khong co body ApiResponse.
  deactivateSupplier: (supplierId: string) =>
    axiosClient.patch<void>(API_ENDPOINTS.suppliers.deactivate(supplierId)).then(() => undefined),

  reactivateSupplier: (supplierId: string) =>
    axiosClient.patch<void>(API_ENDPOINTS.suppliers.reactivate(supplierId)).then(() => undefined),
}
