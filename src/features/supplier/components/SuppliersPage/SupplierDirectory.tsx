'use client'

import { ClickableTableRow } from '@/components/operations/ClickableTableRow'
import {
  CircleOff,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Truck,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { parseActiveStatusFilter } from '@/components/operations/status-filter'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Button } from '@/components/ui/button'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { APP_ROUTES } from '@/routes/app-routes'
import type { Supplier, SupplierStatus } from '../../types/supplier.types'
import { SUPPLIER_STATUS_OPTIONS, formatSupplierText } from '../../utils/supplier-format'
import { SupplierStatusBadge } from './SupplierStatusBadge'

interface SupplierDirectoryProps {
  readonly items: readonly Supplier[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly status: SupplierStatus | ''
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly canCreate: boolean
  readonly canUpdate: boolean
  readonly canDeactivate: boolean
  readonly canReactivate: boolean
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: SupplierStatus | '') => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onCreate: () => void
  readonly onEdit: (supplier: Supplier) => void
  readonly onDeactivate: (supplier: Supplier) => void
  readonly onReactivate: (supplier: Supplier) => void
  readonly onRetry: () => void
}

export function SupplierDirectory({
  items,
  totalCount,
  page,
  pageSize,
  searchText,
  status,
  isLoading,
  isFetching,
  isError,
  canCreate,
  canUpdate,
  canDeactivate,
  canReactivate,
  onSearchChange,
  onStatusChange,
  onPageChange,
  onPageSizeChange,
  onCreate,
  onEdit,
  onDeactivate,
  onReactivate,
  onRetry,
}: SupplierDirectoryProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center">
            <Truck aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-primary text-xs font-medium">Nguồn nhập kho</p>
            <h1 className="mt-0.5 text-xl font-semibold">Nhà cung cấp</h1>
          </div>
        </div>
        {canCreate ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={APP_ROUTES.supplierImport}>
                <Upload aria-hidden="true" />
                Nhập từ tệp
              </Link>
            </Button>
            <Button type="button" className="w-full sm:w-auto" onClick={onCreate}>
              <Plus aria-hidden="true" />
              Thêm nhà cung cấp
            </Button>
          </div>
        ) : null}
      </header>

      <OperationalListPanel className="@container" aria-labelledby="supplier-directory-title">
        <div className="flex shrink-0 flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="supplier-directory-title" className="text-sm font-semibold">
              Danh sách nhà cung cấp
            </h2>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <InputGroup className="min-w-0 flex-1 sm:w-72">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Tìm nhà cung cấp"
                placeholder="Tìm theo mã, tên, số điện thoại hoặc email"
                value={searchText}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </InputGroup>
            <NativeSelect
              aria-label="Lọc nhà cung cấp theo trạng thái"
              className="w-44"
              value={status}
              onChange={(event) => onStatusChange(parseActiveStatusFilter(event.target.value))}
            >
              <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
              {SUPPLIER_STATUS_OPTIONS.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Tải lại danh sách"
                  onClick={onRetry}
                >
                  <RefreshCw
                    className={isFetching ? 'animate-spin' : undefined}
                    aria-hidden="true"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tải lại</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {isLoading ? (
          <OperationalLoadingState />
        ) : isError ? (
          <OperationalErrorState title="Không thể tải danh sách nhà cung cấp" onRetry={onRetry} />
        ) : items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có nhà cung cấp phù hợp"
            description="Thử đổi từ khóa tìm kiếm, bộ lọc trạng thái hoặc thêm nhà cung cấp mới."
          />
        ) : (
          <>
            <SupplierMobileList items={items} />
            <SupplierDesktopTable
              items={items}
              canUpdate={canUpdate}
              canDeactivate={canDeactivate}
              canReactivate={canReactivate}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
            />
            <OperationalPagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              isPending={isFetching}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </>
        )}
      </OperationalListPanel>
    </div>
  )
}

