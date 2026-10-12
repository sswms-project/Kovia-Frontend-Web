import { Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  formatOperationalDate,
  formatOperationalDateTime,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferDetail } from '../../types/transfer.types'
import { TRANSFER_STATUS_DESCRIPTIONS } from '../../utils/transfer-format'
import { TransferStatusBadge } from '../TransfersPage'

interface OverviewItem {
  readonly label: string
  readonly value: string
}

function sumOf(transfer: TransferDetail, pick: (item: TransferDetail['items'][number]) => number) {
  return transfer.items.reduce((total, item) => total + pick(item), 0)
}

export function TransferOverview({ transfer }: { readonly transfer: TransferDetail }) {
  const requested = sumOf(transfer, (item) => item.quantity)
  const dispatched = sumOf(transfer, (item) => item.dispatchedQuantity)
  const received = sumOf(
    transfer,
    (item) => item.receivedQuantity + item.damagedQuantity + item.missingQuantity
  )
  const stopped = sumOf(transfer, (item) => item.stoppedQuantity)
  const items: OverviewItem[] = [
    { label: 'Kho xuất', value: transfer.sourceWarehouseName },
    { label: 'Kho nhập', value: transfer.destinationWarehouseName },
    { label: 'Người tạo', value: transfer.createdByName ?? '—' },
    { label: 'Bộ phận yêu cầu', value: transfer.requestingDepartment || '—' },
    { label: 'Ngày tạo', value: formatOperationalDateTime(transfer.createdAt) },
    {
      label: 'Hạn cần hàng',
      value: transfer.requiredBy ? formatOperationalDate(transfer.requiredBy) : 'Chưa đặt hạn',
    },
    { label: 'Ghi chú cho kho', value: transfer.note || '—' },
    { label: 'Người yêu cầu', value: transfer.requesterName || '—' },
    { label: 'Lý do điều chuyển', value: transfer.reason || '—' },
  ]
  const progress: OverviewItem[] = [
    { label: 'Yêu cầu', value: formatQuantity(requested) },
    { label: 'Đã xuất', value: formatQuantity(dispatched) },
    { label: 'Đã nhận', value: formatQuantity(received) },
    ...(stopped > 0 ? [{ label: 'Đã dừng', value: formatQuantity(stopped) }] : []),
  ]
  if (transfer.cancellationReason) {
    items.push({ label: 'Lý do hủy', value: transfer.cancellationReason })
  }
  if (transfer.stopReason) {
    items.push({ label: 'Lý do dừng phần còn lại', value: transfer.stopReason })
  }

  return (
    <section className="bg-card border p-4" aria-labelledby="transfer-overview-title">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="transfer-overview-title" className="text-sm font-semibold">
          Thông tin phiếu
        </h2>
        <TransferStatusBadge status={transfer.status} />
        <span className="text-muted-foreground text-xs">
          {TRANSFER_STATUS_DESCRIPTIONS[transfer.status]}
        </span>
      </div>
      {transfer.isLegacyWorkflow ? (
        <Alert className="mb-3">
          <Info aria-hidden="true" />
          <AlertTitle>Phiếu thuộc quy trình cũ</AlertTitle>
          <AlertDescription>
            Phiếu này được tạo trước khi chuyển sang quy trình đợt xuất mới nên chỉ xem được. Liên
            hệ quản trị để xử lý các phiếu còn dở.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 text-sm lg:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] lg:gap-0">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:pr-6 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-muted-foreground text-xs">{item.label}</dt>
              <dd className="break-words">{item.value}</dd>
            </div>
          ))}
        </dl>
        <section
          className="border-t pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6"
          aria-label="Tiến độ (ĐVT chính)"
        >
          <h3 className="text-muted-foreground mb-2 text-xs">Tiến độ (ĐVT chính)</h3>
          <dl className="grid gap-y-2">
            {progress.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground text-xs">{item.label}</dt>
                <dd className="font-medium tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </section>
  )
}
