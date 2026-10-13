import { Progress } from '@/components/ui/progress'
import { formatDisplayDate, isoDateStringToDate } from '@/lib/date-format'
import { cn } from '@/lib/utils'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import { formatStockIssueDate, summarizeStockIssueProgress } from '../../utils/stock-issue-format'

function formatIssueDate(value: string | null): string {
  const date = value ? isoDateStringToDate(value) : undefined
  return date ? formatDisplayDate(date) : 'Chưa xác định'
}

export function StockIssueRequestOverview({ order }: { readonly order: StockIssueRequestSummary }) {
  const summary = summarizeStockIssueProgress(order)
  const progress = summary.total <= 0 ? 0 : Math.min(100, (summary.done / summary.total) * 100)

  return (
    <section className="bg-card border" aria-labelledby="stock-issue-request-overview">
      <div className="border-b p-4">
        <h2 id="stock-issue-request-overview" className="text-sm font-semibold">
          Tổng quan
        </h2>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 p-4 lg:grid-cols-4">
        <Metadata label="Kho xuất" value={order.warehouseName} />
        <Metadata
          label="Đơn vị nhận hàng"
          value={`${order.recipientCode} · ${order.stockRecipientName}`}
        />
        <Metadata label="Người nhận" value={order.recipientName} />
        <Metadata label="Điện thoại" value={order.recipientPhone || 'Chưa có'} />
        <Metadata label="Ngày xuất" value={formatIssueDate(order.issueDate)} />
        <Metadata label="Ngày tạo" value={formatStockIssueDate(order.createdAt)} />
        <Metadata label="Mã tham chiếu" value={order.referenceCode ?? 'Không có'} />
        <Metadata label="Người lấy hàng" value={order.assignedStaffName ?? 'Chưa phân công'} />
        {order.dispatchAuthorizedAt ? (
          <Metadata
            label="Cho phép xuất lúc"
            value={formatStockIssueDate(order.dispatchAuthorizedAt)}
          />
        ) : null}
        {order.dispatchedAt ? (
          <Metadata label="Rời kho lúc" value={formatStockIssueDate(order.dispatchedAt)} />
        ) : null}
        <Metadata
          label="Địa chỉ nhận"
          value={order.recipientAddress || 'Chưa có'}
          className="col-span-2"
        />
        <Metadata
          label="Diễn giải / mục đích"
          value={order.purpose ?? 'Không có'}
          className="col-span-2"
        />
        <div className="col-span-2 lg:col-span-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <dt className="text-muted-foreground text-xs">Tiến độ lấy hàng theo kiện</dt>
            <dd className="text-xs font-medium tabular-nums">
              {summary.doneText} / {summary.totalText} {summary.suffix}
            </dd>
          </div>
          <Progress value={progress} />
        </div>
      </dl>
      {order.note ? (
        <div className="border-t px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium">Ghi chú</p>
          <p className="mt-1 text-xs whitespace-pre-wrap">{order.note}</p>
        </div>
      ) : null}
    </section>
  )
}

function Metadata({
  label,
  value,
  className,
}: {
  readonly label: string
  readonly value: string
  readonly className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
    </div>
  )
}
