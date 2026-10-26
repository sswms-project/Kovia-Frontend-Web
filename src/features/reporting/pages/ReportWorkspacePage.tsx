'use client'

import { useCallback, useMemo, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import type { UrlObject } from 'url'
import { P } from '@/config/permissionCodes'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { getApiErrorMessage } from '@/lib/api-error'
import { APP_ROUTES } from '@/routes/app-routes'
import { ReportFilters, ReportTable, ReportSummary } from '../components/ReportWorkspace'
import {
  useWarehouseReport,
  useWarehouseReportCatalog,
  useWarehouseReportOptions,
  useExportWarehouseReport,
} from '../hooks/use-warehouse-report'
import {
  reportFilterSchema,
  type ReportFilterValues,
  type ReportOptions,
} from '../schemas/warehouse-report.schema'
import type { WarehouseReportQuery } from '../types/warehouse-report.types'
import {
  initialReportFilters,
  buildReportQuery,
  rememberReportFilters,
  routeFilter,
  type ReportRouteFilters,
} from '../utils/report-filters'

interface ReportWorkspacePageProps {
  readonly reportType: string
  readonly initialFilters?: ReportRouteFilters
}
const emptyPermissions: readonly string[] = []
const parameterKeys: readonly (keyof WarehouseReportQuery)[] = [
  'categoryId',
  'warehouseIds',
  'productId',
  'search',
  'status',
  'assigneeId',
  'taskType',
  'deadline',
  'dateFrom',
  'dateTo',
]
export default function ReportWorkspacePage({
  reportType,
  initialFilters,
}: ReportWorkspacePageProps) {
  const [defaults] = useState(() => initialReportFilters(reportType, initialFilters))
  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: defaults,
  })
  const warehouseId = useWatch({ control: form.control, name: 'warehouseId' })
  const categoryId = useWatch({ control: form.control, name: 'categoryId' })
  const search = useDebouncedValue(useWatch({ control: form.control, name: 'search' }), 350)
  const [applied, setApplied] = useState<WarehouseReportQuery | null>(() =>
    routeFilter(initialFilters, 'autoRun') === '1'
      ? buildReportQuery(
          reportType,
          defaults,
          !['inventory-snapshot', 'replenishment'].includes(reportType)
        )
      : null
  )
  const me = useMeQuery()
  const permissions = me.data?.permissions ?? emptyPermissions
  const canView = permissions.includes(P.REPORTS_VIEW)
  const permissionKey = [...permissions].sort().join('|')
  const catalog = useWarehouseReportCatalog(canView, permissionKey)
  const definition = catalog.data?.find((report) => report.type === reportType)
  const options = useWarehouseReportOptions(
    canView,
    permissionKey,
    warehouseId || undefined,
    search || undefined,
    categoryId || undefined
  )
  const warehouseOptions = useWarehouseReportOptions(canView, permissionKey)
  const report = useWarehouseReport(
    reportType,
    applied,
    canView && Boolean(definition),
    permissionKey
  )
  const exportReport = useExportWarehouseReport()
  const draftValues = useWatch({
    control: form.control,
    compute: (values) => values,
  })
  const draftQuery = buildReportQuery(reportType, draftValues, definition?.usesPeriod ?? false)
  const [appliedOptions, setAppliedOptions] = useState<ReportOptions>()
  const hasUnappliedChanges = Boolean(
    applied &&
    parameterKeys.some((key) => JSON.stringify(draftQuery[key]) !== JSON.stringify(applied[key]))
  )
  const sourceLinks = useMemo(() => {
    const links = new Map<string, UrlObject>()
    if (canView)
      for (const row of report.data?.items ?? []) {
        if ('sourceId' in row && row.sourceId) {
          if (row.sourceType === 'GoodsReceipt' && permissions.includes(P.GOODS_RECEIPTS_VIEW))
            links.set(row.id, { pathname: APP_ROUTES.goodsReceiptDetail(row.sourceId) })
          if (
            row.sourceType === 'StockIssueRequest' &&
            permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW)
          )
            links.set(row.id, {
              pathname: APP_ROUTES.stockIssueRequests,
              query: { requestId: row.sourceId },
            })
          if (row.sourceType === 'InboundRequest' && permissions.includes(P.INBOUND_REQUESTS_VIEW))
            links.set(row.id, { pathname: APP_ROUTES.inboundRequestDetail(row.sourceId) })
          if (row.sourceType === 'StockTransfer' && permissions.includes(P.TRANSFERS_VIEW))
            links.set(row.id, {
              pathname: APP_ROUTES.transferDetail(row.sourceId),
            })
          if (row.sourceType === 'CycleCount' && permissions.includes(P.CYCLE_COUNTS_VIEW))
            links.set(row.id, { pathname: APP_ROUTES.cycleCountDetail(row.sourceId) })
          if (
            row.sourceType === 'StockAdjustment' &&
            permissions.includes(P.STOCK_ADJUSTMENTS_VIEW)
          )
            links.set(row.id, { pathname: APP_ROUTES.stockAdjustmentDetail(row.sourceId) })
          if (row.rowType === 'task-progress') {
            if (row.taskType === 'Receiving' && permissions.includes(P.INBOUND_REQUESTS_VIEW))
              links.set(row.id, { pathname: APP_ROUTES.inboundRequestDetail(row.sourceId) })
            if (row.taskType === 'PutAway' && permissions.includes(P.GOODS_RECEIPTS_VIEW))
              links.set(row.id, { pathname: APP_ROUTES.goodsReceiptDetail(row.sourceId) })
            if (
              ['Relocation', 'TransferPick', 'TransferReceive', 'TransferPutAway'].includes(
                row.taskType
              ) &&
              (permissions.includes(P.WAREHOUSE_TASKS_VIEW_ALL) ||
                permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN))
            )
              links.set(row.id, {
                pathname: APP_ROUTES.myTasks,
                query: { taskId: row.sourceId },
              })
          }
        }
        if ((row.rowType === 'inventory-balance' || row.rowType === 'slow-moving') && row.productId)
          links.set(row.id, {
            pathname: `${APP_ROUTES.reports}/stock-card`,
            query: {
              productId: row.productId,
              warehouseId: row.warehouseId,
              dateFrom: applied?.dateFrom,
              dateTo: applied?.dateTo,
              autoRun: '1',
            },
          })
        if (row.rowType === 'replenishment' && permissions.includes(P.INVENTORY_VIEW))
          links.set(row.id, {
            pathname: APP_ROUTES.inventory,
            query: { warehouseId: row.warehouseId, productId: row.productId },
          })
      }
    return links
  }, [canView, permissions, report.data?.items, applied?.dateFrom, applied?.dateTo])
  const onPageChange = useCallback((pageNumber: number) => {
    setApplied((current) => (current ? { ...current, pageNumber } : null))
  }, [])
  const onPageSizeChange = useCallback((pageSize: number) => {
    setApplied((current) => (current ? { ...current, pageNumber: 1, pageSize } : null))
  }, [])
  const error = me.isError
    ? getApiErrorMessage(me.error)
    : !me.isPending && !canView
      ? 'Bạn không có quyền xem báo cáo kho.'
      : catalog.isError
        ? getApiErrorMessage(catalog.error)
        : report.isError
          ? getApiErrorMessage(report.error)
          : options.isError
            ? getApiErrorMessage(options.error)
            : warehouseOptions.isError
              ? getApiErrorMessage(warehouseOptions.error)
              : undefined
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-2">
      {!definition || !canView ? (
        <header className="flex min-w-0 items-center gap-3">
          <Link
            href={APP_ROUTES.reports}
            aria-label="Quay lại Báo cáo kho"
            className="text-primary hover:bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-md text-xl"
          >
            ←
          </Link>
          <h1 className="min-w-0 text-xl font-semibold">{definition?.name ?? 'Báo cáo kho'}</h1>
        </header>
      ) : null}
      {error ? (
        <div role="alert" className="text-destructive shrink-0 text-sm">
          {report.data ? 'Dữ liệu cũ — ' : ''}
          {error}
        </div>
      ) : null}
      {definition && canView ? (
        <ReportFilters
          heading={
            <header className="flex min-w-0 items-center gap-3">
              <Link
                href={APP_ROUTES.reports}
                aria-label="Quay lại Báo cáo kho"
                className="text-primary hover:bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-md text-xl"
              >
                ←
              </Link>
              <h1 className="min-w-0 text-xl font-semibold">{definition?.name ?? 'Báo cáo kho'}</h1>
            </header>
          }
          definition={definition}
          form={form}
          options={
            options.data
              ? { ...options.data, warehouses: warehouseOptions.data?.warehouses ?? [] }
              : warehouseOptions.data
                ? { ...warehouseOptions.data, products: [], assignees: [] }
                : undefined
          }
          isFetching={report.isFetching}
          hasUnappliedChanges={hasUnappliedChanges}
          exportAction={
            definition.formats.includes('xlsx') ? (
              <Button
                type="button"
                variant="outline"
                className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary h-10 w-28 rounded-md text-sm sm:w-32"
                title="Xuất Excel toàn bộ dữ liệu theo bộ lọc đã áp dụng"
                disabled={
                  !report.data ||
                  !applied ||
                  exportReport.isPending ||
                  report.isFetching ||
                  report.isError
                }
                onClick={() => {
                  if (applied) exportReport.mutate({ type: reportType, query: applied })
                }}
              >
                <FileSpreadsheet aria-hidden="true" />
                {exportReport.isPending ? 'Đang xuất…' : 'Xuất Excel'}
              </Button>
            ) : null
          }
          onApply={(values) => {
            if (definition.requiresProduct && !values.productId) {
              form.setError('productId', { message: 'Vui lòng chọn mặt hàng để xem thẻ kho.' })
              return false
            }
            const nextQuery = buildReportQuery(reportType, values, definition.usesPeriod)
            if (JSON.stringify(nextQuery) === JSON.stringify(applied)) void report.refetch()
            else setApplied(nextQuery)
            setAppliedOptions(
              options.data
                ? { ...options.data, warehouses: warehouseOptions.data?.warehouses ?? [] }
                : warehouseOptions.data
            )
            rememberReportFilters(values)
            return true
          }}
        />
      ) : null}
      {(catalog.isPending && canView) || (report.isFetching && !report.data) ? (
        <Skeleton aria-label="Đang tải báo cáo" className="min-h-0 flex-1" />
      ) : null}
      {!catalog.isPending && canView && !catalog.isError && !definition ? (
        <p>Loại báo cáo không được hỗ trợ.</p>
      ) : null}
      {canView && report.data ? (
        <>
          <ReportSummary
            report={report.data}
            options={appliedOptions ?? options.data ?? warehouseOptions.data}
          />
          <ReportTable
            report={report.data}
            isFetching={report.isFetching}
            sourceLinks={sourceLinks}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      ) : !report.isFetching && definition && canView ? (
        <p className="text-muted-foreground p-6 text-center text-sm">
          Chọn tham số rồi bấm “Xem báo cáo”.
        </p>
      ) : null}
    </div>
  )
}
