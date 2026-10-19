'use client'

import { Plus, Search } from 'lucide-react'
import { ClickableTableRow } from '@/components/operations/ClickableTableRow'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { StockIssueWorkspaceNavigation } from '@/components/operations/StockIssueWorkspaceNavigation'
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
import { rowActivationProps } from '@/features/inbound/utils/row-activation-props'
import { formatInventoryQuantity } from '@/features/inventory/utils/inventory-format'
import { formatStockIssueDate } from '@/features/stock-issue/utils/stock-issue-format'
import type { SupplierReturnStatus, SupplierReturnSummary } from '../../types/supplier-return.types'
import { SUPPLIER_RETURN_STATUS_LABELS } from '../../utils/supplier-return-format'
import { SupplierReturnStatusBadge } from './SupplierReturnStatusBadge'

interface Option {
  readonly id: string
  readonly label: string
}

interface SupplierReturnDirectoryProps {
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
  readonly permissions: readonly string[]
  readonly canCreate: boolean
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
  permissions,
  canCreate,
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
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <h1 className="sr-only">Trả hàng nhà cung cấp</h1>
      <StockIssueWorkspaceNavigation currentView="supplierReturns" permissions={permissions} />
      <OperationalListPanel
        className="max-md:[&>[data-slot=table-container]]:hidden"
        aria-label="Danh sách phiếu trả hàng nhà cung cấp"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b p-3">
          <div className="flex w-full items-center justify-between gap-2 lg:w-auto">
            <h2 className="text-sm font-semibold">Danh sách phiếu trả hàng NCC</h2>
            {canCreate ? (
              <Button size="sm" onClick={onCreate}>
                <Plus data-icon="inline-start" />
                Lập phiếu
              </Button>
            ) : null}
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-6">
            <InputGroup className="min-w-0 lg:w-56">
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
              aria-label="Lọc trạng thái phiếu trả hàng NCC"
              value={status}
              onChange={(event) => onStatusChange(event.target.value as SupplierReturnStatus | '')}
            >
              <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
              {Object.entries(SUPPLIER_RETURN_STATUS_LABELS).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
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
                    {...rowActivationProps(() => onInspect(item), 'border-b last:border-b-0')}
                  >
                    <ItemContent className="min-w-0">
                      <ItemTitle className="flex w-full min-w-0 flex-wrap items-center gap-2">
                        <span className="font-mono">{item.code}</span>
                        <SupplierReturnStatusBadge status={item.status} />
                      </ItemTitle>
                      <ItemDescription>
                        {item.supplierName} · {item.warehouseName}
                      </ItemDescription>
                      <ItemDescription>
                        {item.lineCount} dòng · {formatInventoryQuantity(item.totalQuantity)} ·{' '}
                        {formatStockIssueDate(item.createdAt)}
                      </ItemDescription>
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
                  <ClickableTableRow key={item.id} onActivate={() => onInspect(item)}>
                    <TableCell className="font-mono">{item.code}</TableCell>
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
                  </ClickableTableRow>
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
    </div>
  )
}
