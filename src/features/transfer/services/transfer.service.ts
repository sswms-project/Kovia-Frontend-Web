import { axiosClient } from '@/lib/axios'
import { transferWriteConfig } from '../utils/transfer-client'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse, QueryResult } from '@/types/api'
import type { WarehouseResponse } from '@/types/warehouse'
import type {
  TransferDestinationLoadQuery,
  TransferDestinationLoad,
  AdjustTransferAllocationRequest,
  TransferAllocationOption,
  AddTransferFeedbackRequest,
  CancelTransferRequest,
  CancelTransferShipmentRequest,
  CreateTransferShipmentRequest,
  CompleteTransferPickingRequest,
  DispatchTransferShipmentRequest,
  ReopenTransferPickingRequest,
  SetTransferPutAwayPlanRequest,
  TransferPutAwayPlanSuggestions,
  EscalateTransferPickRequest,
  ReceiveTransferShipmentRequest,
  RecordTransferPickRequest,
  ReplyTransferFeedbackRequest,
  ResolveTransferDiscrepancyRequest,
  ResolveTransferEscalationRequest,
  ReturnTransferPickRequest,
  SaveTransferDraftRequest,
  SubmitTransferRequest,
  SwitchTransferPickRequest,
  TransferAvailability,
  TransferAvailabilityQuery,
  TransferReceivableSlotOption,
  TransferReceivableSlotsQuery,
  TransferSourceLocation,
  TransferSourceLocationsQuery,
  TransferSourceProduct,
  TransferSourceProductsQuery,
  TransferDetail,
  TransferListQuery,
  TransferListResponse,
  TransferPickAlternative,
  TransferPickSheet,
  TransferReceiveSheet,
  TransferRequesterOption,
  TransferSourceWarehouseQuery,
  UpdateTransferRequest,
} from '../types/transfer.types'
import type { ReceivableSlot } from '../utils/transfer-receive'
import type { AssignableWarehouseStaff } from '@/features/inbound/types/inbound.types'
import type {
  TransferTaskType,
  TransferReceiptSheet,
  TransferPutAwaySheet,
  StartTransferReceivingRequest,
  SubmitTransferReceiptRequest,
  PutAwayTransferShipmentRequest,
} from '../types/transfer-receipt.types'

const unwrap = <TData>(response: { data: ApiResponse<TData> }) => response.data

