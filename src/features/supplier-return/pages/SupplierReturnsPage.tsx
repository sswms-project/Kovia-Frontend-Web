'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useInventoryQuery } from '@/features/inventory/hooks/use-inventory'
import { useSuppliersQuery } from '@/features/supplier/hooks/use-suppliers'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  ConfirmSupplierReturnDeliveryDialog,
  CreateSupplierReturnDialog,
  SupplierReturnDecisionDialog,
  SupplierReturnDetailSheet,
  SupplierReturnDirectory,
  type SupplierReturnDecision,
} from '../components/SupplierReturnsPage'
import {
  useApproveSupplierReturnMutation,
  useCancelSupplierReturnMutation,
  useConfirmSupplierReturnDeliveryMutation,
  useCreateSupplierReturnMutation,
  useRejectSupplierReturnMutation,
  useSupplierReturnQuery,
  useSupplierReturnsQuery,
} from '../hooks/use-supplier-returns'
import {
  confirmSupplierReturnDeliverySchema,
  createSupplierReturnSchema,
  supplierReturnReasonSchema,
  type ConfirmSupplierReturnDeliveryFormValues,
  type CreateSupplierReturnFormValues,
  type SupplierReturnReasonFormValues,
} from '../schemas/supplier-return.schema'
import type { SupplierReturn, SupplierReturnStatus } from '../types/supplier-return.types'

const EMPTY_CREATE_VALUES: CreateSupplierReturnFormValues = {
  warehouseId: '',
  supplierId: '',
  reason: '',
  negotiationNote: '',
  lines: [],
}

