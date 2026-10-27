import { z } from 'zod'
import { dotNetGuidSchema } from '@/lib/dotnet-guid.schema'

const id = dotNetGuidSchema('Mã dữ liệu không hợp lệ.')
const quantity = z.number().finite()

export const splittableTaskTypeSchema = z.enum([
  'Receiving',
  'PutAway',
  'StockIssuePick',
  'Relocation',
  'TransferPick',
  'TransferReceive',
  'TransferPutAway',
  'CycleCount',
])

export const taskPartActionSchema = z.enum([
  'edit',
  'reassign',
  'splitRemaining',
  'merge',
  'cancel',
  'complete',
])

export const taskPartExecutionStatusSchema = z.enum([
  'Queued',
  'InProgress',
  'Paused',
  'Completed',
  'Cancelled',
])

const taskSplitLineViewSchema = z.object({
  sourceLineId: id,
  label: z.string(),
  zoneName: z.string().nullable(),
  slotCode: z.string().nullable(),
  outstanding: quantity,
  unassigned: quantity,
})

const taskPartLineViewSchema = z.object({
  sourceLineId: id,
  label: z.string(),
  quantity,
  completedQuantity: quantity,
})

const taskPartViewSchema = z.object({
  id,
  sequence: z.number().int(),
  assignedTo: id,
  assigneeName: z.string(),
  executionStatus: taskPartExecutionStatusSchema,
  dueAt: z.string().nullable(),
  version: z.string(),
  lines: z.array(taskPartLineViewSchema),
  // Unknown actions from a newer backend are dropped so the rest of the split still renders.
  allowedActions: z
    .array(z.string())
    .transform((actions) =>
      actions.filter(
        (action): action is z.infer<typeof taskPartActionSchema> =>
          taskPartActionSchema.safeParse(action).success
      )
    ),
})

export const taskSplitStateResponseSchema = z.object({
  sourceType: splittableTaskTypeSchema,
  sourceId: id,
  code: z.string(),
  isSplit: z.boolean(),
  version: z.string().nullable(),
  splitSuggested: z.boolean(),
  taskScore: z.number().finite(),
  threshold: z.number().finite(),
  canSplit: z.boolean(),
  canCancelSplit: z.boolean(),
  lines: z.array(taskSplitLineViewSchema),
  parts: z.array(taskPartViewSchema),
})

const assignableStaffSchema = z.object({
  id,
  fullName: z.string(),
  email: z.string(),
  openReceivingTasks: z.number().int(),
  openPutAwayTasks: z.number().int(),
  openPickingTasks: z.number().int(),
  openWarehouseTasks: z.number().int(),
  openCycleCounts: z.number().int(),
  hasTaskInProgress: z.boolean(),
  workloadScore: z.number().finite(),
  totalOpenTasks: z.number().int(),
  isRecommended: z.boolean(),
})

const splitLimitsSchema = z.object({
  maxLinesPerPart: z.number().int(),
  maxPointsPerPart: z.number().finite(),
})

const plannedPartSchema = z.object({
  staffId: id,
  zoneId: id.nullable(),
  lines: z.array(z.object({ sourceLineId: id, quantity })),
  points: z.number().finite(),
})

export const taskSplitSuggestionResponseSchema = z.object({
  staff: z.array(assignableStaffSchema),
  preselectedStaffIds: z.array(id),
  recommendedPeople: z.number().int(),
  limits: splitLimitsSchema,
  parts: z.array(plannedPartSchema),
  idleStaffIds: z.array(id),
  loadAfter: z.record(id, z.number().finite()),
  maxLoadGap: z.number().finite(),
})

const taskSplitSettingsItemSchema = z.object({
  sourceType: splittableTaskTypeSchema,
  maxLinesPerPart: z.number().int(),
  maxPointsPerPart: z.number().finite(),
  version: z.number().int(),
})

export const taskSplitSettingsResponseSchema = z.object({
  items: z.array(taskSplitSettingsItemSchema),
})
