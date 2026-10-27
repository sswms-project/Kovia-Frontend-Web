'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { APP_ROUTES } from '@/routes/app-routes'
import { useReturnListState } from '@/hooks/use-return-list-state'
import { useReturnDocumentEditing } from '@/hooks/use-return-document-editing'
import {
  ReturnDocumentActions,
  ReturnDocumentActionDialog,
} from '@/components/operations/ReturnDocumentActions'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { formatApiError, getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import {
  CreateGoodsReturnRequestDialog,
  RejectGoodsReturnRequestDialog,
  SelectStockIssueForReturnDialog,
  SelfApproveGoodsReturnDialog,
  RestockReturnDialog,
  GoodsReturnRequestDetail,
  GoodsReturnRequestDirectory,
} from '../components/GoodsReturnRequestsPage'
import { useCreateGoodsReturn } from '../hooks/use-create-goods-return'
import {
  useApproveGoodsReturnRequestMutation,
  useRejectGoodsReturnRequestMutation,
  useGoodsReturnRequestsQuery,
  useGoodsReturnRequestQuery,
  useRestockGoodsReturnRequestMutation,
} from '../hooks/use-stock-issue-requests'
import { useGoodsReturnRestockOptionsQuery } from '../hooks/use-goods-return-restock-options'
import {
  rejectGoodsReturnRequestSchema,
  type RejectGoodsReturnRequestFormValues,
} from '../schemas/reject-return.schema'
import { restockReturnSchema, type RestockReturnFormValues } from '../schemas/restock-return.schema'
import {
  GOODS_RETURN_REQUEST_STATUSES,
  type GoodsReturnRequestSummary,
} from '../types/stock-issue.types'
import { P } from '@/config/permissionCodes'

export default function GoodsReturnRequestsPage({ returnId }: { readonly returnId?: string }) {
  const router = useRouter()
  const list = useReturnListState(APP_ROUTES.goodsReturnRequests, GOODS_RETURN_REQUEST_STATUSES)
  const {
    page,
    pageSize,
    searchText,
    status,
    warehouseId,
    dateFrom,
    dateTo,
    setPage,
    setPageSize,
    setSearchText,
    setStatus,
    setWarehouseId,
    setDateFrom,
    setDateTo,
  } = list
  const meQuery = useMeQuery()
  const createReturn = useCreateGoodsReturn()
  const [rejectingItem, setRejectingItem] = useState<GoodsReturnRequestSummary | null>(null)
  const [selfApprovingItem, setSelfApprovingItem] = useState<GoodsReturnRequestSummary | null>(null)
  const [restockingItem, setRestockingItem] = useState<GoodsReturnRequestSummary | null>(null)
  const restockSubmitting = useRef(false)
  const restockHydrated = useRef('')
  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const goodsReturnRequestsQuery = useGoodsReturnRequestsQuery(
    {
      pageNumber: page,
      pageSize,
      ...(debouncedSearchText.trim() ? { searchTerm: debouncedSearchText.trim() } : {}),
      ...(status ? { status } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    },
    !returnId
  )
  const warehousesQuery = useWarehousesQuery(
    {
      top: 100,
      skip: 0,
      needTotalCount: true,
      isActive: true,
    },
    !returnId
  )
  const returnDetailQuery = useGoodsReturnRequestQuery(returnId ?? null)
  const editing = useReturnDocumentEditing(
    'goodsReturnRequests',
    returnDetailQuery.data,
    list.listHref
  )
  const restockDetailQuery = useGoodsReturnRequestQuery(restockingItem?.id ?? null)
  const restockOptionsQuery = useGoodsReturnRestockOptionsQuery(
    restockDetailQuery.data?.id === restockingItem?.id ? (restockingItem?.id ?? null) : null,
    restockDetailQuery.data?.version
  )
  const approveMutation = useApproveGoodsReturnRequestMutation()
  const rejectMutation = useRejectGoodsReturnRequestMutation()
  const restockMutation = useRestockGoodsReturnRequestMutation()
  const rejectForm = useForm<RejectGoodsReturnRequestFormValues>({
    resolver: zodResolver(rejectGoodsReturnRequestSchema),
    defaultValues: { reason: '' },
  })
  const restockForm = useForm<RestockReturnFormValues>({
    resolver: zodResolver(restockReturnSchema),
    defaultValues: { items: [] },
  })

  useEffect(() => {
    if (!restockDetailQuery.data || restockDetailQuery.data.id !== restockingItem?.id) return
    const session = `${restockingItem.id}:${restockDetailQuery.data.version ?? ''}`
    if (restockHydrated.current === session) return
    restockHydrated.current = session
    restockForm.reset({
      items: restockDetailQuery.data.items.map((item) => ({
        returnItemId: item.id,
        condition: item.condition,
        restockSlotId: item.condition === 'Scrap' ? null : item.restockSlotId,
      })),
    })
  }, [restockDetailQuery.data, restockForm, restockingItem?.id])

  const restockVersionMismatch = Boolean(
    restockOptionsQuery.data &&
    restockOptionsQuery.data.version !== (restockDetailQuery.data?.version ?? '')
  )

  useEffect(() => {
    if (
      !restockOptionsQuery.data ||
      restockOptionsQuery.isFetching ||
      restockOptionsQuery.isError ||
      restockVersionMismatch
    )
      return
    restockForm.getValues('items').forEach((line, index) => {
      if (
        line.condition === 'Scrap' ||
        restockForm.getFieldState(`items.${index}.restockSlotId`).isDirty
      )
        return
      const options =
        restockOptionsQuery.data.items
          .find((item) => item.returnItemId === line.returnItemId)
          ?.conditionOptions?.find((entry) => entry.condition === line.condition)?.options ?? []
      const selected =
        options.find((option) => option.slotId === line.restockSlotId) ??
        options.find((option) => option.isOriginalSlot) ??
        options[0]
      restockForm.setValue(`items.${index}.restockSlotId`, selected?.slotId ?? null)
    })
  }, [
    restockForm,
    restockOptionsQuery.data,
    restockOptionsQuery.isFetching,
    restockOptionsQuery.isError,
    restockVersionMismatch,
    restockingItem?.id,
    restockDetailQuery.data?.version,
  ])

  async function approve(item: GoodsReturnRequestSummary, selfApprovalAcknowledged = false) {
    // Phiếu do chính mình lập phải được xác nhận rõ trước khi tự duyệt.
    if (item.createdBy === meQuery.data?.id && !selfApprovalAcknowledged) {
      setSelfApprovingItem(item)
      return
    }
    try {
      await approveMutation.mutateAsync({
        goodsReturnRequestId: item.id,
        selfApprovalAcknowledged,
        expectedVersion: item.version,
      })
      toast.success('Đã duyệt yêu cầu trả hàng. Kho sẽ được báo để nhập lại kho.')
      setSelfApprovingItem(null)
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể duyệt yêu cầu trả hàng.'))
    }
  }
  async function reject(values: RejectGoodsReturnRequestFormValues) {
    if (!rejectingItem) return
    try {
      await rejectMutation.mutateAsync({
        goodsReturnRequestId: rejectingItem.id,
        request: { ...values, expectedVersion: rejectingItem.version },
      })
      toast.success('Đã từ chối yêu cầu trả hàng.')
      setRejectingItem(null)
      rejectForm.reset()
    } catch {
      toast.error('Không thể từ chối yêu cầu trả hàng.')
    }
  }

  async function restock(values: RestockReturnFormValues) {
    if (
      !restockingItem ||
      restockSubmitting.current ||
      restockMutation.isPending ||
      restockDetailQuery.isFetching ||
      restockDetailQuery.isError ||
      restockOptionsQuery.isFetching ||
      restockOptionsQuery.isError ||
      !restockOptionsQuery.data ||
      restockVersionMismatch
    )
      return
    restockSubmitting.current = true
    try {
      await restockMutation.mutateAsync({
        goodsReturnRequestId: restockingItem.id,
        request: {
          items: values.items.map(({ returnItemId, restockSlotId, condition }) => ({
            condition,
            returnItemId,
            restockSlotId,
          })),
          expectedVersion: restockDetailQuery.data?.version ?? restockingItem.version,
        },
      })
      toast.success('Đã nhập lại kho theo kết quả kiểm tra thực tế.')
      setRestockingItem(null)
      restockForm.reset({ items: [] })
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể nhập lại kho.'))
    } finally {
      restockSubmitting.current = false
    }
  }

  return (
    <div
      className={
        returnId ? 'flex w-full min-w-0 flex-col gap-4 pb-3' : 'flex h-full min-h-0 flex-col gap-4'
      }
    >
      {returnId ? (
        <GoodsReturnRequestDetail
          editingActions={
            <ReturnDocumentActions
              allowedActions={returnDetailQuery.data?.allowedActions ?? []}
              disabled={
                editing.isPending || returnDetailQuery.isFetching || createReturn.dialog.isPending
              }
              onEdit={() => {
                if (returnDetailQuery.data) createReturn.openForEdit(returnDetailQuery.data)
              }}
              onAction={editing.open}
            />
          }
          item={returnDetailQuery.data ?? null}
          isLoading={returnDetailQuery.isLoading}
          isError={returnDetailQuery.isError}
          listHref={list.listHref}
          canApprove={
            Boolean(meQuery.data?.permissions.includes(P.GOODS_RETURN_REQUESTS_APPROVE)) &&
            !meQuery.isFetching &&
            !returnDetailQuery.isFetching
          }
          canSelfApprove={Boolean(
            meQuery.data?.permissions.includes(P.GOODS_RETURN_REQUESTS_SELF_APPROVE)
          )}
          canRestock={
            Boolean(meQuery.data?.permissions.includes(P.GOODS_RETURN_REQUESTS_RESTOCK)) &&
            !meQuery.isFetching &&
            !returnDetailQuery.isFetching
          }
          currentUserId={meQuery.data?.id ?? null}
          isPending={
            approveMutation.isPending || rejectMutation.isPending || restockMutation.isPending
          }
          onApprove={(item) => void approve(item)}
          onReject={setRejectingItem}
          onRestock={setRestockingItem}
          onRetry={() => void returnDetailQuery.refetch()}
        />
      ) : (
        <GoodsReturnRequestDirectory
          items={goodsReturnRequestsQuery.data?.items ?? []}
          totalCount={goodsReturnRequestsQuery.data?.totalCount ?? 0}
          page={page}
          pageSize={pageSize}
          searchText={searchText}
          status={status}
          warehouseId={warehouseId}
          dateFrom={dateFrom}
          dateTo={dateTo}
          warehouses={(warehousesQuery.data?.items ?? []).map((warehouse) => ({
            id: warehouse.id,
            label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
          }))}
          permissions={meQuery.data?.permissions ?? []}
          currentUserId={meQuery.data?.id ?? null}
          isLoading={goodsReturnRequestsQuery.isLoading}
          isFetching={goodsReturnRequestsQuery.isFetching}
          isError={goodsReturnRequestsQuery.isError}
          onSearchChange={(value) => {
            setSearchText(value)
          }}
          onStatusChange={(value) => {
            setStatus(value)
          }}
          onWarehouseChange={(value) => {
            setWarehouseId(value)
          }}
          onDateFromChange={(value) => {
            setDateFrom(value)
          }}
          onDateToChange={(value) => {
            setDateTo(value)
          }}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value)
          }}
          detailHref={list.detailHref}
          onInspect={(item) => router.push(list.detailHref(item.id) as Route)}
          onApprove={(item) => void approve(item)}
          onReject={setRejectingItem}
          onRestock={setRestockingItem}
          onCreate={createReturn.openPicker}
          onRetry={() => void goodsReturnRequestsQuery.refetch()}
        />
      )}
      <SelectStockIssueForReturnDialog {...createReturn.picker} />
      <CreateGoodsReturnRequestDialog {...createReturn.dialog} />
      <ReturnDocumentActionDialog {...editing.dialog} />
      <SelfApproveGoodsReturnDialog
        item={selfApprovingItem}
        isPending={approveMutation.isPending}
        onClose={() => setSelfApprovingItem(null)}
        onConfirm={() => {
          if (selfApprovingItem) void approve(selfApprovingItem, true)
        }}
      />
      <RejectGoodsReturnRequestDialog
        item={rejectingItem}
        form={rejectForm}
        isPending={rejectMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingItem(null)
            rejectForm.reset()
          }
        }}
        onSubmit={(values) => void reject(values)}
      />
      <RestockReturnDialog
        key={restockingItem?.id ?? 'closed'}
        item={
          restockingItem
            ? restockDetailQuery.data?.id === restockingItem.id
              ? restockDetailQuery.data
              : restockingItem
            : null
        }
        form={restockForm}
        options={restockOptionsQuery.data?.items ?? []}
        isLoading={restockOptionsQuery.isFetching || restockDetailQuery.isFetching}
        error={
          restockVersionMismatch
            ? 'Phiếu đã thay đổi. Hãy tải lại trước khi nhập kho.'
            : restockOptionsQuery.isError || restockDetailQuery.isError
              ? getApiErrorMessage(
                  restockOptionsQuery.error ?? restockDetailQuery.error,
                  'Không thể tải vị trí nhập lại kho. Vui lòng thử lại.'
                )
              : null
        }
        onRetry={() => {
          void restockDetailQuery.refetch()
          void restockOptionsQuery.refetch()
        }}
        isPending={restockMutation.isPending}
        onOpenChange={(open) => {
          if (!open && !restockMutation.isPending) {
            restockHydrated.current = ''
            setRestockingItem(null)
            restockForm.reset({ items: [] })
          }
        }}
        onSubmit={restock}
      />
    </div>
  )
}
