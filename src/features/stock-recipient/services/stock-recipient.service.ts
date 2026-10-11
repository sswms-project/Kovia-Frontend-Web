import { axiosClient } from '@/lib/axios'
import type {
  SpreadsheetImportInspection,
  SpreadsheetImportPreviewInput,
} from '@/components/operations/spreadsheet-import.types'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  CreateStockRecipientRequest,
  ImportStockRecipientsRequest,
  StockRecipient,
  StockRecipientImportPreview,
  StockRecipientListQuery,
  StockRecipientListResponse,
  StockRecipientIssueHistoryQuery,
  StockRecipientIssueHistoryResponse,
  UpdateStockRecipientRequest,
} from '../types/stock-recipient.types'

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export const stockRecipientService = {
  downloadImportTemplate: async () => {
    const response = await axiosClient.get<Blob>(API_ENDPOINTS.stockRecipients.importTemplate, {
      responseType: 'blob',
    })
    downloadBlob(response.data, 'kovia-mau-nhap-khach-hang.xlsx')
  },

  inspectImport: (input: { file: File; csvDelimiter: string }) => {
    const form = new FormData()
    form.append('file', input.file)
    form.append('csvDelimiter', input.csvDelimiter)
    return axiosClient
      .post<ApiResponse<SpreadsheetImportInspection>>(
        API_ENDPOINTS.stockRecipients.importInspect,
        form,
        {
          headers: { 'Content-Type': null },
        }
      )
      .then((response) => response.data)
  },

  previewImport: (input: File | SpreadsheetImportPreviewInput) => {
    const { file, options } = input instanceof File ? { file: input, options: undefined } : input
    const form = new FormData()
    form.append('file', file)
    if (options) form.append('options', JSON.stringify(options))
    return axiosClient
      .post<
        ApiResponse<StockRecipientImportPreview>
      >(API_ENDPOINTS.stockRecipients.importPreview, form, { headers: { 'Content-Type': null } })
      .then((response) => response.data)
  },

  importStockRecipients: (request: ImportStockRecipientsRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.stockRecipients.import, request)
      .then((response) => response.data),

  getNextCode: () =>
    axiosClient
      .get<ApiResponse<string>>(API_ENDPOINTS.stockRecipients.nextCode)
      .then((response) => response.data),

  getStockRecipients: (params: StockRecipientListQuery) =>
    axiosClient
      .get<ApiResponse<StockRecipientListResponse>>(API_ENDPOINTS.stockRecipients.list, { params })
      .then((response) => response.data),

  getStockRecipient: (stockRecipientId: string) =>
    axiosClient
      .get<ApiResponse<StockRecipient>>(API_ENDPOINTS.stockRecipients.detail(stockRecipientId))
      .then((response) => response.data),

  getIssueHistory: (stockRecipientId: string, params: StockRecipientIssueHistoryQuery) =>
    axiosClient
      .get<
        ApiResponse<StockRecipientIssueHistoryResponse>
      >(API_ENDPOINTS.stockRecipients.issueHistory(stockRecipientId), { params })
      .then((response) => response.data),

  createStockRecipient: (request: CreateStockRecipientRequest) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.stockRecipients.create, request)
      .then((response) => response.data),

  updateStockRecipient: (stockRecipientId: string, request: UpdateStockRecipientRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.stockRecipients.update(stockRecipientId), request)
      .then((response) => response.data),

  changeStatus: (stockRecipientId: string, status: 'Active' | 'Inactive') =>
    axiosClient
      .patch<
        ApiResponse<unknown>
      >(status === 'Active' ? API_ENDPOINTS.stockRecipients.reactivate(stockRecipientId) : API_ENDPOINTS.stockRecipients.deactivate(stockRecipientId))
      .then((response) => response.data),
}
