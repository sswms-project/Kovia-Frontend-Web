'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  ExpiryDaysSettings,
  AlertSpeechControl,
  useVietnameseSpeechAvailable,
  ActivityPeriodFilter,
  StockAlertDialog,
  WarehouseOperationsView,
  WarehouseActivityChart,
  WarehouseOverviewView,
  AlertOverviewCharts,
  stockAlertKinds,
  type OverviewStockAlertKind,
  type StockAlertPanelState,
} from '../components/WarehouseOverview'
import { useInventoryAnomalySummaryQuery } from '@/features/inventory-anomaly/hooks/use-inventory-anomalies'
import {
  useReportingWarehousesQuery,
  useWarehouseOverviewQuery,
  useWarehouseActivityQuery,
} from '../hooks/use-warehouse-overview'
import { useStockAlertsQuery, useStockExpiryDistributionQuery } from '../hooks/use-stock-alerts'
import { useAlertAutoRead } from '../hooks/use-alert-auto-read'
import { useSpeechPreferences } from '@/lib/speech-preferences'
import { useOverviewCompactLayout, useOverviewNavigation } from '../hooks/use-overview-navigation'
import {
  expiryDaysSchema,
  type ExpiryDaysValues,
  type StockAlertParams,
} from '../schemas/stock-alert.schema'
import {
  activityPeriodSchema,
  activityPeriodParams,
  defaultActivityPeriod,
  resolveActivityPeriod,
  type ActivityPeriodValues,
} from '../schemas/activity-period.schema'

const initialPages: Record<OverviewStockAlertKind, number> = {
  'below-minimum': 1,
  expiring: 1,
}
// Biểu đồ dưới tối thiểu vẽ các sản phẩm đầu bảng (API xếp thiếu nhiều nhất trước).
const BELOW_MINIMUM_CHART_ROWS = 6
interface AlertDialogState {
  readonly kind: OverviewStockAlertKind
  readonly scope: string
  readonly page: number
  readonly pageSize: number
  readonly search: string
}

