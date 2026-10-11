'use client'

import {
  Ban,
  Eye,
  ListFilter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Undo2,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { StockIssueWorkspaceNavigation } from '@/components/operations/StockIssueWorkspaceNavigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Input } from '@/components/ui/input'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { P } from '@/config/permissionCodes'
import { APP_ROUTES } from '@/routes/app-routes'
import { StockIssueImportDialog } from './StockIssueImportDialog'
import type {
  StockIssueRequestStatus,
  StockIssueRequestSummary,
} from '../../types/stock-issue.types'
import {
  canCancelStockIssueRequest,
  canRecordStockPicking,
  formatStockIssueDate,
  formatStockIssueQuantity,
  STOCK_ISSUE_REQUEST_STATUS_LABELS,
} from '../../utils/stock-issue-format'
import { Switch } from '@/components/ui/switch'
import { StockIssueRequestStatusBadge } from './StockIssueRequestStatusBadge'

interface WarehouseOption {
  readonly id: string
  readonly name: string
}

interface StockIssueRequestDirectoryProps {
  readonly items: readonly StockIssueRequestSummary[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly status: StockIssueRequestStatus | ''
  readonly warehouseId: string
  readonly stockRecipientId: string
  readonly dateFrom: string
  readonly dateTo: string
  readonly assignedToMe: boolean
  readonly stockRecipientOptions: readonly { id: string; name: string }[]
  readonly warehouseOptions: readonly WarehouseOption[]
  readonly permissions: readonly string[]
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: StockIssueRequestStatus | '') => void
  readonly onWarehouseChange: (value: string) => void
  readonly onStockRecipientChange: (value: string) => void
  readonly onDateFromChange: (value: string) => void
  readonly onDateToChange: (value: string) => void
  readonly onAssignedToMeChange: (value: boolean) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRetry: () => void
  readonly onInspect: (order: StockIssueRequestSummary) => void
  readonly onReleaseForPicking: (order: StockIssueRequestSummary) => void
  readonly onCancel: (order: StockIssueRequestSummary) => void
  readonly onReportPickIssue: (order: StockIssueRequestSummary) => void
  readonly onRecordStockPicking: (order: StockIssueRequestSummary) => void
  readonly onAuthorizeDispatch: (order: StockIssueRequestSummary) => void
  readonly onConfirmDispatch: (order: StockIssueRequestSummary) => void
  readonly onCreateGoodsReturnRequest: (order: StockIssueRequestSummary) => void
}

export function StockIssueRequestDirectory({
  items,
  totalCount,
  page,
  pageSize,
  searchText,
  status,
  warehouseId,
  stockRecipientId,
  dateFrom,
  dateTo,
  stockRecipientOptions,
  warehouseOptions,
  permissions,
  isLoading,
  isFetching,
  isError,
  onSearchChange,
  onStatusChange,
  onWarehouseChange,
  onStockRecipientChange,
  onDateFromChange,
  onDateToChange,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onInspect,
  onReleaseForPicking,
  onCancel,
  onReportPickIssue,
  onRecordStockPicking,
  onAuthorizeDispatch,
  onConfirmDispatch,
  onCreateGoodsReturnRequest,
  assignedToMe,
  onAssignedToMeChange,
}: StockIssueRequestDirectoryProps) {
  const [importOpen, setImportOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const selectedOrder = items.find((order) => order.id === selectedId) ?? items[0] ?? null

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'F3') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  const activeFilterCount =
    (status ? 1 : 0) +
    (warehouseId ? 1 : 0) +
    (stockRecipientId ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (assignedToMe ? 1 : 0)

  const canPick = permissions.includes(P.STOCK_ISSUE_REQUESTS_PICK)
  const canDispatch = permissions.includes(P.STOCK_ISSUE_REQUESTS_DISPATCH)
  const canAuthorizeDispatch = permissions.includes(P.STOCK_ISSUE_REQUESTS_AUTHORIZE_DISPATCH)
  const canAssignPicker = permissions.includes(P.STOCK_ISSUE_REQUESTS_ASSIGN_PICKER)
  const canCancel = permissions.includes(P.STOCK_ISSUE_REQUESTS_CANCEL)
  const canGoodsReturnRequest = permissions.includes(P.STOCK_ISSUE_REQUESTS_RETURN)

  const renderRowActions = (order: StockIssueRequestSummary) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Thao tác với đơn ${order.stockIssueRequestCode}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onInspect(order)}>
          <Eye className="size-4" aria-hidden="true" />
          Xem chi tiết
        </DropdownMenuItem>
        {canAssignPicker && order.status === 'Pending' ? (
          <DropdownMenuItem onSelect={() => onReleaseForPicking(order)}>
            <Send className="size-4" aria-hidden="true" />
            Giao việc lấy hàng
          </DropdownMenuItem>
        ) : null}
        {canPick && canRecordStockPicking(order.status) ? (
          <DropdownMenuItem onSelect={() => onRecordStockPicking(order)}>
            <Undo2 className="size-4" aria-hidden="true" />
            Quét &amp; lấy hàng
          </DropdownMenuItem>
        ) : null}
        {canPick && canRecordStockPicking(order.status) ? (
          <DropdownMenuItem onSelect={() => onReportPickIssue(order)}>
            <Undo2 className="size-4" aria-hidden="true" />
            Báo hàng lỗi
          </DropdownMenuItem>
        ) : null}
        {canAuthorizeDispatch && order.status === 'Picked' ? (
          <DropdownMenuItem onSelect={() => onAuthorizeDispatch(order)}>
            <Send className="size-4" aria-hidden="true" />
            Cho phép xuất kho
          </DropdownMenuItem>
        ) : null}
        {canDispatch && order.status === 'AuthorizedForDispatch' ? (
          <DropdownMenuItem onSelect={() => onConfirmDispatch(order)}>
            <Send className="size-4" aria-hidden="true" />
            Xác nhận hàng rời kho
          </DropdownMenuItem>
        ) : null}
        {canGoodsReturnRequest && order.status === 'Dispatched' ? (
          <DropdownMenuItem onSelect={() => onCreateGoodsReturnRequest(order)}>
            <Undo2 className="size-4" aria-hidden="true" />
            Tạo yêu cầu trả hàng
          </DropdownMenuItem>
        ) : null}
        {canCancel && canCancelStockIssueRequest(order.status) ? (
          <DropdownMenuItem variant="destructive" onSelect={() => onCancel(order)}>
            <Ban className="size-4" aria-hidden="true" />
            Huỷ phiếu
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="flex min-w-0 shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="sr-only">Yêu cầu xuất kho</h1>
        <div className="min-w-0 flex-1">
          <StockIssueWorkspaceNavigation
            currentView="stockIssueRequests"
            permissions={permissions}
          />
        </div>
        {permissions.includes(P.STOCK_ISSUE_REQUESTS_CREATE) ? (
          <div className="flex w-full gap-2 sm:w-auto">
            <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload aria-hidden="true" />
              Nhập từ Excel
            </Button>
            <Button asChild className="flex-1 sm:flex-none">
              <Link href={APP_ROUTES.stockIssueRequestCreate as Route}>
                <Plus aria-hidden="true" />
                Tạo yêu cầu xuất kho
              </Link>
            </Button>
            <StockIssueImportDialog open={importOpen} onOpenChange={setImportOpen} />
          </div>
        ) : null}
      </header>

      <OperationalListPanel aria-labelledby="stock-issue-request-directory-title">
        <div className="flex shrink-0 flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="stock-issue-request-directory-title" className="text-sm font-semibold">
              Danh sách yêu cầu xuất kho
            </h2>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <InputGroup className="min-w-0 flex-1 sm:w-72">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                ref={searchInputRef}
                aria-label="Tìm yêu cầu xuất kho"
                placeholder="Tìm mã yêu cầu, đơn vị nhận hàng, kho… (F3)"
                value={searchText}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </InputGroup>
            <Button type="button" variant="outline" onClick={() => setIsFilterOpen(true)}>
              <ListFilter aria-hidden="true" />
              Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
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
          <OperationalErrorState title="Không thể tải yêu cầu xuất kho" onRetry={onRetry} />
        ) : items.length === 0 ? (
          <OperationalEmptyState
            title="Chưa có yêu cầu xuất kho phù hợp"
            description="Thử đổi từ khóa, bộ lọc hoặc tạo yêu cầu xuất kho đầu tiên."
          />
        ) : (
          <>
            <StockIssueRequestMobileList
              items={items}
              renderRowActions={renderRowActions}
              onInspect={onInspect}
            />
            <StockIssueRequestDesktopTable
              items={items}
              renderRowActions={renderRowActions}
              onInspect={onInspect}
              selectedId={selectedOrder?.id ?? null}
              onSelect={(order) => setSelectedId(order.id)}
            />
            {selectedOrder ? <StockIssueLineDetailPanel order={selectedOrder} /> : null}
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

      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Bộ lọc yêu cầu xuất kho</SheetTitle>
            <SheetDescription>Thu hẹp danh sách theo trạng thái và kho xuất.</SheetDescription>
          </SheetHeader>
          <FieldGroup className="flex-1 p-4">
            <Field orientation="horizontal">
              <Switch
                id="stock-issue-request-filter-assigned-to-me"
                checked={assignedToMe}
                onCheckedChange={onAssignedToMeChange}
              />
              <FieldLabel htmlFor="stock-issue-request-filter-assigned-to-me">
                Chỉ phiếu được giao cho tôi
              </FieldLabel>
            </Field>
            <Field>
              <FieldLabel htmlFor="stock-issue-request-filter-status">Trạng thái</FieldLabel>
              <NativeSelect
                id="stock-issue-request-filter-status"
                className="w-full"
                value={status}
                onChange={(event) =>
                  onStatusChange(event.target.value as StockIssueRequestStatus | '')
                }
              >
                <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
                {Object.entries(STOCK_ISSUE_REQUEST_STATUS_LABELS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="stock-issue-request-filter-warehouse">Kho xuất</FieldLabel>
              <NativeSelect
                id="stock-issue-request-filter-warehouse"
                className="w-full"
                value={warehouseId}
                onChange={(event) => onWarehouseChange(event.target.value)}
              >
                <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
                {warehouseOptions.map((warehouse) => (
                  <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="stock-issue-request-filter-stockRecipient">
                Đơn vị nhận hàng
              </FieldLabel>
              <NativeSelect
                id="stock-issue-request-filter-stockRecipient"
                value={stockRecipientId}
                onChange={(event) => onStockRecipientChange(event.target.value)}
              >
                <NativeSelectOption value="">Tất cả đơn vị nhận hàng</NativeSelectOption>
                {stockRecipientOptions.map((stockRecipient) => (
                  <NativeSelectOption key={stockRecipient.id} value={stockRecipient.id}>
                    {stockRecipient.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="outbound-date-from">Từ ngày</FieldLabel>
                <Input
                  id="outbound-date-from"
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => onDateFromChange(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="outbound-date-to">Đến ngày</FieldLabel>
                <Input
                  id="outbound-date-to"
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => onDateToChange(event.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
          <SheetFooter>
            <Button type="button" onClick={() => setIsFilterOpen(false)}>
              Xem kết quả
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onStatusChange('')
                onWarehouseChange('')
                onStockRecipientChange('')
                onDateFromChange('')
                onDateToChange('')
              }}
            >
              Đặt lại
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function totalOrderedQuantity(order: StockIssueRequestSummary) {
  return order.items.reduce((total, item) => total + item.quantity, 0)
}

function totalPickedQuantity(order: StockIssueRequestSummary) {
  return order.items.reduce((total, item) => total + item.pickedQuantity, 0)
}

function StockIssueRequestMobileList({
  items,
  renderRowActions,
  onInspect,
}: {
  readonly items: readonly StockIssueRequestSummary[]
  readonly onInspect: (order: StockIssueRequestSummary) => void
  readonly renderRowActions: (order: StockIssueRequestSummary) => ReactNode
}) {
  return (
    <ItemGroup className="gap-0 md:hidden">
      {items.map((item) => (
        <Item
          key={item.id}
          className="hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
          onClick={() => onInspect(item)}
        >
          <ItemContent className="min-w-0">
            <ItemTitle className="flex flex-wrap items-center gap-2">
              <span className="max-w-full min-w-0 truncate font-mono font-semibold" translate="no">
                {item.stockIssueRequestCode}
              </span>
              <StockIssueRequestStatusBadge status={item.status} />
            </ItemTitle>
            <ItemDescription>
              {item.recipientName} · {item.warehouseName}
              {item.assignedStaffName ? ` · Lấy hàng: ${item.assignedStaffName}` : ''}
            </ItemDescription>
            <ItemDescription>
              {item.items.length} dòng · {formatStockIssueQuantity(totalPickedQuantity(item))}/
              {formatStockIssueQuantity(totalOrderedQuantity(item))} đơn vị ·{' '}
              {formatStockIssueDate(item.createdAt)}
            </ItemDescription>
          </ItemContent>
          <div onClick={(event) => event.stopPropagation()}>{renderRowActions(item)}</div>
        </Item>
      ))}
    </ItemGroup>
  )
}

function StockIssueRequestDesktopTable({
  items,
  renderRowActions,
  onInspect,
  selectedId,
  onSelect,
}: {
  readonly items: readonly StockIssueRequestSummary[]
  readonly onInspect: (order: StockIssueRequestSummary) => void
  readonly renderRowActions: (order: StockIssueRequestSummary) => ReactNode
  readonly selectedId: string | null
  readonly onSelect: (order: StockIssueRequestSummary) => void
}) {
  return (
    <div className="hidden min-h-0 flex-1 overflow-auto md:block">
      <Table className="min-w-[880px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky top-0 z-10 w-[16%]">Mã đơn</TableHead>
            <TableHead className="sticky top-0 z-10 w-[15%]">Đơn vị nhận hàng</TableHead>
            <TableHead className="sticky top-0 z-10 w-[10%]">Kho xuất</TableHead>
            <TableHead className="sticky top-0 z-10 w-[18%]">Trạng thái</TableHead>
            <TableHead className="sticky top-0 z-10 w-[11%]">Người lấy hàng</TableHead>
            <TableHead className="sticky top-0 z-10 w-[6%] text-right">Số dòng</TableHead>
            <TableHead className="sticky top-0 z-10 w-[8%] text-right">Đã lấy/Đặt</TableHead>
            <TableHead className="sticky top-0 z-10 w-[12%]">Ngày tạo</TableHead>
            <TableHead className="sticky top-0 z-10 w-12">
              <span className="sr-only">Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer"
              data-state={item.id === selectedId ? 'selected' : undefined}
              onClick={() => onSelect(item)}
              onDoubleClick={() => onInspect(item)}
            >
              <TableCell className="min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block truncate font-mono font-semibold" translate="no">
                      {item.stockIssueRequestCode}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="font-mono" translate="no">
                    {item.stockIssueRequestCode}
                  </TooltipContent>
                </Tooltip>
                <span className="text-muted-foreground block truncate text-xs">
                  {item.referenceCode ? `Tham chiếu: ${item.referenceCode} · ` : ''}
                  {item.purpose ?? 'Không có diễn giải'}
                </span>
              </TableCell>
              <TableCell className="min-w-0">
                <span className="block truncate">{item.recipientName}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  Nhận: {item.recipientName}
                </span>
              </TableCell>
              <TableCell className="truncate">{item.warehouseName}</TableCell>
              <TableCell className="min-w-0">
                <StockIssueRequestStatusBadge status={item.status} />
                <StockIssueMiniProgress
                  status={item.status}
                  hasAssignedPicker={Boolean(item.assignedStaffId)}
                />
              </TableCell>
              <TableCell className="truncate">
                {item.assignedStaffName ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.items.length}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatStockIssueQuantity(totalPickedQuantity(item))}/
                {formatStockIssueQuantity(totalOrderedQuantity(item))}
              </TableCell>
              <TableCell className="truncate">{formatStockIssueDate(item.createdAt)}</TableCell>
              <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                {renderRowActions(item)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const PROGRESS_STEPS: readonly StockIssueRequestStatus[] = [
  'Pending',
  'ReleasedForPicking',
  'Picking',
  'Picked',
  'AuthorizedForDispatch',
  'Dispatched',
]

function StockIssueMiniProgress({
  status,
  hasAssignedPicker,
}: {
  readonly status: StockIssueRequestStatus
  readonly hasAssignedPicker: boolean
}) {
  const effective = status === 'Pending' && hasAssignedPicker ? 'ReleasedForPicking' : status
  const current = PROGRESS_STEPS.indexOf(effective)
  if (status === 'Cancelled') return null
  return (
    <div className="mt-1 flex gap-0.5" aria-hidden="true">
      {PROGRESS_STEPS.map((step, index) => (
        <span
          key={step}
          className={`h-1 flex-1 rounded-full ${index <= current ? 'bg-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  )
}

function StockIssueLineDetailPanel({ order }: { readonly order: StockIssueRequestSummary }) {
  return (
    <section
      aria-label={`Chi tiết hàng hóa của ${order.stockIssueRequestCode}`}
      className="hidden max-h-[38%] min-h-32 shrink-0 flex-col border-t md:flex"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <h3 className="text-sm font-semibold">
          Chi tiết hàng hóa ·{' '}
          <span className="font-mono" translate="no">
            {order.stockIssueRequestCode}
          </span>
        </h3>
        <span className="text-muted-foreground text-xs">
          Kho {order.warehouseName} · Nhận: {order.recipientName}
          {order.recipientPhone ? ` · ${order.recipientPhone}` : ''}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 w-10">#</TableHead>
              <TableHead className="sticky top-0 z-10">Mã hàng</TableHead>
              <TableHead className="sticky top-0 z-10">Tên hàng</TableHead>
              <TableHead className="sticky top-0 z-10">Vị trí lấy</TableHead>
              <TableHead className="sticky top-0 z-10">Số lô</TableHead>
              <TableHead className="sticky top-0 z-10 text-right">SL xuất</TableHead>
              <TableHead className="sticky top-0 z-10 text-right">Đã lấy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((line, index) => {
              const slots = [...new Set(line.pickDetails.map((d) => d.slotCode))].join(', ')
              const lots = [
                ...new Set(line.pickDetails.map((d) => d.lotNumber).filter(Boolean)),
              ].join(', ')
              return (
                <TableRow key={line.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-mono" translate="no">
                    {line.sku}
                  </TableCell>
                  <TableCell>{line.productName}</TableCell>
                  <TableCell>{slots || '—'}</TableCell>
                  <TableCell>{lots || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatStockIssueQuantity(line.quantity)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatStockIssueQuantity(line.pickedQuantity)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
