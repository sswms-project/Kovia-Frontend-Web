import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  AlertDetailResponse,
  AlertFeedbackKind,
  AlertListResponse,
  AlertMetrics,
  AlertQuery,
  WatchRuleCatalogResponse,
  WatchRuleChange,
  WatchRuleEvaluation,
  WatchRuleListResponse,
} from '../types/ai-alerts.types'

const endpoints = API_ENDPOINTS.aiAlerts

export const aiAlertsService = {
  getAlerts: (params: AlertQuery) =>
    axiosClient
      .get<ApiResponse<AlertListResponse>>(endpoints.alerts, { params })
      .then((response) => response.data.data),
  getAlert: (alertId: string) =>
    axiosClient
      .get<ApiResponse<AlertDetailResponse>>(endpoints.alert(alertId))
      .then((response) => response.data.data),
  getMetrics: (from: string, to: string) =>
    axiosClient
      .get<ApiResponse<AlertMetrics>>(endpoints.metrics, { params: { from, to } })
      .then((response) => response.data.data),
  acknowledge: (alertId: string) =>
    axiosClient.post<ApiResponse<string>>(endpoints.acknowledge(alertId)).then(() => undefined),
  snooze: ({ alertId, hours }: { alertId: string; hours: number }) =>
    axiosClient
      .post<ApiResponse<string>>(endpoints.snooze(alertId), { hours })
      .then(() => undefined),
  sendFeedback: ({
    alertId,
    kind,
    note,
  }: {
    alertId: string
    kind: AlertFeedbackKind
    note?: string
  }) =>
    axiosClient
      .post<ApiResponse<string>>(endpoints.feedback(alertId), { kind, note: note || undefined })
      .then(() => undefined),
  getRules: () =>
    axiosClient
      .get<ApiResponse<WatchRuleListResponse>>(endpoints.watchRules)
      .then((response) => response.data.data),
  getCatalog: () =>
    axiosClient
      .get<ApiResponse<WatchRuleCatalogResponse>>(endpoints.watchRuleCatalog)
      .then((response) => response.data.data),
  changeRule: ({ ruleId, change }: { ruleId: string; change: WatchRuleChange }) =>
    axiosClient
      .patch<ApiResponse<string>>(endpoints.watchRule(ruleId), { change })
      .then(() => undefined),
  deleteRule: (ruleId: string) =>
    axiosClient.delete<ApiResponse<string>>(endpoints.watchRule(ruleId)).then(() => undefined),
  evaluateRule: (ruleId: string) =>
    axiosClient
      .post<ApiResponse<WatchRuleEvaluation>>(endpoints.evaluateWatchRule(ruleId))
      .then((response) => response.data.data),
}
