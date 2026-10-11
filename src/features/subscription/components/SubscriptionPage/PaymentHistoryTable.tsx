'use client'

import { useState } from 'react'
import { Download, ListFilter, Printer, Search } from 'lucide-react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import type {
  InvoiceActionState,
  PaymentHistoryFilterState,
  PaymentResponse,
  SubscriptionPlanResponse,
} from '../../types/subscription.types'
import {
  formatCurrency,
  formatDate,
  formatHistoricalPlanName,
  formatPaymentStatus,
  isCompletedPayment,
} from '../../utils/format-subscription'
import { PaymentHistoryFilters } from './PaymentHistoryFilters'

interface PaymentHistoryTableProps {
  readonly payments: readonly PaymentResponse[]
  readonly plans: readonly SubscriptionPlanResponse[]
  readonly totalCount: number
  readonly pageIndex: number
  readonly pageSize: number
  readonly filters: PaymentHistoryFilterState
  readonly dateRangeError?: string
  readonly isLoading: boolean
  readonly isError: boolean
  readonly invoiceActionState: InvoiceActionState | null
  readonly onFiltersChange: (filters: PaymentHistoryFilterState) => void
  readonly onFiltersSubmit: () => void
  readonly onFiltersReset: () => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRetry: () => void
  readonly onDownloadInvoice: (payment: PaymentResponse) => void
  readonly onPrintInvoice: (payment: PaymentResponse) => void
}

export function PaymentHistoryTable({
  payments,
  plans,
  totalCount,
  pageIndex,
  pageSize,
  filters,
  dateRangeError,
  isLoading,
  isError,
  invoiceActionState,
  onFiltersChange,
  onFiltersSubmit,
  onFiltersReset,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onDownloadInvoice,
  onPrintInvoice,
}: PaymentHistoryTableProps) {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  return (
    <OperationalListPanel aria-label="Lịch sử thanh toán">
      <div className="flex shrink-0 flex-col gap-3 border-b p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Danh sách giao dịch</h2>
          <p className="text-muted-foreground text-sm">
            Tra cứu trạng thái và tải hóa đơn PDF khi cần đối soát.
          </p>
        </div>

        <form
          className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            onFiltersSubmit()
          }}
        >
          <InputGroup className="sm:w-64">
            <InputGroupAddon>
              <InputGroupButton type="submit" size="icon-xs" aria-label="Tìm kiếm">
                <Search aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
            <InputGroupInput
              id="payment-toolbar-search"
              name="paymentToolbarSearch"
              autoComplete="off"
              aria-label="Tìm theo mã hóa đơn"
              placeholder="Tìm mã hóa đơn…"
              value={filters.searchText}
              onChange={(event) => onFiltersChange({ ...filters, searchText: event.target.value })}
            />
          </InputGroup>
          <Button type="button" variant="outline" onClick={() => setIsFilterSheetOpen(true)}>
            <ListFilter data-icon="inline-start" aria-hidden="true" />
            Bộ lọc
          </Button>
        </form>
      </div>

      <div data-slot="operational-list-body" className="min-h-0 min-w-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Alert variant="destructive" className="m-4">
            <AlertTitle>Không thể tải lịch sử thanh toán</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>Vui lòng kiểm tra kết nối hoặc thử lại sau ít phút.</span>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Tải lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : payments.length === 0 ? (
          <Empty className="border-border bg-muted/30 m-4 min-h-48 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Download aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Chưa có thanh toán</EmptyTitle>
              <EmptyDescription>
                Các hóa đơn sẽ xuất hiện sau khi doanh nghiệp nâng cấp hoặc gia hạn gói dịch vụ.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <PaymentHistoryMobileList
              payments={payments}
              invoiceActionState={invoiceActionState}
              onDownloadInvoice={onDownloadInvoice}
              onPrintInvoice={onPrintInvoice}
            />
            <PaymentHistoryDesktopTable
              payments={payments}
              invoiceActionState={invoiceActionState}
              onDownloadInvoice={onDownloadInvoice}
              onPrintInvoice={onPrintInvoice}
            />
          </>
        )}
      </div>

      {!isLoading && !isError && totalCount > 0 ? (
        <OperationalPagination
          page={pageIndex + 1}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}

      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Bộ lọc thanh toán</SheetTitle>
            <SheetDescription>
              Lọc hóa đơn theo gói, trạng thái hoặc khoảng thời gian.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <PaymentHistoryFilters
              plans={plans}
              value={filters}
              dateRangeError={dateRangeError}
              onChange={onFiltersChange}
              onSubmit={onFiltersSubmit}
              onReset={onFiltersReset}
            />
          </div>
        </SheetContent>
      </Sheet>
    </OperationalListPanel>
  )
}

interface PaymentHistoryListProps {
  readonly payments: readonly PaymentResponse[]
  readonly invoiceActionState: InvoiceActionState | null
  readonly onDownloadInvoice: (payment: PaymentResponse) => void
  readonly onPrintInvoice: (payment: PaymentResponse) => void
}

