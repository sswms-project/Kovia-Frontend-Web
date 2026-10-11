import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MyWarehouseTask } from '../../types/warehouse-task.types'

const label: Record<MyWarehouseTask['deadlineStatus'], string> = {
  NoDeadline: 'Chưa đặt hạn',
  OnTrack: 'Đúng tiến độ',
  DueSoon: 'Sắp đến hạn',
  Overdue: 'Quá hạn',
  CompletedOnTime: 'Xong đúng hạn',
  CompletedLate: 'Xong trễ hạn',
  Cancelled: 'Đã hủy',
}

export function TaskDeadlineBadge({ task }: { readonly task: MyWarehouseTask }) {
  const urgent = task.deadlineStatus === 'Overdue' || task.deadlineStatus === 'CompletedLate'
  const warning = task.deadlineStatus === 'DueSoon'
  const completed = task.deadlineStatus === 'CompletedOnTime'
  const Icon = urgent ? AlertTriangle : completed ? CheckCircle2 : Clock3
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge
        variant={urgent ? 'destructive' : warning ? 'default' : 'outline'}
        className={cn(
          'gap-1 transition-transform motion-safe:hover:-translate-y-0.5',
          warning && 'relative'
        )}
      >
        {warning ? (
          <span className="bg-primary-foreground size-1.5 rounded-full motion-safe:animate-pulse" />
        ) : (
          <Icon className="size-3" aria-hidden="true" />
        )}
        {label[task.deadlineStatus]}
      </Badge>
      {/* "Chưa đặt hạn" đã nói đủ; chỉ thêm dòng thứ hai khi thật sự có hạn. */}
      {task.dueAt ? (
        <span className="text-muted-foreground text-xs tabular-nums">
          {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
            new Date(task.dueAt)
          )}
        </span>
      ) : null}
    </span>
  )
}
