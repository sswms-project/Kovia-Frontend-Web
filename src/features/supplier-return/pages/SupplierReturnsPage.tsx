'use client'

import { useReturnCommand } from '@/features/warehouse-task/hooks/use-return-command'

import { ReturnWorkPanel } from '@/features/warehouse-task/components/ReturnWorkPanel'
import { useReturnWork } from '@/features/warehouse-task/hooks/use-return-work'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useId, useState } from 'react'
import { useGoodsPreviewSelection } from '@/hooks/use-goods-preview-selection'
import { ReturnGoodsPreview } from '@/components/operations/ReturnGoodsPreview'
import {
  SUPPLIER_RETURN_GOODS_COLUMNS,
  supplierReturnGoodsRows,
} from '../utils/return-goods-preview'
import { APP_ROUTES } from '@/routes/app-routes'
import { useReturnListState } from '@/hooks/use-return-list-state'
import { useReturnDocumentEditing } from '@/hooks/use-return-document-editing'
import {
  ReturnDocumentActions,
  ReturnDocumentActionDialog,
} from '@/components/operations/ReturnDocumentActions'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import { USER_ROLES } from '@/config/roles'
import { AiDraftPrefillNotice } from '@/features/ai-assistant/components/AiDraftPrefillNotice'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useSuppliersQuery } from '@/features/supplier/hooks/use-suppliers'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  ConfirmSupplierReturnDeliveryDialog,
  CreateSupplierReturnDialog,
  SupplierReturnDecisionDialog,
  SupplierReturnDetail,
  SupplierReturnDirectory,
  type SupplierReturnDecision,
} from '../components/SupplierReturnsPage'
import {
  useApproveSupplierReturnMutation,
  useCancelSupplierReturnMutation,
  useConfirmSupplierReturnDeliveryMutation,
  useRejectSupplierReturnMutation,
  useSupplierReturnQuery,
  useSupplierReturnsQuery,
} from '../hooks/use-supplier-returns'
import { useSupplierReturnCreateDialog } from '../hooks/use-supplier-return-create-dialog'
import {
  confirmSupplierReturnDeliverySchema,
  supplierReturnReasonSchema,
  type ConfirmSupplierReturnDeliveryFormValues,
  type SupplierReturnReasonFormValues,
} from '../schemas/supplier-return.schema'
import { SUPPLIER_RETURN_STATUSES, type SupplierReturn } from '../types/supplier-return.types'

