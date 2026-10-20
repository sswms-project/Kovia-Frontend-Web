import { axiosClient } from '@/lib/axios'
import { transferWriteConfig } from '@/features/transfer/utils/transfer-client'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  MyWarehouseTaskListResponse,
  MyWarehouseTaskQuery,
  WarehouseTaskAction,
  WarehouseTaskScope,
  AssignWarehouseTaskRequest,
  CreateWarehouseTaskRequest,
  ExecuteWarehouseRelocationRequest,
  WarehousePlacementRecommendation,
  WarehouseTaskDetail,
  UpdateWarehouseTaskScheduleRequest,
} from '../types/warehouse-task.types'

export const warehouseTaskService = {
  getCurrent: (params: MyWarehouseTaskQuery, scope: WarehouseTaskScope = 'mine') =>
    axiosClient
      .get<
        ApiResponse<MyWarehouseTaskListResponse>
      >(scope === 'managed' ? API_ENDPOINTS.warehouseTasks.list : API_ENDPOINTS.myWarehouseTasks.list, { params })
      .then((response) => response.data),
  getHistory: (params: MyWarehouseTaskQuery, scope: WarehouseTaskScope = 'mine') =>
    axiosClient
      .get<ApiResponse<MyWarehouseTaskListResponse>>(
        scope === 'managed'
          ? API_ENDPOINTS.warehouseTasks.history
          : API_ENDPOINTS.myWarehouseTasks.history,
        {
          params,
        }
      )
      .then((response) => response.data),
  action: (taskType: string, taskId: string, action: WarehouseTaskAction, reason?: string) =>
    axiosClient.post(API_ENDPOINTS.myWarehouseTasks.action(taskType, taskId), { action, reason }),
  create: (request: CreateWarehouseTaskRequest) =>
    axiosClient
      .post<ApiResponse<string>>(API_ENDPOINTS.warehouseTasks.list, request)
      .then((response) => response.data),
  getDetail: (taskId: string, scope: WarehouseTaskScope) =>
    axiosClient
      .get<
        ApiResponse<WarehouseTaskDetail>
      >(scope === 'managed' ? API_ENDPOINTS.warehouseTasks.detail(taskId) : API_ENDPOINTS.myWarehouseTasks.relocationDetail(taskId))
      .then((response) => response.data),
  assign: (taskId: string, request: AssignWarehouseTaskRequest) =>
    axiosClient
      .put<
        ApiResponse<unknown>
      >(API_ENDPOINTS.warehouseTasks.assignment(taskId), request, transferWriteConfig())
      .then((response) => response.data),
  updateSchedule: (taskType: string, taskId: string, request: UpdateWarehouseTaskScheduleRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.warehouseTasks.schedule(taskType, taskId), request)
      .then((response) => response.data),
  getRecommendations: (
    taskId: string,
    lineId: string,
    quantity: number,
    scope: WarehouseTaskScope
  ) =>
    axiosClient
      .get<
        ApiResponse<WarehousePlacementRecommendation[]>
      >(scope === 'managed' ? API_ENDPOINTS.warehouseTasks.recommendations(taskId, lineId) : API_ENDPOINTS.myWarehouseTasks.relocationRecommendations(taskId, lineId), { params: { quantity } })
      .then((response) => response.data),
  executeRelocation: (taskId: string, request: ExecuteWarehouseRelocationRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.myWarehouseTasks.executeRelocation(taskId), request)
      .then((response) => response.data),
}
