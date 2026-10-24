import { ChevronDown, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  formatOperationalDateTime,
  formatQuantity,
} from '@/features/inbound-request/utils/inbound-request-format'
import type { TransferDetail } from '../../types/transfer.types'
import { TRANSFER_STATUS_DESCRIPTIONS } from '../../utils/transfer-format'
import { TransferStatusBadge } from '../TransfersPage'
import { formatOperationalOptionalTime } from '@/lib/operational-date-time'

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
      label: 'Ngày dự kiến điều chuyển',
      value: formatOperationalOptionalTime(transfer.plannedTransferDate),
    },
    {
      label: 'Ngày hàng dự kiến về kho nhập',
      value: formatOperationalOptionalTime(transfer.requiredBy),
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
    <section aria-labelledby="transfer-overview-title" className="bg-card shrink-0 border p-3">
      <Collapsible key={transfer.id} defaultOpen>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm font-medium break-words">
            {transfer.sourceWarehouseName} → {transfer.destinationWarehouseName}
          </p>
          <h2 id="transfer-overview-title" className="shrink-0">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="group min-h-11 sm:min-h-7"
              >
                Thông tin phiếu
                <ChevronDown
                  data-icon="inline-end"
                  aria-hidden="true"
                  className="transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                />
              </Button>
            </CollapsibleTrigger>
          </h2>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TransferStatusBadge status={transfer.status} />
          <span className="text-muted-foreground text-xs">
            {TRANSFER_STATUS_DESCRIPTIONS[transfer.status]}
          </span>
        </div>
        {transfer.isLegacyWorkflow ? (
          <Alert className="mt-3">
            <Info aria-hidden="true" />
            <AlertTitle>Phiếu thuộc quy trình cũ</AlertTitle>
            <AlertDescription>
              Phiếu này được tạo trước khi chuyển sang quy trình đợt xuất mới nên chỉ xem được. Liên
              hệ quản trị để xử lý các phiếu còn dở.
            </AlertDescription>
          </Alert>
        ) : null}
        <CollapsibleContent className="mt-3 border-t pt-3">
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
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
