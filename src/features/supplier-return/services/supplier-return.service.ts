import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  ConfirmSupplierReturnDeliveryRequest,
  CreateSupplierReturnRequest,
  SupplierReturn,
  SupplierReturnListQuery,
  SupplierReturnListResponse,
  SupplierReturnReasonRequest,
  SupplierReturnReceiptOption,
  SupplierReturnStockOption,
} from '../types/supplier-return.types'
import type { InventoryStock } from '@/features/inventory/types/inventory.types'

export const supplierReturnService = {
  getSourceReceipts: (params: {
    warehouseId: string
    supplierId: string
    search: string
    page: number
  }) =>
    axiosClient
      .get<
        ApiResponse<{ items: SupplierReturnReceiptOption[]; totalCount: number }>
      >(`${API_ENDPOINTS.supplierReturns.list}/source-receipts`, { params })
      .then((response) => response.data),

  getSourceStocks: (params: {
    warehouseId: string
    supplierId: string
    sourceGoodsReceiptId: string
    search: string
    page: number
  }) =>
    axiosClient
      .get<
        ApiResponse<{
          items: {
            stock: InventoryStock
            sourceReceivedQuantity: number
            sourceRemainingQuantity: number
            returnableQuantity: number
            unattributedReturnedQuantity: number
          }[]
          totalCount: number
        }>
      >(`${API_ENDPOINTS.supplierReturns.list}/source-stocks`, { params })
      .then((response) => ({
        ...response.data,
        data: {
          ...response.data.data,
          items: response.data.data.items.map(
            (entry): SupplierReturnStockOption => ({
              ...entry.stock,
              sourceReceivedQuantity: entry.sourceReceivedQuantity,
              sourceRemainingQuantity: entry.sourceRemainingQuantity,
              returnableQuantity: entry.returnableQuantity,
              unattributedReturnedQuantity: entry.unattributedReturnedQuantity,
            })
          ),
        },
      })),

  getSupplierReturns: (params: SupplierReturnListQuery) =>
    axiosClient
      .get<ApiResponse<SupplierReturnListResponse>>(API_ENDPOINTS.supplierReturns.list, { params })
      .then((response) => response.data),

  getSupplierReturn: (supplierReturnId: string) =>
    axiosClient
      .get<ApiResponse<SupplierReturn>>(API_ENDPOINTS.supplierReturns.detail(supplierReturnId))
      .then((response) => response.data),

  createSupplierReturn: (request: CreateSupplierReturnRequest) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.supplierReturns.list, request)
      .then((response) => response.data),

  approveSupplierReturn: (
    supplierReturnId: string,
    selfApprovalAcknowledged = false,
    expectedVersion?: string | null
  ) =>
    axiosClient
      .post<
        ApiResponse<unknown>
      >(API_ENDPOINTS.supplierReturns.approve(supplierReturnId), { selfApprovalAcknowledged, expectedVersion })
      .then((response) => response.data),

  rejectSupplierReturn: (supplierReturnId: string, request: SupplierReturnReasonRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.supplierReturns.reject(supplierReturnId), request)
      .then((response) => response.data),

  cancelSupplierReturn: (supplierReturnId: string, request: SupplierReturnReasonRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.supplierReturns.cancel(supplierReturnId), request)
      .then((response) => response.data),

  confirmSupplierReturnDelivery: (
    supplierReturnId: string,
    request: ConfirmSupplierReturnDeliveryRequest
  ) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.supplierReturns.deliver(supplierReturnId), request)
      .then((response) => response.data),
}
