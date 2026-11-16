export const ALERT_SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'] as const
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number]

export const ALERT_STATUSES = ['Open', 'Acknowledged', 'Snoozed', 'Resolved'] as const
export type AlertStatus = (typeof ALERT_STATUSES)[number]

export type WatchRuleStatus = 'Active' | 'Paused' | 'Suspended' | 'Completed'

export const ALERT_FEEDBACK_KINDS = [
  'useful',
  'irrelevant',
  'duplicate',
  'wrong_data',
  'unclear',
] as const
export type AlertFeedbackKind = (typeof ALERT_FEEDBACK_KINDS)[number]

export interface WatchRule {
  readonly id: string
  readonly ruleType: string
  readonly label: string
  readonly description: string
  readonly status: WatchRuleStatus
  readonly statusReason: string | null
  readonly warehouseId: string | null
  readonly warehouseName: string | null
  readonly productId: string | null
  readonly referenceType: string | null
  readonly referenceId: string | null
  readonly subjectLabel: string | null
  readonly threshold: number | null
  readonly unit: string | null
  readonly hours: number | null
  readonly days: number | null
  readonly localHour: number | null
  readonly lastEvaluatedAt: string | null
  readonly lastTriggeredAt: string | null
  readonly lastError: string | null
  readonly createdAt: string
}

export interface WatchRuleListResponse {
  readonly items: WatchRule[]
  readonly maxRules: number
}

export interface WatchRuleType {
  readonly ruleType: string
  readonly label: string
  readonly condition: string
  readonly creatable: boolean
}

export interface WatchRuleCatalogResponse {
  readonly types: WatchRuleType[]
}

export type WatchRuleChange = 'pause' | 'resume'

export interface WatchRuleEvaluation {
  readonly hits: number
  readonly created: number
  readonly resolved: number
  readonly notified: number
  readonly durationMs: number
  readonly status: string
  readonly error: string | null
}

export interface OperationalAlert {
  readonly id: string
  readonly watchRuleId: string | null
  readonly alertType: string
  readonly severity: AlertSeverity
  readonly status: AlertStatus
  readonly title: string
  readonly summary: string
  readonly warehouseId: string | null
  readonly entityType: string | null
  readonly entityId: string | null
  readonly firstDetectedAt: string
  readonly lastDetectedAt: string
  readonly lastNotifiedAt: string | null
  readonly snoozedUntil: string | null
  readonly acknowledgedAt: string | null
  readonly resolvedAt: string | null
  /** Why it was resolved; null while open and on alerts resolved before reasons were recorded. */
  readonly resolutionReason?: AlertResolutionReason | null
}

export type AlertResolutionReason = 'ConditionCleared' | 'RuleDeleted' | 'Superseded'

/** URL value of the "Đang mở" filter; the backend accepts the comma-separated list of statuses it stands for. */
export const ACTIVE_ALERT_FILTER = 'active'
export const ACTIVE_ALERT_STATUSES = 'Open,Acknowledged,Snoozed'

export interface AlertQuery {
  readonly status?: AlertStatus | typeof ACTIVE_ALERT_STATUSES
  readonly severity?: AlertSeverity
  readonly warehouseId?: string
  readonly alertType?: string
  readonly pageNumber: number
  readonly pageSize: number
}

export interface AlertListResponse {
  readonly items: OperationalAlert[]
  readonly totalCount: number
  readonly pageNumber: number
  readonly pageSize: number
}

export interface AlertDetailResponse {
  readonly alert: OperationalAlert
  readonly facts: unknown
  readonly myFeedback: string | null
}

export interface AlertMetrics {
  readonly generated: number
  readonly acknowledged: number
  readonly resolved: number
  readonly medianHoursToResolve: number | null
}

export interface AlertFact {
  readonly label: string
  readonly value: string
}
