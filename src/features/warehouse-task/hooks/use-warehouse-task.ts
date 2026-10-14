import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isApiErrorResponse, logApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import type { ApiErrorResponse } from '@/types/api'
import { warehouseTaskService } from '../services/warehouse-task.service'
import type {
  MyWarehouseTaskListResponse,
  MyWarehouseTask,
  MyWarehouseTaskQuery,
  WarehouseTaskScope,
  AssignWarehouseTaskRequest,
  CreateWarehouseTaskRequest,
  ExecuteWarehouseRelocationRequest,
  WarehousePlacementRecommendation,
  WarehouseTaskDetail,
  UpdateWarehouseTaskScheduleRequest,
} from '../types/warehouse-task.types'
import type { WarehouseTaskAction } from '../types/warehouse-task.types'

export function useMyWarehouseTasksQuery(
  params: MyWarehouseTaskQuery,
  scope: WarehouseTaskScope = 'mine',
  enabled = true
) {
  return useQuery<MyWarehouseTaskListResponse, ApiErrorResponse>({
    queryKey: ['warehouse-tasks', scope, params],
    queryFn: () => warehouseTaskService.getCurrent(params, scope).then((response) => response.data),
    placeholderData: (previousData) => previousData,
    enabled,
  })
}

export function useManageMyWarehouseTaskMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: ({
      taskType,
      taskId,
      action,
      reason,
    }: {
      taskType: string
      taskId: string
      action: WarehouseTaskAction
      reason?: string
    }) => warehouseTaskService.action(taskType, taskId, action, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] }),
    onError: (error) => {
      logApiError(error)
      if (isApiErrorResponse(error) && (error.statusCode === 409 || error.statusCode === 404))
        void queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] })
    },
  })
}

export function useWarehouseTaskDetailQuery(taskId: string | null, scope: WarehouseTaskScope) {
  return useQuery<WarehouseTaskDetail, ApiErrorResponse>({
    queryKey: ['warehouse-tasks', scope, 'detail', taskId],
    queryFn: () =>
      warehouseTaskService.getDetail(taskId ?? '', scope).then((response) => response.data),
    enabled: Boolean(taskId),
  })
}

export function useWarehouseTaskRecommendationsQuery(
  taskId: string | null,
  lineId: string | null,
  quantity: number,
  scope: WarehouseTaskScope,
  enabled = true
) {
  return useQuery<WarehousePlacementRecommendation[], ApiErrorResponse>({
    queryKey: ['warehouse-tasks', scope, 'recommendations', taskId, lineId, quantity],
    queryFn: () =>
      warehouseTaskService
        .getRecommendations(taskId ?? '', lineId ?? '', quantity, scope)
        .then((response) => response.data),
    enabled: enabled && Boolean(taskId && lineId && quantity > 0),
  })
}

export function useCreateWarehouseTaskMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateWarehouseTaskRequest) => warehouseTaskService.create(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] }),
    onError: (error) => logger.error(error),
  })
}

export function useAssignWarehouseTaskMutation(taskId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: AssignWarehouseTaskRequest) =>
      warehouseTaskService.assign(taskId ?? '', request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse-tasks', 'managed', 'detail', taskId] })
    },
    onError: logApiError,
  })
}

export function useUpdateWarehouseTaskScheduleMutation(task: MyWarehouseTask | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdateWarehouseTaskScheduleRequest) =>
      warehouseTaskService.updateSchedule(task?.taskType ?? '', task?.id ?? '', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] }),
    onError: (error) => logger.error(error),
  })
}

export function useExecuteWarehouseRelocationMutation(taskId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: ExecuteWarehouseRelocationRequest) =>
      warehouseTaskService.executeRelocation(taskId ?? '', request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse-tasks', 'mine', 'detail', taskId] })
    },
    onError: (error) => logger.error(error),
  })
}

export function useMyWarehouseTaskHistoryQuery(
  params: MyWarehouseTaskQuery,
  scope: WarehouseTaskScope = 'mine'
) {
  return useQuery<MyWarehouseTaskListResponse, ApiErrorResponse>({
    queryKey: ['warehouse-tasks', scope, 'history', params],
    queryFn: () => warehouseTaskService.getHistory(params, scope).then((response) => response.data),
    placeholderData: (previousData) => previousData,
  })
}
