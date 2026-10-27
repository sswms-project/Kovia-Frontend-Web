import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import {
  taskSplitSettingsResponseSchema,
  taskSplitStateResponseSchema,
  taskSplitSuggestionResponseSchema,
} from '../schemas/task-splitting.schema'
import type {
  CancelTaskSplitRequest,
  CreateTaskSplitRequest,
  MergeTaskPartRequest,
  ReassignTaskPartRequest,
  SplitRemainingTaskPartRequest,
  SplittableTaskType,
  TaskPartReasonRequest,
  UpdateTaskPartRequest,
  UpdateTaskSplitSettingsRequest,
} from '../types/task-splitting.types'

const { taskSplits, taskParts, taskSplitSettings } = API_ENDPOINTS

export const taskSplittingService = {
  getState: (type: SplittableTaskType, sourceId: string) =>
    axiosClient
      .get<ApiResponse<unknown>>(taskSplits.state(type, sourceId))
      .then((response) => taskSplitStateResponseSchema.parse(response.data.data)),
  getSuggestion: (type: SplittableTaskType, sourceId: string, staffIds: readonly string[] | null) =>
    axiosClient
      .get<ApiResponse<unknown>>(taskSplits.suggestion(type, sourceId), {
        // Axios would send `staffIds[]=…`, which ASP.NET does not bind; the backend accepts a comma list.
        params: staffIds?.length ? { staffIds: staffIds.join(',') } : undefined,
      })
      .then((response) => taskSplitSuggestionResponseSchema.parse(response.data.data)),
  create: (type: SplittableTaskType, sourceId: string, request: CreateTaskSplitRequest) =>
    axiosClient
      .post<ApiResponse<string[]>>(taskSplits.create(type, sourceId), request)
      .then((response) => response.data.data),
  cancel: (type: SplittableTaskType, sourceId: string, request: CancelTaskSplitRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(taskSplits.cancel(type, sourceId), request)
      .then((response) => response.data),
  updatePart: (partId: string, request: UpdateTaskPartRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(taskParts.update(partId), request)
      .then((response) => response.data),
  reassignPart: (partId: string, request: ReassignTaskPartRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(taskParts.reassign(partId), request)
      .then((response) => response.data),
  splitRemainingPart: (partId: string, request: SplitRemainingTaskPartRequest) =>
    axiosClient
      .post<ApiResponse<string>>(taskParts.splitRemaining(partId), request)
      .then((response) => response.data.data),
  mergePart: (partId: string, request: MergeTaskPartRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(taskParts.merge(partId), request)
      .then((response) => response.data),
  cancelPart: (partId: string, request: TaskPartReasonRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(taskParts.cancel(partId), request)
      .then((response) => response.data),
  completePart: (partId: string, request: TaskPartReasonRequest) =>
    axiosClient
      .post<ApiResponse<unknown>>(taskParts.complete(partId), request)
      .then((response) => response.data),
  getSettings: () =>
    axiosClient
      .get<ApiResponse<unknown>>(taskSplitSettings)
      .then((response) => taskSplitSettingsResponseSchema.parse(response.data.data)),
  updateSettings: (request: UpdateTaskSplitSettingsRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(taskSplitSettings, request)
      .then((response) => response.data),
}
