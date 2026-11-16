import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage, logApiError } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import { aiAlertsService } from '../services/ai-alerts.service'
import type { AlertQuery } from '../types/ai-alerts.types'

const METRICS_WINDOW_DAYS = 30

export function useAlertsQuery(params: AlertQuery) {
  return useQuery({
    queryKey: queryKeys.aiAlerts.list(params),
    queryFn: () => aiAlertsService.getAlerts(params),
    placeholderData: keepPreviousData,
  })
}

export function useAlertDetailQuery(alertId: string | null) {
  return useQuery({
    queryKey: queryKeys.aiAlerts.detail(alertId ?? ''),
    queryFn: () => aiAlertsService.getAlert(alertId ?? ''),
    enabled: alertId !== null,
    // 404 nghĩa là người dùng không còn quyền xem; thử lại không đổi được kết quả.
    retry: false,
  })
}

export function useAlertMetricsQuery() {
  return useQuery({
    queryKey: queryKeys.aiAlerts.metrics,
    queryFn: () => {
      const to = new Date()
      const from = new Date(to.getTime() - METRICS_WINDOW_DAYS * 24 * 60 * 60 * 1000)
      return aiAlertsService.getMetrics(from.toISOString(), to.toISOString())
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useWatchRulesQuery() {
  return useQuery({ queryKey: queryKeys.aiAlerts.rules, queryFn: aiAlertsService.getRules })
}

export function useWatchRuleCatalogQuery() {
  return useQuery({
    queryKey: queryKeys.aiAlerts.catalog,
    queryFn: aiAlertsService.getCatalog,
    staleTime: Infinity,
  })
}

function useAlertsMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  errorMessage: string | null,
  successMessage?: string
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    // Kept in the hook (not per-call): it still runs if the page unmounts mid-request.
    onSuccess: () => {
      if (successMessage) toast.success(successMessage)
      return queryClient.invalidateQueries({ queryKey: queryKeys.aiAlerts.all })
    },
    onError: (error) => {
      logApiError(error)
      if (errorMessage) toast.error(getApiErrorMessage(error, errorMessage))
    },
  })
}

export const useAcknowledgeAlertMutation = () =>
  useAlertsMutation(aiAlertsService.acknowledge, 'Không thể ghi nhận cảnh báo.')

export const useSnoozeAlertMutation = () =>
  useAlertsMutation(aiAlertsService.snooze, 'Không thể tạm hoãn cảnh báo.')

export const useAlertFeedbackMutation = () =>
  useAlertsMutation(aiAlertsService.sendFeedback, 'Không thể gửi phản hồi.')

export const useChangeWatchRuleMutation = () =>
  useAlertsMutation(aiAlertsService.changeRule, 'Không thể cập nhật quy tắc theo dõi.')

export const useDeleteWatchRuleMutation = () =>
  useAlertsMutation(
    aiAlertsService.deleteRule,
    'Không thể xóa quy tắc theo dõi.',
    'Đã xóa quy tắc theo dõi.'
  )

// Kết quả/lỗi kiểm tra hiển thị ngay trên dòng quy tắc, không bật thông báo nổi.
export const useEvaluateWatchRuleMutation = () =>
  useAlertsMutation(aiAlertsService.evaluateRule, null)
