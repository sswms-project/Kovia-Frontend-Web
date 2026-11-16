'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { canUseAiAssistant } from '@/config/ai-assistant-access'
import { getApiErrorMessage, getErrorKind } from '@/lib/api-error'
import { APP_ROUTES } from '@/routes/app-routes'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import { useAuthStore } from '@/stores/auth.store'
import { useInventoryWarehouseOptionsQuery } from '@/features/inventory/hooks/use-inventory'
import {
  AlertDetailSheet,
  AlertDirectory,
  AlertMetricsStrip,
  WatchRuleList,
  type AlertFilterValues,
  type FilterOption,
  type RuleEvaluationNotice,
} from '../components/AiAlertsPage'
import {
  useAlertMetricsQuery,
  useAlertsQuery,
  useChangeWatchRuleMutation,
  useDeleteWatchRuleMutation,
  useEvaluateWatchRuleMutation,
  useWatchRuleCatalogQuery,
  useWatchRulesQuery,
} from '../hooks/use-ai-alerts'
import {
  ACTIVE_ALERT_FILTER,
  ACTIVE_ALERT_STATUSES,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  type AlertQuery,
  type WatchRule,
  type WatchRuleEvaluation,
} from '../types/ai-alerts.types'

const PAGE_SIZES = [10, 20, 30, 50]
const DEFAULT_PAGE_SIZE = 20
const FILTER_KEYS = ['status', 'severity', 'warehouseId', 'alertType'] as const

