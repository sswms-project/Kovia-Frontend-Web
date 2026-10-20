'use client'

import Link from 'next/link'
import { ArrowLeft, Ban, CheckCircle2, FileDown, ListChecks, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'
import type { CycleCountDetail } from '../../types/cycle-count.types'
import { formatCycleCountDate } from '../../utils/cycle-count-format'
import { CycleCountStatusBadge } from '../CycleCountStatusBadge'
import { CycleCountPriorityBadge } from '../CycleCountUrgency'
import type { CycleCountDetailMode, CycleCountDialog } from './types'

interface CycleCountDetailHeaderProps {
  readonly detail: CycleCountDetail
  readonly mode: CycleCountDetailMode
  readonly allowedActions: readonly string[]
  readonly isPending: boolean
  readonly recountSelectedCount: number
  readonly isBeforeSchedule: boolean
  readonly pendingDamageCount: number
  readonly onFinalize: () => Promise<void>
  readonly onExport: () => Promise<void>
  readonly onOpenDialog: (dialog: CycleCountDialog) => void
}

export function CycleCountDetailHeader({
  detail,
  mode,
  allowedActions,
  isPending,
  recountSelectedCount,
  isBeforeSchedule,
  pendingDamageCount,
  onFinalize,
  onExport,
  onOpenDialog,
}: CycleCountDetailHeaderProps) {
  const isLines = mode === 'lines'
  const countedCount = detail.items.filter((item) => item.countedQuantity !== null).length
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b pb-2">
      <Button asChild variant="ghost" size="icon-sm">
        <Link
          href={isLines ? APP_ROUTES.cycleCountOverview(detail.id) : APP_ROUTES.cycleCounts}
          aria-label={isLines ? 'Quay lại phiếu kiểm kê' : 'Quay lại'}
        >
          <ArrowLeft />
        </Link>
      </Button>
      <h1 className="text-base font-semibold">
        <span className="text-primary mr-2 text-xs font-medium">
          {isLines ? 'Chi tiết kiểm đếm' : 'Phiếu kiểm kê'}
        </span>
        <span className="font-mono">{detail.code}</span>
      </h1>
      <span className="text-muted-foreground text-sm">{detail.warehouseName}</span>
      <CycleCountStatusBadge status={detail.status} />
      <CycleCountPriorityBadge priority={detail.priority} status={detail.status} />
      {isLines ? (
        <span className="text-muted-foreground text-sm tabular-nums">
          Đã đếm {countedCount}/{detail.items.length} dòng
          {detail.isBlindCount ? ' · Kiểm kê mù' : ''}
        </span>
      ) : null}
      <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto max-sm:[&>button]:h-11 max-sm:[&>button]:flex-1">
        {isLines ? (
          <Button asChild variant="outline">
            <Link href={APP_ROUTES.cycleCountOverview(detail.id)}>Xem thông tin phiếu</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={APP_ROUTES.cycleCountLines(detail.id)}>
              <ListChecks />
              Chi tiết kiểm đếm
            </Link>
          </Button>
        )}
        <Button variant="outline" disabled={isPending} onClick={() => void onExport()}>
          <FileDown />
          Xuất Excel
        </Button>
        {!isLines && allowedActions.includes('Cancel') ? (
          <Button variant="outline" disabled={isPending} onClick={() => onOpenDialog('cancel')}>
            <Ban />
            Huỷ phiếu
          </Button>
        ) : null}
        {isLines && allowedActions.includes('RequestRecount') ? (
          <Button
            variant="outline"
            disabled={recountSelectedCount === 0 || isPending}
            onClick={() => onOpenDialog('recount')}
          >
            <RotateCcw />
            Yêu cầu đếm lại ({recountSelectedCount})
          </Button>
        ) : null}
        {isBeforeSchedule ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              Mở từ {formatCycleCountDate(detail.scheduledDate)}
            </span>
            <Button disabled>
              <Play />
              Bắt đầu kiểm kê
            </Button>
          </div>
        ) : null}
        {allowedActions.includes('Start') ? (
          <Button disabled={isPending} onClick={() => onOpenDialog('start')}>
            <Play />
            Bắt đầu kiểm kê
          </Button>
        ) : null}
        {!isLines && allowedActions.includes('Finalize') ? (
          <Button
            disabled={isPending || pendingDamageCount > 0}
            title={
              pendingDamageCount > 0
                ? `Còn ${pendingDamageCount} dòng hàng hỏng chưa xác nhận`
                : undefined
            }
            onClick={() => void onFinalize()}
          >
            <CheckCircle2 />
            Hoàn tất kiểm kê
          </Button>
        ) : null}
      </div>
    </header>
  )
}
