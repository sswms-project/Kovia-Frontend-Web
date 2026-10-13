import { Activity, CalendarClock, ClipboardCheck, TriangleAlert } from 'lucide-react'
import {
  OperationalCountTile,
  type OperationalTileTone,
} from '@/components/operations/OperationalCountTile'
import { CYCLE_COUNT_STATUSES, type CycleCountStatus } from '../types/cycle-count.types'

// Thứ tự ô theo mức ưu tiên xử lý, trùng thứ tự sắp xếp mặc định của danh sách.
const TILES: readonly {
  readonly label: string
  readonly statuses: readonly CycleCountStatus[]
  readonly icon: typeof Activity
  readonly tone: OperationalTileTone
}[] = [
  {
    label: 'Chưa bắt đầu',
    statuses: [CYCLE_COUNT_STATUSES.scheduled],
    icon: CalendarClock,
    tone: 'default',
  },
  {
    label: 'Đang thực hiện',
    statuses: [CYCLE_COUNT_STATUSES.counting, CYCLE_COUNT_STATUSES.recount],
    icon: Activity,
    tone: 'active',
  },
  {
    label: 'Chờ duyệt',
    statuses: [CYCLE_COUNT_STATUSES.submitted],
    icon: ClipboardCheck,
    tone: 'warning',
  },
]

interface CycleCountStatsTilesProps {
  readonly statusCounts: Readonly<Record<string, number>>
  readonly needsAdjustmentCount: number
  readonly isLoading: boolean
  readonly isError: boolean
}

export function CycleCountStatsTiles({
  statusCounts,
  needsAdjustmentCount,
  isLoading,
  isError,
}: CycleCountStatsTilesProps) {
  return (
    <section
      className="bg-border hidden shrink-0 grid-cols-2 gap-px border sm:grid sm:grid-cols-4"
      aria-label="Thống kê phiếu kiểm kê"
      aria-busy={isLoading}
    >
      {TILES.map(({ label, statuses, icon, tone }, index) => (
        <OperationalCountTile
          key={label}
          index={index}
          icon={icon}
          tone={tone}
          label={label}
          value={statuses.reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0)}
          isLoading={isLoading}
          isError={isError}
        />
      ))}
      <OperationalCountTile
        index={TILES.length}
        icon={TriangleAlert}
        tone="danger"
        label="Cần xử lý lệch"
        description="Phiếu hoàn tất còn dòng lệch chưa điều chỉnh"
        value={needsAdjustmentCount}
        isLoading={isLoading}
        isError={isError}
      />
    </section>
  )
}
