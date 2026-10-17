import Link from 'next/link'
import type { UrlObject } from 'url'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
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
import { OverviewMetric } from './OverviewMetric'
import { WarehouseActivityChart } from './WarehouseActivityChart'

export interface OverviewLinks {
  readonly inventory?: UrlObject
  readonly forecast?: UrlObject
  readonly tasks?: UrlObject
  readonly reports?: UrlObject
  readonly lowStock?: UrlObject
}
interface WarehouseOperationsViewProps {
  readonly data?: WarehouseOverview
  readonly isLoading: boolean
  readonly errorMessage?: string
  readonly onRefresh: () => void
  readonly activityDays: number
  readonly onActivityDaysChange: (value: number) => void
  readonly compact: boolean
  readonly selectedView: string
  readonly onSelectedViewChange: (value: string) => void
  readonly links: OverviewLinks
}

export function WarehouseOperationsView({
  data,
  isLoading,
  errorMessage,
  onRefresh,
  activityDays,
  onActivityDaysChange,
  compact,
  selectedView,
  onSelectedViewChange,
  links,
}: WarehouseOperationsViewProps) {
  if (isLoading) return <Skeleton className="min-h-0 flex-1" />
  if (!data)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {errorMessage ?? 'Chưa tải được tổng quan hoạt động.'}
          <Button type="button" variant="outline" onClick={onRefresh}>
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    )
  const pending =
    data.pendingInboundRequests +
    data.pendingGoodsReceipts +
    data.pendingStockIssues +
    data.pendingTransfers +
    data.pendingCounts
  const indices = [
    ['SKU đang có tồn', data.stockedSkuCount, links.inventory],
    ['SKU / kho dưới ngưỡng', data.lowStockCount, links.lowStock],
    ['Chứng từ chờ xử lý', pending, links.reports],
    ['Công việc quá hạn', data.overdueTasks, links.tasks],
    ['Yêu cầu nhập', data.pendingInboundRequests, links.reports],
    ['Phiếu nhận / cất hàng', data.pendingGoodsReceipts, links.reports],
    ['Phiếu xuất', data.pendingStockIssues, links.reports],
    ['Điều chuyển liên kho', data.pendingTransfers, links.reports],
    ['Phiên kiểm kê', data.pendingCounts, links.reports],
    ['Công việc chưa phân công', data.unassignedTasks, undefined],
    ['SKU đang có lượng giữ', data.reservedSkuCount, links.inventory],
    ['SKU có tồn cách ly / không khả dụng', data.heldSkuCount, links.inventory],
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
  ] satisfies readonly (readonly [string, number | string, UrlObject | undefined])[]
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      {links.forecast ? (
        <div className="flex shrink-0 justify-end">
          <Link
            href={links.forecast}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Dự báo & bổ sung
          </Link>
        </div>
      ) : null}
      {errorMessage ? (
        <Alert variant="destructive" className="shrink-0">
          <AlertDescription>Đang hiển thị dữ liệu cũ. {errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {!compact ? (
        <div className="grid shrink-0 grid-cols-4 gap-3">
          <OverviewMetric
            label="SKU đang có tồn"
            value={data.stockedSkuCount}
            description="Không cộng lượng khác ĐVT"
            href={links.inventory}
          />
          <OverviewMetric
            label="SKU / kho dưới ngưỡng"
            value={data.lowStockCount}
            description="Theo tồn khả dụng"
            href={links.lowStock}
          />
          <OverviewMetric
            label="Chứng từ chờ xử lý"
            value={pending}
            description="Chưa kết thúc nghiệp vụ"
            href={links.reports}
          />
          <OverviewMetric
            label="Công việc quá hạn"
            value={data.overdueTasks}
            description="Cần theo dõi xử lý"
            href={links.tasks}
          />
        </div>
      ) : (
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
      )}
      <div
        className={
          compact ? 'flex min-h-0 min-w-0 flex-1' : 'grid min-h-0 min-w-0 flex-1 grid-cols-2 gap-3'
        }
      >
        {!compact || selectedView === 'chart' ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            <label className="flex shrink-0 items-center justify-end gap-2 text-xs">
              Kỳ hoạt động
              <NativeSelect
                value={String(activityDays)}
                onChange={(event) => onActivityDaysChange(Number(event.target.value))}
              >
                {[7, 30, 90].map((days) => (
                  <NativeSelectOption key={days} value={String(days)}>
                    {days} ngày gần nhất
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <div className="min-h-0 min-w-0 flex-1 overflow-auto" data-scrollbar="slim">
              <WarehouseActivityChart data={data} />
            </div>
          </div>
        ) : null}
        {!compact || selectedView !== 'chart' ? (
          <OperationalListPanel aria-label="Công việc, chứng từ và vị trí">
            <div className="shrink-0 border-b p-3 text-sm font-semibold">
              Công việc, chứng từ và vị trí
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card">Chỉ số</TableHead>
                  <TableHead className="bg-card text-right">Giá trị</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indices.map(([label, value, href]) => (
                  <TableRow key={label}>
                    <TableCell>
                      {href ? (
                        <Link href={href} className="hover:underline">
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
