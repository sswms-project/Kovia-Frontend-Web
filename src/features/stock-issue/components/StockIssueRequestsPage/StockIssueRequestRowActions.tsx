import {
  Ban,
  Eye,
  MoreHorizontal,
  PackageX,
  Pencil,
  ScanBarcode,
  Send,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { APP_ROUTES } from '@/routes/app-routes'
import type {
  StockIssueCapabilities,
  StockIssueRequestSummary,
  StockIssueRowActionHandlers,
} from '../../types/stock-issue.types'
import {
  canCancelStockIssueRequest,
  canEditStockIssueRequest,
  canRecordStockPicking,
} from '../../utils/stock-issue-format'

interface StockIssueRequestRowActionsProps {
  readonly order: StockIssueRequestSummary
  readonly capabilities: StockIssueCapabilities
  readonly handlers: StockIssueRowActionHandlers
}

export function StockIssueRequestRowActions({
  order,
  capabilities,
  handlers,
}: StockIssueRequestRowActionsProps) {
  const canPickNow = capabilities.canPick && canRecordStockPicking(order.status)
  const canCancelNow = capabilities.canCancel && canCancelStockIssueRequest(order.status)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Thao tác với phiếu ${order.stockIssueRequestCode}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={APP_ROUTES.stockIssueRequestDetail(order.id) as Route}>
            <Eye aria-hidden="true" />
            Xem chi tiết
          </Link>
        </DropdownMenuItem>
        {capabilities.canCreate && canEditStockIssueRequest(order.status) ? (
          <DropdownMenuItem asChild>
            <Link href={APP_ROUTES.stockIssueRequestEdit(order.id) as Route}>
              <Pencil aria-hidden="true" />
              Chỉnh sửa
            </Link>
          </DropdownMenuItem>
        ) : null}
        {capabilities.canAssignPicker && order.status === 'Pending' ? (
          <DropdownMenuItem onSelect={() => handlers.onReleaseForPicking(order)}>
            <Send aria-hidden="true" />
            Giao việc lấy hàng
          </DropdownMenuItem>
        ) : null}
        {canPickNow ? (
          <DropdownMenuItem onSelect={() => handlers.onRecordStockPicking(order)}>
            <ScanBarcode aria-hidden="true" />
            Quét &amp; lấy hàng
          </DropdownMenuItem>
        ) : null}
        {canPickNow ? (
          <DropdownMenuItem onSelect={() => handlers.onReportPickIssue(order)}>
            <PackageX aria-hidden="true" />
            Báo hàng lỗi
          </DropdownMenuItem>
        ) : null}
        {capabilities.canAuthorizeDispatch && order.status === 'Picked' ? (
          <DropdownMenuItem onSelect={() => handlers.onAuthorizeDispatch(order)}>
            <ShieldCheck aria-hidden="true" />
            Cho phép xuất kho
          </DropdownMenuItem>
        ) : null}
        {capabilities.canDispatch && order.status === 'AuthorizedForDispatch' ? (
          <DropdownMenuItem onSelect={() => handlers.onConfirmDispatch(order)}>
            <Truck aria-hidden="true" />
            Xác nhận hàng rời kho
          </DropdownMenuItem>
        ) : null}
        {canCancelNow ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => handlers.onCancel(order)}>
              <Ban aria-hidden="true" />
              Huỷ phiếu
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
