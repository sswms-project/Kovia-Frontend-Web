'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { InboundPageHeader } from '@/features/inbound/components/InboundWorkspace'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { InboundRequestDirectory } from '../components/InboundRequestsPage'
import {
  useDeleteInboundRequestMutation,
  useDeleteInboundRequestsMutation,
  useApproveInboundRequestsMutation,
  useDuplicateInboundRequestMutation,
  useInboundRequestsQuery,
  useSubmitInboundRequestsMutation,
  useSubmitInboundRequestMutation,
} from '../hooks/use-inbound-requests'
import type { InboundRequestStatus, InboundRequestSummary } from '../types/inbound-request.types'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  toOperationalDateTimeEnd,
  toOperationalDateTimeStart,
} from '../utils/inbound-request-format'

type DeleteIntent =
  | { readonly kind: 'single'; readonly item: InboundRequestSummary }
  | { readonly kind: 'many'; readonly ids: readonly string[] }
type WorkflowIntent = {
  readonly action: 'submit' | 'approve'
  readonly ids: readonly string[]
}

export default function InboundRequestsPage() {
  const router = useRouter()
  const [searchText, setSearchText] = useState('')
  const [status, setStatus] = useState<InboundRequestStatus | ''>('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([])
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null)
  const [workflowIntent, setWorkflowIntent] = useState<WorkflowIntent | null>(null)
  const meQuery = useMeQuery()
  const deleteMutation = useDeleteInboundRequestMutation()
  const deleteManyMutation = useDeleteInboundRequestsMutation()
  const duplicateMutation = useDuplicateInboundRequestMutation()
  const submitMutation = useSubmitInboundRequestMutation()
  const submitManyMutation = useSubmitInboundRequestsMutation()
  const approveManyMutation = useApproveInboundRequestsMutation()
  const isSubmitting = submitMutation.isPending || submitManyMutation.isPending
  const isApproving = approveManyMutation.isPending
  const isWorkflowPending = isSubmitting || isApproving
  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const query = useInboundRequestsQuery({
    pageNumber: page,
    pageSize,
    ...(debouncedSearchText ? { searchTerm: debouncedSearchText } : {}),
    ...(status ? { status } : {}),
    ...(createdFrom ? { dateFrom: toOperationalDateTimeStart(createdFrom) } : {}),
    ...(createdTo ? { dateTo: toOperationalDateTimeEnd(createdTo) } : {}),
  })
  const canCreate = meQuery.data?.permissions.includes(P.INBOUND_REQUESTS_CREATE) ?? false

  function confirmDelete() {
    const intent = deleteIntent
    setDeleteIntent(null)
    if (!intent) return

    if (intent.kind === 'single') {
      deleteMutation.mutate(intent.item.id, {
        onSuccess: () => {
          setSelectedIds((ids) => ids.filter((id) => id !== intent.item.id))
          toast.success('Đã xoá yêu cầu nhập kho.')
        },
        onError: (error) => toast.error(error.message || 'Không thể xoá yêu cầu nhập kho.'),
      })
      return
    }

    deleteManyMutation.mutate(intent.ids, {
      onSuccess: () => {
        setSelectedIds([])
        toast.success('Đã xoá các phiếu nhập kho đã chọn.')
      },
      onError: (error) => toast.error(error.message || 'Không thể xoá các phiếu nhập kho đã chọn.'),
    })
  }

  function confirmWorkflowAction(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    const intent = workflowIntent
    if (!intent) return

    const onSuccess = () => {
      setWorkflowIntent(null)
      setSelectedIds([])
      toast.success(
        intent.action === 'submit'
          ? `Đã gửi ${intent.ids.length} yêu cầu nhập kho để duyệt.`
          : `Đã duyệt ${intent.ids.length} yêu cầu nhập kho.`
      )
    }
    const onError = (error: { message?: string }) =>
      toast.error(
        error.message ||
          (intent.action === 'submit'
            ? 'Không thể gửi yêu cầu nhập kho để duyệt.'
            : 'Không thể duyệt yêu cầu nhập kho.')
      )

    if (intent.action === 'submit') {
      if (intent.ids.length === 1) {
        const inboundRequestId = intent.ids[0]
        if (inboundRequestId) submitMutation.mutate(inboundRequestId, { onSuccess, onError })
      } else submitManyMutation.mutate(intent.ids, { onSuccess, onError })
      return
    }

    approveManyMutation.mutate(intent.ids, { onSuccess, onError })
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-4">
        <InboundPageHeader
          title="Yêu cầu nhập kho"
          canViewRequests={meQuery.data?.permissions.includes(P.INBOUND_REQUESTS_VIEW) ?? false}
          canViewReceipts={meQuery.data?.permissions.includes(P.GOODS_RECEIPTS_VIEW) ?? false}
          action={
            canCreate ? (
              <Button asChild size="sm" className="shrink-0">
                <Link href={APP_ROUTES.inboundRequestCreate as Route}>
                  <Plus aria-hidden="true" />
                  Tạo yêu cầu nhập kho
                </Link>
              </Button>
            ) : null
          }
        />
        <InboundRequestDirectory
          items={query.data?.items ?? []}
          totalCount={query.data?.totalCount ?? 0}
          page={page}
          pageSize={pageSize}
          searchText={searchText}
          status={status}
          createdFrom={createdFrom}
          createdTo={createdTo}
          statusCounts={query.data?.statusCounts ?? []}
          isLoading={query.isLoading}
          isStatsError={query.isError}
          isFetching={query.isFetching}
          isError={query.isError}
          canDelete={meQuery.data?.permissions.includes(P.INBOUND_REQUESTS_DELETE) ?? false}
          canDeleteApproved={query.data?.canDeleteApprovedRequests ?? false}
          canEdit={query.data?.canEditRequests ?? false}
          canEditApproved={query.data?.canEditApprovedRequests ?? false}
          canCreate={canCreate}
          canSubmit={meQuery.data?.permissions.includes(P.INBOUND_REQUESTS_SUBMIT) ?? false}
          canApprove={meQuery.data?.permissions.includes(P.INBOUND_REQUESTS_APPROVE) ?? false}
          isDeleting={deleteMutation.isPending}
          isSubmitting={isSubmitting}
          isApproving={isApproving}
          isDuplicating={duplicateMutation.isPending}
          selectedIds={selectedIds}
          isDeletingMany={deleteManyMutation.isPending}
          onSearchChange={(value) => {
            setSearchText(value)
            setPage(1)
            setSelectedIds([])
          }}
          onStatusChange={(value) => {
            setStatus(value)
            setPage(1)
            setSelectedIds([])
          }}
          onCreatedFromChange={(value) => {
            setCreatedFrom(value)
            setPage(1)
            setSelectedIds([])
          }}
          onCreatedToChange={(value) => {
            setCreatedTo(value)
            setPage(1)
            setSelectedIds([])
          }}
          onPageChange={(value) => {
            setPage(value)
            setSelectedIds([])
          }}
          onPageSizeChange={(value) => {
            setPageSize(value)
            setPage(1)
          }}
          onRetry={() => void query.refetch()}
          onSelectionChange={setSelectedIds}
          onDelete={(item) => setDeleteIntent({ kind: 'single', item })}
          onSubmit={(item) => setWorkflowIntent({ action: 'submit', ids: [item.id] })}
          onApprove={(item) => setWorkflowIntent({ action: 'approve', ids: [item.id] })}
          onDuplicate={(item) =>
            duplicateMutation.mutate(item.id, {
              onSuccess: (response) => {
                toast.success('Đã sao chép yêu cầu nhập kho thành bản nháp.')
                router.push(APP_ROUTES.inboundRequestDetail(response.data) as Route)
              },
              onError: (error) =>
                toast.error(error.message || 'Không thể sao chép yêu cầu nhập kho.'),
            })
          }
          onDeleteMany={(ids) => ids.length > 0 && setDeleteIntent({ kind: 'many', ids })}
          onSubmitMany={(ids) => ids.length > 0 && setWorkflowIntent({ action: 'submit', ids })}
          onApproveMany={(ids) => ids.length > 0 && setWorkflowIntent({ action: 'approve', ids })}
        />
      </div>
      <AlertDialog
        open={deleteIntent !== null}
        onOpenChange={(open) => !open && setDeleteIntent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteIntent?.kind === 'single'
                ? 'Xoá yêu cầu nhập kho?'
                : `Xoá ${deleteIntent?.kind === 'many' ? deleteIntent.ids.length : 0} phiếu nhập kho?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteIntent?.kind === 'single'
                ? `Bạn có chắc muốn xoá yêu cầu ${deleteIntent.item.inboundRequestCode}?`
                : 'Bạn có chắc muốn xóa các yêu cầu đã chọn? Chỉ xóa khi chưa phát sinh nhận hàng. Thao tác này không thể hoàn tác.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending || deleteManyMutation.isPending}
              onClick={confirmDelete}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={workflowIntent !== null}
        onOpenChange={(open) => !open && !isWorkflowPending && setWorkflowIntent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {workflowIntent?.action === 'approve'
                ? `Duyệt ${workflowIntent.ids.length} yêu cầu nhập kho?`
                : `Gửi ${workflowIntent?.ids.length ?? 0} yêu cầu nhập kho để duyệt?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {workflowIntent?.action === 'approve'
                ? 'Các yêu cầu đã chọn sẽ chuyển sang trạng thái Đã duyệt.'
                : 'Sau khi gửi, bạn không thể chỉnh sửa cho đến khi đơn được trả lại.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isWorkflowPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction disabled={isWorkflowPending} onClick={confirmWorkflowAction}>
              {isWorkflowPending
                ? workflowIntent?.action === 'approve'
                  ? 'Đang duyệt…'
                  : 'Đang gửi…'
                : workflowIntent?.action === 'approve'
                  ? 'Xác nhận duyệt'
                  : 'Xác nhận gửi duyệt'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
