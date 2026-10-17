import { CheckCircle2, FilePen, TriangleAlert, Truck, XCircle } from 'lucide-react'
import { OperationalCountTile } from '@/components/operations/OperationalCountTile'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { TransferStatusCounts, TransferWorkflowStatus } from '../../types/transfer.types'

const statusGroups = [
  {
    value: 'Draft',
    label: 'Bản nháp',
    count: 'draft',
    description: 'Chưa bắt đầu điều chuyển',
    icon: FilePen,
    tone: 'default',
  },
  {
    value: 'InProgress',
    label: 'Đang thực hiện',
    count: 'inProgress',
    description: 'Đang lấy · Vận chuyển · Cất hàng',
    icon: Truck,
    tone: 'active',
  },
  {
    value: 'AwaitingResolution',
    label: 'Chờ xử lý chênh lệch',
    count: 'awaitingResolution',
    description: 'Cần đối chiếu và xử lý',
    icon: TriangleAlert,
    tone: 'warning',
  },
  {
    value: 'Completed',
    label: 'Hoàn tất',
    count: 'completed',
    description: 'Đã hoàn thành điều chuyển',
    icon: CheckCircle2,
    tone: 'default',
  },
  {
    value: 'Cancelled',
    label: 'Đã hủy',
    count: 'cancelled',
    description: 'Phiếu điều chuyển bị hủy',
    icon: XCircle,
    tone: 'danger',
  },
] as const

export function TransferStatusFilter({
  status,
  onChange,
}: {
  readonly status: TransferWorkflowStatus | ''
  readonly onChange: (value: TransferWorkflowStatus | '') => void
}) {
  return (
    <NativeSelect
      aria-label="Lọc trạng thái điều chuyển"
      className="w-full sm:w-48"
      value={status}
      onChange={(event) =>
        onChange(statusGroups.find((group) => group.value === event.target.value)?.value ?? '')
      }
    >
      <NativeSelectOption value="">Tất cả (trừ đã hủy)</NativeSelectOption>
      {statusGroups.map((group) => (
        <NativeSelectOption key={group.value} value={group.value}>
          {group.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

export function TransferStatusStats({
  counts,
  isLoading = false,
  isError = false,
}: {
  readonly counts?: TransferStatusCounts
  readonly isLoading?: boolean
  readonly isError?: boolean
}) {
  return (
    <section
      aria-label="Thống kê phiếu điều chuyển theo trạng thái"
      aria-busy={isLoading}
      className="bg-border grid shrink-0 grid-cols-2 gap-px border sm:grid-cols-3 lg:grid-cols-5"
    >
      {statusGroups.map((group, index) => (
        <OperationalCountTile
          key={group.count}
          icon={group.icon}
          label={group.label}
          description={group.description}
          value={counts?.[group.count] ?? 0}
          tone={group.tone}
          index={index}
          isLoading={isLoading}
          isError={isError || (!counts && !isLoading)}
        />
      ))}
    </section>
  )
}
