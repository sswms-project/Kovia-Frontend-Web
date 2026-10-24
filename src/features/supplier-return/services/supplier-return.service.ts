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
} from '../types/supplier-return.types'

export const supplierReturnService = {
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