function SupplierMobileList({ items }: { readonly items: readonly Supplier[] }) {
  return (
    <div data-slot="operational-list-body" className="@min-[1040px]:hidden">
      <ItemGroup className="gap-0">
        {items.map((item) => (
          <Item key={item.id} className="border-b last:border-b-0">
            <ItemContent className="min-w-0">
              <ItemTitle className="flex flex-wrap items-center gap-2">
                <Link
                  href={APP_ROUTES.supplierDetail(item.id) as Route}
                  className="max-w-full min-w-0 truncate font-semibold hover:underline"
                >
                  {item.supplierName}
                </Link>
                <SupplierStatusBadge status={item.status} />
              </ItemTitle>
              <ItemDescription className="font-mono">{item.supplierCode}</ItemDescription>
              <ItemDescription>
                {item.phone} · {formatSupplierText(item.email)}
              </ItemDescription>
              <ItemDescription>{formatSupplierText(item.address)}</ItemDescription>
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>
    </div>
  )
}

interface SupplierDesktopTableProps {
  readonly items: readonly Supplier[]
  readonly canUpdate: boolean
  readonly canDeactivate: boolean
  readonly canReactivate: boolean
  readonly onEdit: (supplier: Supplier) => void
  readonly onDeactivate: (supplier: Supplier) => void
  readonly onReactivate: (supplier: Supplier) => void
}

function SupplierDesktopTable({
  items,
  canUpdate,
  canDeactivate,
  canReactivate,
  onEdit,
  onDeactivate,
  onReactivate,
}: SupplierDesktopTableProps) {
  return (
    <div data-slot="operational-list-body" className="hidden @min-[1040px]:block">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky top-0 z-10 w-32">Mã NCC</TableHead>
            <TableHead className="sticky top-0 z-10 w-60">Nhà cung cấp</TableHead>
            <TableHead className="sticky top-0 z-10 w-32">Số điện thoại</TableHead>
            <TableHead className="sticky top-0 z-10 w-48">Email</TableHead>
            <TableHead className="sticky top-0 z-10 w-60">Địa chỉ</TableHead>
            <TableHead className="sticky top-0 z-10 w-28">Trạng thái</TableHead>
            <TableHead className="sticky top-0 z-10 w-28">
              <span className="sr-only">Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <ClickableTableRow key={item.id} href={APP_ROUTES.supplierDetail(item.id) as Route}>
              <TableCell className="truncate font-mono">{item.supplierCode}</TableCell>
              <TableCell className="min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={APP_ROUTES.supplierDetail(item.id) as Route}
                      className="block truncate font-semibold hover:underline"
                    >
                      {item.supplierName}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>{item.supplierName}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="truncate tabular-nums">{item.phone}</TableCell>
              <TableCell className="truncate">{formatSupplierText(item.email)}</TableCell>
              <TableCell className="truncate">{formatSupplierText(item.address)}</TableCell>
              <TableCell>
                <SupplierStatusBadge status={item.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button asChild variant="ghost" size="icon-sm">
                        <Link
                          href={APP_ROUTES.supplierDetail(item.id) as Route}
                          aria-label={`Xem chi tiết ${item.supplierName}`}
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
                          aria-label={`Cập nhật ${item.supplierName}`}
                          onClick={() => onEdit(item)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Cập nhật</TooltipContent>
                    </Tooltip>
                  ) : null}
                  {canDeactivate && item.status === 'Active' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Ngừng hợp tác với ${item.supplierName}`}
                          onClick={() => onDeactivate(item)}
                        >
                          <CircleOff aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ngừng hợp tác</TooltipContent>
                    </Tooltip>
                  ) : null}
                  {canReactivate && item.status === 'Inactive' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Khôi phục hợp tác với ${item.supplierName}`}
                          onClick={() => onReactivate(item)}
                        >
                          <RotateCcw aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Khôi phục hợp tác</TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              </TableCell>
            </ClickableTableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
