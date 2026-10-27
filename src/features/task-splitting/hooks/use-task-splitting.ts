import { useRef } from 'react'
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import {
  receiptCommandId,
  type ReceiptCommandSnapshot,
} from '@/features/inbound/utils/receipt-command-id'
import { isApiErrorResponse, logApiError } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse } from '@/types/api'
import { taskSplittingService } from '../services/task-splitting.service'
import type {
  CancelTaskSplitRequest,
  CreateTaskSplitRequest,
  MergeTaskPartRequest,
  ReassignTaskPartRequest,
  SplitRemainingTaskPartRequest,
  SplittableTaskType,
  TaskPartReasonRequest,
  TaskSplitSettingsResponse,
  TaskSplitStateResponse,
  TaskSplitSuggestionResponse,
  UpdateTaskPartRequest,
  UpdateTaskSplitSettingsRequest,
} from '../types/task-splitting.types'

type PartVariables<TRequest> = TRequest & { partId: string }

function taskSplitStateOptions(type: SplittableTaskType, sourceId: string, enabled: boolean) {
  return {
    queryKey: queryKeys.taskSplits.state(type, sourceId),
    queryFn: () => taskSplittingService.getState(type, sourceId),
    enabled: enabled && Boolean(sourceId),
  }
}

export function useTaskSplitQuery(type: SplittableTaskType, sourceId: string, enabled = true) {
  return useQuery<TaskSplitStateResponse, ApiErrorResponse>(
    taskSplitStateOptions(type, sourceId, enabled)
  )
}

export interface TaskSplitSource {
  readonly type: SplittableTaskType
  readonly sourceId: string
}

/** Split state of a variable number of sources (one page listing several tasks), in source order. */
export function useTaskSplitQueries(sources: readonly TaskSplitSource[]) {
  return useQueries({
    // Same cache entries as useTaskSplitQuery, so split mutations refresh both.
    queries: sources.map(({ type, sourceId }) => taskSplitStateOptions(type, sourceId, true)),
  })
}

export function useTaskSplitSuggestionQuery(
  type: SplittableTaskType,
  sourceId: string,
  staffIds: readonly string[] | null,
  enabled: boolean,
  {
    refetchOnWindowFocus = true,
    refetchOnReconnect = true,
  }: { readonly refetchOnWindowFocus?: boolean; readonly refetchOnReconnect?: boolean } = {}
) {
  return useQuery<TaskSplitSuggestionResponse, ApiErrorResponse>({
    queryKey: queryKeys.taskSplits.suggestion(type, sourceId, staffIds),
    queryFn: () => taskSplittingService.getSuggestion(type, sourceId, staffIds),
    enabled: enabled && Boolean(sourceId),
    // Staff load moves with every assignment, so a cached plan is never trusted on reopen.
    staleTime: 0,
    refetchOnWindowFocus,
    refetchOnReconnect,
  })
}

/** Options shared by every split/part mutation: refresh the split (and the caller's source views) after a write. */
function useSplitMutationHandlers(
  type: SplittableTaskType,
  sourceId: string,
  invalidateKeys: readonly QueryKey[]
) {
  const queryClient = useQueryClient()
  const refreshState = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.taskSplits.state(type, sourceId) })
  return {
    onSuccess: () =>
      Promise.all([
        refreshState(),
        ...invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ]),
    onError: (error: ApiErrorResponse) => {
      logApiError(error)
      // Stale version or vanished source/part: reload so the screen and the next attempt see the truth.
      if (isApiErrorResponse(error) && (error.statusCode === 409 || error.statusCode === 404))
        void refreshState()
    },
  }
}

/**
 * Keeps one command id per payload until it succeeds, so retrying after a lost response is replayed by the
 * backend instead of rejected as a conflict.
 */
function useCommandId() {
  const snapshot = useRef<ReceiptCommandSnapshot | null>(null)
  return {
    next: (body: unknown) => {
      snapshot.current = receiptCommandId(snapshot.current, body)
      return snapshot.current.commandId
    },
    reset: () => {
      snapshot.current = null
    },
  }
}

