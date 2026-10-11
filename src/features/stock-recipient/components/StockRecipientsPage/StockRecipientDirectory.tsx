'use client'

import { ClickableTableRow } from '@/components/operations/ClickableTableRow'
import Link from 'next/link'
import { CircleOff, Eye, Pencil, Plus, RotateCcw, Search, Upload, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
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
import { parseActiveStatusFilter } from '@/components/operations/status-filter'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { APP_ROUTES } from '@/routes/app-routes'
import type { StockRecipient } from '../../types/stock-recipient.types'

interface StockRecipientDirectoryProps {
  readonly items: readonly StockRecipient[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly status: 'Active' | 'Inactive' | ''
  readonly canCreate: boolean
  readonly canUpdate: boolean
  readonly canManageStatus: boolean
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: 'Active' | 'Inactive' | '') => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onCreate: () => void
  readonly onEdit: (stockRecipient: StockRecipient) => void
  readonly onChangeStatus: (stockRecipient: StockRecipient) => void
  readonly onRetry: () => void
}

export function StockRecipientDirectory({
  items,
  totalCount,
  page,
  pageSize,
  searchText,
  status,
  canCreate,
  canUpdate,
  canManageStatus,
  isLoading,
  isFetching,
  isError,
  onSearchChange,
  onStatusChange,
  onPageChange,
  onPageSizeChange,
  onCreate,
  onEdit,
  onChangeStatus,
  onRetry,
}: StockRecipientDirectoryProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-start gap-3">
          <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center">
            <Users aria-hidden="true" />
          </span>
          <div>
            <p className="text-primary text-xs font-medium">Danh mục</p>
            <h1 className="text-xl font-semibold">Khách hàng</h1>
          </div>
        </div>
        {canCreate ? (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={APP_ROUTES.stockRecipientImport}>
                <Upload data-icon="inline-start" />
                Nhập từ tệp
              </Link>
            </Button>
            <Button onClick={onCreate}>
              <Plus data-icon="inline-start" />
              Thêm khách hàng
            </Button>
          </div>
        ) : null}
      </header>
      <OperationalListPanel aria-label="Danh sách khách hàng">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b p-3">
          <div>
            <h2 className="text-sm font-semibold">Danh sách khách hàng</h2>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <InputGroup className="min-w-56 flex-1 sm:w-72">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Tìm khách hàng"
                value={searchText}
                placeholder="Mã, tên hoặc số điện thoại…"
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </InputGroup>
            <NativeSelect
              aria-label="Lọc khách hàng theo trạng thái"
              className="w-44"
              value={status}
              onChange={(event) => onStatusChange(parseActiveStatusFilter(event.target.value))}
            >
              <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
              <NativeSelectOption value="Active">Đang hoạt động</NativeSelectOption>
              <NativeSelectOption value="Inactive">Ngừng hoạt động</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        {isLoading ? (
          <OperationalLoadingState />
        ) : isError ? (
          <OperationalErrorState title="Không thể tải khách hàng" onRetry={onRetry} />
        ) : items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có khách hàng phù hợp"
            description="Thử đổi từ khóa hoặc thêm khách hàng mới."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10">Mã</TableHead>
                <TableHead className="sticky top-0 z-10">Tên khách hàng</TableHead>
                <TableHead className="sticky top-0 z-10">Điện thoại</TableHead>
                <TableHead className="sticky top-0 z-10">Email</TableHead>
                <TableHead className="sticky top-0 z-10">Trạng thái</TableHead>
                <TableHead className="sticky top-0 z-10">
                  <span className="sr-only">Thao tác</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((stockRecipient) => (
                <ClickableTableRow
                  key={stockRecipient.id}
                  href={APP_ROUTES.stockRecipientDetail(stockRecipient.id)}
                >
                  <TableCell className="font-mono">{stockRecipient.recipientCode}</TableCell>
                  <TableCell>
                    <Link
                      title={`Xem chi tiết khách hàng ${stockRecipient.recipientName}`}
                      className="text-primary font-medium underline-offset-4 hover:underline focus-visible:underline"
                      href={APP_ROUTES.stockRecipientDetail(stockRecipient.id)}
                    >
                      {stockRecipient.recipientName}
                    </Link>
                  </TableCell>
                  <TableCell>{stockRecipient.phone}</TableCell>
                  <TableCell>{stockRecipient.email ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={stockRecipient.status === 'Active' ? 'default' : 'outline'}>
                      {stockRecipient.status === 'Active' ? 'Đang hợp tác' : 'Ngừng hợp tác'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link
                              href={APP_ROUTES.stockRecipientDetail(stockRecipient.id)}
                              aria-label={`Xem chi tiết khách hàng ${stockRecipient.recipientName}`}
                            >
                              <Eye aria-hidden="true" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Xem chi tiết</TooltipContent>
                      </Tooltip>
                      {canUpdate ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Chỉnh sửa ${stockRecipient.recipientName}`}
                              onClick={() => onEdit(stockRecipient)}
                            >
                              <Pencil aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Chỉnh sửa</TooltipContent>
                        </Tooltip>
                      ) : null}
                      {canManageStatus ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={
                                stockRecipient.status === 'Active'
                                  ? `Ngừng hợp tác ${stockRecipient.recipientName}`
                                  : `Tiếp tục hợp tác với ${stockRecipient.recipientName}`
                              }
                              onClick={() => onChangeStatus(stockRecipient)}
                            >
                              {stockRecipient.status === 'Active' ? (
                                <CircleOff aria-hidden="true" />
                              ) : (
                                <RotateCcw aria-hidden="true" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {stockRecipient.status === 'Active'
                              ? 'Ngừng hợp tác'
                              : 'Tiếp tục hợp tác'}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
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
