'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { APP_ROUTES } from '@/routes/app-routes'

import { Plus, Search } from 'lucide-react'
import {
  ReturnGoodsWorkspace,
  type ReturnGoodsWorkspaceState,
} from '@/components/operations/ReturnGoodsWorkspace'
import { goodsPreviewInteractions } from '@/features/inbound/utils/goods-preview-interactions'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { ReturnsWorkspaceNavigation } from '@/components/operations/ReturnsWorkspaceNavigation'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatInventoryQuantity } from '@/features/inventory/utils/inventory-format'
import { formatStockIssueDate } from '@/features/stock-issue/utils/stock-issue-format'
import type { SupplierReturnStatus, SupplierReturnSummary } from '../../types/supplier-return.types'
import {
  isSupplierReturnStatus,
  SUPPLIER_RETURN_STATUS_LABELS,
} from '../../utils/supplier-return-format'
import { SupplierReturnStatusBadge } from './SupplierReturnStatusBadge'

interface Option {
  readonly id: string
  readonly label: string
}

interface SupplierReturnDirectoryProps {
  readonly goodsPreview?: ReturnGoodsWorkspaceState
  readonly detailHref?: (id: string) => string
  readonly items: readonly SupplierReturnSummary[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly status: SupplierReturnStatus | ''
  readonly warehouseId: string
  readonly supplierId: string
  readonly dateFrom: string
  readonly dateTo: string
  readonly warehouses: readonly Option[]
  readonly suppliers: readonly Option[]
  readonly canCreate: boolean
  readonly permissions: readonly string[]
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: SupplierReturnStatus | '') => void
  readonly onWarehouseChange: (value: string) => void
  readonly onSupplierChange: (value: string) => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onInspect: (item: SupplierReturnSummary) => void
  readonly onCreate: () => void
  readonly onRetry: () => void
}

