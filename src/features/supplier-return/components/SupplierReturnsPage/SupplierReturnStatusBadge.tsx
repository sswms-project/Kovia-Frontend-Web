import { Badge } from '@/components/ui/badge'
import type { SupplierReturnStatus } from '../../types/supplier-return.types'
import { SUPPLIER_RETURN_STATUS_LABELS } from '../../utils/supplier-return-format'

export function SupplierReturnStatusBadge({ status }: { readonly status: SupplierReturnStatus }) {
  const variant =
    status === 'Rejected'
      ? 'destructive'
      : status === 'Pending'
        ? 'outline'
        : status === 'Completed'
          ? 'default'
          : 'secondary'

  return <Badge variant={variant}>{SUPPLIER_RETURN_STATUS_LABELS[status]}</Badge>
}
