import type { ReactNode, Ref } from 'react'
import { RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { ReportingWarehouse } from '../../schemas/warehouse-overview.schema'
import type { StockAlertKind } from '../../schemas/stock-alert.schema'
import { StockAlertPanel, stockAlertTitles, type StockAlertPanelState } from './StockAlertPanel'

export const stockAlertKinds = ['below-minimum', 'above-maximum', 'expiring', 'expired'] as const
interface WarehouseOverviewViewProps {
  readonly workspaceRef: Ref<HTMLDivElement>
  readonly compact: boolean
  readonly warehouses: readonly ReportingWarehouse[]
  readonly warehouseId: string
  readonly warehouseOptionsLoading: boolean
  readonly onWarehouseChange: (id: string) => void
  readonly tab: string
  readonly onTabChange: (value: string) => void
  readonly selectedKind: StockAlertKind
  readonly onKindChange: (value: StockAlertKind) => void
  readonly expiringDays: number
  readonly panels: Readonly<Record<StockAlertKind, StockAlertPanelState>>
  readonly onPageChange: (kind: StockAlertKind, page: number) => void
  readonly onExpand: (kind: StockAlertKind, opener: HTMLButtonElement) => void
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
  onExpand,
  onRefresh,
  isFetching,
  errorMessage,
  canShowData,
  canViewInventory,
  settings,
  operations,
}: WarehouseOverviewViewProps) {
  const noWarehouses = !warehouseOptionsLoading && warehouses.length === 0
  return (
    <div
      ref={workspaceRef}
      className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3 [@media(max-height:500px)]:gap-1"
      data-slot="warehouse-overview"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Tổng quan kho</h1>
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
      <Tabs
        value={tab}
        onValueChange={onTabChange}
        className="min-h-0 min-w-0 flex-1 [@media(max-height:500px)]:gap-1"
      >
        <TabsList variant="line" className="shrink-0">
          <TabsTrigger value="alerts">Cảnh báo tồn kho</TabsTrigger>
          <TabsTrigger value="activity">Hoạt động kho</TabsTrigger>
        </TabsList>
        <TabsContent
          value="alerts"
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 [@media(max-height:500px)]:gap-1"
        >
          {compact && canShowData && !noWarehouses ? (
            <ToggleGroup
              type="single"
              value={selectedKind}
              variant="outline"
              size="sm"
              aria-label="Nhóm cảnh báo"
              className="grid w-full shrink-0 grid-cols-2 gap-1 sm:grid-cols-4"
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
                    <span>
                      {
                        {
                          'below-minimum': 'Dưới tối thiểu',
                          'above-maximum': 'Vượt tối đa',
                          expiring: 'Sắp hết hạn',
                          expired: 'Quá hạn',
                        }[kind]
                      }
                    </span>
                    <span className="tabular-nums">{count}</span>
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          ) : null}
          {canShowData && !noWarehouses ? (
            <div
              className={cn(
                'grid min-h-0 min-w-0 flex-1 gap-3',
                compact
                  ? 'grid-cols-1 grid-rows-1'
                  : 'grid-cols-2 grid-rows-[repeat(2,minmax(0,1fr))]'
              )}
            >
              {stockAlertKinds
                .filter((kind) => !compact || selectedKind === kind)
                .map((kind) => (
                  <StockAlertPanel
                    key={kind}
                    {...panels[kind]}
                    kind={kind}
                    expiringDays={expiringDays}
                    canViewInventory={canViewInventory}
                    onPageChange={(page) => onPageChange(kind, page)}
                    onExpand={(opener) => onExpand(kind, opener)}
                    settings={kind === 'expiring' ? settings : undefined}
                  />
                ))}
            </div>
          ) : null}
        </TabsContent>
        <TabsContent value="activity" className="flex min-h-0 min-w-0 flex-1 flex-col">
          {canShowData && !noWarehouses ? operations : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
