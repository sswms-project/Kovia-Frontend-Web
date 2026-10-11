import Link from 'next/link'
import type { UrlObject } from 'url'
import { RefreshCw, TrendingUp, Warehouse } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { WarehouseActivityChart } from './WarehouseActivityChart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ReportingWarehouse, WarehouseOverview } from '../../schemas/warehouse-overview.schema'
import { OverviewMetric } from './OverviewMetric'

interface WarehouseOverviewViewProps {
  readonly data?: WarehouseOverview
  readonly warehouses: readonly ReportingWarehouse[]
  readonly warehouseId: string
  readonly activityDays: number
  readonly onActivityDaysChange: (days: number) => void
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly errorMessage?: string
  readonly links: {
    readonly forecast?: UrlObject
    readonly inventory?: UrlObject
    readonly tasks?: UrlObject
    readonly reports?: UrlObject
    readonly lowStock?: UrlObject
  }
  readonly onWarehouseChange: (id: string) => void
  readonly onRefresh: () => void
}

export function WarehouseOverviewView({
  data,
  warehouses,
  warehouseId,
  activityDays,
  onActivityDaysChange,
  isLoading,
  isFetching,
  errorMessage,
  links,
  onWarehouseChange,
  onRefresh,
}: WarehouseOverviewViewProps) {
  const pending = data
    ? data.pendingInboundRequests +
      data.pendingGoodsReceipts +
      data.pendingStockIssues +
      data.pendingTransfers +
      data.pendingCounts
    : 0
  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-semibold tracking-wide uppercase">
            Kovia · Vận hành kho
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Tổng quan kho</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tồn hiện tại và công việc cần xử lý trong phạm vi được cấp.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-xs">
            <span>Phạm vi kho</span>
            <NativeSelect
              value={warehouseId}
              onChange={(event) => onWarehouseChange(event.target.value)}
              aria-label="Phạm vi kho"
            >
              <NativeSelectOption value="">Tất cả kho được phép</NativeSelectOption>
              {warehouses.map((warehouse) => (
                <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <label className="space-y-1 text-xs">
            <span>Kỳ hoạt động</span>
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
          <Button variant="outline" disabled={isFetching} onClick={onRefresh}>
            <RefreshCw
              className={isFetching ? 'size-4 animate-spin motion-reduce:animate-none' : 'size-4'}
              aria-hidden
            />
            Làm mới
          </Button>
          {links.forecast ? (
            <Link href={links.forecast} className={buttonVariants({ variant: 'outline' })}>
              <TrendingUp className="size-4" aria-hidden="true" />
              Dự báo & bổ sung
            </Link>
          ) : null}
        </div>
      </header>
      {errorMessage ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 rounded-lg border p-3 text-sm"
        >
          {data ? 'Dữ liệu cũ — cập nhật thất bại. ' : ''}
          {errorMessage}
        </div>
      ) : null}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((id) => (
            <Skeleton key={id} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : null}
      {data ? (
        <>
          <p className="text-muted-foreground text-xs">
            Snapshot lúc tải: {new Date(data.generatedAt).toLocaleString('vi-VN')} ·{' '}
            {data.warehouses.length} kho · không phải tồn tại một ngày lịch sử.
          </p>
          {data.warehouses.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground flex items-center gap-3 p-6">
                <Warehouse className="size-5" />
                Chưa có kho trong phạm vi được phép.
              </CardContent>
            </Card>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewMetric
              label="SKU đang có tồn"
              value={data.stockedSkuCount}
              description="Đếm mặt hàng, không cộng số lượng khác ĐVT"
              href={links.inventory}
            />
            <OverviewMetric
              label="SKU / kho dưới ngưỡng"
              value={data.lowStockCount}
              description="Tồn khả dụng so với policy đang hoạt động"
              href={links.lowStock}
            />
            <OverviewMetric
              label="Chứng từ chờ xử lý"
              value={pending}
              description="Phân loại chi tiết ở bảng bên dưới"
              href={links.reports}
            />
            <OverviewMetric
              label="Công việc quá hạn"
              value={data.overdueTasks}
              description="Chưa kết thúc và đã qua deadline"
              href={links.tasks}
            />
          </div>
          <WarehouseActivityChart data={data} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Công việc và chứng từ đang chờ</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Yêu cầu nhập', data.pendingInboundRequests],
                    ['Phiếu nhận / cất hàng', data.pendingGoodsReceipts],
                    ['Phiếu xuất', data.pendingStockIssues],
                    ['Điều chuyển liên kho', data.pendingTransfers],
                    ['Phiên kiểm kê', data.pendingCounts],
                    ['Công việc chưa phân công', data.unassignedTasks],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                {links.reports ? (
                  <Link
                    href={links.reports}
                    className="text-primary mt-4 inline-block text-sm hover:underline"
                  >
                    Mở báo cáo vận hành →
                  </Link>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tồn và vị trí lưu trữ</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ['SKU đang có lượng giữ', data.reservedSkuCount],
                    ['SKU có tồn bị cách ly / không khả dụng theo trạng thái', data.heldSkuCount],
                    ['Vị trí hoạt động', data.activeSlots],
                    ['Vị trí hoạt động có hàng', data.occupiedActiveSlots],
                    ['Vị trí ngừng hoạt động còn hàng', data.inactiveSlotsWithStock],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-muted-foreground mt-4 text-xs">
                  Tỷ lệ vị trí có hàng:{' '}
                  {data.activeSlots
                    ? `${Math.round((data.occupiedActiveSlots / data.activeSlots) * 100)}%`
                    : 'Chưa có vị trí hoạt động'}
                  . Chỉ số này không phải sức chứa khối lượng/thể tích.
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hàng dưới ngưỡng tồn · tối đa 10 dòng</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {['Kho', 'SKU / Mặt hàng', 'Khả dụng', 'Ngưỡng tối thiểu', 'ĐVT'].map(
                      (label) => (
                        <TableHead key={label}>{label}</TableHead>
                      )
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowStockSignals.map((signal) => (
                    <TableRow key={`${signal.warehouseId}-${signal.productId}`}>
                      <TableCell>{signal.warehouseName}</TableCell>
                      <TableCell>
                        <span className="font-medium">{signal.sku}</span>
                        <p className="text-muted-foreground text-xs">{signal.productName}</p>
                      </TableCell>
                      <TableCell>{signal.availableQuantity.toLocaleString('vi-VN')}</TableCell>
                      <TableCell>{signal.minimumQuantity.toLocaleString('vi-VN')}</TableCell>
                      <TableCell>{signal.unit}</TableCell>
                    </TableRow>
                  ))}
                  {data.lowStockSignals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground py-6 text-center">
                        Không có SKU dưới ngưỡng trong các policy đã cấu hình.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <p className="text-muted-foreground mt-3 text-xs">
                Đây là tín hiệu theo ngưỡng; không phải đề xuất AI hoặc đơn mua hàng tự động.
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
