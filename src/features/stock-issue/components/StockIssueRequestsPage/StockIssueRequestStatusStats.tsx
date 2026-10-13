import {
  Ban,
  ClipboardList,
  PackageCheck,
  PackageSearch,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import {
  OperationalCountTile,
  type OperationalTileTone,
} from '@/components/operations/OperationalCountTile'
import type {
  StockIssueRequestStatus,
  StockIssueRequestStatusCount,
} from '../../types/stock-issue.types'

const STATUS_GROUPS: {
  readonly label: string
  readonly description: string
  readonly icon: LucideIcon
  readonly tone: OperationalTileTone
  readonly statuses: readonly StockIssueRequestStatus[]
}[] = [
  {
    label: 'Chờ xử lý',
    description: 'Chưa giao việc lấy hàng',
    icon: ClipboardList,
    tone: 'warning',
    statuses: ['Pending'],
  },
  {
    label: 'Đang lấy hàng',
    description: 'Đã giao việc · Đang lấy',
    icon: PackageSearch,
    tone: 'active',
    statuses: ['ReleasedForPicking', 'Picking'],
  },
  {
    label: 'Chờ xuất',
    description: 'Đã lấy đủ · Đã cho phép xuất',
    icon: PackageCheck,
    tone: 'active',
    statuses: ['Picked', 'AuthorizedForDispatch'],
  },
  {
    label: 'Đã xuất kho',
    description: 'Hàng đã rời kho',
    icon: Truck,
    tone: 'default',
    statuses: ['Dispatched'],
  },
  {
    label: 'Đã hủy',
    description: 'Phiếu bị hủy',
    icon: Ban,
    tone: 'danger',
    statuses: ['Cancelled'],
  },
]

interface StockIssueRequestStatusStatsProps {
  readonly counts: readonly StockIssueRequestStatusCount[]
  readonly isLoading: boolean
  readonly isError: boolean
}

export function StockIssueRequestStatusStats({
  counts,
  isLoading,
  isError,
}: StockIssueRequestStatusStatsProps) {
  const countByStatus = new Map(counts.map(({ status, count }) => [status, count]))

  return (
    <section
      className="bg-border grid shrink-0 grid-cols-2 gap-px border sm:grid-cols-3 lg:grid-cols-5"
      aria-label="Thống kê yêu cầu xuất kho theo trạng thái"
      aria-busy={isLoading}
    >
      {STATUS_GROUPS.map((group, index) => (
        <OperationalCountTile
          key={group.label}
          icon={group.icon}
          label={group.label}
          description={group.description}
          value={group.statuses.reduce((sum, status) => sum + (countByStatus.get(status) ?? 0), 0)}
          tone={group.tone}
          index={index}
          isLoading={isLoading}
          isError={isError}
        />
      ))}
    </section>
  )
}
