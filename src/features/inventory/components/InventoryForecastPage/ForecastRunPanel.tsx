'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, PackagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_ROUTES } from '@/routes/app-routes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { operationalToday } from '@/lib/operational-date-time'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import type { ForecastWorkspace } from '../../hooks/use-forecast-workspace'
import type { InventoryFilterOption } from '../../types/inventory.types'
import {
  forecastEvaluationStartDate,
  forecastRunStatusLabel,
  hasEndedForecastDays,
} from '../../utils/forecast-overview'
import { formatInventoryDateOnly } from '../../utils/inventory-format'
import { ForecastOverviewView } from './ForecastOverviewView'
import { ForecastDemandView } from './ForecastDemandView'
import { ReplenishmentList } from './ReplenishmentList'
import { ReplenishmentReviewDialog } from './ReplenishmentReviewDialog'
import { ForecastRebalancingView } from './ForecastRebalancingView'

// Opacity only: a tab swap should feel instant, never shift the layout.
const TAB_ENTER = 'animate-in fade-in-0 animation-duration-200 motion-reduce:animate-none'

interface ForecastRunPanelProps {
  readonly workspace: ForecastWorkspace
  readonly warehouseOptions: readonly InventoryFilterOption[]
  readonly warehousesLoading: boolean
  readonly warehousesError: boolean
  readonly retryWarehouses: () => void
  readonly canRun: boolean
  readonly canReview: boolean
  readonly canViewInbound: boolean
  readonly canCreateTransfer: boolean
  readonly canViewReports: boolean
}

