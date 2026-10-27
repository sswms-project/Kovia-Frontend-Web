import type { z } from 'zod'
import type { WarehouseTaskPriority } from '@/features/inbound/types/inbound.types'
import type {
  splittableTaskTypeSchema,
  taskPartActionSchema,
  taskPartExecutionStatusSchema,
  taskSplitSettingsResponseSchema,
  taskSplitStateResponseSchema,
  taskSplitSuggestionResponseSchema,
} from '../schemas/task-splitting.schema'

// Response shapes come from the zod schemas that validate them, so the two cannot drift.
export type SplittableTaskType = z.infer<typeof splittableTaskTypeSchema>
export type TaskPartAction = z.infer<typeof taskPartActionSchema>
export type TaskPartExecutionStatus = z.infer<typeof taskPartExecutionStatusSchema>
export type TaskSplitStateResponse = z.infer<typeof taskSplitStateResponseSchema>
export type TaskSplitLineView = TaskSplitStateResponse['lines'][number]
export type TaskPartView = TaskSplitStateResponse['parts'][number]
export type TaskPartLineView = TaskPartView['lines'][number]
export type TaskSplitSuggestionResponse = z.infer<typeof taskSplitSuggestionResponseSchema>
export type TaskSplitStaff = TaskSplitSuggestionResponse['staff'][number]
export type PlannedPart = TaskSplitSuggestionResponse['parts'][number]
export type SplitLimits = TaskSplitSuggestionResponse['limits']
export type TaskSplitSettingsResponse = z.infer<typeof taskSplitSettingsResponseSchema>
export type TaskSplitSettingsItem = TaskSplitSettingsResponse['items'][number]

export interface TaskSplitLineRequest {
  sourceLineId: string
  quantity: number
}

export interface TaskSplitPartRequest {
  staffId: string
  lines: TaskSplitLineRequest[]
}

export interface CreateTaskSplitRequest {
  commandId: string
  expectedVersion: string | null
  priority?: WarehouseTaskPriority | null
  dueAt?: string | null
  parts: TaskSplitPartRequest[]
}

export interface CancelTaskSplitRequest {
  commandId: string
  expectedVersion: string | null
  reason: string
}

export interface UpdateTaskPartRequest {
  expectedVersion: string
  staffId: string
  lines: TaskSplitLineRequest[]
}

export interface ReassignTaskPartRequest {
  expectedVersion: string
  staffId: string
  expectedStaffId: string | null
  reason: string | null
}

export type SplitRemainingTaskPartRequest = UpdateTaskPartRequest

export interface MergeTaskPartRequest {
  expectedVersion: string
  intoPartId: string
}

export interface TaskPartReasonRequest {
  expectedVersion: string
  reason: string
}

export interface UpdateTaskSplitSettingsRequest {
  items: TaskSplitSettingsItem[]
}
