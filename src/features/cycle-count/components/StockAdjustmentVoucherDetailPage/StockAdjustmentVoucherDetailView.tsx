'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { ArrowLeft, Check, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'
import type { RejectStockAdjustmentFormValues } from '../../schemas/cycle-count.schema'
import type { StockAdjustmentVoucher } from '../../types/cycle-count.types'
import { formatCount, formatCycleCountDate } from '../../utils/cycle-count-format'
import { StockAdjustmentStatusBadge } from '../CycleCountStatusBadge'
import { StockAdjustmentVoucherActionDialogs } from './StockAdjustmentVoucherActionDialogs'
import { StockAdjustmentVoucherLinesTable } from './StockAdjustmentVoucherLinesTable'
import type { StockAdjustmentVoucherDialog } from './types'

interface StockAdjustmentVoucherDetailViewProps {
  readonly voucher: StockAdjustmentVoucher
  readonly allowedActions: readonly string[]
  readonly selfApprovalRequired: boolean
  readonly isPending: boolean
  readonly rejectForm: UseFormReturn<RejectStockAdjustmentFormValues>
  readonly onApprove: (
    excludedLineIds: string[],
    selfApprovalAcknowledged: boolean
  ) => Promise<boolean>
  readonly onReject: (reason: string) => Promise<boolean>
}

export function StockAdjustmentVoucherDetailView({
  voucher,
  allowedActions,
  selfApprovalRequired,
  isPending,
  rejectForm,
  onApprove,
  onReject,
}: StockAdjustmentVoucherDetailViewProps) {
  const [dialog, setDialog] = useState<StockAdjustmentVoucherDialog | null>(null)
  const [excludedLineIds, setExcludedLineIds] = useState<string[]>([])
  const canApprove = allowedActions.includes('Approve')
  const canReject = allowedActions.includes('Reject')
  const pendingLines = voucher.lines.filter((line) => line.status === 'Pending')
  const approvingCount = pendingLines.length - excludedLineIds.length

  function toggleExclude(lineId: string, excluded: boolean) {
    setExcludedLineIds((current) =>
      excluded ? [...current, lineId] : current.filter((id) => id !== lineId)
    )
  }

  const approvalResult =
    voucher.status === 'Pending'
      ? 'Đang chờ chủ doanh nghiệp (hoặc người được uỷ quyền duyệt) xem xét.'
      : voucher.status === 'Approved'
        ? `Đã duyệt bởi ${voucher.approvedByName || 'người có thẩm quyền'}${
            voucher.approvedAt ? ` lúc ${formatCycleCountDate(voucher.approvedAt)}` : ''
          }. Tồn kho đã được cập nhật cho các dòng giữ lại.`
        : `Đã từ chối bởi ${voucher.rejectedByName || 'người có thẩm quyền'}${
            voucher.rejectedAt ? ` lúc ${formatCycleCountDate(voucher.rejectedAt)}` : ''
          }. Lý do: ${voucher.rejectionReason || '—'}`

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b pb-4">
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
            <p className="text-primary text-xs font-medium">Phiếu điều chỉnh tồn</p>
            <h1 className="font-mono text-xl font-semibold">{voucher.code}</h1>
            <p className="text-muted-foreground text-xs">
              {voucher.warehouseName} · Từ phiếu kiểm kê{' '}
              <Link
                className="font-mono underline-offset-2 hover:underline"
                href={APP_ROUTES.cycleCountDetail(voucher.cycleCountId)}
              >
                {voucher.cycleCountCode}
              </Link>
            </p>
          </div>
        </div>
        <StockAdjustmentStatusBadge status={voucher.status} />
      </header>

      <section className="bg-border grid shrink-0 gap-px border sm:grid-cols-3">
        <Metric label="Số dòng" value={voucher.lineCount} />
        <Metric label="Tổng tăng" value={voucher.totalIncrease} signed />
        <Metric label="Tổng giảm" value={voucher.totalDecrease} signed />
      </section>

      <section className="bg-card grid shrink-0 gap-4 border p-4 md:grid-cols-2">
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted-foreground">Lý do</dt>
          <dd>{voucher.reason}</dd>
          <dt className="text-muted-foreground">Người tạo</dt>
          <dd>{voucher.createdByName}</dd>
          <dt className="text-muted-foreground">Thời điểm</dt>
          <dd>{formatCycleCountDate(voucher.createdAt)}</dd>
        </dl>
        <div>
          <h2 className="text-sm font-semibold">Kết quả phê duyệt</h2>
          <p className="text-muted-foreground mt-2 text-sm">{approvalResult}</p>
          {canApprove ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Bỏ tick cột &quot;Giữ&quot; để loại dòng không đồng ý; dòng bị loại sẽ chuyển sang Đã
              từ chối.
            </p>
          ) : null}
        </div>
      </section>

      <StockAdjustmentVoucherLinesTable
        lines={voucher.lines}
        canExclude={canApprove}
        excludedLineIds={excludedLineIds}
        onToggleExclude={toggleExclude}
      />

      {canApprove || canReject ? (
        <footer className="flex shrink-0 justify-end gap-2 border-t pt-4">
          {canReject ? (
            <Button variant="outline" disabled={isPending} onClick={() => setDialog('reject')}>
              <X />
              Từ chối phiếu
            </Button>
          ) : null}
          {canApprove ? (
            <Button
              disabled={isPending || approvingCount <= 0}
              onClick={() => setDialog('approve')}
            >
              <Check />
              Duyệt {approvingCount} dòng và cập nhật tồn
            </Button>
          ) : null}
        </footer>
      ) : null}

      <StockAdjustmentVoucherActionDialogs
        dialog={dialog}
        approvingCount={approvingCount}
        excludedCount={excludedLineIds.length}
        selfApprovalRequired={selfApprovalRequired}
        isPending={isPending}
        rejectForm={rejectForm}
        onClose={() => setDialog(null)}
        onApprove={async () => {
          if (await onApprove(excludedLineIds, selfApprovalRequired)) {
            setExcludedLineIds([])
            setDialog(null)
          }
        }}
        onReject={onReject}
      />
    </div>
  )
}

function Metric({
  label,
  value,
  signed = false,
}: {
  readonly label: string
  readonly value: number
  readonly signed?: boolean
}) {
  return (
    <div className="bg-card p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold">
        {signed && value > 0 ? '+' : ''}
        {formatCount(value)}
      </p>
    </div>
  )
}
