'use client'

import { Button } from '@/components/ui/button'
import type { OpeningStockRecord } from '../../types/inventory.types'

interface OpeningStockActionsProps {
  readonly item: OpeningStockRecord
  readonly canCreate: boolean
  readonly canApprove: boolean
  readonly canSelfApprove: boolean
  readonly currentUserId: string | null
  readonly isPending: boolean
  readonly onEdit: (item: OpeningStockRecord) => void
  readonly onApprove: (item: OpeningStockRecord) => void
  readonly onReview: (
    item: OpeningStockRecord,
    decision: 'Returned' | 'Cancelled' | 'Withdraw'
  ) => void
  readonly onAction: (item: OpeningStockRecord, action: 'submit') => Promise<void>
}

export function OpeningStockActions({ item, ...props }: OpeningStockActionsProps) {
  const isMaker =
    Boolean(props.currentUserId) &&
    (item.createdByUserId === props.currentUserId || item.submittedByUserId === props.currentUserId)
  const canDirectApprove =
    item.status === 'Draft' && isMaker && props.canApprove && props.canSelfApprove
  return (
    <div className="flex flex-wrap gap-2">
      {(item.status === 'Draft' || item.status === 'Returned') &&
      props.canCreate &&
      (item.createdByUserId === props.currentUserId ||
        item.submittedByUserId === props.currentUserId) ? (
        <Button
          size="sm"
          variant="outline"
          disabled={props.isPending}
          onClick={() => props.onEdit(item)}
        >
          Sửa
        </Button>
      ) : null}
      {(item.status === 'Draft' || item.status === 'Returned') &&
      props.canCreate &&
      !canDirectApprove ? (
        <Button
          size="sm"
          variant="outline"
          disabled={props.isPending}
          onClick={() => void props.onAction(item, 'submit')}
        >
          Gửi duyệt
        </Button>
      ) : null}
      {canDirectApprove ||
      (item.status === 'PendingApproval' &&
        props.canApprove &&
        ((item.createdByUserId !== props.currentUserId &&
          item.submittedByUserId !== props.currentUserId) ||
          props.canSelfApprove)) ? (
        <Button size="sm" disabled={props.isPending} onClick={() => props.onApprove(item)}>
          Duyệt & ghi sổ
        </Button>
      ) : null}
      {item.status === 'PendingApproval' &&
      props.canApprove &&
      ((item.createdByUserId !== props.currentUserId &&
        item.submittedByUserId !== props.currentUserId) ||
        props.canSelfApprove) ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            props.onReview(item, 'Returned')
          }}
        >
          Phản hồi
        </Button>
      ) : null}
      {item.status === 'PendingApproval' &&
      props.canCreate &&
      (item.createdByUserId === props.currentUserId ||
        item.submittedByUserId === props.currentUserId) ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            props.onReview(item, 'Withdraw')
          }}
        >
          Rút lại
        </Button>
      ) : null}
      {['Draft', 'PendingApproval'].includes(item.status) &&
      props.canCreate &&
      (item.createdByUserId === props.currentUserId ||
        item.submittedByUserId === props.currentUserId) ? (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            props.onReview(item, 'Cancelled')
          }}
        >
          Hủy
        </Button>
      ) : null}
    </div>
  )
}
