import type { z } from 'zod'
import { axiosClient } from '@/lib/axios'
import { logger } from '@/lib/logger'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
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

const INVALID_RESPONSE_MESSAGE =
  'Dữ liệu chia việc từ máy chủ không hợp lệ. Vui lòng tải lại trang.'

/** Validates a response; on mismatch logs the zod detail and rejects with the same shape as an API error. */
function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  logger.error(result.error)
  const error: ApiErrorResponse = { statusCode: 500, message: INVALID_RESPONSE_MESSAGE }
  throw error
}

export const taskSplittingService = {
  getState: (type: SplittableTaskType, sourceId: string) =>
    axiosClient
      .get<ApiResponse<unknown>>(taskSplits.state(type, sourceId))
      .then((response) => parseResponse(taskSplitStateResponseSchema, response.data.data)),
  getSuggestion: (type: SplittableTaskType, sourceId: string, staffIds: readonly string[] | null) =>
    axiosClient
      .get<ApiResponse<unknown>>(taskSplits.suggestion(type, sourceId), {
        // Axios would send `staffIds[]=…`, which ASP.NET does not bind; the backend accepts a comma list.
        params: staffIds?.length ? { staffIds: staffIds.join(',') } : undefined,
      })
      .then((response) => parseResponse(taskSplitSuggestionResponseSchema, response.data.data)),
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
      .then((response) => parseResponse(taskSplitSettingsResponseSchema, response.data.data)),
  updateSettings: (request: UpdateTaskSplitSettingsRequest) =>
    axiosClient
      .put<ApiResponse<unknown>>(taskSplitSettings, request)
      .then((response) => response.data),
}
