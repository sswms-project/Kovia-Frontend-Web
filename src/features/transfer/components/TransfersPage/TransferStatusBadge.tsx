import {
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  FilePen,
  MessageSquareWarning,
  TriangleAlert,
  Truck,
  PackageX,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type {
  TransferDispatchProgress,
  TransferReceiveProgress,
  TransferShipmentStatus,
  TransferStatus,
} from '../../types/transfer.types'
import {
  DISPATCH_PROGRESS_LABELS,
  RECEIVE_PROGRESS_LABELS,
  SHIPMENT_STATUS_LABELS,
  TRANSFER_STATUS_LABELS,
} from '../../utils/transfer-format'

const STATUS_PRESENTATION: Record<
  TransferStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CircleDot }
> = {
  Draft: { variant: 'outline', icon: FilePen },
  InProgress: { variant: 'secondary', icon: Truck },
  AwaitingResolution: { variant: 'outline', icon: TriangleAlert },
  Completed: { variant: 'default', icon: CircleCheck },
  Cancelled: { variant: 'destructive', icon: CircleX },
  PendingSourceApproval: { variant: 'outline', icon: CircleDashed },
  Approved: { variant: 'outline', icon: CircleDashed },
  InTransit: { variant: 'outline', icon: CircleDashed },
  ReceivedWithVariance: { variant: 'outline', icon: CircleDashed },
  Rejected: { variant: 'destructive', icon: CircleX },
}

/** Trạng thái luôn có chữ và biểu tượng, không chỉ dựa vào màu. */
export function TransferStatusBadge({ status }: { readonly status: TransferStatus }) {
  const { variant, icon: Icon } = STATUS_PRESENTATION[status]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {TRANSFER_STATUS_LABELS[status]}
    </Badge>
  )
}

export function ShipmentStatusBadge({ status }: { readonly status: TransferShipmentStatus }) {
  const variant =
    status === 'Cancelled'
      ? 'destructive'
      : status === 'Received'
        ? 'default'
        : status === 'ReceivedWithDiscrepancy'
          ? 'outline'
          : 'secondary'
  return <Badge variant={variant}>{SHIPMENT_STATUS_LABELS[status]}</Badge>
}

export function TransferProgressText({
  dispatch,
  receive,
}: {
  readonly dispatch: TransferDispatchProgress
  readonly receive: TransferReceiveProgress
}) {
  return (
    <span className="flex flex-col text-xs leading-5">
      <span>Xuất: {DISPATCH_PROGRESS_LABELS[dispatch]}</span>
      <span className="text-muted-foreground">Nhận: {RECEIVE_PROGRESS_LABELS[receive]}</span>
    </span>
  )
}

interface TransferFlagBadgesProps {
  readonly hasOpenFeedback: boolean
  readonly hasPendingPickEscalation: boolean
  readonly hasOpenDiscrepancy?: boolean
}

export function TransferFlagBadges({
  hasOpenFeedback,
  hasPendingPickEscalation,
  hasOpenDiscrepancy = false,
}: TransferFlagBadgesProps) {
  if (!hasOpenFeedback && !hasPendingPickEscalation && !hasOpenDiscrepancy) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <span className="flex flex-wrap gap-1">
      {hasOpenFeedback ? (
        <Badge variant="outline" className="text-warning">
          <MessageSquareWarning aria-hidden="true" />
          Cần Owner xử lý
        </Badge>
      ) : null}
      {hasPendingPickEscalation ? (
        <Badge variant="outline" className="text-warning">
          <TriangleAlert aria-hidden="true" />
          Dòng chờ quản lý
        </Badge>
      ) : null}
      {hasOpenDiscrepancy ? (
        <Badge variant="outline" className="text-warning">
          <PackageX aria-hidden="true" />
          Chênh lệch chờ xử lý
        </Badge>
      ) : null}
    </span>
  )
}
