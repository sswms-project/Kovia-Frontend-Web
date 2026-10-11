import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CycleCountStatus, StockAdjustmentStatus } from '../types/cycle-count.types'
import {
  CYCLE_COUNT_STATUS_LABELS,
  STOCK_ADJUSTMENT_STATUS_LABELS,
} from '../utils/cycle-count-format'

const statusStyles: Record<CycleCountStatus | StockAdjustmentStatus, string> = {
  Scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  Counting: 'border-amber-200 bg-amber-50 text-amber-700',
  Submitted: 'border-violet-200 bg-violet-50 text-violet-700',
  Recount: 'border-orange-200 bg-orange-50 text-orange-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Cancelled: 'border-zinc-200 bg-zinc-100 text-zinc-600',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Rejected: 'border-red-200 bg-red-50 text-red-700',
}

export function CycleCountStatusBadge({ status }: { readonly status: CycleCountStatus }) {
  return (
    <Badge className={cn('border', statusStyles[status])}>
      {CYCLE_COUNT_STATUS_LABELS[status]}
    </Badge>
  )
}

export function StockAdjustmentStatusBadge({ status }: { readonly status: StockAdjustmentStatus }) {
  return (
    <Badge className={cn('border', statusStyles[status])}>
      {STOCK_ADJUSTMENT_STATUS_LABELS[status]}
    </Badge>
  )
}
