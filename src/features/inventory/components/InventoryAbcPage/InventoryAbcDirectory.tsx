import { ChartNoAxesColumnIncreasing, RefreshCw, TriangleAlert } from 'lucide-react'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { InventoryAbcItem, InventoryFilterOption } from '../../types/inventory.types'
import { formatInventoryQuantity } from '../../utils/inventory-format'
import { InventoryWorkspaceNavigation } from '../InventoryWorkspaceNavigation'

interface InventoryAbcDirectoryProps {
  readonly permissions: readonly string[]
  readonly items: readonly InventoryAbcItem[]
  readonly page: number
  readonly pageSize: number
  readonly warehouseId: string
  readonly warehouseOptions: readonly InventoryFilterOption[]
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly areWarehousesLoading: boolean
  readonly areWarehousesError: boolean
  readonly onWarehouseChange: (value: string) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRetryWarehouses: () => void
  readonly onRetry: () => void
  readonly historicalPeriodDays: number
  readonly metric: 'Quantity' | 'Activity'
  readonly aThreshold: number
  readonly bThreshold: number
  readonly isRunning: boolean
  readonly canRun: boolean
  readonly canCreateCycleCount: boolean
  readonly analysisId: string | null
  readonly datasetFingerprint: string | null
  readonly appliedCycleCountId: string | null
  readonly staffOptions: readonly InventoryFilterOption[]
  readonly assignedTo: string
  readonly scheduledDate: string
  readonly isApplying: boolean
  readonly onHistoricalPeriodDaysChange: (value: number) => void
  readonly onMetricChange: (value: 'Quantity' | 'Activity') => void
  readonly onAThresholdChange: (value: number) => void
  readonly onBThresholdChange: (value: number) => void
  readonly onRun: () => void
  readonly onAssignedToChange: (value: string) => void
  readonly onScheduledDateChange: (value: string) => void
  readonly onApply: () => void
}

const classStyles: Record<string, string> = {
  A: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  B: 'border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400',
  C: 'border-sky-600/30 bg-sky-600/10 text-sky-700 dark:text-sky-400',
}

