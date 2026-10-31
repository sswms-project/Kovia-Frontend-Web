import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type { AssignableWarehouseStaff } from '@/features/inbound/types/inbound.types'
import type {
  AssignReturnWorkRequest,
  ManageReturnWorkRequest,
  ReturnWork,
} from '../types/return-work.types'

export const returnWorkService = {
  get: (supplier: boolean, id: string) =>
    axiosClient
      .get<ApiResponse<ReturnWork>>(API_ENDPOINTS.returnWork.document(supplier, id))
      .then((response) => response.data.data),
  mine: (supplier: boolean, id: string) =>
    axiosClient
      .get<ApiResponse<ReturnWork>>(API_ENDPOINTS.returnWork.task(supplier, id))
      .then((response) => response.data.data),
  staff: (supplier: boolean, id: string) =>
    axiosClient
      .get<ApiResponse<AssignableWarehouseStaff[]>>(API_ENDPOINTS.returnWork.staff(supplier, id))
      .then((response) => response.data.data),
  assign: (supplier: boolean, id: string, request: AssignReturnWorkRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.returnWork.assignment(supplier, id), request)
      .then((response) => response.data.data),
  action: (supplier: boolean, id: string, request: ManageReturnWorkRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.returnWork.actions(supplier, id), request)
      .then((response) => response.data.data),
}
