import { Check, Copy, Eye, MoreHorizontal, Send, Trash2, Pencil } from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  INBOUND_REQUEST_STATUS,
  type InboundRequestSummary,
} from '../../types/inbound-request.types'

interface InboundRequestRowActionsProps {
  readonly currentUserId?: string | null
  readonly item: InboundRequestSummary
  readonly canCreate: boolean
  readonly canSubmit: boolean
  readonly canApprove: boolean
  readonly canDelete: boolean
  readonly canDeleteApproved?: boolean
  readonly canEdit?: boolean
  readonly canEditApproved?: boolean
  readonly isSubmitting: boolean
  readonly isApproving: boolean
  readonly isDeleting: boolean
  readonly isDuplicating: boolean
  readonly onSubmit: (item: InboundRequestSummary) => void
  readonly onApprove: (item: InboundRequestSummary) => void
  readonly onDelete: (item: InboundRequestSummary) => void
  readonly onDuplicate: (item: InboundRequestSummary) => void
}

export function InboundRequestRowActions({
  currentUserId,
  item,
  canCreate,
  canSubmit,
  canApprove,
  canDelete,
  canEdit = false,
  isSubmitting,
  isApproving,
  isDeleting,
  isDuplicating,
  onSubmit,
  onApprove,
  onDelete,
  onDuplicate,
}: InboundRequestRowActionsProps) {
  const isDraft = item.status === INBOUND_REQUEST_STATUS.Draft
  const isPendingApproval = item.status === INBOUND_REQUEST_STATUS.PendingApproval
  const showSubmit = canSubmit && isDraft
  const showApprove = canApprove && isPendingApproval
  const canChangeOwn = canCreate && currentUserId === item.createdBy
  const showDelete = (canDelete || canChangeOwn) && isDraft

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Thao tác cho ${item.inboundRequestCode}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link
            href={APP_ROUTES.inboundRequestDetail(item.id) as Route}
            aria-label={`Xem chi tiết ${item.inboundRequestCode}`}
          >
            <Eye aria-hidden="true" />
            Xem chi tiết
          </Link>
        </DropdownMenuItem>
        {(canEdit || canChangeOwn) && isDraft ? (
          <DropdownMenuItem asChild>
            <Link href={APP_ROUTES.inboundRequestEdit(item.id) as Route}>
              <Pencil aria-hidden="true" />
              {isDraft ? 'Chỉnh sửa' : 'Chỉnh sửa / đổi mã'}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {showSubmit ? (
          <DropdownMenuItem disabled={isSubmitting} onClick={() => onSubmit(item)}>
            <Send aria-hidden="true" />
            Gửi duyệt
          </DropdownMenuItem>
        ) : null}
        {showApprove ? (
          <DropdownMenuItem disabled={isApproving} onClick={() => onApprove(item)}>
            <Check aria-hidden="true" />
            Duyệt yêu cầu
          </DropdownMenuItem>
        ) : null}
        {canCreate ? (
          <DropdownMenuItem disabled={isDuplicating} onClick={() => onDuplicate(item)}>
            <Copy aria-hidden="true" />
            Sao chép
          </DropdownMenuItem>
        ) : null}
        {showDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={isDeleting}
              onClick={() => onDelete(item)}
            >
              <Trash2 aria-hidden="true" />
              Xóa chứng từ
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
