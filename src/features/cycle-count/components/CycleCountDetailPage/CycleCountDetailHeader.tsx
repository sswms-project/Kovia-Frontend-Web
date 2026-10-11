'use client'

import Link from 'next/link'
import { ArrowLeft, Ban, CheckCircle2, FileDown, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/routes/app-routes'
import type { CycleCountDetail } from '../../types/cycle-count.types'
import { CycleCountStatusBadge } from '../CycleCountStatusBadge'
import type { CycleCountDialog } from './types'

interface CycleCountDetailHeaderProps {
  readonly detail: CycleCountDetail
  readonly allowedActions: readonly string[]
  readonly isPending: boolean
  readonly recountSelectedCount: number
  readonly onFinalize: () => Promise<void>
  readonly onExport: () => Promise<void>
  readonly onOpenDialog: (dialog: CycleCountDialog) => void
}

export function CycleCountDetailHeader({
  detail,
  allowedActions,
  isPending,
  recountSelectedCount,
  onFinalize,
  onExport,
  onOpenDialog,
}: CycleCountDetailHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b pb-2">
      <Button asChild variant="ghost" size="icon-sm">
        <Link href={APP_ROUTES.cycleCounts} aria-label="Quay lại">
          <ArrowLeft />
        </Link>
      </Button>
      <h1 className="text-base font-semibold">
        <span className="text-primary mr-2 text-xs font-medium">Phiếu kiểm kê</span>
        <span className="font-mono">{detail.code}</span>
      </h1>
      <span className="text-muted-foreground text-sm">{detail.warehouseName}</span>
      <CycleCountStatusBadge status={detail.status} />
      <div className="ml-auto flex flex-wrap gap-2">
        <Button variant="outline" disabled={isPending} onClick={() => void onExport()}>
          <FileDown />
          Xuất Excel
        </Button>
        {allowedActions.includes('Cancel') ? (
          <Button variant="outline" disabled={isPending} onClick={() => onOpenDialog('cancel')}>
            <Ban />
            Huỷ phiếu
          </Button>
        ) : null}
        {allowedActions.includes('RequestRecount') ? (
          <Button
            variant="outline"
            disabled={recountSelectedCount === 0 || isPending}
            onClick={() => onOpenDialog('recount')}
          >
            <RotateCcw />
            Yêu cầu đếm lại ({recountSelectedCount})
          </Button>
        ) : null}
        {allowedActions.includes('Start') ? (
          <Button disabled={isPending} onClick={() => onOpenDialog('start')}>
            <Play />
            Bắt đầu kiểm kê
          </Button>
        ) : null}
        {allowedActions.includes('Finalize') ? (
          <Button disabled={isPending} onClick={() => void onFinalize()}>
            <CheckCircle2 />
            Hoàn tất kiểm kê
          </Button>
        ) : null}
      </div>
    </header>
  )
}