export function ForecastRunPanel({
  workspace,
  warehouseOptions,
  warehousesLoading,
  warehousesError,
  retryWarehouses,
  canRun,
  canReview,
  canViewInbound,
  canCreateTransfer,
  canViewReports,
}: ForecastRunPanelProps) {
  const [tab, setTab] = useState('overview')
  const run = workspace.runQuery.data
  const diagnostics = run?.details?.products ?? []
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* One line, like the report pages: the table below gets the rest of the height. */}
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {canViewReports ? (
            <Link
              href={APP_ROUTES.reports}
              aria-label="Quay lại Báo cáo & phân tích"
              className="text-primary hover:bg-primary/10 focus-visible:ring-ring flex size-9 shrink-0 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
          ) : null}
          <h1 className="min-w-0 truncate text-xl font-semibold">Dự báo & bổ sung hàng</h1>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Cập nhật căn cứ"
          title="Cập nhật căn cứ"
          disabled={!workspace.runId || workspace.runQuery.isFetching}
          onClick={() => void workspace.runQuery.refetch()}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </header>
      {/* Field is w-full: the flexible fields use a zero basis so they share one row from sm up. */}
      <form
        onSubmit={workspace.createAndRun}
        className="bg-card flex shrink-0 flex-wrap items-end gap-3 rounded-xl border p-3"
      >
        <Field className="min-w-56 flex-1 basis-full sm:basis-0">
          <FieldLabel htmlFor="forecast-warehouse">Kho</FieldLabel>
          <NativeSelect
            id="forecast-warehouse"
            value={workspace.warehouseId}
            disabled={warehousesLoading || workspace.isCreating}
            onChange={(event) => workspace.changeWarehouse(event.target.value)}
          >
            <NativeSelectOption value="">Chọn kho</NativeSelectOption>
            {warehouseOptions.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {workspace.createForm.formState.errors.warehouseId ? (
            <p className="text-destructive text-xs" role="alert">
              {workspace.createForm.formState.errors.warehouseId.message}
            </p>
          ) : null}
        </Field>
        <Field className="w-28">
          <FieldLabel htmlFor="forecast-history">Lịch sử (ngày)</FieldLabel>
          <Input
            id="forecast-history"
            type="number"
            min={1}
            max={366}
            disabled={!canRun || workspace.isCreating}
            {...workspace.createForm.register('historicalPeriodDays', { valueAsNumber: true })}
          />
          {workspace.createForm.formState.errors.historicalPeriodDays ? (
            <p role="alert" className="text-destructive text-xs">
              Từ 1 đến 366 ngày.
            </p>
          ) : null}
        </Field>
        <Field className="w-28">
          <FieldLabel htmlFor="forecast-horizon">Kỳ phủ (ngày)</FieldLabel>
          <Input
            id="forecast-horizon"
            type="number"
            min={1}
            max={90}
            disabled={!canRun || workspace.isCreating}
            {...workspace.createForm.register('horizonDays', { valueAsNumber: true })}
          />
          {workspace.createForm.formState.errors.horizonDays ? (
            <p role="alert" className="text-destructive text-xs">
              Từ 1 đến 90 ngày.
            </p>
          ) : null}
        </Field>
        {workspace.warehouseId ? (
          <Field className="min-w-64 flex-1 basis-full sm:basis-0">
            <FieldLabel htmlFor="forecast-run">Phiên đã lưu</FieldLabel>
            <NativeSelect
              id="forecast-run"
              value={workspace.runId}
              disabled={workspace.runsQuery.isLoading || workspace.isCreating}
              onChange={(event) => workspace.selectRun(event.target.value)}
            >
              <NativeSelectOption value="">
                Chọn phiên đã lưu (30 phiên gần nhất)
              </NativeSelectOption>
              {(workspace.runsQuery.data ?? []).map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {new Date(item.createdAt).toLocaleString('vi-VN')} ·{' '}
                  {forecastRunStatusLabel(item.status)} ·{' '}
                  {formatInventoryDateOnly(item.forecastEndDate)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {canRun ? (
            <Button
              className="transition-transform active:scale-[0.98] motion-reduce:transform-none"
              type="submit"
              disabled={!workspace.warehouseId || workspace.isCreating}
            >
              <PackagePlus className="size-4" aria-hidden="true" />
              {workspace.isCreating ? 'Đang tính & lập nháp…' : 'Tính & lập nháp'}
            </Button>
          ) : null}
          {run?.status === 'Completed' && canRun ? (
            hasEndedForecastDays(run.forecastStartDate, operationalToday()) ? (
              <Button
                type="button"
                variant="outline"
                disabled={workspace.isEvaluating || workspace.isCreating}
                onClick={() => void workspace.evaluate()}
              >
                {workspace.isEvaluating ? 'Đang đối chiếu…' : 'Đối chiếu thực tế'}
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* A disabled button gets no pointer or focus events, so the wrapper shows the hint. */}
                  <span
                    tabIndex={0}
                    aria-label="Đối chiếu thực tế (chưa khả dụng)"
                    className="focus-visible:ring-ring inline-flex rounded-md focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Button type="button" variant="outline" disabled tabIndex={-1}>
                      Đối chiếu thực tế
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Chưa có ngày nào kết thúc. Đối chiếu được từ{' '}
                  {formatInventoryDateOnly(forecastEvaluationStartDate(run.forecastStartDate))}.
                </TooltipContent>
              </Tooltip>
            )
          ) : null}
          {workspace.warehouseId && workspace.runsQuery.isError ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void workspace.runsQuery.refetch()}
            >
              Tải lại lịch sử phiên
            </Button>
          ) : null}
        </div>
      </form>
      {warehousesError ? (
        <OperationalErrorState title="Không tải được kho" onRetry={retryWarehouses} />
      ) : null}
      {workspace.runId && workspace.runQuery.isLoading ? (
        <OperationalLoadingState rows={5} />
      ) : workspace.runId && workspace.runQuery.isError ? (
        <OperationalErrorState
          title="Không tải được phiên dự báo"
          onRetry={() => void workspace.runQuery.refetch()}
        />
      ) : !run ? (
        <OperationalEmptyState
          title="Chọn kho và phiên dự báo"
          description="Tính kế hoạch mới hoặc mở phiên đã lưu để kiểm tra các đề xuất và nháp nhập kho."
        />
      ) : run.status === 'Pending' || run.status === 'Running' ? (
        // The run is calculated in the background; its results do not exist until it completes.
        <Empty className="min-h-64 flex-1 border-0" aria-live="polite">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Spinner aria-label="Đang tính dự báo" />
            </EmptyMedia>
            <EmptyTitle>Đang tính dự báo & lập nháp…</EmptyTitle>
            <EmptyDescription>
              Hệ thống đang chọn mô hình và dự báo cho từng mặt hàng của {run.warehouseName}. Kết
              quả hiện ra khi phiên hoàn tất; bạn có thể rời trang trong lúc chờ.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div
            className="text-muted-foreground flex shrink-0 flex-wrap gap-x-5 gap-y-1 text-xs"
            aria-live="polite"
          >
            <span>
              {run.warehouseName} · {formatInventoryDateOnly(run.forecastStartDate)} –{' '}
              {formatInventoryDateOnly(run.forecastEndDate)}
            </span>
            <span>
              {diagnostics.filter((item) => item.basis === 'Forecast').length} SKU đủ lịch sử
            </span>
            <span>
              {diagnostics.filter((item) => item.basis === 'PolicyFallback').length} SKU dùng chính
              sách tồn
            </span>
            <span>
              {
                run.replenishmentSuggestions.filter(
                  (item) => item.inboundRequestId && item.status === 'New'
                ).length
              }{' '}
              nháp chờ kiểm tra
            </span>
          </div>
          {run.status === 'Failed' ? (
            <Alert variant="destructive">
              <AlertDescription>
                {run.failureReason || 'Phiên thất bại. Hãy tạo phiên mới.'}
              </AlertDescription>
            </Alert>
          ) : null}
          {run.details?.draftCreationNotice ? (
            <Alert>
              <AlertDescription>{run.details.draftCreationNotice}</AlertDescription>
            </Alert>
          ) : null}
          {!run.details ? (
            <Alert>
              <AlertDescription>
                Phiên cũ chưa lưu căn cứ nhu cầu. Không diễn giải kết quả cũ là dự báo nhu cầu xuất.
                Hãy tính phiên mới.
              </AlertDescription>
            </Alert>
          ) : null}
          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="shrink-0">
              <TabsTrigger value="overview">Tổng quan ({diagnostics.length})</TabsTrigger>
              <TabsTrigger value="replenishment">
                Bổ sung hàng ({run.replenishmentSuggestions.length})
              </TabsTrigger>
              <TabsTrigger value="demand">Nhu cầu & sai số</TabsTrigger>
              {run.rebalancingSuggestions.length > 0 ? (
                <TabsTrigger value="rebalancing">Điều chuyển</TabsTrigger>
              ) : null}
            </TabsList>
            <TabsContent value="overview" className={cn(TAB_ENTER, 'flex min-h-0 flex-1 flex-col')}>
              <ForecastOverviewView
                {...workspace.overview}
                onSelectProduct={(productId) => {
                  workspace.setProductId(productId)
                  setTab('demand')
                }}
              />
            </TabsContent>
            <TabsContent
              value="replenishment"
              className={cn(TAB_ENTER, 'flex min-h-0 flex-1 flex-col')}
            >
              <ReplenishmentList
                items={run.replenishmentSuggestions}
                onReview={workspace.openReview}
                canReview={canReview}
                canViewInbound={canViewInbound}
              />
            </TabsContent>
            <TabsContent value="demand" className={cn(TAB_ENTER, 'min-h-0 flex-1 overflow-auto')}>
              <ForecastDemandView
                run={run}
                productId={workspace.productId}
                onProductChange={workspace.setProductId}
              />
            </TabsContent>
            <TabsContent
              value="rebalancing"
              className={cn(TAB_ENTER, 'min-h-0 flex-1 overflow-auto')}
            >
              <ForecastRebalancingView workspace={workspace} canCreate={canCreateTransfer} />
            </TabsContent>
          </Tabs>
        </>
      )}
      <ReplenishmentReviewDialog
        workspace={workspace}
        canReview={canReview}
        canViewInbound={canViewInbound}
      />
    </div>
  )
}
