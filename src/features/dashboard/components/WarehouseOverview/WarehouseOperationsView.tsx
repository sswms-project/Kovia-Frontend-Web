import Link from 'next/link'
import type { ReactNode } from 'react'
import type { UrlObject } from 'url'
import { cn } from '@/lib/utils'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { WarehouseOverview } from '../../schemas/warehouse-overview.schema'
import {
  WarehouseOperationMetrics,
  type WarehouseOperationMetric,
} from './WarehouseOperationMetrics'
import { WarehouseActivityChart } from './WarehouseActivityChart'
import { WarehouseDetailsSkeleton, WarehouseMetricsSkeleton } from './WarehouseOperationsSkeleton'

export interface OverviewLinks {
  readonly inventory?: UrlObject
  readonly forecast?: UrlObject
  readonly tasks?: UrlObject
  readonly reports?: UrlObject
  readonly lowStock?: UrlObject
}
interface WarehouseOperationsViewProps {
  readonly activityChart?: ReactNode
  readonly data?: WarehouseOverview
  readonly isLoading: boolean
  readonly errorMessage?: string
  readonly onRefresh: () => void
  readonly compact: boolean
  readonly selectedView: string
  readonly onSelectedViewChange: (value: string) => void
  readonly links: OverviewLinks
}

export function WarehouseOperationsView({
  activityChart,
  data,
  isLoading,
  errorMessage,
  onRefresh,
  compact,
  selectedView,
  onSelectedViewChange,
  links,
}: WarehouseOperationsViewProps) {
  const viewToggle = compact ? (
    <ToggleGroup
      type="single"
      value={selectedView}
      variant="outline"
      aria-label="Hiển thị hoạt động"
      onValueChange={(value) => {
        if (value) onSelectedViewChange(value)
      }}
      className="shrink-0"
    >
      <ToggleGroupItem value="indices">Chỉ số</ToggleGroupItem>
      <ToggleGroupItem value="chart">Biểu đồ</ToggleGroupItem>
    </ToggleGroup>
  ) : null
  const bodyClassName = cn(
    'min-h-0 min-w-0 flex-1',
    compact ? 'flex' : 'grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3'
  )
  if (!data || isLoading)
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {viewToggle}
        {isLoading && !compact ? <WarehouseMetricsSkeleton /> : null}
        <div className={bodyClassName}>
          {!compact || selectedView === 'chart'
            ? (activityChart ?? <WarehouseActivityChart isLoading={isLoading} />)
            : null}
          {!compact || selectedView !== 'chart' ? (
            isLoading ? (
              <WarehouseDetailsSkeleton compact={compact} showForecast={Boolean(links.forecast)} />
            ) : (
              <Alert variant="destructive" className="self-start">
                <AlertDescription>
                  {errorMessage ?? 'Chưa tải được tổng quan hoạt động.'}
                  <Button type="button" variant="outline" onClick={onRefresh}>
                    Thử lại
                  </Button>
                </AlertDescription>
              </Alert>
            )
          ) : null}
        </div>
      </div>
    )
  const pending =
    data.pendingInboundRequests +
    data.pendingGoodsReceipts +
    data.pendingStockIssues +
    data.pendingTransfers +
    data.pendingCounts
  const metrics = [
    {
      label: 'SKU đang có tồn',
      value: data.stockedSkuCount,
      description: 'Không cộng lượng khác ĐVT',
      href: links.inventory,
    },
    {
      label: 'SKU / kho dưới ngưỡng',
      value: data.lowStockCount,
      description: 'Theo tồn khả dụng',
      href: links.lowStock,
    },
    {
      label: 'Chứng từ chờ xử lý',
      value: pending,
      description: 'Chưa kết thúc nghiệp vụ',
      href: links.reports,
    },
    {
      label: 'Công việc quá hạn',
      value: data.overdueTasks,
      description: 'Chưa hoàn tất hoặc hủy',
      href: links.tasks,
    },
  ] satisfies readonly WarehouseOperationMetric[]
  const groups = [
    ...(compact
      ? [
          {
            label: 'Chỉ số hiện tại',
            rows: metrics.map((metric) => [metric.label, metric.value, metric.href] as const),
          },
        ]
      : []),
    {
      label: 'Chứng từ chờ xử lý',
      rows: [
        ['Yêu cầu nhập', data.pendingInboundRequests, links.reports],
        ['Phiếu nhận / cất hàng', data.pendingGoodsReceipts, links.reports],
        ['Phiếu xuất', data.pendingStockIssues, links.reports],
        ['Điều chuyển liên kho', data.pendingTransfers, links.reports],
        ['Phiên kiểm kê', data.pendingCounts, links.reports],
      ],
    },
    {
      label: 'Tồn kho & công việc',
      rows: [
        ['Công việc chưa phân công', data.unassignedTasks, undefined],
        ['SKU đang có lượng giữ', data.reservedSkuCount, links.inventory],
        ['SKU có tồn cách ly / không khả dụng', data.heldSkuCount, links.inventory],
      ],
    },
    {
      label: 'Bố trí kho',
      rows: [
        ['Vị trí hoạt động', data.activeSlots, undefined],
        ['Vị trí hoạt động có hàng', data.occupiedActiveSlots, undefined],
        ['Vị trí ngừng hoạt động còn hàng', data.inactiveSlotsWithStock, undefined],
        [
          'Tỷ lệ vị trí hoạt động có hàng',
          data.activeSlots
            ? `${Math.round((data.occupiedActiveSlots / data.activeSlots) * 100)}%`
            : 'Chưa có vị trí',
          undefined,
        ],
      ],
    },
  ] satisfies readonly {
    readonly label: string
    readonly rows: readonly (readonly [string, number | string, UrlObject | undefined])[]
  }[]
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      {errorMessage ? (
        <Alert variant="destructive" className="shrink-0">
          <AlertDescription>Đang hiển thị dữ liệu cũ. {errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {!compact ? <WarehouseOperationMetrics metrics={metrics} /> : viewToggle}
      <div className={bodyClassName}>
        {!compact || selectedView === 'chart'
          ? (activityChart ?? <WarehouseActivityChart data={data} />)
          : null}
        {!compact || selectedView !== 'chart' ? (
          <OperationalListPanel aria-label="Công việc, chứng từ và vị trí">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b p-3">
              <h2 className="text-sm font-semibold">Chi tiết vận hành</h2>
              {links.forecast ? (
                <Link
                  href={links.forecast}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Dự báo & bổ sung
                </Link>
              ) : null}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card">Chỉ số</TableHead>
                  <TableHead className="bg-card text-right">Giá trị</TableHead>
                </TableRow>
              </TableHeader>
              {groups.map((group) => (
                <TableBody key={group.label}>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell
                      colSpan={2}
                      className="text-muted-foreground py-2 text-xs font-semibold"
                    >
                      {group.label}
                    </TableCell>
                  </TableRow>
                  {group.rows.map(([label, value, href]) => (
                    <TableRow key={label}>
                      <TableCell>
                        {href ? (
                          <Link
                            href={href}
                            className="focus-visible:ring-ring rounded-sm outline-hidden hover:underline focus-visible:ring-2"
                          >
                            {label}
                          </Link>
                        ) : (
                          label
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              ))}
            </Table>
            <p className="text-muted-foreground shrink-0 border-t p-3 text-xs">
              Tỷ lệ vị trí có hàng không phải sức chứa khối lượng/thể tích.
            </p>
          </OperationalListPanel>
        ) : null}
      </div>
    </div>
  )
}
