import Link from 'next/link'
import { ClickableTableRow } from '@/components/operations/ClickableTableRow'
import type { Route } from 'next'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  OperationalCellStack,
  OperationalQuantityProgress,
} from '@/components/operations/OperationalCells'
import { APP_ROUTES } from '@/routes/app-routes'
import { inboundSourceLabels } from '../../schemas/inbound-request.schema'
import { type InboundRequestSummary } from '../../types/inbound-request.types'
import {
  formatOperationalDate,
  formatOperationalDateTime,
  formatQuantity,
} from '../../utils/inbound-request-format'
import { InboundRequestStatusBadge } from './InboundRequestStatusBadge'
import { InboundRequestRowActions } from './InboundRequestRowActions'

interface InboundRequestTableProps {
  readonly items: readonly InboundRequestSummary[]
  readonly canDelete: boolean
  readonly canDeleteApproved?: boolean
  readonly canEdit?: boolean
  readonly canEditApproved?: boolean
  readonly canCreate: boolean
  readonly canSubmit: boolean
  readonly canApprove: boolean
  readonly isDeleting: boolean
  readonly isSubmitting: boolean
  readonly isApproving: boolean
  readonly isDeletingMany: boolean
  readonly selectAllIds: readonly string[]
  readonly isDuplicating: boolean
  readonly selectedIds: readonly string[]
  readonly allSelected: boolean
  readonly onDelete: (item: InboundRequestSummary) => void
  readonly onSubmit: (item: InboundRequestSummary) => void
  readonly onApprove: (item: InboundRequestSummary) => void
  readonly onDuplicate: (item: InboundRequestSummary) => void
  readonly onSelectionChange: (ids: readonly string[]) => void
}

export function InboundRequestTableSkeleton() {
  return (
    <div className="flex-1 overflow-hidden" aria-label="Đang tải danh sách yêu cầu nhập kho">
      <Table className="min-w-[960px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="bg-card w-12 p-0 text-center">
              <Skeleton className="size-4" />
            </TableHead>
            {['Mã yêu cầu', 'Nguồn hàng · Kho nhận', 'Trạng thái', 'Tiến độ', 'Thời gian', ''].map(
              (heading) => (
                <TableHead key={heading} className="bg-card">
                  {heading}
                </TableHead>
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="size-4" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-2 h-3 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20" />
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

export function InboundRequestTable({
  items,
  canDelete,
  canDeleteApproved = false,
  canEdit = false,
  canEditApproved = false,
  canCreate,
  canSubmit,
  canApprove,
  isDeleting,
  isSubmitting,
  isApproving,
  isDeletingMany,
  selectAllIds,
  isDuplicating,
  selectedIds,
  allSelected,
  onDelete,
  onSubmit,
  onApprove,
  onDuplicate,
  onSelectionChange,
}: InboundRequestTableProps) {
  return (
    <div className="hidden min-h-0 flex-1 overflow-auto md:block">
      <Table className="min-w-[960px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="bg-card w-12 p-0 text-center">
              <Checkbox
                className="mx-auto"
                aria-label="Chọn tất cả yêu cầu nhập kho trên trang"
                checked={
                  allSelected
                    ? true
                    : selectedIds.some((id) => selectAllIds.includes(id))
                      ? 'indeterminate'
                      : false
                }
                disabled={
                  selectAllIds.length === 0 || isDeletingMany || isSubmitting || isApproving
                }
                onCheckedChange={(checked) =>
                  onSelectionChange(checked === true ? selectAllIds : [])
                }
              />
            </TableHead>
            <TableHead className="bg-card w-52">Mã yêu cầu</TableHead>
            <TableHead className="bg-card">Nguồn hàng · Kho nhận</TableHead>
            <TableHead className="bg-card w-36">Trạng thái</TableHead>
            <TableHead className="bg-card w-44">Tiến độ nhận</TableHead>
            <TableHead className="bg-card w-44">Thời gian</TableHead>
            <TableHead className="bg-card w-16">
              <span className="sr-only">Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <ClickableTableRow
              key={item.id}
              href={APP_ROUTES.inboundRequestDetail(item.id) as Route}
            >
              <TableCell data-row-ignore className="w-12 p-0 text-center">
                <Checkbox
                  className="mx-auto"
                  aria-label={`Chọn ${item.inboundRequestCode}`}
                  checked={selectedIds.includes(item.id)}
                  disabled={isDeletingMany || isSubmitting || isApproving}
                  onCheckedChange={(checked) =>
                    onSelectionChange(
                      checked === true
                        ? Array.from(new Set([...selectedIds, item.id]))
                        : selectedIds.filter((id) => id !== item.id)
                    )
                  }
                />
              </TableCell>
              <TableCell className="min-w-0">
                <div className="min-w-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={APP_ROUTES.inboundRequestDetail(item.id) as Route}
                        className="text-primary block truncate font-mono font-semibold underline-offset-4 hover:underline"
                        translate="no"
                      >
                        {item.inboundRequestCode}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent className="font-mono" translate="no">
                      {item.inboundRequestCode}
                    </TooltipContent>
                  </Tooltip>
                  <p className="text-muted-foreground truncate text-xs">{item.createdByName}</p>
                </div>
              </TableCell>
              <TableCell className="min-w-0">
                <OperationalCellStack
                  primary={item.supplierName ?? item.sourceName ?? 'Chưa xác định'}
                  secondary={`${inboundSourceLabels[item.sourceType]} → ${
                    item.warehouseName ?? 'Chưa xác định kho'
                  }`}
                />
              </TableCell>
              <TableCell>
                <InboundRequestStatusBadge status={item.status} />
              </TableCell>
              <TableCell>
                <OperationalQuantityProgress
                  done={item.receivedQuantity}
                  total={item.orderedQuantity}
                  doneText={formatQuantity(item.receivedQuantity)}
                  totalText={formatQuantity(item.orderedQuantity)}
                />
              </TableCell>
              <TableCell>
                <OperationalCellStack
                  primary={formatOperationalDateTime(item.createdAt)}
                  secondary={`Dự kiến ${formatOperationalDate(item.expectedDate)}`}
                />
              </TableCell>
              <TableCell data-row-ignore className="text-right">
                <InboundRequestRowActions
                  item={item}
                  canCreate={canCreate}
                  canSubmit={canSubmit}
                  canApprove={canApprove}
                  canDelete={canDelete}
                  canDeleteApproved={canDeleteApproved}
                  canEdit={canEdit}
                  canEditApproved={canEditApproved}
                  isSubmitting={isSubmitting}
                  isApproving={isApproving}
                  isDeleting={isDeleting}
                  isDuplicating={isDuplicating}
                  onSubmit={onSubmit}
                  onApprove={onApprove}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                />
              </TableCell>
            </ClickableTableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
