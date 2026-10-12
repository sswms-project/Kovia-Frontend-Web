'use client'

import { ClipboardList, RotateCcw } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'

interface PutawayPlanNoticeProps {
  readonly items: readonly { id: string; label: string; locations: string }[]
  readonly updatedLabel?: string
  readonly description?: string
  readonly disabled: boolean
  readonly onApplyPlan: () => void
}

export function PutawayPlanNotice({
  items: plannedItems,
  disabled,
  onApplyPlan,
  updatedLabel,
  description = 'Hệ thống đã điền sẵn theo kế hoạch. Cất khác vị trí hoặc số lượng vẫn được, nhưng cần nhập lý do (có thể kèm ảnh).',
}: PutawayPlanNoticeProps) {
  const headingId = useId()
  if (plannedItems.length === 0) return null

  return (
    <section
      className="bg-card animate-in fade-in-0 slide-in-from-top-2 animation-duration-250 border motion-reduce:animate-none"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center">
            <ClipboardList aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="text-sm font-semibold">
              Vị trí cất do quản lý cấu hình
            </h2>
            <p className="text-muted-foreground text-xs">
              {description}
              {updatedLabel ? ` Cập nhật lúc ${updatedLabel}.` : ''}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onApplyPlan}>
          <RotateCcw aria-hidden="true" data-icon="inline-start" />
          Làm theo kế hoạch
        </Button>
      </div>
      <ul className="divide-y">
        {plannedItems.map((item) => (
          <li key={item.id} className="flex flex-col gap-1 px-4 py-2 text-xs sm:flex-row sm:gap-4">
            <span className="min-w-0 font-medium break-words sm:w-1/3">{item.label}</span>
            <span className="text-muted-foreground min-w-0 break-words tabular-nums">
              {item.locations}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
