import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type { AuditLogListResponse } from '@/features/platform-services/types/platform-services.types'
import type {
  AssignStockIssuePickerRequest,
  CancelStockIssueRequestRequest,
  ConfirmStockDispatchRequest,
  ReportStockIssuePickIssueRequest,
  StockIssueAuditLogQuery,
  CreateStockIssueRequestRequest,
  StockIssueAttachment,
  StockIssueImportPreview,
  RecordStockPickingRequest,
  StockIssueRequestListQuery,
  StockIssueRequestListResponse,
  StockIssueRequestSummary,
  CreateGoodsReturnRequestRequest,
  RejectGoodsReturnRequestRequest,
  GoodsReturnRequestListQuery,
  GoodsReturnRequestListResponse,
  GoodsReturnRequestSummary,
  ReleaseStockIssueRequestRequest,
  RestockGoodsReturnRequest,
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
  downloadImportTemplate: async () => {
    const response = await axiosClient.get<Blob>(API_ENDPOINTS.stockIssueRequests.importTemplate, {
      responseType: 'blob',
    })
    downloadBlob(response.data, 'kovia-mau-nhap-phieu-xuat-kho.xlsx')
  },

  previewImport: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return axiosClient
      .post<
        ApiResponse<StockIssueImportPreview>
      >(API_ENDPOINTS.stockIssueRequests.importPreview, form, { headers: { 'Content-Type': null } })
      .then((response) => response.data)
  },

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

  confirmDispatch: (stockIssueRequestId: string, request?: ConfirmStockDispatchRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.stockIssueRequests.dispatch(stockIssueRequestId), request ?? {})
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

  approveGoodsReturnRequest: (goodsReturnRequestId: string) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.goodsReturnRequests.approve(goodsReturnRequestId))
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

  restockGoodsReturnRequest: (goodsReturnRequestId: string, request: RestockGoodsReturnRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.goodsReturnRequests.restock(goodsReturnRequestId), request)
      .then((response) => response.data),
}
