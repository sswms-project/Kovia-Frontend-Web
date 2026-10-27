'use client'

import { OrderType } from '@/types/api'
import { Button } from '@/components/ui/button'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { useState } from 'react'
import { Check, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
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
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import {
  toOperationalDateTimeEnd,
  toOperationalDateTimeStart,
} from '@/features/inbound-request/utils/inbound-request-format'
import { OperationalCountTile } from '@/components/operations/OperationalCountTile'
import {
  InboundPageHeader,
  InboundMasterDetail,
  InboundStageGoodsPreview,
} from '../components/InboundWorkspace'
import { INBOUND_STATUS_LABELS } from '../utils/inbound-format'
import { useInboundGoodsSelection } from '../hooks/use-inbound-goods-selection'
import { receiptStageGoodsRows } from '../utils/inbound-goods-preview'
import { ReceiptDirectory } from '../components/ReceiptsPage'
import {
  useApproveGoodsReceiptMutation,
  useGoodsReceiptQuery,
  useGoodsReceiptsQuery,
  useInboundAllowedActionsQuery,
} from '../hooks/use-inbound'
import type { GoodsReceiptStatus, GoodsReceiptSummary } from '../types/inbound.types'

export default function GoodsReceiptsPage() {
  const [searchText, setSearchText] = useState('')
  const [status, setStatus] = useState<GoodsReceiptStatus | ''>('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [sortDirection, setSortDirection] = useState(OrderType.Descending)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [approvalTarget, setApprovalTarget] = useState<GoodsReceiptSummary | null>(null)
  const meQuery = useMeQuery()
  const approveMutation = useApproveGoodsReceiptMutation()
  const approvalDetailQuery = useGoodsReceiptQuery(approvalTarget?.id ?? '')
  const allowedActionsQuery = useInboundAllowedActionsQuery(approvalTarget?.id ?? '')
  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const exportFilters = {
    sortDirection,
    pageNumber: page,
    pageSize,
    ...(debouncedSearchText ? { searchTerm: debouncedSearchText } : {}),
    ...(status ? { status } : {}),
    ...(createdFrom ? { dateFrom: toOperationalDateTimeStart(createdFrom) } : {}),
    ...(createdTo ? { dateTo: toOperationalDateTimeEnd(createdTo) } : {}),
  }
  const query = useGoodsReceiptsQuery(exportFilters)
  const preview = useInboundGoodsSelection(
    'receipt',
    JSON.stringify([exportFilters, searchText]),
    (query.data?.items ?? []).map((item) => item.id),
    !query.isError &&
      !query.isPlaceholderData &&
      searchText.trim() === debouncedSearchText.trim() &&
      Boolean(meQuery.data?.permissions.includes(P.GOODS_RECEIPTS_VIEW))
  )
  const previewItem = preview.id
    ? query.data?.items.find((item) => item.id === preview.id)
    : undefined
  const previewQuery = useGoodsReceiptQuery(
    preview.expanded && previewItem && meQuery.data?.permissions.includes(P.GOODS_RECEIPTS_VIEW)
      ? previewItem.id
      : ''
  )
  const previewDetail =
    previewItem && previewQuery.data?.id === previewItem.id ? previewQuery.data : undefined

  async function approveReceipt() {
    if (!approvalTarget) return
    if (allowedActionsQuery.isError) {
      toast.error(getApiErrorMessage(allowedActionsQuery.error, 'Không thể kiểm tra quyền duyệt.'))
      setApprovalTarget(null)
      return
    }
    if (!allowedActionsQuery.data?.allowedActions.includes('Approve')) {
      toast.error('Bạn không có quyền duyệt phiếu này hoặc phiếu không còn ở trạng thái chờ duyệt.')
      setApprovalTarget(null)
      return
    }

    if (!approvalDetailQuery.data) {
      toast.error('Không thể tải phiên bản mới nhất của phiếu nhận hàng.')
      return
    }

    try {
      await approveMutation.mutateAsync({
        receiptId: approvalTarget.id,
        expectedVersion: approvalDetailQuery.data.version,
        selfApprovalAcknowledged: allowedActionsQuery.data.selfApprovalRequired,
      })
      toast.success(`Đã duyệt kết quả kiểm hàng của phiếu ${approvalTarget.receiptCode}.`)
      setApprovalTarget(null)
    } catch (error) {
      logger.error(error)
      toast.error(getApiErrorMessage(error, 'Không thể duyệt kết quả kiểm hàng.'))
    }
  }

  const listExport = useListExport({
    dataset: 'goods-receipts',
    filters: exportFilters,
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: P.GOODS_RECEIPTS_VIEW,
    totalCount: query.data?.totalCount ?? 0,
    isFetching: query.isFetching,
    isError: query.isError,
    blocked: searchText !== debouncedSearchText,
  })
  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-4">
        <InboundPageHeader
          title="Phiếu nhận hàng"
          canViewRequests={meQuery.data?.permissions.includes(P.INBOUND_REQUESTS_VIEW) ?? false}
          canViewReceipts={meQuery.data?.permissions.includes(P.GOODS_RECEIPTS_VIEW) ?? false}
        />
        <div className="bg-border w-full shrink-0 border sm:max-w-xs">
          <OperationalCountTile
            icon={ClipboardList}
            tone="default"
            label="Phiếu phù hợp"
            value={query.data?.totalCount ?? 0}
            isLoading={query.isFetching}
            isError={query.isError}
          />
        </div>
        <InboundMasterDetail
          title="Chi tiết hàng hóa"
          detailAnchorId={preview.anchorId}
          expanded={preview.expanded}
          onExpandedChange={preview.setExpanded}
          referenceCode={previewItem?.receiptCode}
          detail={
            <InboundStageGoodsPreview
              key={preview.id || 'empty'}
              stage="receipt"
              rows={receiptStageGoodsRows(previewDetail?.items ?? [], 'receipt')}
              selected={Boolean(previewItem)}
              isLoading={Boolean(previewItem) && !previewDetail && !previewQuery.isError}
              isError={query.isError || previewQuery.isError}
              statusLabel={previewDetail ? INBOUND_STATUS_LABELS[previewDetail.status] : undefined}
              onRetry={() => void (query.isError ? query.refetch() : previewQuery.refetch())}
            />
          }
        >
          <ReceiptDirectory
            previewId={preview.id}
            onPreview={(item, open) => preview.select(item.id, open)}
            previewAction={
              <Button
                type="button"
                variant="outline"
                disabled={!previewItem}
                aria-label={
                  previewItem ? `Xem hàng hóa ${previewItem.receiptCode}` : 'Xem hàng hóa'
                }
                onClick={() => preview.select(preview.id, true)}
              >
                Xem hàng hóa
              </Button>
            }
            exportAction={
              listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
            }
            items={query.data?.items ?? []}
            totalCount={query.data?.totalCount ?? 0}
            page={page}
            pageSize={pageSize}
            searchText={searchText}
            status={status}
            createdFrom={createdFrom}
            createdTo={createdTo}
            sortDirection={sortDirection}
            onSortDirectionChange={(value) => {
              setSortDirection(value)
              setPage(1)
            }}
            isLoading={query.isFetching}
            isFetching={query.isFetching}
            isError={query.isError}
            canApprove={meQuery.data?.permissions.includes(P.GOODS_RECEIPTS_APPROVE) ?? false}
            isApproving={approveMutation.isPending}
            onSearchChange={(value) => {
              setSearchText(value)
              setPage(1)
            }}
            onStatusChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
            onCreatedFromChange={(value) => {
              setCreatedFrom(value)
              setPage(1)
            }}
            onCreatedToChange={(value) => {
              setCreatedTo(value)
              setPage(1)
            }}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value)
              setPage(1)
            }}
            onRetry={() => void query.refetch()}
            onApprove={setApprovalTarget}
          />
        </InboundMasterDetail>
      </div>
      <AlertDialog
        open={approvalTarget !== null}
        onOpenChange={(open) => !open && !approveMutation.isPending && setApprovalTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Phê duyệt kết quả kiểm hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              {approvalTarget
                ? allowedActionsQuery.data?.selfApprovalRequired
                  ? `Bạn là người ghi nhận phiếu ${approvalTarget.receiptCode}. Hệ thống sẽ lưu hành động tự phê duyệt trước khi cất hàng.`
                  : `Xác nhận kết quả kiểm hàng của phiếu ${approvalTarget.receiptCode} trước khi thực hiện cất hàng.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                approveMutation.isPending ||
                approvalDetailQuery.isLoading ||
                approvalDetailQuery.isFetching ||
                allowedActionsQuery.isLoading ||
                allowedActionsQuery.isFetching
              }
              onClick={(event) => {
                event.preventDefault()
                void approveReceipt()
              }}
            >
              <Check aria-hidden="true" />
              {approveMutation.isPending ? 'Đang phê duyệt…' : 'Duyệt kiểm hàng'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
