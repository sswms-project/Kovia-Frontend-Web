import { Badge } from '@/components/ui/badge'
import type { GoodsReturnRequestStatus } from '../../types/stock-issue.types'
import { RETURN_STATUS_LABELS } from '../../utils/stock-issue-format'

export function GoodsReturnRequestStatusBadge({
  status,
}: {
  readonly status: GoodsReturnRequestStatus
}) {
  const variant =
    status === 'Rejected' || status === 'Cancelled'
      ? 'destructive'
      : status === 'Requested'
        ? 'outline'
        : status === 'Restocked'
          ? 'default'
          : 'secondary'

  return <Badge variant={variant}>{RETURN_STATUS_LABELS[status]}</Badge>
}
