import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  INBOUND_REQUEST_STATUS,
  type InboundRequestStatus,
  type InboundRequestSummary,
  type SupplierResponseDecision,
} from '../../types/inbound-request.types'
import { INBOUND_REQUEST_STATUS_LABELS } from '../../utils/inbound-request-format'

export function InboundRequestStatusBadge({ status }: { readonly status: InboundRequestStatus }) {
  const variant =
    status === INBOUND_REQUEST_STATUS.Cancelled || status === INBOUND_REQUEST_STATUS.Rejected
      ? 'destructive'
      : status === INBOUND_REQUEST_STATUS.Draft
        ? 'outline'
        : status === INBOUND_REQUEST_STATUS.PendingApproval ||
            status === INBOUND_REQUEST_STATUS.PartiallyReceived ||
            status === INBOUND_REQUEST_STATUS.Sent
          ? 'secondary'
          : 'default'

  return <Badge variant={variant}>{INBOUND_REQUEST_STATUS_LABELS[status]}</Badge>
}

const SUPPLIER_RESPONSE_HINTS: Record<
  SupplierResponseDecision,
  { label: string; className: string }
> = {
  Confirmed: { label: 'NCC đã xác nhận', className: 'text-primary' },
  ProposedNewDate: { label: 'NCC đề xuất ngày khác', className: 'text-warning' },
  Rejected: { label: 'NCC từ chối', className: 'text-destructive' },
}

/**
 * The order stays "Approved" while the supplier answers by email (receiving depends on that
 * status), so the supplier's answer is shown next to the status instead of replacing it.
 */
export function SupplierResponseHint({
  item,
}: {
  readonly item: Pick<InboundRequestSummary, 'status' | 'supplierEmailSentAt' | 'supplierResponse'>
}) {
  if (item.status !== INBOUND_REQUEST_STATUS.Approved || !item.supplierEmailSentAt) return null
  const hint = item.supplierResponse
    ? SUPPLIER_RESPONSE_HINTS[item.supplierResponse]
    : { label: 'Chờ NCC phản hồi', className: 'text-muted-foreground' }
  return <span className={cn('text-xs font-medium', hint.className)}>{hint.label}</span>
}
