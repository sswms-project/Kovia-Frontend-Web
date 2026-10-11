'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { ArrowLeft, Check, Eye, RefreshCw, SlidersHorizontal, X } from 'lucide-react'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { InventoryWorkspaceNavigation } from '@/features/inventory/components/InventoryWorkspaceNavigation'
import { APP_ROUTES } from '@/routes/app-routes'
import type {
  StockAdjustment,
  StockAdjustmentStatus,
  StockAdjustmentVoucher,
} from '../types/cycle-count.types'
import { STOCK_ADJUSTMENT_STATUSES } from '../types/cycle-count.types'
import {
  CYCLE_COUNT_QUALITY_LABELS,
  STOCK_ADJUSTMENT_STATUS_LABELS,
  formatCount,
  formatCycleCountDate,
} from '../utils/cycle-count-format'
import { formatStockLocation } from '../utils/cycle-count-scope'
import { StockAdjustmentStatusBadge } from './CycleCountStatusBadge'
import type { RejectStockAdjustmentFormValues } from '../schemas/cycle-count.schema'

interface DirectoryProps {
  readonly permissions: readonly string[]
  readonly items: readonly StockAdjustmentVoucher[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly warehouseId: string
  readonly status: '' | StockAdjustmentStatus
  readonly warehouses: readonly { value: string; label: string }[]
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly onWarehouseChange: (value: string) => void
  readonly onStatusChange: (value: '' | StockAdjustmentStatus) => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRetry: () => void
}

export function StockAdjustmentDirectory(props: DirectoryProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 items-start gap-3 border-b pb-4">
        <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center">
          <SlidersHorizontal />
        </span>
        <div>
          <p className="text-primary text-xs font-medium">Kiểm soát tồn kho</p>
          <h1 className="text-xl font-semibold">Điều chỉnh tồn kho</h1>
        </div>
      </header>
      <InventoryWorkspaceNavigation currentView="adjustments" permissions={props.permissions} />
      <OperationalListPanel aria-label="Danh sách điều chỉnh tồn kho">
        <div className="flex flex-wrap items-end gap-3 border-b p-3">
          <label className="grid gap-1 text-xs font-medium">
            Kho
            <NativeSelect
              className="h-9 min-w-52"
              value={props.warehouseId}
              onChange={(e) => props.onWarehouseChange(e.target.value)}
            >
              <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
              {props.warehouses.map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Trạng thái
            <NativeSelect
              className="h-9 min-w-44"
              value={props.status}
              onChange={(e) => props.onStatusChange(parseAdjustmentStatus(e.target.value))}
            >
              <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
              {Object.values(STOCK_ADJUSTMENT_STATUSES).map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {STOCK_ADJUSTMENT_STATUS_LABELS[value]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <Button
            variant="outline"
            size="icon"
            onClick={props.onRetry}
            disabled={props.isFetching}
            aria-label="Làm mới"
          >
            <RefreshCw
              className={props.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}
            />
          </Button>
        </div>
        {props.isLoading ? (
          <OperationalLoadingState rows={8} />
        ) : props.isError ? (
          <OperationalErrorState title="Không thể tải điều chỉnh tồn kho" onRetry={props.onRetry} />
        ) : !props.items.length ? (
          <OperationalEmptyState
            title="Chưa có phiếu điều chỉnh"
            description="Phiếu được tạo từ các dòng lệch của phiếu kiểm kê đã hoàn tất."
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Phiếu điều chỉnh</TableHead>
                  <TableHead>Phiếu kiểm kê</TableHead>
                  <TableHead>Kho</TableHead>
                  <TableHead className="text-right">Số dòng</TableHead>
                  <TableHead className="text-right">Tăng</TableHead>
                  <TableHead className="text-right">Giảm</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.items.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell>
                      <Link
                        href={APP_ROUTES.stockAdjustmentVoucherDetail(voucher.id)}
                        className="font-mono font-medium underline-offset-2 hover:underline"
                      >
                        {voucher.code}
                      </Link>
                      <p className="text-muted-foreground max-w-xs truncate text-xs">
                        {voucher.reason}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={APP_ROUTES.cycleCountDetail(voucher.cycleCountId)}
                        className="font-mono text-xs underline-offset-2 hover:underline"
                      >
                        {voucher.cycleCountCode}
                      </Link>
                    </TableCell>
                    <TableCell>{voucher.warehouseName}</TableCell>
                    <TableCell className="text-right font-mono">{voucher.lineCount}</TableCell>
                    <TableCell className="text-primary text-right font-mono font-semibold">
                      {voucher.totalIncrease > 0 ? `+${formatCount(voucher.totalIncrease)}` : '—'}
                    </TableCell>
                    <TableCell className="text-destructive text-right font-mono font-semibold">
                      {voucher.totalDecrease < 0 ? formatCount(voucher.totalDecrease) : '—'}
                    </TableCell>
                    <TableCell>
                      <p>{voucher.createdByName}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatCycleCountDate(voucher.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StockAdjustmentStatusBadge status={voucher.status} />
                    </TableCell>
                    <TableCell>
                      <Button asChild size="icon" variant="ghost">
                        <Link
                          href={APP_ROUTES.stockAdjustmentVoucherDetail(voucher.id)}
                          aria-label="Xem chi tiết"
                        >
                          <Eye />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <OperationalPagination
          page={props.page}
          pageSize={props.pageSize}
          totalCount={props.totalCount}
          isPending={props.isFetching}
          onPageChange={props.onPageChange}
          onPageSizeChange={props.onPageSizeChange}
        />
      </OperationalListPanel>
    </div>
  )
}

function parseAdjustmentStatus(value: string): '' | StockAdjustmentStatus {
  return Object.values(STOCK_ADJUSTMENT_STATUSES).find((status) => status === value) ?? ''
}

interface DetailProps {
  readonly detail: StockAdjustment
  readonly allowedActions: readonly string[]
  readonly selfApprovalRequired: boolean
  readonly isPending: boolean
  readonly rejectForm: UseFormReturn<RejectStockAdjustmentFormValues>
  readonly onApprove: (selfApprovalAcknowledged: boolean) => Promise<boolean>
  readonly onReject: (reason: string) => Promise<boolean>
}

export function StockAdjustmentDetailView({
  detail,
  allowedActions,
  selfApprovalRequired,
  isPending,
  rejectForm,
  onApprove,
  onReject,
}: DetailProps) {
  const [rejecting, setRejecting] = useState(false)
  const [approving, setApproving] = useState(false)
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href={APP_ROUTES.stockAdjustments} aria-label="Quay lại">
              <ArrowLeft />
            </Link>
          </Button>
          <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center">
            <SlidersHorizontal />
          </span>
          <div>
            <p className="text-primary text-xs font-medium">Đề nghị điều chỉnh</p>
            <h1 className="text-xl font-semibold">{detail.productName}</h1>
            <p className="text-muted-foreground font-mono text-xs">
              {detail.productSku} · {formatStockLocation(detail)}
            </p>
          </div>
        </div>
        <StockAdjustmentStatusBadge status={detail.status} />
      </header>
      <section className="bg-border grid gap-px border sm:grid-cols-3">
        <Metric label="Tồn hệ thống" value={detail.systemQuantity} />
        <Metric label="Số kiểm đếm" value={detail.countedQuantity} />
        <Metric label="Chênh lệch hệ thống tính" value={detail.quantityChange} signed />
      </section>
      <section className="bg-card grid gap-4 border p-4 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold">Căn cứ điều chỉnh</h2>
          <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Mã VTHH</dt>
            <dd className="font-mono">{detail.productSku}</dd>
            <dt className="text-muted-foreground">Tên VTHH</dt>
            <dd className="font-medium">{detail.productName}</dd>
            <dt className="text-muted-foreground">ĐVT</dt>
            <dd>{detail.unitName ?? '—'}</dd>
            <dt className="text-muted-foreground">Kho</dt>
            <dd>{detail.warehouseName}</dd>
            <dt className="text-muted-foreground">Vị trí</dt>
            <dd className="font-mono">{formatStockLocation(detail)}</dd>
            <dt className="text-muted-foreground">Lý do</dt>
            <dd>{detail.reason}</dd>
            <dt className="text-muted-foreground">Lô hàng</dt>
            <dd className="font-mono">{detail.lotNumber ?? 'Theo số lượng'}</dd>
            <dt className="text-muted-foreground">Chất lượng</dt>
            <dd>{CYCLE_COUNT_QUALITY_LABELS[detail.qualityStatus] ?? detail.qualityStatus}</dd>
            <dt className="text-muted-foreground">Người tạo</dt>
            <dd>{detail.createdByName}</dd>
            <dt className="text-muted-foreground">Thời điểm</dt>
            <dd>{formatCycleCountDate(detail.createdAt)}</dd>
            {detail.voucherId ? (
              <>
                <dt className="text-muted-foreground">Phiếu điều chỉnh</dt>
                <dd>
                  <Link
                    className="text-primary hover:underline"
                    href={APP_ROUTES.stockAdjustmentVoucherDetail(detail.voucherId)}
                  >
                    {detail.voucherCode ?? 'Xem phiếu'}
                  </Link>
                </dd>
              </>
            ) : null}
            {detail.cycleCountId ? (
              <>
                <dt className="text-muted-foreground">Phiếu kiểm kê</dt>
                <dd>
                  <Link
                    className="text-primary hover:underline"
                    href={APP_ROUTES.cycleCountDetail(detail.cycleCountId)}
                  >
                    {detail.cycleCountCode ?? 'Xem phiếu nguồn'}
                  </Link>
                </dd>
              </>
            ) : null}
          </dl>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Kết quả phê duyệt</h2>
          <p className="text-muted-foreground mt-3 text-sm">
            {detail.status === 'Pending'
              ? detail.voucherId
                ? 'Dòng thuộc phiếu điều chỉnh, duyệt hoặc từ chối ở cấp phiếu.'
                : 'Đang chờ chủ doanh nghiệp (hoặc người được uỷ quyền duyệt) xem xét.'
              : detail.status === 'Approved'
                ? `Đã duyệt bởi ${detail.approvedByName || 'người có thẩm quyền'}${
                    detail.approvedAt ? ` lúc ${formatCycleCountDate(detail.approvedAt)}` : ''
                  }. Tồn kho đã được cập nhật.`
                : `Đã từ chối bởi ${detail.rejectedByName || 'người có thẩm quyền'}${
                    detail.rejectedAt ? ` lúc ${formatCycleCountDate(detail.rejectedAt)}` : ''
                  }. Lý do: ${detail.rejectionReason || '—'}`}
          </p>
        </div>
      </section>
      {allowedActions.length ? (
        <footer className="flex justify-end gap-2 border-t pt-4">
          {allowedActions.includes('Reject') ? (
            <Button variant="outline" disabled={isPending} onClick={() => setRejecting(true)}>
              <X />
              Từ chối
            </Button>
          ) : null}
          {allowedActions.includes('Approve') ? (
            <Button disabled={isPending} onClick={() => setApproving(true)}>
              <Check />
              Duyệt và cập nhật tồn
            </Button>
          ) : null}
        </footer>
      ) : null}
      <AlertDialog open={approving} onOpenChange={setApproving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duyệt và cập nhật tồn kho?</AlertDialogTitle>
            <AlertDialogDescription>
              {selfApprovalRequired
                ? 'Bạn là người tạo phiếu này. Khi xác nhận, hệ thống ghi nhận hành động tự phê duyệt vào nhật ký kiểm toán.'
                : 'Tồn kho sẽ được ghi nhận theo số kiểm đếm. Hành động này không thể hoàn tác.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault()
                void onApprove(selfApprovalRequired).then((succeeded) => {
                  if (succeeded) setApproving(false)
                })
              }}
            >
              Xác nhận duyệt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={rejecting}
        onOpenChange={(open) => {
          setRejecting(open)
          if (!open) rejectForm.reset({ reason: '' })
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đề nghị điều chỉnh</DialogTitle>
            <DialogDescription>Lý do sẽ được lưu cùng lịch sử phê duyệt.</DialogDescription>
          </DialogHeader>
          <Textarea
            maxLength={500}
            placeholder="Nhập lý do bắt buộc"
            {...rejectForm.register('reason')}
          />
          <FieldError
            errors={
              rejectForm.formState.errors.reason ? [rejectForm.formState.errors.reason] : undefined
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                void rejectForm.handleSubmit(async (values) => {
                  if (await onReject(values.reason.trim())) {
                    rejectForm.reset({ reason: '' })
                    setRejecting(false)
                  }
                })()
              }
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Metric({
  label,
  value,
  signed = false,
}: {
  readonly label: string
  readonly value: number | null
  readonly signed?: boolean
}) {
  return (
    <div className="bg-card p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold">
        {signed && value !== null && value > 0 ? '+' : ''}
        {formatCount(value)}
      </p>
    </div>
  )
}