function PaymentHistoryMobileList({
  payments,
  invoiceActionState,
  onDownloadInvoice,
  onPrintInvoice,
}: PaymentHistoryListProps) {
  return (
    <div className="divide-y md:hidden">
      {payments.map((payment) => (
        <article key={payment.id} className="flex flex-col gap-3 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-sm font-medium">{payment.invoiceNumber}</p>
              <p className="text-muted-foreground truncate text-xs">
                {formatHistoricalPlanName(payment.planName)}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium">
              {formatPaymentStatus(payment.status)}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Số tiền</dt>
              <dd className="font-medium tabular-nums">
                {formatCurrency(payment.amount, payment.currency)}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Thanh toán</dt>
              <dd>{payment.paidAt ? formatDate(payment.paidAt) : 'Chưa thanh toán'}</dd>
            </div>
          </dl>
          <div className="flex justify-end gap-2">
            <InvoiceActionButton
              ariaLabel={`Tải hóa đơn ${payment.invoiceNumber}`}
              icon="download"
              disabled={!isCompletedPayment(payment.status)}
              pending={
                invoiceActionState?.paymentId === payment.id &&
                invoiceActionState.kind === 'download'
              }
              tooltip={
                !isCompletedPayment(payment.status)
                  ? 'Chỉ có hóa đơn khi thanh toán hoàn tất'
                  : undefined
              }
              onClick={() => onDownloadInvoice(payment)}
            />
            <InvoiceActionButton
              ariaLabel={`In hóa đơn ${payment.invoiceNumber}`}
              icon="print"
              disabled={!isCompletedPayment(payment.status)}
              pending={
                invoiceActionState?.paymentId === payment.id && invoiceActionState.kind === 'print'
              }
              tooltip={
                !isCompletedPayment(payment.status)
                  ? 'Chỉ có hóa đơn khi thanh toán hoàn tất'
                  : undefined
              }
              onClick={() => onPrintInvoice(payment)}
            />
          </div>
        </article>
      ))}
    </div>
  )
}

function PaymentHistoryDesktopTable({
  payments,
  invoiceActionState,
  onDownloadInvoice,
  onPrintInvoice,
}: PaymentHistoryListProps) {
  return (
    <div className="hidden min-w-0 md:block [&>[data-slot=table-container]]:overflow-visible">
      <Table className="min-w-[820px]">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky top-0 z-10 pl-4">Mã hóa đơn</TableHead>
            <TableHead className="sticky top-0 z-10">Gói dịch vụ</TableHead>
            <TableHead className="sticky top-0 z-10 text-right">Số tiền</TableHead>
            <TableHead className="sticky top-0 z-10">Trạng thái</TableHead>
            <TableHead className="sticky top-0 z-10">Ngày thanh toán</TableHead>
            <TableHead className="sticky top-0 z-10">Ngày tạo</TableHead>
            <TableHead className="sticky top-0 z-10 pr-4 text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="pl-4 font-mono">{payment.invoiceNumber}</TableCell>
              <TableCell>{formatHistoricalPlanName(payment.planName)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCurrency(payment.amount, payment.currency)}
              </TableCell>
              <TableCell>{formatPaymentStatus(payment.status)}</TableCell>
              <TableCell>
                {payment.paidAt ? formatDate(payment.paidAt) : 'Chưa thanh toán'}
              </TableCell>
              <TableCell>{formatDate(payment.createdAt)}</TableCell>
              <TableCell className="pr-4 text-right">
                <div className="flex justify-end gap-2">
                  <InvoiceActionButton
                    ariaLabel={`Tải hóa đơn ${payment.invoiceNumber}`}
                    icon="download"
                    disabled={!isCompletedPayment(payment.status)}
                    pending={
                      invoiceActionState?.paymentId === payment.id &&
                      invoiceActionState.kind === 'download'
                    }
                    tooltip={
                      !isCompletedPayment(payment.status)
                        ? 'Chỉ có hóa đơn khi thanh toán hoàn tất'
                        : undefined
                    }
                    onClick={() => onDownloadInvoice(payment)}
                  />
                  <InvoiceActionButton
                    ariaLabel={`In hóa đơn ${payment.invoiceNumber}`}
                    icon="print"
                    disabled={!isCompletedPayment(payment.status)}
                    pending={
                      invoiceActionState?.paymentId === payment.id &&
                      invoiceActionState.kind === 'print'
                    }
                    tooltip={
                      !isCompletedPayment(payment.status)
                        ? 'Chỉ có hóa đơn khi thanh toán hoàn tất'
                        : undefined
                    }
                    onClick={() => onPrintInvoice(payment)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface InvoiceActionButtonProps {
  readonly ariaLabel: string
  readonly icon: 'download' | 'print'
  readonly disabled: boolean
  readonly pending: boolean
  readonly tooltip?: string
  readonly onClick: () => void
}

function InvoiceActionButton({
  ariaLabel,
  icon,
  disabled,
  pending,
  tooltip,
  onClick,
}: InvoiceActionButtonProps) {
  const Icon = icon === 'download' ? Download : Printer
  const button = (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={ariaLabel}
      disabled={disabled || pending}
      onClick={onClick}
    >
      <Icon
        aria-hidden="true"
        className={pending ? 'animate-spin motion-reduce:animate-none' : undefined}
      />
    </Button>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>{button}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltip ?? ariaLabel}</TooltipContent>
    </Tooltip>
  )
}
