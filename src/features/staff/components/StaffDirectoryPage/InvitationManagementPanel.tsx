import { LoaderCircle, Mail, RefreshCw, Send, Trash2 } from 'lucide-react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getRoleLabel } from '@/config/roles'
import type { InvitationResponse } from '../../types/invitation.types'

interface InvitationManagementPanelProps {
  readonly invitations: InvitationResponse[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isFetching: boolean
  readonly resendingId: string | null
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRefresh: () => void
  readonly onResend: (invitation: InvitationResponse) => void
  readonly onRevoke: (invitation: InvitationResponse) => void
}

const STATUS_LABELS: Record<string, string> = {
  Pending: 'Chờ xác nhận',
  Accepted: 'Đã chấp nhận',
  Expired: 'Hết hạn',
  Revoked: 'Đã thu hồi',
}

const DELIVERY_LABELS: Record<string, string> = {
  Queued: 'Đang chờ',
  Processing: 'Đang gửi',
  Sent: 'Đã gửi',
  Failed: 'Gửi thất bại',
  Superseded: 'Đã thay thế',
  NotQueued: 'Chưa xếp hàng',
}

export function InvitationManagementPanel({
  invitations,
  totalCount,
  page,
  pageSize,
  isLoading,
  isError,
  isFetching,
  resendingId,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  onResend,
  onRevoke,
}: InvitationManagementPanelProps) {
  return (
    <OperationalListPanel aria-labelledby="invitations-title">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3 py-3 sm:px-4">
        <div>
          <h2 id="invitations-title" className="text-sm font-semibold">
            Danh sách lời mời
          </h2>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={onRefresh}>
          <RefreshCw className={isFetching ? 'animate-spin' : undefined} aria-hidden="true" />
          Làm mới
        </Button>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-sm font-medium">Không thể tải danh sách lời mời</p>
          <Button type="button" variant="outline" onClick={onRefresh}>
            Thử lại
          </Button>
        </div>
      ) : invitations.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-4 text-center">
          <Mail className="text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Chưa có lời mời nào</p>
        </div>
      ) : (
        <>
          <ul data-slot="operational-list-body" className="min-h-0">
            {invitations.map((invitation) => {
              const needsWarehouse =
                invitation.warehouses.length === 0 &&
                (invitation.effectiveStatus === 'Pending' ||
                  invitation.effectiveStatus === 'Expired')
              return (
                <li
                  key={invitation.id}
                  className="border-border flex flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:items-center sm:px-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{invitation.fullName}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {invitation.email} · {getRoleLabel(invitation.role)}
                    </p>
                    {invitation.warehouses.length > 0 && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {invitation.warehouses
                          .map((warehouse) => warehouse.warehouseCode)
                          .join(', ')}
                      </p>
                    )}
                    {needsWarehouse && (
                      <p className="text-destructive mt-1 text-xs">
                        {invitation.canRevoke
                          ? 'Lời mời cũ thiếu kho. Cần thu hồi và gửi lời mời mới.'
                          : 'Lời mời cũ thiếu kho. Cần gửi lời mời mới.'}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
                    <Badge
                      variant={invitation.effectiveStatus === 'Pending' ? 'default' : 'outline'}
                    >
                      {STATUS_LABELS[invitation.effectiveStatus] ?? invitation.effectiveStatus}
                    </Badge>
                    <Badge variant="outline">
                      Email:{' '}
                      {DELIVERY_LABELS[invitation.deliveryStatus] ?? invitation.deliveryStatus}
                    </Badge>
                    {invitation.canResend && !needsWarehouse ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Gửi lại lời mời ${invitation.email}`}
                        disabled={resendingId === invitation.id}
                        onClick={() => onResend(invitation)}
                      >
                        {resendingId === invitation.id ? (
                          <LoaderCircle className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Send aria-hidden="true" />
                        )}
                      </Button>
                    ) : null}
                    {invitation.canRevoke ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Thu hồi lời mời ${invitation.email}`}
                        onClick={() => onRevoke(invitation)}
                      >
                        <Trash2 className="text-destructive" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          <OperationalPagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </OperationalListPanel>
  )
}
