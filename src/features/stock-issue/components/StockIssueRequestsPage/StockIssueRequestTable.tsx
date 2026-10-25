import Link from 'next/link'
import type { Route } from 'next'
import { goodsPreviewInteractions } from '@/features/inbound/utils/goods-preview-interactions'
import {
  OperationalCellStack,
  OperationalQuantityProgress,
} from '@/components/operations/OperationalCells'
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
import type {
  StockIssueCapabilities,
  StockIssueRequestSummary,
  StockIssueRowActionHandlers,
} from '../../types/stock-issue.types'
import {
  formatStockIssueDate,
  summarizeStockIssueProgress,
  summarizeStockIssueSlots,
} from '../../utils/stock-issue-format'
import { StockIssueRequestRowActions } from './StockIssueRequestRowActions'
import { StockIssueRequestStatusBadge } from './StockIssueRequestStatusBadge'

const TABLE_CLASS_NAME = 'min-w-[960px] table-fixed'

interface StockIssueRequestTableProps {
  readonly previewId?: string
  readonly onPreview?: (item: StockIssueRequestSummary) => void
  readonly items: readonly StockIssueRequestSummary[]
  readonly capabilities: StockIssueCapabilities
  readonly handlers: StockIssueRowActionHandlers
}

function StockIssueRequestTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-56">Mã yêu cầu</TableHead>
        <TableHead>Đơn vị nhận · Kho xuất</TableHead>
        <TableHead className="w-48">Trạng thái</TableHead>
        <TableHead className="w-48">Tiến độ lấy hàng (kiện)</TableHead>
        <TableHead className="w-44">Thời gian</TableHead>
        <TableHead className="w-16">
          <span className="sr-only">Thao tác</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

export function StockIssueRequestTableSkeleton() {
  return (
    <div className="flex-1 overflow-hidden" aria-label="Đang tải danh sách yêu cầu xuất kho">
      <Table className={TABLE_CLASS_NAME}>
        <StockIssueRequestTableHeader />
        <TableBody>
          {Array.from({ length: 6 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-2 h-3 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-2 w-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-3 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto size-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function StockIssueRequestTable({
  previewId,
  onPreview,
  items,
  capabilities,
  handlers,
}: StockIssueRequestTableProps) {
  return (
    <div className="hidden min-h-0 flex-1 overflow-auto md:block">
      <Table className={TABLE_CLASS_NAME}>
        <StockIssueRequestTableHeader />
        <TableBody>
          {items.map((item) => {
            const detailHref = APP_ROUTES.stockIssueRequestDetail(item.id) as Route
            const progress = summarizeStockIssueProgress(item)
            const pendingSlots = summarizeStockIssueSlots(item)
            return (
              <TableRow
                key={item.id}
                {...goodsPreviewInteractions(
                  onPreview ? () => onPreview(item) : undefined,
                  previewId === item.id
                )}
              >
                <TableCell className="min-w-0">
                  <div
                    className="font-mono font-semibold wrap-anywhere whitespace-normal"
                    translate="no"
                  >
                    <Link
                      href={detailHref}
                      className="underline-offset-4 hover:underline"
                      translate="no"
                    >
                      {item.stockIssueRequestCode}
                    </Link>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {item.referenceCode
                      ? `Tham chiếu ${item.referenceCode}`
                      : 'Không có tham chiếu'}
                  </p>
                </TableCell>
                <TableCell className="min-w-0">
                  <OperationalCellStack
                    primary={item.recipientName}
                    secondary={`Mã: ${item.recipientCode} · Kho xuất: ${item.warehouseName}`}
                  />
                </TableCell>
                <TableCell className="min-w-0">
                  <StockIssueRequestStatusBadge status={item.status} />
                  <p className="text-muted-foreground mt-1 truncate text-xs">
                    {item.assignedStaffName
                      ? `Lấy hàng: ${item.assignedStaffName}`
                      : 'Chưa giao người lấy hàng'}
                  </p>
                </TableCell>
                <TableCell className="min-w-0 whitespace-normal">
                  <OperationalQuantityProgress
                    done={progress.done}
                    total={progress.total}
                    doneText={progress.doneText}
                    totalText={progress.totalText}
                    suffix={progress.suffix}
                  />
                  {pendingSlots ? (
                    <p className="text-muted-foreground mt-1 max-w-full text-xs wrap-anywhere">
                      Kệ cần lấy:{' '}
                      <span className="font-mono" translate="no">
                        {pendingSlots}
                      </span>
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <OperationalCellStack
                    primary={formatStockIssueDate(item.createdAt)}
                    secondary={`${item.items.length} dòng hàng`}
                  />
                </TableCell>
                <TableCell data-row-ignore className="text-right">
                  <StockIssueRequestRowActions
                    order={item}
                    capabilities={capabilities}
                    handlers={handlers}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
