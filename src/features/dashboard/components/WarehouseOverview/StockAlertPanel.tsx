import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { APP_ROUTES } from '@/routes/app-routes'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import type { StockAlertKind, StockAlerts } from '../../schemas/stock-alert.schema'

export const stockAlertTitles: Record<StockAlertKind, string> = {
  'below-minimum': 'Khả dụng dưới mức tối thiểu',
  'above-maximum': 'Khả dụng vượt mức tối đa',
  expiring: 'Hàng hóa sắp hết hạn',
  expired: 'Hàng hóa quá hạn sử dụng',
}
export interface StockAlertPanelState {
  readonly data?: StockAlerts
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly errorMessage?: string
  readonly onRefresh: () => void
}
export interface StockAlertPanelProps extends StockAlertPanelState {
  readonly kind: StockAlertKind
  readonly expiringDays: number
  readonly canViewInventory: boolean
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange?: (size: number) => void
  readonly onExpand?: (opener: HTMLButtonElement) => void
  readonly expanded?: boolean
  readonly settings?: ReactNode
  readonly searchControl?: ReactNode
}

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC' })
const snapshotFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
})

export function StockAlertPanel({
  kind,
  data,
  isLoading,
  isFetching,
  errorMessage,
  expiringDays,
  canViewInventory,
  onRefresh,
  onPageChange,
  onPageSizeChange,
  onExpand,
  expanded = false,
  settings,
  searchControl,
}: StockAlertPanelProps) {
  const expiry = kind === 'expiring' || kind === 'expired'
  const title =
    kind === 'expiring'
      ? `Sắp hết hạn · hôm nay và ${expiringDays} ngày tới`
      : stockAlertTitles[kind]
  const columns = expiry
    ? ['Hàng hóa', 'Kho', 'Số lô', 'Hạn dùng', 'Tồn thực tế', 'ĐVT']
    : ['Hàng hóa', 'Kho', 'Khả dụng', kind === 'above-maximum' ? 'Tối đa' : 'Tối thiểu', 'ĐVT']
  if (expanded) columns.push(expiry ? 'Ngày còn lại' : kind === 'above-maximum' ? 'Vượt' : 'Thiếu')
  const noPolicy = data && 'configuredPolicyCount' in data && data.configuredPolicyCount === 0
  return (
    <OperationalListPanel aria-label={title}>
      <div className="flex shrink-0 flex-col gap-2 border-b p-3 [@media(max-height:500px)]:p-2">
        <div className="flex min-w-0 items-center gap-2">
          {expanded ? (
            searchControl
          ) : (
            <h2
              className="min-w-0 flex-1 text-sm font-semibold"
              title={`${title}${data ? ` · Cập nhật ${snapshotFormatter.format(new Date(data.generatedAt))}` : ''}`}
            >
              {title}
            </h2>
          )}
          {settings}
          {onExpand ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(event) => onExpand(event.currentTarget)}
            >
              Xem tất cả
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={isFetching}
            aria-label={`Tải lại ${stockAlertTitles[kind]}`}
            title={`Tải lại ${stockAlertTitles[kind]}`}
            onClick={onRefresh}
          >
            <RefreshCw
              aria-hidden="true"
              className={cn(isFetching && 'animate-spin motion-reduce:animate-none')}
            />
          </Button>
        </div>
        {!expanded ? searchControl : null}
        {errorMessage && data ? (
          <Alert variant="destructive">
            <AlertDescription>
              Chưa tải lại được — đang hiển thị dữ liệu cũ. {errorMessage}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
      <Table
        className={cn(
          'table-fixed',
          expanded ? 'min-w-[48rem]' : expiry ? 'min-w-[36rem]' : 'min-w-[28rem]'
        )}
      >
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead
                key={column}
                className={cn(
                  'bg-card whitespace-nowrap',
                  index === 0 && 'w-[30%]',
                  index === 1 && 'w-[18%]',
                  [
                    'Khả dụng',
                    'Tối đa',
                    'Tối thiểu',
                    'Tồn thực tế',
                    'Thiếu',
                    'Vượt',
                    'Ngày còn lại',
                  ].includes(column) && 'text-right'
                )}
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? [1, 2, 3].map((row) => (
                <TableRow key={row}>
                  {columns.map((column) => (
                    <TableCell key={column}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : data?.items.map((row) => (
                <TableRow
                  key={`${row.warehouseId}:${row.productId}:${'lotId' in row ? row.lotId : 'policy'}`}
                >
                  <TableCell className="whitespace-normal">
                    {canViewInventory ? (
                      <Link
                        className={cn(
                          'font-medium break-words hover:underline focus-visible:underline',
                          !expanded && 'line-clamp-2'
                        )}
                        title={row.productName}
                        href={{
                          pathname: APP_ROUTES.inventory,
                          query: { warehouseId: row.warehouseId, productId: row.productId },
                        }}
                      >
                        {row.productName}
                      </Link>
                    ) : (
                      <span
                        className={cn('font-medium break-words', !expanded && 'line-clamp-2')}
                        title={row.productName}
                      >
                        {row.productName}
                      </span>
                    )}
                    <p className="text-muted-foreground font-mono text-xs break-all">{row.sku}</p>
                  </TableCell>
                  <TableCell className="min-w-24 whitespace-normal">{row.warehouseName}</TableCell>
                  {'expiryDate' in row ? (
                    <>
                      <TableCell className="max-w-56 break-words whitespace-normal">
                        {row.lotNumber}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'whitespace-nowrap',
                          kind === 'expired' && 'text-destructive'
                        )}
                      >
                        {dateFormatter.format(new Date(`${row.expiryDate}T00:00:00Z`))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.onHandQuantity.toLocaleString('vi-VN')}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right font-medium tabular-nums">
                        {row.availableQuantity.toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.thresholdQuantity.toLocaleString('vi-VN')}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="whitespace-nowrap">{row.unit}</TableCell>
                  {expanded ? (
                    <TableCell className="text-right tabular-nums">
                      {'daysToExpiry' in row
                        ? row.daysToExpiry < 0
                          ? `Quá ${Math.abs(row.daysToExpiry)}`
                          : row.daysToExpiry === 0
                            ? 'Hôm nay'
                            : row.daysToExpiry
                        : row.difference.toLocaleString('vi-VN')}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
          {!isLoading && !data?.items.length ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>
                      {errorMessage && !data
                        ? 'Không tải được cảnh báo'
                        : noPolicy
                          ? 'Chưa cấu hình ngưỡng'
                          : 'Không có cảnh báo phù hợp'}
                    </EmptyTitle>
                    <EmptyDescription>
                      {errorMessage && !data
                        ? errorMessage
                        : noPolicy
                          ? 'Chưa có policy hoạt động cho loại ngưỡng này trong phạm vi kho đã chọn.'
                          : 'Theo phạm vi và điều kiện đánh giá hiện tại.'}
                    </EmptyDescription>
                  </EmptyHeader>
                  {errorMessage ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onRefresh}
                      disabled={isFetching}
                    >
                      Thử lại
                    </Button>
                  ) : null}
                </Empty>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <div
        className={cn(
          'text-muted-foreground flex shrink-0 flex-wrap items-center justify-between gap-1 border-t px-3 py-1.5 text-xs',
          onExpand && '[@media(max-height:500px)]:hidden'
        )}
        aria-live="polite"
      >
        <span>
          {data
            ? `Cập nhật: ${snapshotFormatter.format(new Date(data.generatedAt))}`
            : 'Chưa có dữ liệu cập nhật'}
          {data && 'evaluationDate' in data ? (
            <span
              className="ml-1"
              title="Ngày UTC tương thích rule lô/tồn hiện tại; Dự báo & bổ sung dùng ngày Việt Nam."
            >
              · Đánh giá {dateFormatter.format(new Date(`${data.evaluationDate}T00:00:00Z`))} (UTC)
            </span>
          ) : null}
        </span>
      </div>
      {data ? (
        <OperationalPagination
          page={data.pageNumber}
          pageSize={data.pageSize}
          totalCount={data.totalCount}
          isPending={isFetching}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : (
        <div className="shrink-0 border-t p-3">
          <Skeleton className="h-6 w-full" />
        </div>
      )}
    </OperationalListPanel>
  )
}
