import { ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { MyWarehouseTask } from '../../types/warehouse-task.types'
import { getTaskRoute, taskTypeIcon, taskTypeLabel } from '../WarehouseTaskDirectory'

const MAX_VISIBLE = 6

const EXECUTION_LABEL: Partial<Record<MyWarehouseTask['executionStatus'], string>> = {
  Queued: 'Chờ làm',
  InProgress: 'Đang làm',
  Paused: 'Tạm dừng',
}

const OPEN_STATUSES: readonly MyWarehouseTask['executionStatus'][] = [
  'Queued',
  'InProgress',
  'Paused',
]

interface MyWorkQueueProps {
  readonly tasks: readonly MyWarehouseTask[]
  readonly isLoading: boolean
}

/** Việc đang được giao cho người dùng, gom mọi loại (nhập, xuất, điều chuyển, kiểm kê...) để thấy ngay khi vào trang. */
export function MyWorkQueue({ tasks, isLoading }: MyWorkQueueProps) {
  const open = tasks.filter((task) => OPEN_STATUSES.includes(task.executionStatus))
  const visible = open.slice(0, MAX_VISIBLE)

  return (
    <section aria-labelledby="my-work-queue-title" className="mb-4 shrink-0 space-y-3">
      <div className="flex items-center gap-2">
        <h2 id="my-work-queue-title" className="text-base font-semibold">
          Việc cần làm
        </h2>
        {open.length > 0 ? <Badge variant="secondary">{open.length}</Badge> : null}
      </div>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : open.length === 0 ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <ClipboardList aria-hidden="true" className="size-4" />
          Chưa có việc nào được giao cho bạn.
        </p>
      ) : (
        <>
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((task) => (
              <li key={`${task.taskType}-${task.id}`}>
                <MyWorkQueueItem task={task} />
              </li>
            ))}
          </ul>
          {open.length > visible.length ? (
            <p className="text-muted-foreground text-xs">
              Còn {open.length - visible.length} việc khác trong danh sách bên dưới.
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}

function MyWorkQueueItem({ task }: { readonly task: MyWarehouseTask }) {
  const Icon = taskTypeIcon[task.taskType] ?? ClipboardList
  const isOverdue = task.deadlineStatus === 'Overdue'
  return (
    <Link
      href={getTaskRoute(task)}
      className={cn(
        'bg-card hover:bg-accent flex items-start gap-3 rounded-lg border p-3 transition-colors',
        isOverdue && 'border-destructive/50'
      )}
    >
      <Icon aria-hidden="true" className="text-muted-foreground mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{taskTypeLabel[task.taskType] ?? task.taskType}</p>
        <p className="truncate font-mono text-sm">{task.referenceCode}</p>
        <p className="text-muted-foreground text-xs">{task.workSummary}</p>
        <p className="text-muted-foreground truncate text-xs">{task.warehouseName}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant="secondary">
          {EXECUTION_LABEL[task.executionStatus] ?? task.executionStatus}
        </Badge>
        {task.priority === 'Urgent' ? <Badge variant="destructive">Gấp</Badge> : null}
        {isOverdue ? <Badge variant="destructive">Quá hạn</Badge> : null}
        {task.deadlineStatus === 'DueSoon' ? <Badge variant="outline">Sắp đến hạn</Badge> : null}
      </div>
    </Link>
  )
}
