export interface ReturnWork {
  assignmentRequired: boolean
  sourceDocumentId: string
  documentVersion: string
  warehouseId: string
  referenceCode: string
  approved: boolean
  taskId: string | null
  taskVersion: string | null
  executionStatus: string | null
  assignedToName: string | null
  warehouseName: string
  assignedTo: string | null
  priority: 'Normal' | 'Urgent' | null
  dueAt: string | null
  startedAt: string | null
  canAssign: boolean
  canManage: boolean
  canComplete: boolean
}

export interface ReturnWorkProof {
  expectedVersion: string
  taskId: string
  taskVersion: string
  commandId: string
}

export interface AssignReturnWorkRequest {
  staffId: string
  expectedStaffId: string | null
  documentVersion: string
  taskVersion: string | null
  commandId: string
  priority: 'Normal' | 'Urgent'
  dueAt: string | null
  reason: string | null
}

export interface ManageReturnWorkRequest {
  taskId: string
  documentVersion: string
  taskVersion: string
  commandId: string
  action: 'Start' | 'Pause' | 'Return'
  reason?: string
}
