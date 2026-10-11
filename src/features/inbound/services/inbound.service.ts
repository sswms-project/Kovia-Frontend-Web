import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type { InventoryEvidence } from '@/features/inventory/types/inventory.types'
import type {
  AssignableWarehouseStaff,
  AssignWarehouseTaskRequest,
  UnassignReceivingTaskRequest,
  InboundAllowedActionsResponse,
  InboundDocumentImport,
  InboundListQuery,
  GoodsReceiptDetail,
  GoodsReceiptListResponse,
  PutawayRequest,
  PutAwayDeviationReport,
  PutAwayDeviationReportQuery,
  PutAwayHeldSlot,
  PutAwaySuggestionsResponse,
  PutawayTaskQuery,
  SavePutAwayPlanRequest,
  ReceivingTaskListResponse,
  ReceivingTaskQuery,
  SaveGoodsReceiptRequest,
  StartInboundDocumentImportRequest,
  ReviewInboundDocumentImportRequest,
  CancelPutawayTaskRequest,
  ConfirmPhysicalArrivalRequest,
  ReconcilePutawayCancellationRequest,
} from '../types/inbound.types'

export const inboundService = {
  getNextReceiptCode: () =>
    axiosClient
      .get<ApiResponse<string>>(API_ENDPOINTS.goodsReceipts.nextCode)
      .then((response) => response.data),
  getReceivingTasks: (params: ReceivingTaskQuery) =>
    axiosClient
      .get<
        ApiResponse<ReceivingTaskListResponse>
      >(API_ENDPOINTS.goodsReceipts.receivingTasks, { params })
      .then((response) => response.data),
  getReceipts: (params: InboundListQuery) =>
    axiosClient
      .get<ApiResponse<GoodsReceiptListResponse>>(API_ENDPOINTS.goodsReceipts.list, { params })
      .then((response) => response.data),
  getPutawayTasks: (params: PutawayTaskQuery) =>
    axiosClient
      .get<
        ApiResponse<GoodsReceiptListResponse>
      >(API_ENDPOINTS.goodsReceipts.putawayTasks, { params })
      .then((response) => response.data),
  getAssignableStaff: (warehouseId: string) =>
    axiosClient
      .get<ApiResponse<AssignableWarehouseStaff[]>>(API_ENDPOINTS.goodsReceipts.assignableStaff, {
        params: { warehouseId },
      })
      .then((response) => response.data),
  assignReceivingTask: (inboundRequestId: string, request: AssignWarehouseTaskRequest) =>
    axiosClient
      .put<
        ApiResponse<unknown>
      >(API_ENDPOINTS.goodsReceipts.assignReceivingTask(inboundRequestId), request)
      .then((response) => response.data),
  unassignReceivingTask: (inboundRequestId: string, request: UnassignReceivingTaskRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.goodsReceipts.unassignReceivingTask(inboundRequestId), request)
      .then((response) => response.data),
  assignPutawayTask: (receiptId: string, request: AssignWarehouseTaskRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.goodsReceipts.assignPutawayTask(receiptId), request)
      .then((response) => response.data),
  getReceipt: (receiptId: string) =>
    axiosClient
      .get<ApiResponse<GoodsReceiptDetail>>(API_ENDPOINTS.goodsReceipts.detail(receiptId))
      .then((response) => response.data),
  getAllowedActions: (receiptId: string) =>
    axiosClient
      .get<
        ApiResponse<InboundAllowedActionsResponse>
      >(API_ENDPOINTS.goodsReceipts.allowedActions(receiptId))
      .then((response) => response.data),
  createReceipt: (request: SaveGoodsReceiptRequest) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.goodsReceipts.create, request)
      .then((response) => response.data),
  updateReceipt: (receiptId: string, request: Omit<SaveGoodsReceiptRequest, 'inboundRequestId'>) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.goodsReceipts.update(receiptId), request)
      .then((response) => response.data),
  submitReceipt: (receiptId: string, request: ConfirmPhysicalArrivalRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.goodsReceipts.submit(receiptId), request)
      .then((response) => response.data),
  approveReceipt: (receiptId: string, request: ConfirmPhysicalArrivalRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.goodsReceipts.approve(receiptId), request)
      .then((response) => response.data),
  rejectReceipt: (receiptId: string, reason: string) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.goodsReceipts.reject(receiptId), { reason })
      .then((response) => response.data),
  putaway: (receiptId: string, request: PutawayRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.goodsReceipts.putaway(receiptId), request)
      .then((response) => response.data),
  savePutawayPlan: (receiptId: string, request: SavePutAwayPlanRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.goodsReceipts.putawayPlan(receiptId), request)
      .then((response) => response.data),
  suggestPutawaySlotsForPutaway: (receiptId: string) =>
    axiosClient
      .post<
        ApiResponse<PutAwaySuggestionsResponse>
      >(API_ENDPOINTS.goodsReceipts.putawaySuggestions(receiptId), undefined, { timeout: 60_000 })
      .then((response) => response.data),
  suggestPutawaySlots: (receiptId: string) =>
    axiosClient
      .post<
        ApiResponse<PutAwaySuggestionsResponse>
      >(API_ENDPOINTS.goodsReceipts.putawayPlanSuggestions(receiptId), undefined, { timeout: 60_000 })
      .then((response) => response.data),
  uploadPutawayEvidence: (warehouseId: string, file: File) => {
    const formData = new FormData()
    formData.append('warehouseId', warehouseId)
    formData.append('file', file)
    return axiosClient
      .post<ApiResponse<InventoryEvidence>>(API_ENDPOINTS.goodsReceipts.putawayEvidence, formData, {
        // Mặc định của axiosClient là JSON; bỏ đi để trình duyệt tự đặt multipart kèm boundary.
        headers: { 'Content-Type': null },
      })
      .then((response) => response.data)
  },
  getPutawayHeldSlots: (receiptId: string) =>
    axiosClient
      .get<ApiResponse<PutAwayHeldSlot[]>>(API_ENDPOINTS.goodsReceipts.putawayHeldSlots(receiptId))
      .then((response) => response.data),
  getPutawayDeviationReport: (params: PutAwayDeviationReportQuery) =>
    axiosClient
      .get<
        ApiResponse<PutAwayDeviationReport>
      >(API_ENDPOINTS.goodsReceipts.putawayDeviationReport, { params })
      .then((response) => response.data),
  cancelPutawayTask: (receiptId: string, request: CancelPutawayTaskRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.goodsReceipts.cancelPutawayTask(receiptId), request)
      .then((response) => response.data),
  reconcilePutawayCancellation: (receiptId: string, request: ReconcilePutawayCancellationRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.goodsReceipts.reconcilePutawayCancellation(receiptId), request)
      .then((response) => response.data),
  startDocumentImport: ({
    file,
    inboundRequestId,
    warehouseId,
  }: StartInboundDocumentImportRequest) => {
    const formData = new FormData()
    formData.append('file', file)
    if (inboundRequestId) formData.append('inboundRequestId', inboundRequestId)
    if (warehouseId) formData.append('warehouseId', warehouseId)
    return axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.inboundDocumentImports.create, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90_000,
      })
      .then((response) => response.data)
  },
  getDocumentImport: (importId: string) =>
    axiosClient
      .get<
        ApiResponse<InboundDocumentImport>
      >(API_ENDPOINTS.inboundDocumentImports.detail(importId))
      .then((response) => response.data),
  reviewDocumentImport: ({ id, ...request }: ReviewInboundDocumentImportRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.inboundDocumentImports.review(id), request)
      .then((response) => response.data),
  createDraftFromDocument: (importId: string) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.inboundDocumentImports.createDraft(importId))
      .then((response) => response.data),
}
