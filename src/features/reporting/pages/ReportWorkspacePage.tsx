'use client'

import { useState } from 'react'
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
import { ReportFilters, ReportTable } from '../components/ReportWorkspace'
import {
  useWarehouseReport,
  useWarehouseReportCatalog,
  useWarehouseReportOptions,
  useExportWarehouseReport,
} from '../hooks/use-warehouse-report'
import { reportFilterSchema, type ReportFilterValues } from '../schemas/warehouse-report.schema'
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
  const permissions = me.data?.permissions ?? []
  const canView = permissions.includes(P.REPORTS_VIEW)
  const permissionKey = [...permissions].sort().join('|')
  const catalog = useWarehouseReportCatalog(canView, permissionKey)
  const definition = catalog.data?.find((report) => report.type === reportType)
  const options = useWarehouseReportOptions(
    canView,
    permissionKey,
    warehouseId || undefined,
    search || undefined
  )
  const warehouseOptions = useWarehouseReportOptions(canView, permissionKey)
  const report = useWarehouseReport(
    reportType,
    applied,
    canView && Boolean(definition),
    permissionKey
  )
  const exportReport = useExportWarehouseReport()
  const sourceLinks = new Map<string, UrlObject>()
  if (canView)
    for (const row of report.data?.items ?? []) {
      if ('sourceId' in row && row.sourceId) {
        if (row.sourceType === 'GoodsReceipt' && permissions.includes(P.GOODS_RECEIPTS_VIEW))
          sourceLinks.set(row.id, { pathname: APP_ROUTES.goodsReceiptDetail(row.sourceId) })
        if (
          row.sourceType === 'StockIssueRequest' &&
          permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW)
        )
          sourceLinks.set(row.id, {
            pathname: APP_ROUTES.stockIssueRequests,
            query: { requestId: row.sourceId },
          })
        if (row.sourceType === 'InboundRequest' && permissions.includes(P.INBOUND_REQUESTS_VIEW))
          sourceLinks.set(row.id, { pathname: APP_ROUTES.inboundRequestDetail(row.sourceId) })
        if (row.sourceType === 'StockTransfer' && permissions.includes(P.TRANSFERS_VIEW))
          sourceLinks.set(row.id, {
            pathname: APP_ROUTES.transferDetail(row.sourceId),
          })
        if (row.sourceType === 'CycleCount' && permissions.includes(P.CYCLE_COUNTS_VIEW))
          sourceLinks.set(row.id, { pathname: APP_ROUTES.cycleCountDetail(row.sourceId) })
        if (row.sourceType === 'StockAdjustment' && permissions.includes(P.STOCK_ADJUSTMENTS_VIEW))
          sourceLinks.set(row.id, { pathname: APP_ROUTES.stockAdjustmentDetail(row.sourceId) })
        if (row.rowType === 'task-progress') {
          if (row.taskType === 'Receiving' && permissions.includes(P.INBOUND_REQUESTS_VIEW))
            sourceLinks.set(row.id, { pathname: APP_ROUTES.inboundRequestDetail(row.sourceId) })
          if (row.taskType === 'PutAway' && permissions.includes(P.GOODS_RECEIPTS_VIEW))
            sourceLinks.set(row.id, { pathname: APP_ROUTES.goodsReceiptDetail(row.sourceId) })
          if (
            ['Relocation', 'TransferPick', 'TransferReceive'].includes(row.taskType) &&
            (permissions.includes(P.WAREHOUSE_TASKS_VIEW_ALL) ||
              permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN))
          )
            sourceLinks.set(row.id, {
              pathname: APP_ROUTES.myTasks,
              query: { taskId: row.sourceId },
            })
        }
      }
      if ((row.rowType === 'inventory-balance' || row.rowType === 'slow-moving') && row.productId)
        sourceLinks.set(row.id, {
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
        sourceLinks.set(row.id, {
          pathname: APP_ROUTES.inventory,
          query: { warehouseId: row.warehouseId, productId: row.productId },
        })
    }
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
    <div className="flex h-full min-h-0 flex-col gap-3">
      <header className="motion-safe:animate-in motion-safe:fade-in shrink-0 motion-safe:duration-200">
        <Link href={APP_ROUTES.reports} className="text-primary text-xs hover:underline">
          ← Báo cáo kho
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{definition?.name ?? 'Báo cáo kho'}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{definition?.description}</p>
      </header>
      {error ? (
        <div role="alert" className="text-destructive shrink-0 text-sm">
          {report.data ? 'Dữ liệu cũ — ' : ''}
          {error}
        </div>
      ) : null}
      {definition && canView ? (
        <ReportFilters
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
          exportAction={
            definition.formats.includes('xlsx') ? (
              <Button
                type="button"
                variant="outline"
                className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary w-32 rounded-md"
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
              return
            }
            setApplied(buildReportQuery(reportType, values, definition.usesPeriod))
            rememberReportFilters(values)
          }}
        />
      ) : null}
      {(catalog.isPending && canView) || (report.isFetching && !report.data) ? (
        <Skeleton className="h-48" />
      ) : null}
      {!catalog.isPending && canView && !catalog.isError && !definition ? (
        <p>Loại báo cáo không được hỗ trợ.</p>
      ) : null}
      {canView && report.data ? (
        <>
          <div className="text-muted-foreground bg-card shrink-0 rounded-xl border p-3 text-xs">
            <p>
              {report.data.timeBasis} · Tạo lúc{' '}
              {new Date(report.data.generatedAt).toLocaleString('vi-VN')} · {report.data.totalCount}{' '}
              dòng trên toàn bộ bộ lọc
            </p>
            <p>
              Phạm vi đã áp dụng: {report.data.appliedFilters.warehouseIds.length} kho
              {report.data.appliedFilters.dateFrom
                ? ` · ${report.data.appliedFilters.dateFrom} → ${report.data.appliedFilters.dateTo}`
                : ''}
            </p>
            <details className="mt-2 border-t pt-2">
              <summary className="text-primary focus-visible:outline-primary cursor-pointer py-1 font-medium">
                Cách đọc số liệu · {report.data.warnings.length} lưu ý
              </summary>
              {report.data.warnings.map((warning) => (
                <p key={warning} className="mt-2 leading-relaxed">
                  {warning}
                </p>
              ))}
              <p className="mt-2">
                Đổi tham số rồi bấm “Xem báo cáo” để áp dụng; không cộng số lượng khác SKU/ĐVT.
              </p>
            </details>
          </div>
          <ReportTable
            report={report.data}
            isFetching={report.isFetching}
            sourceLinks={sourceLinks}
            onPageChange={(pageNumber) =>
              setApplied((current) => (current ? { ...current, pageNumber } : null))
            }
            onPageSizeChange={(pageSize) =>
              setApplied((current) => (current ? { ...current, pageNumber: 1, pageSize } : null))
            }
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
