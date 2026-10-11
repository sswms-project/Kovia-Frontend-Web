import { Activity, ClipboardList, PauseCircle, UserRoundX } from 'lucide-react'
import type { ReceivingTaskStats } from '../../types/inbound.types'
import {
  OperationalCountTile,
  type OperationalTileTone,
} from '@/components/operations/OperationalCountTile'

const CARDS = [
  { label: 'Đơn chờ nhận', key: 'totalOpenCount', icon: ClipboardList, tone: 'default' },
  { label: 'Chưa giao việc', key: 'unassignedCount', icon: UserRoundX, tone: 'warning' },
  { label: 'Đang nhận', key: 'inProgressCount', icon: Activity, tone: 'active' },
  { label: 'Tạm dừng', key: 'pausedCount', icon: PauseCircle, tone: 'default' },
] as const satisfies readonly {
  label: string
  key: keyof ReceivingTaskStats
  icon: typeof ClipboardList
  tone: OperationalTileTone
}[]

interface ReceivingTaskStatsCardsProps {
  readonly taskStats: ReceivingTaskStats | null
  readonly isLoading: boolean
  readonly isError: boolean
}

export function ReceivingTaskStatsCards({
  taskStats,
  isLoading,
  isError,
}: ReceivingTaskStatsCardsProps) {
  return (
    <section
      className="bg-border grid shrink-0 grid-cols-2 gap-px border sm:grid-cols-4"
      aria-label="Thống kê công việc nhận hàng"
      aria-busy={isLoading}
    >
      {CARDS.map(({ label, key, icon, tone }, index) => (
        <OperationalCountTile
          key={key}
          index={index}
          icon={icon}
          tone={tone}
          label={label}
          value={taskStats?.[key] ?? 0}
          isLoading={isLoading}
          isError={isError}
        />
      ))}
    </section>
  )
}
