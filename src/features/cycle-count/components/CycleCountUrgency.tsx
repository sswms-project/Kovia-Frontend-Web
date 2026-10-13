import { Flame } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CycleCountStatus, CycleCountSummary } from '../types/cycle-count.types'
import { getDeadlineHint, isUrgentOpen } from '../utils/cycle-count-format'

// Viền trái đỏ đặt trên ô đầu tiên của hàng để hiển thị ổn định trong bảng; nền nhạt đặt trên cả hàng.
export const URGENT_ROW_CLASS = 'bg-destructive/5'
export const URGENT_FIRST_CELL_CLASS = 'shadow-[inset_3px_0_0_0_var(--destructive)]'

const TONE_CLASS = {
  overdue: 'text-destructive font-medium',
  soon: 'text-warning font-medium',
  normal: 'text-muted-foreground',
} as const

interface PriorityProps {
  readonly priority: CycleCountSummary['priority']
  readonly status: CycleCountStatus
}

/** Huy hiệu "Khẩn", chỉ hiện khi phiếu khẩn còn phải làm. */
export function CycleCountPriorityBadge({ priority, status }: PriorityProps) {
  if (!isUrgentOpen(priority, status)) return null
  return (
    <Badge variant="destructive">
      <Flame aria-hidden="true" />
      Khẩn
    </Badge>
  )
}

/** Dòng phụ "Còn 5 giờ" / "Quá hạn 2 giờ" cho phiếu khẩn còn phải làm. */
export function CycleCountDeadlineHint({
  priority,
  status,
  dueAt,
  className,
}: PriorityProps & { readonly dueAt: string | null; readonly className?: string }) {
  if (!isUrgentOpen(priority, status)) return null
  const hint = getDeadlineHint(dueAt)
  if (!hint) return null
  return <span className={cn('text-xs', TONE_CLASS[hint.tone], className)}>{hint.label}</span>
}