export default function SupplierReturnsPage({
  returnId,
  taskView = false,
}: {
  readonly returnId?: string
  readonly taskView?: boolean
}) {
  const router = useRouter()
  const deliveryCommand =
    useReturnCommand<
      Parameters<ReturnType<typeof useConfirmSupplierReturnDeliveryMutation>['mutateAsync']>[0]
    >()
  const searchParams = useSearchParams()
  const legacyDetailId = searchParams.get('id')
  const list = useReturnListState(APP_ROUTES.supplierReturns, SUPPLIER_RETURN_STATUSES)
  const {
    page,
    pageSize,
    searchText,
    status,
    warehouseId,
    supplierId,
    dateFrom,
    dateTo,
    setPage,
    setPageSize,
    setSearchText,
    setStatus,
    setWarehouseId,
    setSupplierId,
    setDateFrom,
    setDateTo,
  } = list
  const legacyHref = legacyDetailId ? list.detailHref(legacyDetailId) : null
  useEffect(() => {
    if (!returnId && legacyHref) router.replace(legacyHref as Route)
  }, [returnId, legacyHref, router])
  const meQuery = useMeQuery()
  const permissions = meQuery.data?.permissions ?? []
  const canApprove =
    meQuery.data?.role !== USER_ROLES.WarehouseStaff &&
    permissions.includes(P.SUPPLIER_RETURNS_APPROVE)
  const canSelfApprove = canApprove && permissions.includes(P.SUPPLIER_RETURNS_SELF_APPROVE)
  const canDispatch = permissions.includes(P.SUPPLIER_RETURNS_DISPATCH)
  const [decision, setDecision] = useState<{
    type: SupplierReturnDecision
    item: SupplierReturn
  } | null>(null)
  const [deliveringItem, setDeliveringItem] = useState<SupplierReturn | null>(null)
  const returnWork = useReturnWork(true, returnId ?? deliveringItem?.id ?? null)
  const debouncedSearchText = useDebouncedValue(searchText.trim(), 350)

  const listQuery = useSupplierReturnsQuery(
    {
      page,
      pageSize,
      ...(debouncedSearchText ? { search: debouncedSearchText } : {}),
      ...(status ? { status } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(dateFrom ? { from: dateFrom } : {}),
      ...(dateTo ? { to: dateTo } : {}),
    },
    !returnId && !legacyDetailId
  )
  const detailQuery = useSupplierReturnQuery(returnId ?? null)
  const createDialog = useSupplierReturnCreateDialog({ returnId, detail: detailQuery.data })
  const previewPanelId = useId()
  const preview = useGoodsPreviewSelection(
    'return-goods-detail:supplier:v1',
    JSON.stringify([
      meQuery.data?.id,
      returnId,
      page,
      pageSize,
      searchText,
      status,
      warehouseId,
      supplierId,
      dateFrom,
      dateTo,
    ]),
    (listQuery.data?.items ?? []).map((item) => item.id),
    !returnId &&
      !legacyDetailId &&
      listQuery.isSuccess &&
      !listQuery.isError &&
      !listQuery.isPlaceholderData &&
      searchText.trim() === debouncedSearchText &&
      !meQuery.isError &&
      permissions.includes(P.SUPPLIER_RETURNS_VIEW)
  )
  const previewQuery = useSupplierReturnQuery(preview.expanded && preview.id ? preview.id : null)
  const previewDocument =
    !previewQuery.isError && previewQuery.data?.id === preview.id ? previewQuery.data : null
  const previewCode = (listQuery.data?.items ?? []).find((item) => item.id === preview.id)?.code
  const editing = useReturnDocumentEditing('supplierReturns', detailQuery.data, list.listHref)
  const warehousesQuery = useWarehousesQuery(
    {
      top: 100,
      skip: 0,
      needTotalCount: true,
      isActive: true,
    },
    !returnId || Boolean(createDialog.editingDocument)
  )
  const suppliersQuery = useSuppliersQuery(
    { pageNumber: 1, pageSize: 100, status: 'Active' },
    !returnId || Boolean(createDialog.editingDocument)
  )

  const reasonForm = useForm<SupplierReturnReasonFormValues>({
    resolver: zodResolver(supplierReturnReasonSchema),
    defaultValues: { reason: '' },
  })
  const deliveryForm = useForm<ConfirmSupplierReturnDeliveryFormValues>({
    resolver: zodResolver(confirmSupplierReturnDeliverySchema),
    defaultValues: { items: [] },
  })
  const approveMutation = useApproveSupplierReturnMutation()
  const rejectMutation = useRejectSupplierReturnMutation()
  const cancelMutation = useCancelSupplierReturnMutation()
  const deliverMutation = useConfirmSupplierReturnDeliveryMutation()

  const warehouseOptions = (warehousesQuery.data?.items ?? []).map((warehouse) => ({
    id: warehouse.id,
    label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
  }))
  const supplierOptions = (suppliersQuery.data?.items ?? []).map((supplier) => ({
    id: supplier.id,
    label: `${supplier.supplierCode} · ${supplier.supplierName}`,
  }))

  async function approve(item: SupplierReturn, selfApprovalAcknowledged = false) {
    if (!canApprove || meQuery.isError || meQuery.isFetching) return
    if (
      item.createdById === meQuery.data?.id &&
      (!canSelfApprove || !selfApprovalAcknowledged || !item.version)
    ) {
      toast.error('Cần quyền tự duyệt, xác nhận rõ và phiên bản phiếu mới nhất. Vui lòng tải lại.')
      return
    }
    try {
      await approveMutation.mutateAsync({
        supplierReturnId: item.id,
        selfApprovalAcknowledged,
        expectedVersion: item.version,
      })
      toast.success('Đã duyệt phiếu trả hàng NCC.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể duyệt phiếu trả hàng NCC.'))
    }
  }

  function openDecision(type: SupplierReturnDecision, item: SupplierReturn) {
    reasonForm.reset({ reason: '' })
    setDecision({ type, item })
  }

  function closeDecision() {
    setDecision(null)
    reasonForm.reset({ reason: '' })
  }

  async function submitDecision(values: SupplierReturnReasonFormValues) {
    if (!decision) return
    const mutation = decision.type === 'reject' ? rejectMutation : cancelMutation
    try {
      await mutation.mutateAsync({
        supplierReturnId: decision.item.id,
        request: { ...values, expectedVersion: decision.item.version },
      })
      toast.success(
        decision.type === 'reject' ? 'Đã từ chối phiếu trả hàng NCC.' : 'Đã huỷ phiếu trả hàng NCC.'
      )
      closeDecision()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật phiếu trả hàng NCC.'))
    }
  }

  function openDelivery(item: SupplierReturn) {
    deliveryForm.reset({
      items: item.items.map((line) => ({
        itemId: line.id,
        approvedQuantity: line.quantity,
        deliveredQuantity: line.quantity,
        quantityPrecision: line.quantityPrecision ?? 2,
      })),
    })
    setDeliveringItem(item)
  }

  function closeDelivery() {
    if (deliverMutation.isPending || deliveryCommand.isLocked) return
    setDeliveringItem(null)
    deliveryForm.reset({ items: [] })
  }

  async function confirmDelivery(values: ConfirmSupplierReturnDeliveryFormValues) {
    if (!deliveringItem) return
    try {
      await deliveryCommand.run(
        () => ({
          supplierReturnId: deliveringItem!.id,
          request: {
            expectedVersion: deliveringItem!.version,
            ...returnWork.proof(values, deliveringItem!.version),
            lines: values.items.map((item) => ({
              itemId: item.itemId,
              deliveredQuantity: item.deliveredQuantity,
            })),
          },
        }),
        (request) => deliverMutation.mutateAsync(request)
      )
      void returnWork.refresh()
      toast.success('Đã xác nhận giao hàng trả NCC.')
      router.replace(APP_ROUTES.supplierReturnDetail(deliveringItem.id) as Route)
      setDeliveringItem(null)
      deliveryForm.reset({ items: [] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể xác nhận giao hàng trả NCC.'))
    }
  }

  const resetPageThen =
    <T,>(setter: (value: T) => void) =>
    (value: T) =>
      setter(value)

  return (
    <div
      className={
        returnId ? 'flex w-full min-w-0 flex-col gap-4 pb-3' : 'flex h-full min-h-0 flex-col gap-4'
      }
    >
      {returnId ? (
        <SupplierReturnDetail
          taskView={taskView}
          workPanel={<ReturnWorkPanel key={returnId} supplier={true} documentId={returnId} />}
          editingActions={
            <ReturnDocumentActions
              allowedActions={detailQuery.data?.allowedActions ?? []}
              disabled={editing.isPending || detailQuery.isFetching || createDialog.isOpen}
              onEdit={createDialog.openEdit}
              onAction={editing.open}
            />
          }
          item={detailQuery.data ?? null}
          isLoading={detailQuery.isLoading}
          isError={detailQuery.isError}
          listHref={taskView ? APP_ROUTES.myTasks : list.listHref}
          canApprove={canApprove && !meQuery.isFetching && !detailQuery.isFetching}
          canSelfApprove={canSelfApprove}
          canViewSourceReceipt={permissions.includes(P.GOODS_RECEIPTS_VIEW)}
          workStarted={Boolean(returnWork.query.data?.startedAt)}
          canDispatch={
            canDispatch &&
            !meQuery.isFetching &&
            !detailQuery.isFetching &&
            !returnWork.query.isFetching &&
            Boolean(returnWork.query.data) &&
            (!returnWork.query.data?.assignmentRequired || returnWork.query.data.canComplete)
          }
          isPending={
            meQuery.isFetching ||
            detailQuery.isFetching ||
            approveMutation.isPending ||
            rejectMutation.isPending ||
            cancelMutation.isPending ||
            deliverMutation.isPending
          }
          currentUserId={meQuery.data?.id ?? null}
          onRetry={() => void detailQuery.refetch()}
          onApprove={(item, acknowledged) => void approve(item, acknowledged)}
          onReject={(item) => openDecision('reject', item)}
          onCancel={(item) => openDecision('cancel', item)}
          onDeliver={openDelivery}
        />
      ) : (
        <SupplierReturnDirectory
          goodsPreview={{
            selectedId: preview.id,
            onSelect: preview.select,
            expanded: preview.expanded,
            onExpandedChange: preview.setExpanded,
            detailId: previewPanelId,
            detail: (
              <ReturnGoodsPreview
                key={preview.id || 'empty'}
                id={previewPanelId}
                anchorId={preview.anchorId}
                expanded={preview.expanded}
                selected={Boolean(preview.id)}
                referenceCode={previewCode}
                description={
                  previewDocument
                    ? [
                        previewDocument.warehouseName,
                        previewDocument.supplierName,
                        previewDocument.sourceGoodsReceiptCode
                          ? `Phiếu nhận: ${previewDocument.sourceGoodsReceiptCode}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : undefined
                }
                columns={SUPPLIER_RETURN_GOODS_COLUMNS}
                rows={previewDocument ? supplierReturnGoodsRows(previewDocument) : []}
                isLoading={previewQuery.isPending || (!previewDocument && !previewQuery.isError)}
                isError={previewQuery.isError}
                onRetry={() => {
                  if (preview.id && preview.expanded) void previewQuery.refetch()
                }}
              />
            ),
          }}
          items={listQuery.data?.items ?? []}
          totalCount={listQuery.data?.totalCount ?? 0}
          page={page}
          pageSize={pageSize}
          searchText={searchText}
          status={status}
          warehouseId={warehouseId}
          supplierId={supplierId}
          dateFrom={dateFrom}
          dateTo={dateTo}
          warehouses={warehouseOptions}
          suppliers={supplierOptions}
          permissions={permissions}
          canCreate={permissions.includes(P.SUPPLIER_RETURNS_CREATE)}
          isLoading={listQuery.isLoading}
          isFetching={listQuery.isFetching}
          isError={listQuery.isError}
          onSearchChange={resetPageThen(setSearchText)}
          onStatusChange={resetPageThen(setStatus)}
          onWarehouseChange={resetPageThen(setWarehouseId)}
          onSupplierChange={resetPageThen(setSupplierId)}
          onDateFromChange={resetPageThen(setDateFrom)}
          onDateToChange={resetPageThen(setDateTo)}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value)
          }}
          detailHref={list.detailHref}
          onInspect={(item) => router.push(list.detailHref(item.id) as Route)}
          onCreate={createDialog.openCreate}
          onRetry={() => void listQuery.refetch()}
        />
      )}
      <CreateSupplierReturnDialog
        key={`${createDialog.isOpen}:${createDialog.editingDocument?.id ?? 'new'}`}
        notice={
          createDialog.aiNotice ? (
            <AiDraftPrefillNotice
              isLoading={createDialog.aiNotice.isLoading}
              error={createDialog.aiNotice.error}
            />
          ) : null
        }
        warehouses={warehouseOptions}
        suppliers={supplierOptions}
        {...createDialog.dialogProps}
      />
      <ReturnDocumentActionDialog {...editing.dialog} />
      <SupplierReturnDecisionDialog
        item={decision?.item ?? null}
        decision={decision?.type ?? 'reject'}
        form={reasonForm}
        isPending={rejectMutation.isPending || cancelMutation.isPending}
        onOpenChange={(open) => {
          if (!open) closeDecision()
        }}
        onSubmit={(values) => void submitDecision(values)}
      />
      <ConfirmSupplierReturnDeliveryDialog
        item={deliveringItem}
        form={deliveryForm}
        isPending={deliverMutation.isPending}
        isUncertain={deliveryCommand.isUncertain}
        onResolve={() => void confirmDelivery(deliveryForm.getValues())}
        onOpenChange={(open) => {
          if (!open) closeDelivery()
        }}
        onSubmit={(values) => void confirmDelivery(values)}
      />
    </div>
  )
}
