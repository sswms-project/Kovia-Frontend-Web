import type {
  TaskPartView,
  TaskSplitStaff,
  TaskSplitStateResponse,
  TaskSplitSuggestionResponse,
} from '../types/task-splitting.types'

export const SOURCE_ID = 'source-1'

export function buildState(
  overrides: Partial<TaskSplitStateResponse> = {}
): TaskSplitStateResponse {
  return {
    sourceType: 'Receiving',
    sourceId: SOURCE_ID,
    code: 'IR-001',
    isSplit: false,
    version: 'v1',
    splitSuggested: true,
    taskScore: 42,
    threshold: 30,
    canSplit: true,
    canCancelSplit: false,
    lines: [
      {
        sourceLineId: 'line-1',
        label: 'Gạo ST25',
        zoneName: 'Khu A',
        slotCode: 'A-01',
        outstanding: 10,
        unassigned: 10,
      },
      {
        sourceLineId: 'line-2',
        label: 'Đường cát',
        zoneName: 'Khu B',
        slotCode: null,
        outstanding: 7,
        unassigned: 7,
      },
    ],
    parts: [],
    ...overrides,
  }
}

export function buildStaff(id: string, fullName: string): TaskSplitStaff {
  return {
    id,
    fullName,
    email: `${id}@kovia.vn`,
    openReceivingTasks: 1,
    openPutAwayTasks: 0,
    openPickingTasks: 0,
    openWarehouseTasks: 0,
    openCycleCounts: 0,
    hasTaskInProgress: false,
    workloadScore: 3,
    totalOpenTasks: 1,
    isRecommended: false,
  }
}

export function buildSuggestion(): TaskSplitSuggestionResponse {
  return {
    staff: [
      buildStaff('staff-an', 'Nguyễn Văn An'),
      buildStaff('staff-binh', 'Trần Thị Bình'),
      buildStaff('staff-chi', 'Lê Văn Chi'),
    ],
    preselectedStaffIds: ['staff-an', 'staff-binh'],
    recommendedPeople: 2,
    limits: { maxLinesPerPart: 0, maxPointsPerPart: 0 },
    parts: [
      {
        staffId: 'staff-an',
        zoneId: null,
        lines: [{ sourceLineId: 'line-1', quantity: 10 }],
        points: 12,
      },
      {
        staffId: 'staff-binh',
        zoneId: null,
        lines: [{ sourceLineId: 'line-2', quantity: 7 }],
        points: 9,
      },
    ],
    idleStaffIds: [],
    loadAfter: { 'staff-an': 15, 'staff-binh': 12 },
    maxLoadGap: 3,
  }
}

export function buildPart(overrides: Partial<TaskPartView>): TaskPartView {
  return {
    id: 'part-1',
    sequence: 1,
    assignedTo: 'staff-an',
    assigneeName: 'Nguyễn Văn An',
    executionStatus: 'Queued',
    dueAt: null,
    version: 'p1',
    lines: [{ sourceLineId: 'line-1', label: 'Gạo ST25', quantity: 10, completedQuantity: 0 }],
    allowedActions: [],
    ...overrides,
  }
}
