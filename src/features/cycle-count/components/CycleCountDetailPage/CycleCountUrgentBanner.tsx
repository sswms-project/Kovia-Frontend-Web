'use client'

import { Flame } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { CycleCountDetail } from '../../types/cycle-count.types'
import { formatCycleCountDate, getDeadlineHint, isUrgentOpen } from '../../utils/cycle-count-format'

interface CycleCountUrgentBannerProps {
  readonly detail: CycleCountDetail
  // Người đang xem được phép bắt đầu phiếu (nhân viên phụ trách): nhắc bắt đầu ngay.
  readonly canStart: boolean
}

/** Dải cảnh báo đỏ cho phiếu khẩn còn phải làm: nêu hạn xử lý và thời gian còn lại. */
export function CycleCountUrgentBanner({ detail, canStart }: CycleCountUrgentBannerProps) {
  if (!isUrgentOpen(detail.priority, detail.status)) return null
  const hint = getDeadlineHint(detail.dueAt)
  return (
    <Alert variant="destructive" className="flex shrink-0 items-center gap-3" role="status">
      <Flame aria-hidden="true" />
      <AlertDescription className="flex-1">
        <span className="font-semibold">Phiếu khẩn</span>
        {detail.dueAt ? `: cần hoàn thành trước ${formatCycleCountDate(detail.dueAt)}` : ''}
        {hint ? (
          <span className={cn('ml-2 font-semibold', hint.tone === 'overdue' && 'underline')}>
            ({hint.label})
          </span>
        ) : null}
        {canStart ? '. Hãy bắt đầu kiểm kê ngay.' : '.'}
      </AlertDescription>
    </Alert>
  )
}
