import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  AllowedActionsResponse,
  CancelCycleCountRequest,
  CreateCycleCountRequest,
  CreateStockAdjustmentRequest,
  CycleCountDetail,
  CycleCountListQuery,
  CycleCountListResponse,
  CycleCountMethod,
  ApproveStockAdjustmentRequest,
  ApproveStockAdjustmentVoucherRequest,
  CreateStockAdjustmentVoucherRequest,
  RejectStockAdjustmentRequest,
  StockAdjustmentVoucher,
  StockAdjustmentVoucherListQuery,
  StockAdjustmentVoucherListResponse,
  RequestRecountRequest,
  StockAdjustment,
  StockAdjustmentListQuery,
  StockAdjustmentListResponse,
} from '../types/cycle-count.types'

export const cycleCountService = {
  getCycleCounts: (params: CycleCountListQuery) =>
    axiosClient
      .get<ApiResponse<CycleCountListResponse>>(API_ENDPOINTS.cycleCounts.list, { params })
      .then((response) => response.data),
  getCycleCount: (cycleCountId: string) =>
    axiosClient
      .get<ApiResponse<CycleCountDetail>>(API_ENDPOINTS.cycleCounts.detail(cycleCountId))
      .then((response) => response.data),
  getCycleCountAllowedActions: (cycleCountId: string) =>
    axiosClient
      .get<
        ApiResponse<AllowedActionsResponse>
      >(API_ENDPOINTS.cycleCounts.allowedActions(cycleCountId))
      .then((response) => response.data),
  createCycleCount: (request: CreateCycleCountRequest) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.cycleCounts.create, request)
      .then((response) => response.data),
  recordCycleCountItem: ({
    cycleCountId,
    itemId,
    countedQuantity,
    countedDamagedQuantity,
    note,
    countMethod,
    scannedBarcode,
  }: {
    cycleCountId: string
    itemId: string
    countedQuantity: number
    countedDamagedQuantity: number | null
    note: string | null
    countMethod: CycleCountMethod
    scannedBarcode: string | null
  }) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.cycleCounts.recordItem(cycleCountId, itemId), {
        countedQuantity,
        countedDamagedQuantity,
        note,
        countMethod,
        scannedBarcode,
      })
      .then((response) => response.data),
  startCycleCount: (cycleCountId: string) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.cycleCounts.start(cycleCountId))
      .then((response) => response.data),
  submitCycleCount: (cycleCountId: string) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.cycleCounts.submit(cycleCountId))
      .then((response) => response.data),
  requestRecount: ({
    cycleCountId,
    request,
  }: {
    cycleCountId: string
    request: RequestRecountRequest
  }) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.cycleCounts.recount(cycleCountId), request)
      .then((response) => response.data),
  cancelCycleCount: ({
    cycleCountId,
    request,
  }: {
    cycleCountId: string
    request: CancelCycleCountRequest
  }) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.cycleCounts.cancel(cycleCountId), request)
      .then((response) => response.data),
  finalizeCycleCount: (cycleCountId: string) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.cycleCounts.finalize(cycleCountId))
      .then((response) => response.data),
  exportCycleCount: async (cycleCountId: string, fileName: string) => {
    const response = await axiosClient.get<Blob>(API_ENDPOINTS.cycleCounts.export(cycleCountId), {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(response.data)
    try {
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
    } finally {
      URL.revokeObjectURL(url)
    }
  },
  getStockAdjustments: (params: StockAdjustmentListQuery) =>
    axiosClient
      .get<ApiResponse<StockAdjustmentListResponse>>(API_ENDPOINTS.stockAdjustments.list, {
        params,
      })
      .then((response) => response.data),
  getStockAdjustment: (adjustmentId: string) =>
    axiosClient
      .get<ApiResponse<StockAdjustment>>(API_ENDPOINTS.stockAdjustments.detail(adjustmentId))
      .then((response) => response.data),
  getStockAdjustmentAllowedActions: (adjustmentId: string) =>
    axiosClient
      .get<
        ApiResponse<AllowedActionsResponse>
      >(API_ENDPOINTS.stockAdjustments.allowedActions(adjustmentId))
      .then((response) => response.data),
  createStockAdjustment: (request: CreateStockAdjustmentRequest) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.stockAdjustments.create, request)
      .then((response) => response.data),
  approveStockAdjustment: ({
    adjustmentId,
    request,
  }: {
    adjustmentId: string
    request: ApproveStockAdjustmentRequest
  }) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.stockAdjustments.approve(adjustmentId), request)
      .then((response) => response.data),
  rejectStockAdjustment: ({
    adjustmentId,
    request,
  }: {
    adjustmentId: string
    request: RejectStockAdjustmentRequest
  }) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.stockAdjustments.reject(adjustmentId), request)
      .then((response) => response.data),
  createStockAdjustmentVoucher: (request: CreateStockAdjustmentVoucherRequest) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.stockAdjustments.vouchers, request)
      .then((response) => response.data),
  getStockAdjustmentVouchers: (params: StockAdjustmentVoucherListQuery) =>
    axiosClient
      .get<ApiResponse<StockAdjustmentVoucherListResponse>>(
        API_ENDPOINTS.stockAdjustments.vouchers,
        {
          params,
        }
      )
      .then((response) => response.data),
  getStockAdjustmentVoucher: (voucherId: string) =>
    axiosClient
      .get<
        ApiResponse<StockAdjustmentVoucher>
      >(API_ENDPOINTS.stockAdjustments.voucherDetail(voucherId))
      .then((response) => response.data),
  getStockAdjustmentVoucherAllowedActions: (voucherId: string) =>
    axiosClient
      .get<
        ApiResponse<AllowedActionsResponse>
      >(API_ENDPOINTS.stockAdjustments.voucherAllowedActions(voucherId))
      .then((response) => response.data),
  approveStockAdjustmentVoucher: ({
    voucherId,
    request,
  }: {
    voucherId: string
    request: ApproveStockAdjustmentVoucherRequest
  }) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.stockAdjustments.voucherApprove(voucherId), request)
      .then((response) => response.data),
  rejectStockAdjustmentVoucher: ({
    voucherId,
    request,
  }: {
    voucherId: string
    request: RejectStockAdjustmentRequest
  }) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.stockAdjustments.voucherReject(voucherId), request)
      .then((response) => response.data),
}