export function SupplierReturnDirectory({
  goodsPreview,
  detailHref = APP_ROUTES.supplierReturnDetail,
  items,
  totalCount,
  page,
  pageSize,
  searchText,
  status,
  warehouseId,
  supplierId,
  dateFrom,
  dateTo,
  warehouses,
  suppliers,
  canCreate,
  permissions,
  isLoading,
  isFetching,
  isError,
  onSearchChange,
  onStatusChange,
  onWarehouseChange,
  onSupplierChange,
  onDateFromChange,
  onDateToChange,
  onPageChange,
  onPageSizeChange,
  onInspect,
  onCreate,
  onRetry,
}: SupplierReturnDirectoryProps) {
  return (
    <div
      data-compact-workspace-bottom
      className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4"
    >
      <h1 className="sr-only">Trả hàng nhà cung cấp</h1>
      <header className="flex min-w-0 shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <ReturnsWorkspaceNavigation currentView="supplierReturns" permissions={permissions} />
        </div>
        {canCreate ? (
          <Button type="button" size="sm" className="shrink-0 self-end" onClick={onCreate}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Lập phiếu
          </Button>
        ) : null}
      </header>
      <ReturnGoodsWorkspace preview={goodsPreview}>
        <OperationalListPanel
          className="max-md:[&>[data-slot=table-container]]:hidden"
          aria-label="Danh sách phiếu trả hàng nhà cung cấp"
        >
          <div className="flex shrink-0 flex-col gap-3 border-b p-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Danh sách phiếu trả hàng NCC</h2>
            </div>
            <div
              role="search"
              aria-label="Bộ lọc phiếu trả hàng NCC"
              className="grid w-full min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(14rem,2fr)_repeat(3,minmax(9rem,1fr))_repeat(2,minmax(9.5rem,1fr))]"
            >
              <InputGroup className="min-w-0">
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Tìm phiếu trả hàng NCC"
                  placeholder="Mã phiếu, NCC…"
                  value={searchText}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
              </InputGroup>
              <NativeSelect
                className="w-full min-w-0"
                aria-label="Lọc trạng thái phiếu trả hàng NCC"
                value={status}
                onChange={(event) => {
                  const value = event.target.value
                  onStatusChange(isSupplierReturnStatus(value) ? value : '')
                }}
              >
                <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
                {Object.entries(SUPPLIER_RETURN_STATUS_LABELS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                className="w-full min-w-0"
                aria-label="Lọc kho"
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
              <NativeSelect
                className="w-full min-w-0"
                aria-label="Lọc nhà cung cấp"
                value={supplierId}
                onChange={(event) => onSupplierChange(event.target.value)}
              >
                <NativeSelectOption value="">Tất cả NCC</NativeSelectOption>
                {suppliers.map((supplier) => (
                  <NativeSelectOption key={supplier.id} value={supplier.id}>
                    {supplier.label}
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
            <OperationalErrorState title="Không thể tải phiếu trả hàng NCC" onRetry={onRetry} />
          ) : items.length === 0 ? (
            <OperationalEmptyState
              title="Chưa có phiếu trả hàng NCC phù hợp"
              description="Thử đổi từ khóa hoặc bộ lọc."
            />
          ) : (
            <>
              <div data-slot="operational-list-body" className="md:hidden">
                <ItemGroup className="gap-0">
                  {items.map((item) => (
                    <Item
                      key={item.id}
                      {...goodsPreviewInteractions(
                        () => (goodsPreview ? goodsPreview.onSelect(item.id) : onInspect(item)),
                        goodsPreview?.selectedId === item.id,
                        'border-b last:border-b-0'
                      )}
                    >
                      <ItemContent className="min-w-0">
                        <ItemTitle className="flex w-full min-w-0 flex-wrap items-center gap-2">
                          <Link
                            className="font-mono underline-offset-4 hover:underline focus-visible:underline"
                            href={detailHref(item.id) as Route}
                          >
                            {item.code}
                          </Link>
                          <SupplierReturnStatusBadge status={item.status} />
                        </ItemTitle>
                        <ItemDescription>
                          {item.supplierName} · {item.warehouseName}
                        </ItemDescription>
                        <ItemDescription>
                          {item.lineCount} dòng · {formatInventoryQuantity(item.totalQuantity)} ·{' '}
                          {formatStockIssueDate(item.createdAt)}
                        </ItemDescription>
                        {goodsPreview ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11 self-start"
                            onClick={() => goodsPreview.onSelect(item.id, true)}
                          >
                            Xem hàng hóa
                          </Button>
                        ) : null}
                      </ItemContent>
                    </Item>
                  ))}
                </ItemGroup>
              </div>
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-10">Mã phiếu</TableHead>
                    <TableHead className="sticky top-0 z-10">Nhà cung cấp</TableHead>
                    <TableHead className="sticky top-0 z-10">Kho</TableHead>
                    <TableHead className="sticky top-0 z-10 text-right">Số dòng</TableHead>
                    <TableHead className="sticky top-0 z-10 text-right">Tổng số lượng</TableHead>
                    <TableHead className="sticky top-0 z-10">Trạng thái</TableHead>
                    <TableHead className="sticky top-0 z-10">Ngày lập</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      {...goodsPreviewInteractions(
                        () => (goodsPreview ? goodsPreview.onSelect(item.id) : onInspect(item)),
                        goodsPreview?.selectedId === item.id
                      )}
                    >
                      <TableCell className="font-mono">
                        <Link
                          className="underline-offset-4 hover:underline focus-visible:underline"
                          href={detailHref(item.id) as Route}
                        >
                          {item.code}
                        </Link>
                      </TableCell>
                      <TableCell>{item.supplierName}</TableCell>
                      <TableCell>{item.warehouseName}</TableCell>
                      <TableCell className="text-right">{item.lineCount}</TableCell>
                      <TableCell className="text-right">
                        {formatInventoryQuantity(item.totalQuantity)}
                      </TableCell>
                      <TableCell>
                        <SupplierReturnStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>{formatStockIssueDate(item.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
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
      </ReturnGoodsWorkspace>
    </div>
  )
}
