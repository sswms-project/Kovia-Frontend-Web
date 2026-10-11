'use client'

import { ClickableTableRow } from '@/components/operations/ClickableTableRow'
import { Check, Eye, MoreHorizontal, Search, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { StockIssueWorkspaceNavigation } from '@/components/operations/StockIssueWorkspaceNavigation'
import { P } from '@/config/permissionCodes'
import type {
  GoodsReturnRequestStatus,
  GoodsReturnRequestSummary,
} from '../../types/stock-issue.types'
import { RETURN_STATUS_LABELS, formatStockIssueDate } from '../../utils/stock-issue-format'
import { GoodsReturnRequestStatusBadge } from './GoodsReturnRequestStatusBadge'

interface GoodsReturnRequestDirectoryProps {
  readonly items: readonly GoodsReturnRequestSummary[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly status: GoodsReturnRequestStatus | ''
  readonly warehouseId: string
  readonly dateFrom: string
  readonly dateTo: string
  readonly warehouses: readonly { id: string; label: string }[]
  readonly permissions: readonly string[]
  readonly currentUserId: string | null
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: GoodsReturnRequestStatus | '') => void
  readonly onWarehouseChange: (value: string) => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onInspect: (item: GoodsReturnRequestSummary) => void
  readonly onApprove: (item: GoodsReturnRequestSummary) => void
  readonly onReject: (item: GoodsReturnRequestSummary) => void
  readonly onRestock: (item: GoodsReturnRequestSummary) => void
  readonly onRetry: () => void
}

export function GoodsReturnRequestDirectory({
  items,
  totalCount,
  page,
  pageSize,
  searchText,
  status,
  warehouseId,
  dateFrom,
  dateTo,
  warehouses,
  permissions,
  currentUserId,
  isLoading,
  isFetching,
  isError,
  onSearchChange,
  onStatusChange,
  onWarehouseChange,
  onDateFromChange,
  onDateToChange,
  onPageChange,
  onPageSizeChange,
  onInspect,
  onApprove,
  onReject,
  onRestock,
  onRetry,
}: GoodsReturnRequestDirectoryProps) {
  const canApprove = permissions.includes(P.GOODS_RETURN_REQUESTS_APPROVE)
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <h1 className="sr-only">Yêu cầu trả hàng</h1>
      <StockIssueWorkspaceNavigation currentView="goodsReturnRequests" permissions={permissions} />
      <OperationalListPanel aria-label="Danh sách phiếu hoàn hàng">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b p-3">
          <div>
            <h2 className="text-sm font-semibold">Danh sách yêu cầu trả hàng</h2>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-5">
            <InputGroup className="min-w-0 lg:w-64">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Tìm yêu cầu trả hàng"
                value={searchText}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </InputGroup>
            <NativeSelect
              aria-label="Lọc trạng thái yêu cầu trả hàng"
              value={status}
              onChange={(event) =>
                onStatusChange(event.target.value as GoodsReturnRequestStatus | '')
              }
            >
              <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
              {Object.entries(RETURN_STATUS_LABELS).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Lọc kho nhận hàng trả"
              value={warehouseId}
              onChange={(event) => onWarehouseChange(event.target.value)}
            >
              <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
              {warehouses.map((warehouse) => (
                <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                  {warehouse.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Input
              aria-label="Từ ngày"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => onDateFromChange(event.target.value)}
            />
            <Input
              aria-label="Đến ngày"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => onDateToChange(event.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <OperationalLoadingState />
        ) : isError ? (
          <OperationalErrorState title="Không thể tải yêu cầu trả hàng" onRetry={onRetry} />
        ) : items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có yêu cầu trả hàng phù hợp"
            description="Thử đổi từ khóa hoặc trạng thái."
          />
        ) : (
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10">Mã phiếu</TableHead>
                <TableHead className="sticky top-0 z-10">Yêu cầu xuất kho</TableHead>
                <TableHead className="sticky top-0 z-10">Lý do</TableHead>
                <TableHead className="sticky top-0 z-10">Trạng thái</TableHead>
                <TableHead className="sticky top-0 z-10">Ngày tạo</TableHead>
                <TableHead className="sticky top-0 z-10">
                  <span className="sr-only">Thao tác</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <ClickableTableRow key={item.id} onActivate={() => onInspect(item)}>
                  <TableCell className="font-mono">{item.goodsReturnRequestCode}</TableCell>
                  <TableCell className="font-mono">{item.stockIssueRequestCode}</TableCell>
                  <TableCell className="max-w-64 truncate">{item.reason}</TableCell>
                  <TableCell>
                    <GoodsReturnRequestStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{formatStockIssueDate(item.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Thao tác với ${item.goodsReturnRequestCode}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onSelect={() => onInspect(item)}>
                            <Eye />
                            Chi tiết
                          </DropdownMenuItem>
                          {canApprove &&
                          item.status === 'Requested' &&
                          item.createdBy !== currentUserId ? (
                            <>
                              <DropdownMenuItem onSelect={() => onApprove(item)}>
                                <Check />
                                Duyệt
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => onReject(item)}
                              >
                                <X />
                                Từ chối
                              </DropdownMenuItem>
                            </>
                          ) : null}
                          {canApprove && item.status === 'Approved' ? (
                            <DropdownMenuItem onSelect={() => onRestock(item)}>
                              <Undo2 />
                              Nhập lại kho
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <OperationalPagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          isPending={isFetching}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </OperationalListPanel>
    </div>
  )
}