export function InventoryAbcDirectory({
  permissions,
  items,
  page,
  pageSize,
  warehouseId,
  warehouseOptions,
  isLoading,
  isFetching,
  isError,
  areWarehousesLoading,
  areWarehousesError,
  onWarehouseChange,
  onPageChange,
  onPageSizeChange,
  onRetryWarehouses,
  onRetry,
  historicalPeriodDays,
  metric,
  aThreshold,
  bThreshold,
  isRunning,
  canRun,
  canCreateCycleCount,
  analysisId,
  datasetFingerprint,
  appliedCycleCountId,
  staffOptions,
  assignedTo,
  scheduledDate,
  isApplying,
  onHistoricalPeriodDaysChange,
  onMetricChange,
  onAThresholdChange,
  onBThresholdChange,
  onRun,
  onAssignedToChange,
  onScheduledDateChange,
  onApply,
}: InventoryAbcDirectoryProps) {
  const counts: Record<string, number> = {
    A: items.filter((item) => item.class === 'A').length,
    B: items.filter((item) => item.class === 'B').length,
    C: items.filter((item) => item.class === 'C').length,
  }
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize)
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center">
            <ChartNoAxesColumnIncreasing aria-hidden="true" />
          </span>
          <div>
            <p className="text-primary text-xs font-medium">Kiểm soát tồn kho</p>
            <h1 className="mt-0.5 text-xl font-semibold">Phân loại ABC theo lịch sử xuất kho</h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Phân nhóm sản phẩm theo lịch sử xuất kho trong kỳ đã chọn.
            </p>
          </div>
        </div>
        <div className="border-primary/20 bg-primary/5 flex min-h-10 items-center gap-2 border px-3">
          <ChartNoAxesColumnIncreasing className="text-primary size-4" aria-hidden="true" />
          <span className="text-xs font-medium tabular-nums">{items.length} sản phẩm</span>
        </div>
      </header>
      <InventoryWorkspaceNavigation currentView="abc" permissions={permissions} />
      <section className="grid shrink-0 grid-cols-3 border" aria-label="Phân bố nhóm ABC">
        {['A', 'B', 'C'].map((className) => (
          <div
            key={className}
            className="flex min-w-0 items-center gap-2 border-r px-3 py-2 last:border-r-0"
          >
            <Badge variant="outline" className={classStyles[className]}>
              Nhóm {className}
            </Badge>
            <span className="text-xs font-medium tabular-nums">{counts[className] ?? 0}</span>
          </div>
        ))}
      </section>
      {analysisId ? (
        <section className="bg-card grid gap-3 border p-3 text-xs sm:grid-cols-[1fr_auto_auto_auto]">
          <div>
            <p className="font-medium">Snapshot phân tích đã lưu</p>
            <p className="text-muted-foreground">
              Mã dữ liệu:{' '}
              <span className="font-mono">{datasetFingerprint?.slice(0, 16) ?? 'không có'}…</span>.
              Kết quả không tự thay đổi policy hoặc tạo kiểm kê.
            </p>
          </div>
          {appliedCycleCountId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.href = `/inventory/cycle-counts/${appliedCycleCountId}`
              }}
            >
              Mở phiếu kiểm kê đã tạo
            </Button>
          ) : canCreateCycleCount ? (
            <>
              <NativeSelect
                aria-label="Nhân viên kiểm kê"
                value={assignedTo}
                onChange={(event) => onAssignedToChange(event.target.value)}
              >
                <NativeSelectOption value="">Chọn nhân viên kiểm kê</NativeSelectOption>
                {staffOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Input
                aria-label="Ngày kiểm kê"
                type="datetime-local"
                value={scheduledDate}
                onChange={(event) => onScheduledDateChange(event.target.value)}
              />
              <Button
                type="button"
                disabled={isApplying || !assignedTo || !scheduledDate}
                onClick={onApply}
              >
                {isApplying ? 'Đang tạo…' : 'Tạo kiểm kê nhóm A'}
              </Button>
            </>
          ) : null}
        </section>
      ) : null}
      <OperationalListPanel aria-labelledby="abc-title">
        <div className="flex shrink-0 flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="abc-title" className="text-sm font-semibold">
              Kết quả phân loại
            </h2>
            <p className="text-muted-foreground text-xs">
              Class do hệ thống tính theo tỷ lệ tích lũy số lượng.
            </p>
          </div>
          <div className="flex gap-2">
            <NativeSelect
              aria-label="Lọc phân loại theo kho"
              className="h-11 min-w-52 sm:h-8"
              value={warehouseId}
              disabled={areWarehousesLoading}
              onChange={(event) => onWarehouseChange(event.target.value)}
            >
              <NativeSelectOption value="">Chọn kho</NativeSelectOption>
              {warehouseOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Chỉ số phân tích ABC"
              value={metric}
              onChange={(event) =>
                onMetricChange(event.target.value === 'Activity' ? 'Activity' : 'Quantity')
              }
            >
              <NativeSelectOption value="Quantity">Số lượng xuất</NativeSelectOption>
              <NativeSelectOption value="Activity">Tần suất xuất</NativeSelectOption>
            </NativeSelect>
            <Input
              aria-label="Số ngày lịch sử phân loại ABC"
              className="w-28"
              type="number"
              min={1}
              max={366}
              value={historicalPeriodDays}
              onChange={(event) => onHistoricalPeriodDaysChange(Number(event.target.value))}
            />
            <Input
              aria-label="Ngưỡng nhóm A"
              className="w-20"
              type="number"
              min={1}
              max={98}
              value={aThreshold}
              onChange={(event) => onAThresholdChange(Number(event.target.value))}
            />
            <Input
              aria-label="Ngưỡng nhóm B"
              className="w-20"
              type="number"
              min={2}
              max={99}
              value={bThreshold}
              onChange={(event) => onBThresholdChange(Number(event.target.value))}
            />
            {canRun ? (
              <Button
                type="button"
                disabled={
                  !warehouseId ||
                  isRunning ||
                  historicalPeriodDays < 1 ||
                  historicalPeriodDays > 366 ||
                  aThreshold >= bThreshold
                }
                onClick={onRun}
              >
                {isRunning ? 'Đang phân tích…' : 'Phân tích'}
              </Button>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 sm:size-8"
                  disabled={isFetching}
                  aria-label="Làm mới phân loại ABC"
                  onClick={onRetry}
                >
                  <RefreshCw
                    className={isFetching ? 'animate-spin motion-reduce:animate-none' : undefined}
                    aria-hidden="true"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={4}>Làm mới phân loại</TooltipContent>
            </Tooltip>
          </div>
        </div>
        {areWarehousesError ? (
          <div className="border-b px-3 py-2 text-xs" role="alert">
            <span className="text-destructive inline-flex items-center gap-2">
              <TriangleAlert className="size-4" aria-hidden="true" />
              Không thể tải danh sách kho.
            </span>{' '}
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={onRetryWarehouses}
            >
              Thử lại
            </Button>
          </div>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {isFetching ? 'Đang cập nhật phân loại ABC' : 'Phân loại ABC đã cập nhật'}
        </p>
        {isLoading ? (
          <OperationalLoadingState rows={8} />
        ) : isError ? (
          <OperationalErrorState title="Không thể tải phân loại ABC" onRetry={onRetry} />
        ) : items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có dữ liệu phân loại"
            description={
              warehouseId
                ? 'Kho đã chọn chưa có kết quả phân tích. Hãy chạy phân loại với kỳ lịch sử xuất phù hợp.'
                : 'Chọn một kho để xem hoặc chạy phân loại theo lịch sử xuất kho.'
            }
          />
        ) : (
          <AbcResults items={pageItems} />
        )}
        <OperationalPagination
          page={page}
          pageSize={pageSize}
          totalCount={items.length}
          isPending={isFetching}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </OperationalListPanel>
    </div>
  )
}

function AbcResults({ items }: { readonly items: readonly InventoryAbcItem[] }) {
  return (
    <>
      <ItemGroup className="gap-0 md:hidden">
        {items.map((item) => (
          <Item key={item.productId} className="border-b last:border-b-0">
            <ItemContent>
              <ItemTitle className="flex justify-between gap-3">
                <span className="truncate">{item.productName || 'Sản phẩm chưa xác định'}</span>
                <Badge variant="outline" className={classStyles[item.class]}>
                  Nhóm {item.class}
                </Badge>
              </ItemTitle>
              <ItemDescription>
                <span className="font-mono">{item.sku || item.productId}</span> ·{' '}
                {formatInventoryQuantity(item.totalQuantity)} đơn vị
              </ItemDescription>
              <ItemDescription>
                Tích lũy {item.cumulativePercentage.toLocaleString('vi-VN')}%
              </ItemDescription>
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>
      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <Table className="min-w-[760px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 w-80">Sản phẩm</TableHead>
              <TableHead className="sticky top-0 z-10 w-32 text-right">Tổng số lượng</TableHead>
              <TableHead className="sticky top-0 z-10 w-36 text-right">Tỷ lệ tích lũy</TableHead>
              <TableHead className="sticky top-0 z-10 w-44">Cơ sở / kỳ</TableHead>
              <TableHead className="sticky top-0 z-10 w-28 text-center">Nhóm</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.productId}>
                <TableCell>
                  <p className="truncate font-medium">
                    {item.productName || 'Sản phẩm chưa xác định'}
                  </p>
                  <p className="text-muted-foreground truncate font-mono text-xs">
                    {item.sku || item.productId}
                  </p>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatInventoryQuantity(item.totalQuantity)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {item.cumulativePercentage.toLocaleString('vi-VN')}%
                </TableCell>
                <TableCell className="text-xs">
                  <p>{item.calculationBasis}</p>
                  <p className="text-muted-foreground">
                    {item.analysisFrom.slice(0, 10)} – {item.analysisTo.slice(0, 10)}
                  </p>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={classStyles[item.class]}>
                    Nhóm {item.class}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
