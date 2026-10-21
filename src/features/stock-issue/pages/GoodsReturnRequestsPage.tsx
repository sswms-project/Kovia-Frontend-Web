'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { formatApiError, getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  useWarehouseLayoutQuery,
  useWarehouseQuery,
  useWarehousesQuery,
} from '@/features/warehouse/hooks/use-warehouse'
import {
  CreateGoodsReturnRequestDialog,
  RejectGoodsReturnRequestDialog,
  SelectStockIssueForReturnDialog,
  SelfApproveGoodsReturnDialog,
  RestockReturnDialog,
  GoodsReturnRequestDetailSheet,
  GoodsReturnRequestDirectory,
} from '../components/GoodsReturnRequestsPage'
import { useCreateGoodsReturn } from '../hooks/use-create-goods-return'
import {
  useApproveGoodsReturnRequestMutation,
  useRejectGoodsReturnRequestMutation,
  useGoodsReturnRequestsQuery,
  useGoodsReturnRequestQuery,
  useRestockGoodsReturnRequestMutation,
  useStockIssueRequestQuery,
} from '../hooks/use-stock-issue-requests'
import {
  rejectGoodsReturnRequestSchema,
  type RejectGoodsReturnRequestFormValues,
} from '../schemas/reject-return.schema'
import { restockReturnSchema, type RestockReturnFormValues } from '../schemas/restock-return.schema'
import type {
  GoodsReturnRequestStatus,
  GoodsReturnRequestSummary,
} from '../types/stock-issue.types'

export default function GoodsReturnRequestsPage() {
  const meQuery = useMeQuery()
  const createReturn = useCreateGoodsReturn()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchText, setSearchText] = useState('')
  const [status, setStatus] = useState<GoodsReturnRequestStatus | ''>('')
  const [warehouseId, setWarehouseId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [inspectedItem, setInspectedItem] = useState<GoodsReturnRequestSummary | null>(null)
  const [rejectingItem, setRejectingItem] = useState<GoodsReturnRequestSummary | null>(null)
  const [selfApprovingItem, setSelfApprovingItem] = useState<GoodsReturnRequestSummary | null>(null)
  const [restockingItem, setRestockingItem] = useState<GoodsReturnRequestSummary | null>(null)
  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const goodsReturnRequestsQuery = useGoodsReturnRequestsQuery({
    pageNumber: page,
    pageSize,
    ...(debouncedSearchText.trim() ? { searchTerm: debouncedSearchText.trim() } : {}),
    ...(status ? { status } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  })
  const warehousesQuery = useWarehousesQuery({
    top: 100,
    skip: 0,
    needTotalCount: true,
    isActive: true,
  })
  const returnDetailQuery = useGoodsReturnRequestQuery(inspectedItem?.id ?? null)
  const restockDetailQuery = useGoodsReturnRequestQuery(restockingItem?.id ?? null)
  const restockStockIssueQuery = useStockIssueRequestQuery(
    restockingItem?.stockIssueRequestId ?? null
  )
  const restockWarehouseId = restockStockIssueQuery.data?.warehouseId ?? ''
  const restockWarehouseQuery = useWarehouseQuery(restockWarehouseId)
  const restockLayoutQuery = useWarehouseLayoutQuery(
    restockWarehouseId,
    Boolean(restockWarehouseId)
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
    if (!restockDetailQuery.data) return
    restockForm.reset({
      items: restockDetailQuery.data.items.map((item) => ({
        returnItemId: item.id,
        condition: item.condition,
        restockSlotId:
          item.condition === 'Scrap'
            ? null
            : item.condition === 'Damaged' || item.condition === 'Expired'
              ? (restockWarehouseQuery.data?.quarantineSlotId ?? null)
              : item.restockSlotId,
      })),
    })
  }, [restockDetailQuery.data, restockForm, restockWarehouseQuery.data?.quarantineSlotId])

  async function approve(item: GoodsReturnRequestSummary, selfApprovalAcknowledged = false) {
    // Phiếu do chính mình lập phải được xác nhận rõ trước khi tự duyệt.
    if (item.createdBy === meQuery.data?.id && !selfApprovalAcknowledged) {
      setSelfApprovingItem(item)
      return
    }
    try {
      await approveMutation.mutateAsync({ goodsReturnRequestId: item.id, selfApprovalAcknowledged })
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
      await rejectMutation.mutateAsync({ goodsReturnRequestId: rejectingItem.id, request: values })
      toast.success('Đã từ chối yêu cầu trả hàng.')
      setRejectingItem(null)
      rejectForm.reset()
    } catch {
      toast.error('Không thể từ chối yêu cầu trả hàng.')
    }
  }

  async function restock(values: RestockReturnFormValues) {
    if (!restockingItem) return
    try {
      await restockMutation.mutateAsync({
        goodsReturnRequestId: restockingItem.id,
        request: values,
      })
      toast.success('Đã nhập lại kho theo kết quả kiểm tra thực tế.')
      setRestockingItem(null)
      restockForm.reset({ items: [] })
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể nhập lại kho.'))
    }
  }

  const restockSlots = (restockLayoutQuery.data ?? []).flatMap((zone) =>
    zone.racks.flatMap((rack) =>
      rack.slots
        .filter((slot) => slot.isActive)
        .map((slot) => ({
          id: slot.id,
          label: `${zone.zoneCode} · ${rack.rackCode} · ${slot.slotCode}`,
        }))
    )
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
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
          setPage(1)
        }}
        onStatusChange={(value) => {
          setStatus(value)
          setPage(1)
        }}
        onWarehouseChange={(value) => {
          setWarehouseId(value)
          setPage(1)
        }}
        onDateFromChange={(value) => {
          setDateFrom(value)
          setPage(1)
        }}
        onDateToChange={(value) => {
          setDateTo(value)
          setPage(1)
        }}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value)
          setPage(1)
        }}
        onInspect={setInspectedItem}
        onApprove={(item) => void approve(item)}
        onReject={setRejectingItem}
        onRestock={setRestockingItem}
        onCreate={createReturn.openPicker}
        onRetry={() => void goodsReturnRequestsQuery.refetch()}
      />
      <SelectStockIssueForReturnDialog {...createReturn.picker} />
      <CreateGoodsReturnRequestDialog {...createReturn.dialog} />
      <GoodsReturnRequestDetailSheet
        item={returnDetailQuery.data ?? null}
        isLoading={returnDetailQuery.isLoading}
        isError={returnDetailQuery.isError}
        onRetry={() => void returnDetailQuery.refetch()}
        onOpenChange={(open) => {
          if (!open) setInspectedItem(null)
        }}
      />
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
        item={restockDetailQuery.data ?? null}
        form={restockForm}
        slots={restockSlots}
        quarantineSlotId={restockWarehouseQuery.data?.quarantineSlotId ?? null}
        isPending={restockMutation.isPending}
        onOpenChange={(open) => {
          if (!open && !restockMutation.isPending) {
            setRestockingItem(null)
            restockForm.reset({ items: [] })
          }
        }}
        onSubmit={(values) => void restock(values)}
      />
    </div>
  )
}
