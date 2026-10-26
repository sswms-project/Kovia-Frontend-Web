import type { ReactNode, Ref } from 'react'
import { RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { ReportingWarehouse } from '../../schemas/warehouse-overview.schema'
import { StockAlertPanel, stockAlertTitles, type StockAlertPanelState } from './StockAlertPanel'
import { WarehouseOperationsSkeleton } from './WarehouseOperationsSkeleton'

// Tổng quan chỉ theo dõi hai nhóm tồn kho cần xử lý; API vẫn hỗ trợ vượt tối đa và quá hạn cho nơi khác.
export const stockAlertKinds = ['below-minimum', 'expiring'] as const
export type OverviewStockAlertKind = (typeof stockAlertKinds)[number]
interface WarehouseOverviewViewProps {
  readonly workspaceRef: Ref<HTMLDivElement>
  readonly compact: boolean
  readonly warehouses: readonly ReportingWarehouse[]
  readonly warehouseId: string
  readonly warehouseOptionsLoading: boolean
  readonly onWarehouseChange: (id: string) => void
  readonly tab: string
  readonly onTabChange: (value: string) => void
  readonly selectedKind: OverviewStockAlertKind
  readonly onKindChange: (value: OverviewStockAlertKind) => void
  readonly expiringDays: number
  readonly panels: Readonly<Record<OverviewStockAlertKind, StockAlertPanelState>>
  readonly onPageChange: (kind: OverviewStockAlertKind, page: number) => void
  readonly onPageSizeChange: (kind: OverviewStockAlertKind, pageSize: number) => void
  readonly onExpand: (kind: OverviewStockAlertKind, opener: HTMLButtonElement) => void
  /** Thẻ số và biểu đồ tóm tắt đặt trên hai bảng cảnh báo. */
  readonly charts: ReactNode
  readonly onRefresh: () => void
  readonly isFetching: boolean
  readonly errorMessage?: string
  readonly canShowData: boolean
  readonly canViewInventory: boolean
  readonly settings: ReactNode
  readonly operations: ReactNode
}

export function WarehouseOverviewView({
  workspaceRef,
  compact,
  warehouses,
  warehouseId,
  warehouseOptionsLoading,
  onWarehouseChange,
  tab,
  onTabChange,
  selectedKind,
  onKindChange,
  expiringDays,
  panels,
  onPageChange,
  onPageSizeChange,
  onExpand,
  onRefresh,
  isFetching,
  errorMessage,
  canShowData,
  canViewInventory,
  settings,
  operations,
  charts,
}: WarehouseOverviewViewProps) {
  const noWarehouses = !warehouseOptionsLoading && warehouses.length === 0
  return (
    <Tabs
      ref={workspaceRef}
      value={tab}
      onValueChange={onTabChange}
      className="@container flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3 [@media(max-height:500px)]:gap-1"
      data-slot="warehouse-overview"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h1 className="sr-only">Tổng quan kho</h1>
        <TabsList variant="line" className="shrink-0">
          <TabsTrigger
            value="alerts"
            className="font-sans text-sm font-medium data-[state=active]:font-bold"
          >
            Cảnh báo tồn kho
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="font-sans text-sm font-medium data-[state=active]:font-bold"
          >
            Hoạt động kho
          </TabsTrigger>
        </TabsList>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          <label className="flex min-w-0 items-center gap-2 text-xs">
            Kho
            <NativeSelect
              value={warehouseId}
              disabled={warehouseOptionsLoading}
              aria-label="Phạm vi kho"
              className="max-w-72"
              onChange={(event) => onWarehouseChange(event.target.value)}
            >
              <NativeSelectOption value="">Tất cả kho được phép</NativeSelectOption>
              {warehouseId && !warehouses.some((warehouse) => warehouse.id === warehouseId) ? (
                <NativeSelectOption value={warehouseId}>
                  Kho đã chọn không còn trong danh sách
                </NativeSelectOption>
              ) : null}
              {warehouses.map((warehouse) => (
                <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onRefresh}
            disabled={isFetching}
            aria-label="Tải lại tổng quan"
            title="Tải lại tổng quan"
          >
            <RefreshCw
              aria-hidden="true"
              className={cn(isFetching && 'animate-spin motion-reduce:animate-none')}
            />
          </Button>
        </div>
      </header>
      {errorMessage ? (
        <Alert variant="destructive" className="shrink-0">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {noWarehouses && !errorMessage ? (
        <Alert className="shrink-0">
          <AlertDescription>Chưa có kho trong phạm vi được phép.</AlertDescription>
        </Alert>
      ) : null}
      <TabsContent
        value="alerts"
        data-scrollbar="slim"
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto [@media(max-height:500px)]:gap-1"
      >
        {compact && canShowData && !noWarehouses ? (
          <ToggleGroup
            type="single"
            value={selectedKind}
            variant="outline"
            size="sm"
            aria-label="Nhóm cảnh báo"
            className="grid w-full shrink-0 grid-cols-2 gap-1"
            onValueChange={(value) => {
              const selected = stockAlertKinds.find((kind) => kind === value)
              if (selected) onKindChange(selected)
            }}
          >
            {stockAlertKinds.map((kind) => {
              const count = panels[kind].errorMessage
                ? 'Lỗi tải'
                : (panels[kind].data?.totalCount ?? 'Đang tải…')
              return (
                <ToggleGroupItem
                  key={kind}
                  value={kind}
                  className="min-w-0 justify-between px-2"
                  aria-label={`${stockAlertTitles[kind]} · ${count}`}
                  title={stockAlertTitles[kind]}
                >
                  <span>{kind === 'below-minimum' ? 'Dưới tối thiểu' : 'Sắp hết hạn'}</span>
                  <span className="tabular-nums">{count}</span>
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
        ) : null}
        {canShowData && !noWarehouses ? charts : null}
        {canShowData && !noWarehouses ? (
          <div
            className={cn(
              'grid min-w-0 flex-1 gap-3',
              compact
                ? 'min-h-fit auto-rows-[minmax(18rem,1fr)] grid-cols-1 @min-[64rem]:grid-cols-2'
                : 'min-h-[22rem] grid-cols-2'
            )}
          >
            {stockAlertKinds.map((kind) => (
              <StockAlertPanel
                key={kind}
                {...panels[kind]}
                kind={kind}
                expiringDays={expiringDays}
                canViewInventory={canViewInventory}
                onPageChange={(page) => onPageChange(kind, page)}
                onPageSizeChange={(size) => onPageSizeChange(kind, size)}
                onExpand={(opener) => onExpand(kind, opener)}
                settings={kind === 'expiring' ? settings : undefined}
              />
            ))}
          </div>
        ) : null}
      </TabsContent>
      <TabsContent value="activity" className="flex min-h-0 min-w-0 flex-1 flex-col">
        {canShowData && !noWarehouses ? (
          operations
        ) : warehouseOptionsLoading && !errorMessage ? (
          <WarehouseOperationsSkeleton compact={compact} />
        ) : null}
      </TabsContent>
    </Tabs>
  )
}
