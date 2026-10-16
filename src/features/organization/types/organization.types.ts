export interface OrganizationResponse {
  id: string
  tenantName: string
  email: string
  phone: string
  address: string | null
  taxCode: string | null
  website: string | null
  industry: string | null
  defaultCurrency: string
  status: string
}

export interface TaskAssignmentScoringWeights {
  receivingBase: number
  putAwayBase: number
  warehouseTaskBase: number
  cycleCountBase: number
  pointsPerLine: number
  pointsPerQuantityLog: number
  urgentMultiplier: number
}

export interface TaskAssignmentScoringResponse {
  weights: TaskAssignmentScoringWeights
  defaults: TaskAssignmentScoringWeights
  isCustomized: boolean
  /** Gửi kèm khi lưu hoặc khôi phục; 0 khi doanh nghiệp chưa tùy chỉnh. */
  version: number
}

export interface UpdateTaskAssignmentScoringRequest extends TaskAssignmentScoringWeights {
  version: number
}
