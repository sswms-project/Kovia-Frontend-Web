import {
  CheckCircle2,
  FilePen,
  Hourglass,
  PackageOpen,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import {
  OperationalCountTile,
  type OperationalTileTone,
} from '@/components/operations/OperationalCountTile'
import {
  INBOUND_REQUEST_STATUS,
  type InboundRequestStatus,
  type InboundRequestStatusCount,
} from '../../types/inbound-request.types'

const STATUS_GROUPS: {
  readonly label: string
  readonly description: string
  readonly icon: LucideIcon
  readonly tone: OperationalTileTone
  readonly statuses: readonly InboundRequestStatus[]
}[] = [
  {
    label: 'Bản nháp',
    description: 'Đơn chưa gửi duyệt',
    icon: FilePen,
    tone: 'default',
    statuses: [INBOUND_REQUEST_STATUS.Draft],
  },
  {
    label: 'Chờ duyệt',
    description: 'Đang chờ phê duyệt',
    icon: Hourglass,
    tone: 'warning',
    statuses: [INBOUND_REQUEST_STATUS.PendingApproval],
  },
  {
    label: 'Đang xử lý',
    description: 'Đã duyệt · Đã gửi · Đã xác nhận · Nhận một phần',
    icon: PackageOpen,
    tone: 'active',
    statuses: [
      INBOUND_REQUEST_STATUS.Approved,
      INBOUND_REQUEST_STATUS.Sent,
      INBOUND_REQUEST_STATUS.Confirmed,
      INBOUND_REQUEST_STATUS.PartiallyReceived,
    ],
  },
  {
    label: 'Đã nhận đủ',
    description: 'Hoàn tất nhận hàng',
    icon: CheckCircle2,
    tone: 'default',
    statuses: [INBOUND_REQUEST_STATUS.Received],
  },
  {
    label: 'Từ chối / hủy',
    description: 'Bị từ chối · Đã hủy',
    icon: XCircle,
    tone: 'danger',
    statuses: [INBOUND_REQUEST_STATUS.Rejected, INBOUND_REQUEST_STATUS.Cancelled],
  },
]

interface InboundRequestStatusStatsProps {
  readonly counts: readonly InboundRequestStatusCount[]
  readonly isLoading: boolean
  readonly isError: boolean
}

export function InboundRequestStatusStats({
  counts,
  isLoading,
  isError,
}: InboundRequestStatusStatsProps) {
  const countByStatus = new Map(counts.map(({ status, count }) => [status, count]))

  return (
    <section
      className="bg-border grid shrink-0 grid-cols-2 gap-px border sm:grid-cols-3 lg:grid-cols-5"
      aria-label="Thống kê yêu cầu nhập kho theo trạng thái"
      aria-busy={isLoading}
    >
      {STATUS_GROUPS.map((group, index) => {
        const total = group.statuses.reduce(
          (sum, status) => sum + (countByStatus.get(status) ?? 0),
          0
        )
        return (
          <OperationalCountTile
            key={group.label}
            icon={group.icon}
            label={group.label}
            description={group.description}
            value={total}
            tone={group.tone}
            index={index}
            isLoading={isLoading}
            isError={isError}
          />
        )
      })}
    </section>
  )
}