export default function SupplierReturnsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const detailId = searchParams.get('id')
  const isCreateOpen = searchParams.get('create') === '1'
  const meQuery = useMeQuery()
  const permissions = meQuery.data?.permissions ?? []
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchText, setSearchText] = useState('')
  const [status, setStatus] = useState<SupplierReturnStatus | ''>('')
  const [warehouseId, setWarehouseId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [stockSearch, setStockSearch] = useState('')
  const [decision, setDecision] = useState<{
    type: SupplierReturnDecision
    item: SupplierReturn
  } | null>(null)
  const [deliveringItem, setDeliveringItem] = useState<SupplierReturn | null>(null)
  const debouncedSearchText = useDebouncedValue(searchText.trim(), 350)
  const debouncedStockSearch = useDebouncedValue(stockSearch.trim(), 350)

  const listQuery = useSupplierReturnsQuery({
    page,
    pageSize,
    ...(debouncedSearchText ? { search: debouncedSearchText } : {}),
    ...(status ? { status } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(supplierId ? { supplierId } : {}),
    ...(dateFrom ? { from: dateFrom } : {}),
    ...(dateTo ? { to: dateTo } : {}),
  })
  const detailQuery = useSupplierReturnQuery(detailId)
  const warehousesQuery = useWarehousesQuery({
    top: 100,
    skip: 0,
    needTotalCount: true,
    isActive: true,
  })
  const suppliersQuery = useSuppliersQuery({ pageNumber: 1, pageSize: 100, status: 'Active' })

  const createForm = useForm<CreateSupplierReturnFormValues>({
    resolver: zodResolver(createSupplierReturnSchema),
    defaultValues: EMPTY_CREATE_VALUES,
  })
  const reasonForm = useForm<SupplierReturnReasonFormValues>({
    resolver: zodResolver(supplierReturnReasonSchema),
    defaultValues: { reason: '' },
  })
  const deliveryForm = useForm<ConfirmSupplierReturnDeliveryFormValues>({
    resolver: zodResolver(confirmSupplierReturnDeliverySchema),
    defaultValues: { items: [] },
  })
  const createWarehouseId = useWatch({ control: createForm.control, name: 'warehouseId' })
  const stocksQuery = useInventoryQuery(
    {
      pageNumber: 1,
      pageSize: 50,
      warehouseId: createWarehouseId,
      inStockOnly: true,
      ...(debouncedStockSearch ? { searchTerm: debouncedStockSearch } : {}),
    },
    isCreateOpen && Boolean(createWarehouseId)
  )

  const createMutation = useCreateSupplierReturnMutation()
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

  function navigate(query: Record<string, string>) {
    const search = new URLSearchParams(query).toString()
    router.replace((search ? `${pathname}?${search}` : pathname) as Route)
  }

  function openCreate() {
    createForm.reset(EMPTY_CREATE_VALUES)
    setStockSearch('')
    navigate({ create: '1' })
  }

  function closeCreate() {
    if (createMutation.isPending) return
    createForm.reset(EMPTY_CREATE_VALUES)
    setStockSearch('')
    navigate({})
  }

  async function create(values: CreateSupplierReturnFormValues) {
    try {
      await createMutation.mutateAsync({
        warehouseId: values.warehouseId,
        supplierId: values.supplierId,
        reason: values.reason,
        ...(values.negotiationNote ? { negotiationNote: values.negotiationNote } : {}),
        lines: values.lines.map((line) => ({
          inventoryStockId: line.inventoryStockId,
          quantity: line.quantity,
        })),
      })
      toast.success('Đã lập phiếu trả hàng NCC và giữ tồn.')
      closeCreate()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lập phiếu trả hàng NCC.'))
    }
  }

  async function approve(item: SupplierReturn) {
    try {
      await approveMutation.mutateAsync(item.id)
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
      await mutation.mutateAsync({ supplierReturnId: decision.item.id, request: values })
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
      })),
    })
    setDeliveringItem(item)
  }

  function closeDelivery() {
    if (deliverMutation.isPending) return
    setDeliveringItem(null)
    deliveryForm.reset({ items: [] })
  }

  async function confirmDelivery(values: ConfirmSupplierReturnDeliveryFormValues) {
    if (!deliveringItem) return
    try {
      await deliverMutation.mutateAsync({
        supplierReturnId: deliveringItem.id,
        request: {
          lines: values.items.map((item) => ({
            itemId: item.itemId,
            deliveredQuantity: item.deliveredQuantity,
          })),
        },
      })
      toast.success('Đã xác nhận giao hàng trả NCC.')
      setDeliveringItem(null)
      deliveryForm.reset({ items: [] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể xác nhận giao hàng trả NCC.'))
    }
  }

  const resetPageThen =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <SupplierReturnDirectory
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
          setPage(1)
        }}
        onInspect={(item) => navigate({ id: item.id })}
        onCreate={openCreate}
        onRetry={() => void listQuery.refetch()}
      />
      <SupplierReturnDetailSheet
        item={detailId ? (detailQuery.data ?? null) : null}
        isLoading={Boolean(detailId) && detailQuery.isLoading}
        isError={Boolean(detailId) && detailQuery.isError}
        permissions={permissions}
        currentUserName={meQuery.data?.fullName ?? null}
        onRetry={() => void detailQuery.refetch()}
        onOpenChange={(open) => {
          if (!open) navigate({})
        }}
        onApprove={(item) => void approve(item)}
        onReject={(item) => openDecision('reject', item)}
        onCancel={(item) => openDecision('cancel', item)}
        onDeliver={openDelivery}
      />
      <CreateSupplierReturnDialog
        open={isCreateOpen}
        form={createForm}
        warehouses={warehouseOptions}
        suppliers={supplierOptions}
        stocks={stocksQuery.data?.items ?? []}
        stockSearch={stockSearch}
        isStocksLoading={stocksQuery.isLoading}
        isPending={createMutation.isPending}
        onStockSearchChange={setStockSearch}
        onOpenChange={(open) => {
          if (!open) closeCreate()
        }}
        onSubmit={(values) => void create(values)}
      />
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
        onOpenChange={(open) => {
          if (!open) closeDelivery()
        }}
        onSubmit={(values) => void confirmDelivery(values)}
      />
    </div>
  )
}