export const transferService = {
  getDestinationLoad: (query: TransferDestinationLoadQuery, signal?: AbortSignal) =>
    axiosClient
      .get<
        ApiResponse<TransferDestinationLoad>
      >(API_ENDPOINTS.transfers.destinationLoad, { params: query, signal })
      .then(unwrap),
  getAssignableStaff: (warehouseId: string, taskType: TransferTaskType) =>
    axiosClient
      .get<
        ApiResponse<AssignableWarehouseStaff[]>
      >(API_ENDPOINTS.transfers.assignableStaff, { params: { warehouseId, taskType } })
      .then(unwrap),
  getReceiptSheet: (transferId: string, shipmentId: string) =>
    axiosClient
      .get<
        ApiResponse<TransferReceiptSheet>
      >(API_ENDPOINTS.transfers.receiptSheet(transferId, shipmentId))
      .then(unwrap),
  getPutAwaySheet: (transferId: string, shipmentId: string) =>
    axiosClient
      .get<
        ApiResponse<TransferPutAwaySheet>
      >(API_ENDPOINTS.transfers.putAwaySheet(transferId, shipmentId))
      .then(unwrap),
  startReceiving: (
    transferId: string,
    shipmentId: string,
    request: StartTransferReceivingRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.startReceiving(transferId, shipmentId), request, transferWriteConfig())
      .then(unwrap),
  submitReceipt: (transferId: string, shipmentId: string, request: SubmitTransferReceiptRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.submitReceipt(transferId, shipmentId), request, transferWriteConfig())
      .then(unwrap),
  putAwayShipment: (
    transferId: string,
    shipmentId: string,
    request: PutAwayTransferShipmentRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.putAwayShipment(transferId, shipmentId), request, transferWriteConfig())
      .then(unwrap),
  setPutAwayPlan: (transferId: string, request: SetTransferPutAwayPlanRequest) =>
    axiosClient
      .put<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.setPutAwayPlan(transferId), request, transferWriteConfig())
      .then(unwrap),

  getPutAwayPlanSuggestions: (
    transferId: string,
    shipmentId?: string,
    useAi = true,
    signal?: AbortSignal
  ) =>
    axiosClient
      .get<ApiResponse<TransferPutAwayPlanSuggestions>>(
        API_ENDPOINTS.transfers.putAwayPlanSuggestions(transferId),
        {
          params: { shipmentId, useAi },
          signal,
        }
      )
      .then(unwrap),

  /**
   * Tra vị trí cất hàng của kho nhận theo mã vừa quét; null nếu không có vị trí khớp. Server đối chiếu nhãn
   * ghép khu, mã vạch riêng và mã ngắn, và từ chối (409) khi một mã ngắn trùng ở nhiều kệ.
   */
  findReceivableSlot: (warehouseId: string, scannedCode: string) =>
    axiosClient
      .get<ApiResponse<ReceivableSlot | null>>(API_ENDPOINTS.transfers.receivableSlot, {
        params: { warehouseId, code: scannedCode.trim() },
      })
      .then((response) => response.data.data),

  getTransfers: (params: TransferListQuery) =>
    axiosClient
      .get<ApiResponse<TransferListResponse>>(API_ENDPOINTS.transfers.list, { params })
      .then(unwrap),

  getTransfer: (transferId: string) =>
    axiosClient
      .get<ApiResponse<TransferDetail>>(API_ENDPOINTS.transfers.detail(transferId))
      .then(unwrap),

  getNextCode: () =>
    axiosClient.get<ApiResponse<string>>(API_ENDPOINTS.transfers.nextCode).then(unwrap),

  getRequesterOptions: () =>
    axiosClient
      .get<ApiResponse<TransferRequesterOption[]>>(API_ENDPOINTS.transfers.requesterOptions)
      .then(unwrap),

  getSourceWarehouses: (params: TransferSourceWarehouseQuery) =>
    axiosClient
      .get<ApiResponse<QueryResult<WarehouseResponse>>>(API_ENDPOINTS.transfers.sourceWarehouses, {
        params,
      })
      .then(unwrap),

  getReceivableSlots: (params: TransferReceivableSlotsQuery) =>
    axiosClient
      .get<ApiResponse<TransferReceivableSlotOption[]>>(API_ENDPOINTS.transfers.receivableSlots, {
        params,
      })
      .then(unwrap),

  /** Vị trí kho nhập cho lập kế hoạch/cất hàng: chỉ cần quyền nhận chuyển kho, không cần quyền tạo phiếu. */
  getPutAwaySlots: (params: TransferReceivableSlotsQuery) =>
    axiosClient
      .get<ApiResponse<TransferReceivableSlotOption[]>>(API_ENDPOINTS.transfers.putAwaySlots, {
        params,
      })
      .then(unwrap),

  getSourceLocations: (params: TransferSourceLocationsQuery) =>
    axiosClient
      .get<ApiResponse<TransferSourceLocation[]>>(API_ENDPOINTS.transfers.sourceLocations, {
        params,
      })
      .then(unwrap),

  getSourceProducts: (params: TransferSourceProductsQuery) =>
    axiosClient
      .get<ApiResponse<TransferSourceProduct[]>>(API_ENDPOINTS.transfers.sourceProducts, { params })
      .then(unwrap),

  getAvailability: (query: TransferAvailabilityQuery) =>
    axiosClient
      .post<ApiResponse<TransferAvailability[]>>(API_ENDPOINTS.transfers.availability, query)
      .then(unwrap),

  createDraft: (request: SaveTransferDraftRequest) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.transfers.drafts, request, transferWriteConfig())
      .then(unwrap),

  updateDraft: (transferId: string, request: SaveTransferDraftRequest) =>
    axiosClient
      .put<
        ApiResponse<string>
      >(API_ENDPOINTS.transfers.draft(transferId), request, transferWriteConfig())
      .then(unwrap),

  submitDraft: (transferId: string, request: SubmitTransferRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.submitDraft(transferId), request, transferWriteConfig())
      .then(unwrap),

  updateTransfer: (transferId: string, request: UpdateTransferRequest) =>
    axiosClient
      .put<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.update(transferId), request, transferWriteConfig())
      .then(unwrap),

  cancelTransfer: (transferId: string, request: CancelTransferRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.cancel(transferId), request, transferWriteConfig())
      .then(unwrap),

  stopRemaining: (transferId: string, request: CancelTransferRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.stopRemaining(transferId), request, transferWriteConfig())
      .then(unwrap),

  addFeedback: (transferId: string, request: AddTransferFeedbackRequest) =>
    axiosClient
      .post<
        ApiResponse<string>
      >(API_ENDPOINTS.transfers.feedback(transferId), request, transferWriteConfig())
      .then(unwrap),

  replyFeedback: (transferId: string, feedbackId: string, request: ReplyTransferFeedbackRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.replyFeedback(transferId, feedbackId), request, transferWriteConfig())
      .then(unwrap),

  createShipment: (transferId: string, request: CreateTransferShipmentRequest) =>
    axiosClient
      .post<
        ApiResponse<string>
      >(API_ENDPOINTS.transfers.shipments(transferId), request, transferWriteConfig())
      .then(unwrap),

  cancelShipment: (
    transferId: string,
    shipmentId: string,
    request: CancelTransferShipmentRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.cancelShipment(transferId, shipmentId), request, transferWriteConfig())
      .then(unwrap),

  getPickSheet: (transferId: string, shipmentId: string) =>
    axiosClient
      .get<
        ApiResponse<TransferPickSheet>
      >(API_ENDPOINTS.transfers.pickSheet(transferId, shipmentId))
      .then(unwrap),

  getPickAlternatives: (transferId: string, shipmentId: string, lineId: string) =>
    axiosClient
      .get<
        ApiResponse<TransferPickAlternative[]>
      >(API_ENDPOINTS.transfers.pickAlternatives(transferId, shipmentId, lineId))
      .then(unwrap),

  recordPick: (transferId: string, shipmentId: string, request: RecordTransferPickRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.picks(transferId, shipmentId), request, transferWriteConfig())
      .then(unwrap),

  getAllocationOptions: (transferId: string, itemId: string) =>
    axiosClient
      .get<
        ApiResponse<TransferAllocationOption[]>
      >(API_ENDPOINTS.transfers.allocationOptions(transferId, itemId))
      .then(unwrap),

  adjustAllocation: (transferId: string, request: AdjustTransferAllocationRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.adjustAllocation(transferId), request, transferWriteConfig())
      .then(unwrap),

  switchPick: (
    transferId: string,
    shipmentId: string,
    lineId: string,
    request: SwitchTransferPickRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.switchPick(transferId, shipmentId, lineId), request, transferWriteConfig())
      .then(unwrap),

  escalatePick: (
    transferId: string,
    shipmentId: string,
    lineId: string,
    request: EscalateTransferPickRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<string>
      >(API_ENDPOINTS.transfers.escalatePick(transferId, shipmentId, lineId), request, transferWriteConfig())
      .then(unwrap),

  resolveEscalation: (
    transferId: string,
    shipmentId: string,
    lineId: string,
    exceptionId: string,
    request: ResolveTransferEscalationRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.resolveEscalation(transferId, shipmentId, lineId, exceptionId), request, transferWriteConfig())
      .then(unwrap),

  returnPick: (transferId: string, shipmentId: string, request: ReturnTransferPickRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.returnPick(transferId, shipmentId), request, transferWriteConfig())
      .then(unwrap),

  completePicking: (
    transferId: string,
    shipmentId: string,
    request: CompleteTransferPickingRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.completePicking(transferId, shipmentId), request, transferWriteConfig())
      .then(unwrap),

  reopenPicking: (transferId: string, shipmentId: string, request: ReopenTransferPickingRequest) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.reopenPicking(transferId, shipmentId), request, transferWriteConfig())
      .then(unwrap),

  dispatchShipment: (
    transferId: string,
    shipmentId: string,
    request: DispatchTransferShipmentRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.dispatchShipment(transferId, shipmentId), request, transferWriteConfig())
      .then(unwrap),

  getReceiveSheet: (transferId: string, shipmentId: string) =>
    axiosClient
      .get<
        ApiResponse<TransferReceiveSheet>
      >(API_ENDPOINTS.transfers.receiveSheet(transferId, shipmentId))
      .then(unwrap),

  receiveShipment: (
    transferId: string,
    shipmentId: string,
    request: ReceiveTransferShipmentRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.receipt(transferId, shipmentId), request, transferWriteConfig())
      .then(unwrap),

  resolveDiscrepancy: (
    transferId: string,
    discrepancyId: string,
    request: ResolveTransferDiscrepancyRequest
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.transfers.resolveDiscrepancy(transferId, discrepancyId), request, transferWriteConfig())
      .then(unwrap),
}
