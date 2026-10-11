import type { ReactNode } from 'react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

/** Hai dòng trong một ô: nội dung chính và phụ; cắt chữ dài thay vì làm bể cột. */
export function OperationalCellStack({
  primary,
  secondary,
  className,
}: {
  readonly primary: ReactNode
  readonly secondary?: ReactNode
  readonly className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="truncate text-sm">{primary}</div>
      {secondary ? (
        <div className="text-muted-foreground mt-0.5 truncate text-xs">{secondary}</div>
      ) : null}
    </div>
  )
}

/** Số lượng đã/tổng kèm thanh tiến độ; dùng chung để mọi bảng nghiệp vụ đọc giống nhau. */
export function OperationalQuantityProgress({
  done,
  total,
  doneText,
  totalText,
  suffix,
}: {
  readonly done: number
  readonly total: number
  readonly doneText: string
  readonly totalText: string
  readonly suffix?: string
}) {
  const percent = total <= 0 ? 0 : Math.min(100, (done / total) * 100)
  return (
    <div className="flex min-w-28 flex-col gap-1">
      <span className="text-xs tabular-nums">
        <span className="font-medium">{doneText}</span>
        <span className="text-muted-foreground">
          {' '}
          / {totalText}
          {suffix ? ` ${suffix}` : ''}
        </span>
      </span>
      <Progress value={percent} className="h-1.5 transition-all motion-reduce:transition-none" />
    </div>
  )
}
