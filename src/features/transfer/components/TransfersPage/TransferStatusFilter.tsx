import Link from 'next/link'
import { APP_ROUTES } from '@/routes/app-routes'
import type { TransferStatusCounts, TransferWorkflowStatus } from '../../types/transfer.types'
import { transferStatusHref } from '../../utils/transfer-list-state'

const filters = [
  { value: '', label: 'Tất cả', count: 'all' },
  { value: 'Draft', label: 'Bản nháp', count: 'draft' },
  { value: 'InProgress', label: 'Đang thực hiện', count: 'inProgress' },
  { value: 'AwaitingResolution', label: 'Chờ xử lý chênh lệch', count: 'awaitingResolution' },
  { value: 'Completed', label: 'Hoàn tất', count: 'completed' },
  { value: 'Cancelled', label: 'Đã hủy', count: 'cancelled' },
] as const

export function TransferStatusFilter({
  status,
  counts,
  query,
}: {
  readonly status: TransferWorkflowStatus | ''
  readonly counts?: TransferStatusCounts
  readonly query: string
}) {
  return (
    <nav
      data-slot="operational-workspace-navigation"
      aria-label="Trạng thái phiếu điều chuyển"
      className="flex-nowrap sm:flex-wrap"
    >
      {filters.map((filter) => (
        <Link
          key={filter.count}
          href={transferStatusHref(APP_ROUTES.transfers, query, filter.value)}
          aria-current={filter.value === status ? 'page' : undefined}
          className="focus-visible:ring-ring touch-manipulation focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        >
          {filter.label}
          <span
            className={`ml-1.5 text-xs tabular-nums ${filter.count === 'awaitingResolution' && (counts?.awaitingResolution ?? 0) > 0 ? 'text-warning font-semibold' : 'text-muted-foreground'}`}
          >
            {counts ? counts[filter.count] : '—'}
          </span>
        </Link>
      ))}
    </nav>
  )
}