export default function WarehouseOverviewPage() {
  const location = useOverviewNavigation()
  const { ref, compact } = useOverviewCompactLayout()
  const [pages, setPages] = useState(initialPages)
  const [pageSizes, setPageSizes] = useState<Record<OverviewStockAlertKind, number>>({
    'below-minimum': 10,
    expiring: 10,
  })
  const [currentOverviewRange] = useState(() => resolveActivityPeriod(defaultActivityPeriod()))
  const activityForm = useForm<ActivityPeriodValues>({
    resolver: zodResolver(activityPeriodSchema),
    values: location.activityPeriod,
  })
  const [activityView, setActivityView] = useState('indices')
  const [dialog, setDialog] = useState<AlertDialogState | null>(null)
  const dialogOpener = useRef<HTMLElement | null>(null)
  const [isRecoveringAccess, setIsRecoveringAccess] = useState(false)
  const [accessRecoveryFailed, setAccessRecoveryFailed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const daysForm = useForm<ExpiryDaysValues>({
    resolver: zodResolver(expiryDaysSchema),
    defaultValues: { days: location.expiringDays },
  })
  const me = useMeQuery()
  const permissions = me.data?.permissions ?? []
  const permissionKey = [...permissions].sort().join('|')
  const canView = permissions.includes(P.DASHBOARD_VIEW)
  const canViewInventory = permissions.includes(P.INVENTORY_VIEW)
  const canViewAnomalies = permissions.includes(P.INVENTORY_ANOMALIES_VIEW)
  const options = useReportingWarehousesQuery(canView, permissionKey)
  const warehouseMissing =
    options.isSuccess &&
    Boolean(location.warehouseId) &&
    !options.data.some((warehouse) => warehouse.id === location.warehouseId)
  const enabled =
    canView &&
    !location.invalidWarehouse &&
    !warehouseMissing &&
    options.isSuccess &&
    options.data.length > 0
  // Đường dẫn cũ có thể còn trỏ tới nhóm đã bỏ khỏi tổng quan (vượt tối đa, quá hạn).
  const selectedKind: OverviewStockAlertKind =
    stockAlertKinds.find((kind) => kind === location.kind) ?? 'below-minimum'
  const scope = `${location.warehouseId}:${location.expiringDays}`
  const activeDialog = dialog?.scope === scope && location.tab === 'alerts' ? dialog : null
  const search = useDebouncedValue(activeDialog?.search ?? '', 350)
  const request = (kind: OverviewStockAlertKind): StockAlertParams => ({
    kind,
    warehouseId: location.warehouseId || undefined,
    expiringDays: kind === 'expiring' ? location.expiringDays : undefined,
    pageNumber: pages[kind],
    pageSize: pageSizes[kind],
  })
  const below = useStockAlertsQuery(
    request('below-minimum'),
    enabled && location.tab === 'alerts',
    permissionKey
  )
  const expiring = useStockAlertsQuery(
    request('expiring'),
    enabled && location.tab === 'alerts',
    permissionKey
  )
  const belowChart = useStockAlertsQuery(
    { ...request('below-minimum'), pageNumber: 1, pageSize: BELOW_MINIMUM_CHART_ROWS },
    enabled && location.tab === 'alerts',
    permissionKey
  )
  const expiryChart = useStockExpiryDistributionQuery(
    { warehouseId: location.warehouseId || undefined, expiringDays: location.expiringDays },
    enabled && location.tab === 'alerts',
    permissionKey
  )
  const anomalySummary = useInventoryAnomalySummaryQuery(
    location.warehouseId,
    enabled && location.tab === 'alerts' && canViewAnomalies
  )
  const overview = useWarehouseOverviewQuery(
    location.warehouseId || undefined,
    enabled && location.tab === 'activity',
    permissionKey,
    currentOverviewRange
  )
  const activity = useWarehouseActivityQuery(
    location.warehouseId || undefined,
    enabled && location.tab === 'activity',
    permissionKey,
    location.activityRange
  )
  const details = useStockAlertsQuery(
    {
      kind: activeDialog?.kind ?? selectedKind,
      warehouseId: location.warehouseId || undefined,
      expiringDays:
        (activeDialog?.kind ?? selectedKind) === 'expiring' ? location.expiringDays : undefined,
      pageNumber: activeDialog?.page ?? 1,
      pageSize: activeDialog?.pageSize ?? 10,
      search,
    },
    enabled && Boolean(activeDialog),
    permissionKey
  )
  const activeQueries =
    location.tab === 'alerts'
      ? [below, expiring, belowChart, expiryChart, anomalySummary, details]
      : [overview]
  const accessQueries = [
    below,
    expiring,
    belowChart,
    expiryChart,
    details,
    overview,
    activity,
    options,
    me,
  ]
  const deniedQueries = accessQueries.filter(
    (query) => isApiErrorResponse(query.error) && [401, 403].includes(query.error.statusCode)
  )
  const denied = deniedQueries[0]
  const errorMessage = me.isError
    ? getApiErrorMessage(me.error)
    : !me.isPending && !canView
      ? 'Bạn không có quyền xem tổng quan kho.'
      : location.invalidWarehouse
        ? 'Mã kho trên đường dẫn không hợp lệ. Vui lòng chọn lại kho.'
        : warehouseMissing
          ? 'Kho đã chọn không còn trong phạm vi được phép. Vui lòng chọn lại kho.'
          : denied
            ? getApiErrorMessage(denied.error)
            : options.isError
              ? `Không tải được danh sách kho. ${getApiErrorMessage(options.error)}`
              : undefined
  const canShowData =
    enabled && !denied && !me.isError && !isRecoveringAccess && !accessRecoveryFailed
  const panelState = (query: typeof below): StockAlertPanelState => ({
    data: canShowData ? query.data : undefined,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    errorMessage: query.isError ? getApiErrorMessage(query.error) : undefined,
    onRefresh: () => {
      if (enabled) void query.refetch()
    },
  })
  const panels = {
    'below-minimum': panelState(below),
    expiring: panelState(expiring),
  }
  const chartState = <T,>(query: {
    readonly data?: T
    readonly isPending: boolean
    readonly isError: boolean
    readonly error: unknown
    readonly refetch: () => Promise<unknown>
  }) => ({
    data: canShowData ? query.data : undefined,
    isLoading: query.isPending,
    errorMessage: query.isError ? getApiErrorMessage(query.error) : undefined,
    onRetry: () => {
      if (enabled) void query.refetch()
    },
  })
  const belowChartState = chartState(belowChart)
  const refresh = async () => {
    const recoverAccess = Boolean(denied || me.isError || !canView || accessRecoveryFailed)
    const visibleQueries =
      location.tab === 'activity'
        ? [overview, activity]
        : [below, expiring, belowChart, expiryChart, ...(canViewAnomalies ? [anomalySummary] : [])]
    const targets = new Set([
      options,
      ...(enabled ? visibleQueries : []),
      ...(recoverAccess ? accessQueries : []),
    ])
    // Refetch may clear a query's error before the access checks finish.
    if (recoverAccess) setIsRecoveringAccess(true)
    try {
      const results = await Promise.allSettled(
        [...targets].map((query) => query.refetch({ cancelRefetch: false }))
      )
      if (recoverAccess) {
        setAccessRecoveryFailed(
          results.some((result) => result.status === 'rejected' || !result.value.isSuccess)
        )
      }
    } finally {
      if (recoverAccess) setIsRecoveringAccess(false)
    }
  }
  const changeLocation = (values: Record<string, string>) => {
    setPages(initialPages)
    setDialog(null)
    setSettingsOpen(false)
    location.updateLocation(values)
  }
  const inventoryLink = canViewInventory
    ? {
        pathname: APP_ROUTES.inventory,
        query: location.warehouseId ? { warehouseId: location.warehouseId } : {},
      }
    : undefined
  const [speechPreferences] = useSpeechPreferences()
  const speechAvailable = useVietnameseSpeechAvailable()
  const speechCounts =
    canShowData && below.data && expiring.data
      ? {
          belowMinimum: below.data.totalCount,
          expiring: expiring.data.totalCount,
          belowMinimumNames: (belowChart.data ?? below.data).items.map((row) => row.productName),
          expiringNames: expiring.data.items.map((row) => row.productName),
        }
      : undefined
  const speechWarehouseName = options.data?.find(
    (warehouse) => warehouse.id === location.warehouseId
  )?.name
  useAlertAutoRead({
    enabled: speechPreferences.autoReadAlerts && location.tab === 'alerts',
    available: speechAvailable,
    scopeKey: scope,
    counts: speechCounts,
    warehouseName: speechWarehouseName,
  })
  const settings = (
    <>
      <AlertSpeechControl counts={speechCounts} warehouseName={speechWarehouseName} />
      <ExpiryDaysSettings
        open={settingsOpen}
        onOpenChange={(open) => {
          if (open) daysForm.reset({ days: location.expiringDays })
          setSettingsOpen(open)
        }}
        form={daysForm}
        onApply={({ days }) => {
          setPages((current) => ({ ...current, expiring: 1 }))
          setSettingsOpen(false)
          location.updateLocation({ expiringDays: String(days) })
        }}
      />
    </>
  )
  return (
    <>
      <WarehouseOverviewView
        workspaceRef={ref}
        compact={compact}
        warehouses={options.data ?? []}
        warehouseId={location.warehouseId}
        warehouseOptionsLoading={options.isPending}
        onWarehouseChange={(warehouseId) => changeLocation({ warehouseId })}
        tab={location.tab}
        onTabChange={(tab) => {
          setDialog(null)
          setSettingsOpen(false)
          location.updateLocation({ tab })
        }}
        selectedKind={selectedKind}
        onKindChange={(alert) => {
          location.updateLocation({ alert })
          ref.current
            ?.querySelector<HTMLElement>(`[data-alert-kind="${alert}"]`)
            ?.scrollIntoView({ block: 'nearest' })
        }}
        expiringDays={location.expiringDays}
        panels={panels}
        onPageChange={(kind, page) => setPages((current) => ({ ...current, [kind]: page }))}
        onPageSizeChange={(kind, pageSize) => {
          setPageSizes((current) => ({ ...current, [kind]: pageSize }))
          setPages((current) => ({ ...current, [kind]: 1 }))
        }}
        onExpand={(kind, opener) => {
          dialogOpener.current = opener
          setDialog({ kind, scope, page: 1, pageSize: 10, search: '' })
        }}
        onRefresh={refresh}
        isFetching={
          isRecoveringAccess ||
          me.isFetching ||
          options.isFetching ||
          activeQueries.some((query) => query.isFetching)
        }
        errorMessage={
          errorMessage ??
          (accessRecoveryFailed
            ? 'Chưa xác minh lại được dữ liệu tổng quan. Vui lòng tải lại.'
            : undefined)
        }
        canShowData={canShowData}
        canViewInventory={canViewInventory && canShowData}
        settings={settings}
        charts={
          <AlertOverviewCharts
            belowMinimum={{
              ...belowChartState,
              data:
                belowChartState.data && 'configuredPolicyCount' in belowChartState.data
                  ? belowChartState.data
                  : undefined,
            }}
            expiry={chartState(expiryChart)}
            anomalies={canViewAnomalies ? chartState(anomalySummary) : undefined}
            expiringDays={location.expiringDays}
            anomaliesHref={
              canViewAnomalies
                ? {
                    pathname: APP_ROUTES.inventoryAnomalies,
                    query: location.warehouseId ? { warehouseId: location.warehouseId } : {},
                  }
                : undefined
            }
          />
        }
        operations={
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            <WarehouseOperationsView
              activityChart={
                <WarehouseActivityChart
                  data={canShowData ? activity.data : undefined}
                  isLoading={activity.isPending && Boolean(location.activityRange)}
                  errorMessage={
                    !location.activityRange
                      ? 'Khoảng thời gian trên đường dẫn không hợp lệ. Vui lòng chọn lại kỳ và bấm Áp dụng.'
                      : activity.isError
                        ? getApiErrorMessage(activity.error)
                        : undefined
                  }
                  onRefresh={() => {
                    if (enabled && location.activityRange) void activity.refetch()
                  }}
                  periodFilter={
                    <ActivityPeriodFilter
                      form={activityForm}
                      onApply={(values) => location.updateLocation(activityPeriodParams(values))}
                    />
                  }
                />
              }
              data={canShowData ? overview.data : undefined}
              isLoading={overview.isPending}
              errorMessage={overview.isError ? getApiErrorMessage(overview.error) : undefined}
              onRefresh={() => {
                if (enabled) void overview.refetch()
              }}
              compact={compact}
              selectedView={activityView}
              onSelectedViewChange={setActivityView}
              links={{
                inventory: inventoryLink,
                forecast: canViewInventory ? { pathname: APP_ROUTES.reportForecast } : undefined,
                lowStock: permissions.includes(P.REPORTS_VIEW)
                  ? {
                      pathname: `${APP_ROUTES.reports}/replenishment`,
                      query: { warehouseId: location.warehouseId, autoRun: '1' },
                    }
                  : undefined,
                reports: permissions.includes(P.REPORTS_VIEW)
                  ? { pathname: APP_ROUTES.reports }
                  : undefined,
                tasks:
                  permissions.includes(P.WAREHOUSE_TASKS_VIEW_ALL) ||
                  permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN)
                    ? {
                        pathname: APP_ROUTES.myTasks,
                        query: {
                          deadlineStatus: 'Overdue',
                          ...(location.warehouseId ? { warehouseId: location.warehouseId } : {}),
                        },
                      }
                    : undefined,
              }}
            />
          </div>
        }
      />
      <StockAlertDialog
        {...panelState(details)}
        kind={activeDialog?.kind ?? selectedKind}
        open={Boolean(activeDialog) && canShowData}
        onClose={() => setDialog(null)}
        onRestoreFocus={() => {
          const opener = dialogOpener.current
          dialogOpener.current = null
          if (opener?.isConnected) opener.focus()
        }}
        search={activeDialog?.search ?? ''}
        onSearchChange={(value) =>
          setDialog((current) => (current ? { ...current, page: 1, search: value } : null))
        }
        warehouseLabel={
          options.data?.find((warehouse) => warehouse.id === location.warehouseId)?.name ??
          'Tất cả kho được phép'
        }
        expiringDays={location.expiringDays}
        canViewInventory={canViewInventory && canShowData}
        onPageChange={(page) => setDialog((current) => (current ? { ...current, page } : null))}
        onPageSizeChange={(pageSize) =>
          setDialog((current) => (current ? { ...current, page: 1, pageSize } : null))
        }
      />
    </>
  )
}