export default function AiAlertsPage() {
  const searchParams = useSearchParams()
  const serializedParams = searchParams.toString()
  const params = useMemo(() => new URLSearchParams(serializedParams), [serializedParams])
  const query = useMemo(() => buildAlertQuery(params), [params])
  const tab = params.get('tab') === 'rules' ? 'rules' : 'alerts'
  const selectedAlertId = params.get('alert')
  const highlightedRuleId = params.get('rule')

  const user = useAuthStore((state) => state.user)
  const setAssistantOpen = useAiAssistantPanelStore((state) => state.setOpen)
  const alertsQuery = useAlertsQuery(query)
  const metricsQuery = useAlertMetricsQuery()
  const rulesQuery = useWatchRulesQuery()
  const catalogQuery = useWatchRuleCatalogQuery()
  const changeRuleMutation = useChangeWatchRuleMutation()
  const deleteRuleMutation = useDeleteWatchRuleMutation()
  const evaluateRuleMutation = useEvaluateWatchRuleMutation()
  const [evaluationNotice, setEvaluationNotice] = useState<RuleEvaluationNotice | null>(null)

  const rules = useMemo(() => rulesQuery.data?.items ?? [], [rulesQuery.data])
  const warehousesQuery = useInventoryWarehouseOptionsQuery()
  // Danh sách cảnh báo chỉ có mã kho; tên kho lấy từ các kho người dùng được xem và từ quy tắc của chính họ
  // (thiếu quy tắc thì cảnh báo của kho Đà Nẵng từng hiện "Kho khác").
  const warehouseOptions = useMemo<FilterOption[]>(() => {
    const names = new Map<string, string>()
    for (const warehouse of warehousesQuery.data ?? [])
      if (warehouse.canManageWarehouse) names.set(warehouse.id, warehouse.warehouseName)
    for (const rule of rules)
      if (rule.warehouseId && rule.warehouseName) names.set(rule.warehouseId, rule.warehouseName)
    return [...names].map(([value, label]) => ({ value, label }))
  }, [rules, warehousesQuery.data])
  const typeOptions = useMemo<FilterOption[]>(
    () =>
      (catalogQuery.data?.types ?? [])
        .filter((type) => type.creatable)
        .map((type) => ({ value: type.ruleType, label: type.label })),
    [catalogQuery.data]
  )
  const warehouseName = (warehouseId: string | null) =>
    (warehouseId && warehouseOptions.find((option) => option.value === warehouseId)?.label) ||
    (warehouseId ? 'Kho khác' : '—')
  const typeLabel = (alertType: string) =>
    catalogQuery.data?.types.find((type) => type.ruleType === alertType)?.label ?? alertType

  const filters: AlertFilterValues = {
    // The select shows the URL value ("active"), not the expanded status list sent to the BE.
    status: query.status === ACTIVE_ALERT_STATUSES ? ACTIVE_ALERT_FILTER : (query.status ?? ''),
    severity: query.severity ?? '',
    warehouseId: query.warehouseId ?? '',
    alertType: query.alertType ?? '',
  }

  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    const search = next.toString()
    window.history.pushState(
      null,
      '',
      search ? `${APP_ROUTES.aiAlerts}?${search}` : APP_ROUTES.aiAlerts
    )
  }

  const pendingRuleId =
    (changeRuleMutation.isPending && changeRuleMutation.variables?.ruleId) ||
    (deleteRuleMutation.isPending && deleteRuleMutation.variables) ||
    (evaluateRuleMutation.isPending && evaluateRuleMutation.variables) ||
    null

  function changeRuleStatus(rule: WatchRule) {
    changeRuleMutation.mutate({
      ruleId: rule.id,
      change: rule.status === 'Active' ? 'pause' : 'resume',
    })
  }

  function deleteRule(rule: WatchRule) {
    deleteRuleMutation.mutate(rule.id)
  }

  function evaluateRule(rule: WatchRule) {
    setEvaluationNotice(null)
    evaluateRuleMutation.mutate(rule.id, {
      onSuccess: (result) => setEvaluationNotice(toEvaluationNotice(rule.id, result)),
      onError: (error) =>
        setEvaluationNotice({
          ruleId: rule.id,
          isError: true,
          message:
            getErrorKind(error).kind === 'forbidden'
              ? 'Môi trường này không cho kiểm tra thủ công.'
              : getApiErrorMessage(error, 'Không thể kiểm tra quy tắc.'),
        }),
    })
  }

  return (
    // A size container: with the Kovia dock open the column is narrow while the viewport is wide, so the strip,
    // header and filters adapt to this width (@-variants), not the viewport.
    <div className="@container flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      <header className="shrink-0">
        <h1 className="text-foreground text-xl font-semibold">Cảnh báo theo dõi</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Kovia tự kiểm tra các quy tắc bạn đặt và báo khi điều kiện xảy ra.
        </p>
      </header>
      <Tabs
        value={tab}
        onValueChange={(value) =>
          updateParams({ tab: value === 'rules' ? 'rules' : null, rule: null, alert: null })
        }
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <TabsList className="shrink-0">
          <TabsTrigger value="alerts">Cảnh báo</TabsTrigger>
          <TabsTrigger value="rules">Quy tắc theo dõi</TabsTrigger>
        </TabsList>
        <TabsContent value="alerts" className="flex min-h-0 flex-col gap-3 text-sm">
          <AlertMetricsStrip metrics={metricsQuery.data} />
          <AlertDirectory
            items={alertsQuery.data?.items ?? []}
            totalCount={alertsQuery.data?.totalCount ?? 0}
            page={query.pageNumber}
            pageSize={query.pageSize}
            filters={filters}
            warehouseOptions={warehouseOptions}
            typeOptions={typeOptions}
            isLoading={alertsQuery.isLoading}
            isFetching={alertsQuery.isFetching}
            isError={alertsQuery.isError}
            warehouseName={warehouseName}
            onFilterChange={(key, value) => updateParams({ [key]: value, page: null })}
            onPageChange={(page) => updateParams({ page: String(page) })}
            onPageSizeChange={(pageSize) =>
              updateParams({ pageSize: String(pageSize), page: null })
            }
            onOpen={(alertId) => updateParams({ alert: alertId })}
            onRetry={() => void alertsQuery.refetch()}
          />
        </TabsContent>
        <TabsContent value="rules" className="flex min-h-0 flex-col text-sm">
          <WatchRuleList
            rules={rules}
            maxRules={rulesQuery.data?.maxRules ?? null}
            isLoading={rulesQuery.isLoading}
            isError={rulesQuery.isError}
            highlightedRuleId={highlightedRuleId}
            pendingRuleId={pendingRuleId}
            evaluationNotice={evaluationNotice}
            canOpenAssistant={canUseAiAssistant(user)}
            onOpenAssistant={() => setAssistantOpen(true)}
            onChangeStatus={changeRuleStatus}
            onEvaluate={evaluateRule}
            onDelete={deleteRule}
            onRetry={() => void rulesQuery.refetch()}
          />
        </TabsContent>
      </Tabs>
      <AlertDetailSheet
        alertId={selectedAlertId}
        warehouseName={warehouseName}
        typeLabel={typeLabel}
        onClose={() => updateParams({ alert: null })}
      />
    </div>
  )
}

function buildAlertQuery(params: URLSearchParams): AlertQuery {
  const pick = <T extends string>(values: readonly T[], value: string | null) =>
    values.find((candidate) => candidate === value)
  const page = Number(params.get('page'))
  const pageSize = Number(params.get('pageSize'))
  const filters = Object.fromEntries(
    FILTER_KEYS.map((key) => [key, params.get(key) || undefined])
  ) as Record<(typeof FILTER_KEYS)[number], string | undefined>
  return {
    status:
      filters.status === ACTIVE_ALERT_FILTER
        ? ACTIVE_ALERT_STATUSES
        : pick(ALERT_STATUSES, filters.status ?? null),
    severity: pick(ALERT_SEVERITIES, filters.severity ?? null),
    warehouseId: filters.warehouseId,
    alertType: filters.alertType,
    pageNumber: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  }
}

function toEvaluationNotice(ruleId: string, result: WatchRuleEvaluation): RuleEvaluationNotice {
  if (result.error) return { ruleId, isError: true, message: result.error }
  return {
    ruleId,
    isError: false,
    message: `${result.hits} điều kiện khớp, ${result.created} cảnh báo mới, ${result.resolved} đã tự đóng.`,
  }
}
