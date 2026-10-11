'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, TrendingUp, PackagePlus } from 'lucide-react'
import { P } from '@/config/permissionCodes'
import { APP_ROUTES } from '@/routes/app-routes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import type { ForecastWorkspace } from '../../hooks/use-forecast-workspace'
import type { InventoryFilterOption } from '../../types/inventory.types'
import { formatInventoryDateOnly } from '../../utils/inventory-format'
import { ForecastDemandView } from './ForecastDemandView'
import { ReplenishmentList } from './ReplenishmentList'
import { ReplenishmentReviewDialog } from './ReplenishmentReviewDialog'
import { ForecastRebalancingView } from './ForecastRebalancingView'

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
  readonly permissions: readonly string[]
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
  permissions,
}: ForecastRunPanelProps) {
  const [tab, setTab] = useState('replenishment')
  const run = workspace.runQuery.data
  const diagnostics = run?.details?.products ?? []
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
            <TrendingUp aria-hidden="true" />
          </span>
          <div>
            <p className="text-primary text-xs font-medium">
              Báo cáo & phân tích · Kế hoạch tồn kho
            </p>
            <h1 className="text-xl font-semibold">Dự báo & bổ sung hàng</h1>
            <p className="text-muted-foreground text-xs">
              Tính nhu cầu → lập nháp → Manager kiểm tra → gửi yêu cầu nhập.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!workspace.runId || workspace.runQuery.isFetching}
          onClick={() => void workspace.runQuery.refetch()}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Cập nhật căn cứ
        </Button>
      </header>
      {permissions.includes(P.REPORTS_VIEW) ? (
        <nav aria-label="Điều hướng báo cáo" className="shrink-0">
          <Link
            href={APP_ROUTES.reports}
            className="text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex items-center gap-2 rounded-sm text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Báo cáo & phân tích
          </Link>
        </nav>
      ) : null}
      <form
        onSubmit={workspace.createAndRun}
        className="bg-card grid shrink-0 gap-3 rounded-xl border p-3 md:grid-cols-[minmax(12rem,1fr)_8rem_8rem_auto]"
      >
        <Field>
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
        <Field>
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
        <Field>
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
        {canRun ? (
          <Button
            className="self-end transition-transform active:scale-[0.98] motion-reduce:transform-none"
            type="submit"
            disabled={!workspace.warehouseId || workspace.isCreating}
          >
            <PackagePlus className="size-4" aria-hidden="true" />
            {workspace.isCreating ? 'Đang tính & lập nháp…' : 'Tính & lập nháp'}
          </Button>
        ) : null}
      </form>
      {warehousesError ? (
        <OperationalErrorState title="Không tải được kho" onRetry={retryWarehouses} />
      ) : null}
      {workspace.warehouseId ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Field className="min-w-64 flex-1">
            <FieldLabel className="sr-only" htmlFor="forecast-run">
              Phiên đã lưu
            </FieldLabel>
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
                  {new Date(item.createdAt).toLocaleString('vi-VN')} · {item.status} ·{' '}
                  {formatInventoryDateOnly(item.forecastEndDate)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          {workspace.runsQuery.isError ? (
            <Button variant="outline" onClick={() => void workspace.runsQuery.refetch()}>
              Tải lại lịch sử phiên
            </Button>
          ) : null}
          {run?.status === 'Completed' && canRun ? (
            <Button
              variant="outline"
              size="sm"
              disabled={workspace.isEvaluating}
              onClick={() => void workspace.evaluate()}
            >
              {workspace.isEvaluating ? 'Đang đối chiếu…' : 'Đối chiếu thực tế'}
            </Button>
          ) : null}
        </div>
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
              <TabsTrigger value="replenishment">
                Bổ sung hàng ({run.replenishmentSuggestions.length})
              </TabsTrigger>
              <TabsTrigger value="demand">Nhu cầu & sai số</TabsTrigger>
              {run.rebalancingSuggestions.length > 0 ? (
                <TabsTrigger value="rebalancing">Điều chuyển</TabsTrigger>
              ) : null}
            </TabsList>
            <TabsContent value="replenishment" className="flex min-h-0 flex-1 flex-col">
              <ReplenishmentList
                items={run.replenishmentSuggestions}
                onReview={workspace.openReview}
                canReview={canReview}
                canViewInbound={canViewInbound}
              />
            </TabsContent>
            <TabsContent value="demand" className="min-h-0 flex-1 overflow-auto">
              <ForecastDemandView
                run={run}
                productId={workspace.productId}
                onProductChange={workspace.setProductId}
              />
            </TabsContent>
            <TabsContent value="rebalancing" className="min-h-0 flex-1 overflow-auto">
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