export function useCreateTaskSplitMutation(
  type: SplittableTaskType,
  sourceId: string,
  invalidateKeys: readonly QueryKey[] = []
) {
  const handlers = useSplitMutationHandlers(type, sourceId, invalidateKeys)
  const command = useCommandId()
  return useMutation<string[], ApiErrorResponse, Omit<CreateTaskSplitRequest, 'commandId'>>({
    mutationFn: (request) =>
      taskSplittingService.create(type, sourceId, {
        ...request,
        commandId: command.next({ type, sourceId, ...request }),
      }),
    ...handlers,
    onSuccess: () => {
      command.reset()
      return handlers.onSuccess()
    },
  })
}

export function useCancelTaskSplitMutation(
  type: SplittableTaskType,
  sourceId: string,
  invalidateKeys: readonly QueryKey[] = []
) {
  const handlers = useSplitMutationHandlers(type, sourceId, invalidateKeys)
  const command = useCommandId()
  return useMutation<unknown, ApiErrorResponse, Omit<CancelTaskSplitRequest, 'commandId'>>({
    mutationFn: (request) =>
      taskSplittingService.cancel(type, sourceId, {
        ...request,
        commandId: command.next({ type, sourceId, ...request }),
      }),
    ...handlers,
    onSuccess: () => {
      command.reset()
      return handlers.onSuccess()
    },
  })
}

export function useTaskPartMutations(
  type: SplittableTaskType,
  sourceId: string,
  invalidateKeys: readonly QueryKey[] = []
) {
  const handlers = useSplitMutationHandlers(type, sourceId, invalidateKeys)
  return {
    update: useMutation<unknown, ApiErrorResponse, PartVariables<UpdateTaskPartRequest>>({
      mutationFn: ({ partId, ...request }) => taskSplittingService.updatePart(partId, request),
      ...handlers,
    }),
    reassign: useMutation<unknown, ApiErrorResponse, PartVariables<ReassignTaskPartRequest>>({
      mutationFn: ({ partId, ...request }) => taskSplittingService.reassignPart(partId, request),
      ...handlers,
    }),
    splitRemaining: useMutation<
      string,
      ApiErrorResponse,
      PartVariables<SplitRemainingTaskPartRequest>
    >({
      mutationFn: ({ partId, ...request }) =>
        taskSplittingService.splitRemainingPart(partId, request),
      ...handlers,
    }),
    merge: useMutation<unknown, ApiErrorResponse, PartVariables<MergeTaskPartRequest>>({
      mutationFn: ({ partId, ...request }) => taskSplittingService.mergePart(partId, request),
      ...handlers,
    }),
    cancel: useMutation<unknown, ApiErrorResponse, PartVariables<TaskPartReasonRequest>>({
      mutationFn: ({ partId, ...request }) => taskSplittingService.cancelPart(partId, request),
      ...handlers,
    }),
    complete: useMutation<unknown, ApiErrorResponse, PartVariables<TaskPartReasonRequest>>({
      mutationFn: ({ partId, ...request }) => taskSplittingService.completePart(partId, request),
      ...handlers,
    }),
  }
}

export function useTaskSplitSettingsQuery() {
  return useQuery<TaskSplitSettingsResponse, ApiErrorResponse>({
    queryKey: queryKeys.taskSplitSettings,
    queryFn: () => taskSplittingService.getSettings(),
  })
}

export function useUpdateTaskSplitSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, UpdateTaskSplitSettingsRequest>({
    mutationFn: (request) => taskSplittingService.updateSettings(request),
    // Chờ tải lại để form nhận phiên bản mới trước khi cho lưu tiếp; gợi ý chia chứa giới hạn nên cũng làm mới.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.taskSplitSettings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.taskSplits.all }),
      ]),
    onError: logApiError,
  })
}
