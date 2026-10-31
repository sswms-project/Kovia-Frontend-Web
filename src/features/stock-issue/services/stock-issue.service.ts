import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import { stockIssueSourceOptionsSchema } from '../schemas/stock-issue-sources.schema'
import type { StockIssueManualSourceDraft } from '../types/stock-issue.types'
import type {
  SpreadsheetImportInspection,
  SpreadsheetImportPreviewInput,
} from '@/components/operations/spreadsheet-import.types'
import type { ApiResponse } from '@/types/api'
import type { AuditLogListResponse } from '@/features/platform-services/types/platform-services.types'
import type {
  AssignStockIssuePickerRequest,
  CancelStockIssueRequestRequest,
  ReportStockIssuePickIssueRequest,
  StockIssueAuditLogQuery,
  CreateStockIssueRequestRequest,
  ImportStockIssueRequestsRequest,
  StockIssueAttachment,
  StockIssueImportPreview,
  RecordStockPickingRequest,
  StockIssueRequestListQuery,
  StockIssueRequestListResponse,
  StockIssueProductOption,
  StockIssueProductOptionQuery,
  StockIssueRequestSummary,
  UpdateStockIssueRequestRequest,
  CreateGoodsReturnRequestRequest,
  GoodsReturnLineSuggestion,
  GoodsReturnSuggestionLineRequest,
  RejectGoodsReturnRequestRequest,
  GoodsReturnRequestListQuery,
  GoodsReturnRequestListResponse,
  GoodsReturnRequestSummary,
  ReleaseStockIssueRequestRequest,
  RestockGoodsReturnRequest,
  GoodsReturnRestockOptions,
} from '../types/stock-issue.types'

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export const stockIssueService = {
  getNextGoodsReturnCode: () =>
    axiosClient
      .get<ApiResponse<string>>(API_ENDPOINTS.goodsReturnRequests.nextCode)
      .then((response) => response.data),
  sourceOptions: async (
    id: string,
    itemId: string,
    search: string,
    signal?: AbortSignal,
    selectedStockId?: string
  ) => {
    const response = await axiosClient.get<ApiResponse<unknown>>(
      API_ENDPOINTS.stockIssueRequests.sourceOptions(id),
      { params: { itemId, search, selectedStockId }, signal }
    )
    return stockIssueSourceOptionsSchema.parse(response.data.data)
  },
  adjustSources: (draft: StockIssueManualSourceDraft, commandId: string) =>
    axiosClient.put<ApiResponse<unknown>>(
      API_ENDPOINTS.stockIssueRequests.pickingSources(draft.orderId),
      {
        expectedVersion: draft.version,
        commandId,
        allocations: draft.allocations,
        reason: draft.allocationReason,
      }
    ),
  getAllowedActions: (id: string) =>
    axiosClient
      .get<
        ApiResponse<{ allowedActions: string[] }>
      >(API_ENDPOINTS.stockIssueRequests.allowedActions(id))
      .then((response) => response.data.data),
  withdraw: (id: string, request: { expectedVersion: string; commandId: string; reason: string }) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.stockIssueRequests.withdraw(id), request)
      .then((response) => response.data),
  downloadImportTemplate: async () => {
    const response = await axiosClient.get<Blob>(API_ENDPOINTS.stockIssueRequests.importTemplate, {
      responseType: 'blob',
    })
    downloadBlob(response.data, 'kovia-mau-nhap-phieu-xuat-kho.xlsx')
  },

  inspectImport: (input: { file: File; csvDelimiter: string }) => {
    const form = new FormData()
    form.append('file', input.file)
    form.append('csvDelimiter', input.csvDelimiter)
    return axiosClient
      .post<
        ApiResponse<SpreadsheetImportInspection>
      >(API_ENDPOINTS.stockIssueRequests.importInspect, form, { headers: { 'Content-Type': null } })
      .then((response) => response.data)
  },

  previewImport: (input: { warehouseId: string } & SpreadsheetImportPreviewInput) => {
    const form = new FormData()
    form.append('warehouseId', input.warehouseId)
    form.append('file', input.file)
    if (input.options) form.append('options', JSON.stringify(input.options))
    return axiosClient
      .post<
        ApiResponse<StockIssueImportPreview>
      >(API_ENDPOINTS.stockIssueRequests.importPreview, form, { headers: { 'Content-Type': null } })
      .then((response) => response.data)
  },

  importRequests: (request: ImportStockIssueRequestsRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.stockIssueRequests.import, request)
      .then((response) => response.data),

  uploadAttachment: (stockIssueRequestId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return axiosClient
      .post<
        ApiResponse<StockIssueAttachment>
      >(API_ENDPOINTS.stockIssueRequests.attachments(stockIssueRequestId), form, { headers: { 'Content-Type': null } })
      .then((response) => response.data)
  },

  downloadAttachment: async (stockIssueRequestId: string, attachment: StockIssueAttachment) => {
    const response = await axiosClient.get<Blob>(
      API_ENDPOINTS.stockIssueRequests.attachment(stockIssueRequestId, attachment.id),
      { responseType: 'blob' }
    )
    downloadBlob(response.data, attachment.fileName)
  },

  deleteAttachment: (stockIssueRequestId: string, attachmentId: string) =>
    axiosClient
      .delete<
        ApiResponse<unknown>
      >(API_ENDPOINTS.stockIssueRequests.attachment(stockIssueRequestId, attachmentId))
      .then((response) => response.data),

  getStockIssueRequests: (params: StockIssueRequestListQuery) =>
    axiosClient
      .get<
        ApiResponse<StockIssueRequestListResponse>
      >(API_ENDPOINTS.stockIssueRequests.list, { params })
      .then((response) => response.data),

  getProductOptions: (params: StockIssueProductOptionQuery) =>
    axiosClient
      .get<
        ApiResponse<{ items: StockIssueProductOption[] }>
      >(API_ENDPOINTS.stockIssueRequests.productOptions, { params })
      .then((response) => response.data),

  getStockIssueRequest: (stockIssueRequestId: string) =>
    axiosClient
      .get<
        ApiResponse<StockIssueRequestSummary>
      >(API_ENDPOINTS.stockIssueRequests.detail(stockIssueRequestId))
      .then((response) => response.data),

  createStockIssueRequest: (request: CreateStockIssueRequestRequest) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.stockIssueRequests.create, request)
      .then((response) => response.data),

  getNextCode: () =>
    axiosClient
      .get<ApiResponse<string>>(API_ENDPOINTS.stockIssueRequests.nextCode)
      .then((response) => response.data),

  updateStockIssueRequest: (request: UpdateStockIssueRequestRequest) =>
    axiosClient
      .put<
        ApiResponse<unknown>
      >(API_ENDPOINTS.stockIssueRequests.detail(request.stockIssueRequestId), request)
      .then((response) => response.data),

  releaseForPicking: (request: ReleaseStockIssueRequestRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.stockIssueRequests.releaseForPicking(request.stockIssueRequestId), request)
      .then((response) => response.data),

  assignPicker: (request: AssignStockIssuePickerRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.stockIssueRequests.assignPicker(request.stockIssueRequestId), request)
      .then((response) => response.data),

  cancelStockIssueRequest: (request: CancelStockIssueRequestRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.stockIssueRequests.cancel(request.stockIssueRequestId), request)
      .then((response) => response.data),

  getStockIssueRequestAuditLogs: (stockIssueRequestId: string, params: StockIssueAuditLogQuery) =>
    axiosClient
      .get<
        ApiResponse<AuditLogListResponse>
      >(API_ENDPOINTS.stockIssueRequests.auditLogs(stockIssueRequestId), { params })
      .then((response) => response.data),

  recordStockPicking: (stockIssueRequestId: string, request: RecordStockPickingRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.stockIssueRequests.picks(stockIssueRequestId), request)
      .then((response) => response.data),

  confirmDispatch: (stockIssueRequestId: string) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.stockIssueRequests.dispatch(stockIssueRequestId))
      .then((response) => response.data),

  reportPickIssue: (request: ReportStockIssuePickIssueRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.stockIssueRequests.reportPickIssue(request.stockIssueRequestId), request)
      .then((response) => response.data),

  authorizeDispatch: (stockIssueRequestId: string) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.stockIssueRequests.authorizeDispatch(stockIssueRequestId))
      .then((response) => response.data),

  removePickDetail: (stockIssueRequestId: string, pickDetailId: string) =>
    axiosClient
      .delete<
        ApiResponse<unknown>
      >(API_ENDPOINTS.stockIssueRequests.removePickDetail(stockIssueRequestId, pickDetailId))
      .then((response) => response.data),

  createGoodsReturnRequest: (
    stockIssueRequestId: string,
    request: CreateGoodsReturnRequestRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<string>
      >(API_ENDPOINTS.stockIssueRequests.goodsReturnRequests(stockIssueRequestId), request)
      .then((response) => response.data),

  suggestGoodsReturnSlots: (
    stockIssueRequestId: string,
    items: readonly GoodsReturnSuggestionLineRequest[]
  ) =>
    axiosClient
      .post<
        ApiResponse<GoodsReturnLineSuggestion[]>
      >(API_ENDPOINTS.stockIssueRequests.goodsReturnSuggestions(stockIssueRequestId), { items })
      .then((response) => response.data),

  getGoodsReturnRequests: (params: GoodsReturnRequestListQuery) =>
    axiosClient
      .get<
        ApiResponse<GoodsReturnRequestListResponse>
      >(API_ENDPOINTS.goodsReturnRequests.list, { params })
      .then((response) => response.data),

  getGoodsReturnRequest: (goodsReturnRequestId: string) =>
    axiosClient
      .get<
        ApiResponse<GoodsReturnRequestSummary>
      >(API_ENDPOINTS.goodsReturnRequests.detail(goodsReturnRequestId))
      .then((response) => response.data),

  approveGoodsReturnRequest: (
    goodsReturnRequestId: string,
    selfApprovalAcknowledged = false,
    expectedVersion?: string | null
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.goodsReturnRequests.approve(goodsReturnRequestId), { selfApprovalAcknowledged, expectedVersion })
      .then((response) => response.data),

  rejectGoodsReturnRequest: (
    goodsReturnRequestId: string,
    request: RejectGoodsReturnRequestRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.goodsReturnRequests.reject(goodsReturnRequestId), request)
      .then((response) => response.data),

  getGoodsReturnRestockOptions: (goodsReturnRequestId: string) =>
    axiosClient
      .get<
        ApiResponse<GoodsReturnRestockOptions>
      >(`${API_ENDPOINTS.goodsReturnRequests.restock(goodsReturnRequestId)}-options`)
      .then((response) => response.data),

  restockGoodsReturnRequest: (goodsReturnRequestId: string, request: RestockGoodsReturnRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.goodsReturnRequests.restock(goodsReturnRequestId), request)
      .then((response) => response.data),
}
