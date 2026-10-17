'use client'

import { useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { operationalToday } from '@/lib/operational-date-time'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { OpeningStockDirectory, type OpeningStockDraftLine } from '../components/OpeningStocksPage'
import {
  useOpeningStockActionMutation,
  useOpeningStocksQuery,
  useUpdateOpeningStockMutation,
  useInventoryWarehouseOptionsQuery,
} from '../hooks/use-inventory'
import {
  createOpeningStockSchema,
  type CreateOpeningStockFormValues,
} from '../schemas/create-opening-stock.schema'
import type { OpeningStockRecord, OpeningStockStatus } from '../types/inventory.types'
import { useOpeningStockOptions } from '../hooks/use-opening-stock-options'
import { useOpeningStockDraft } from '../hooks/use-opening-stock-draft'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  openingStockErrorMessage,
  openingStockLocationDescription,
} from '../utils/opening-stock-import'

export default function OpeningStocksPage({ recordId }: { readonly recordId?: string }) {
  const approvalCommands = useRef(new Map<string, string>())
  const meQuery = useMeQuery()
  const [page, setPage] = useState(1)
  const [filterWarehouseId, setFilterWarehouseId] = useState('')
  const [status, setStatus] = useState<OpeningStockStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 250)
  const recordsQuery = useOpeningStocksQuery({
    pageNumber: page,
    pageSize: 20,
    ...(recordId ? { id: recordId } : {}),
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    ...(filterWarehouseId ? { warehouseId: filterWarehouseId } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom ? { effectiveDateFrom: dateFrom } : {}),
    ...(dateTo ? { effectiveDateTo: dateTo } : {}),
  })
  const draft = useOpeningStockDraft()
  const actionMutation = useOpeningStockActionMutation()
  const updateMutation = useUpdateOpeningStockMutation()
  const form = useForm<CreateOpeningStockFormValues>({
    resolver: zodResolver(createOpeningStockSchema),
    defaultValues: {
      code: '',
      enteredUnitId: '',
      warehouseId: '',
      effectiveDate: operationalToday(),
      newLotNumber: '',
      manufacturedDate: '',
      expiryDate: '',
      acknowledgePendingLots: false,
      productId: '',
      slotId: '',
      lotId: '',
      quantity: 1,
      qualityStatus: 'Good',
      eligibilityStatus: 'Available',
    },
  })
  const warehouseId = useWatch({ control: form.control, name: 'warehouseId' })
  const productId = useWatch({ control: form.control, name: 'productId' })
  const [productSearch, setProductSearch] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [lotSearch, setLotSearch] = useState('')
  const lookup = useOpeningStockOptions({
    warehouseId,
    productId,
    productSearch: useDebouncedValue(productSearch, 250),
    locationSearch: useDebouncedValue(locationSearch, 250),
    lotSearch: useDebouncedValue(lotSearch, 250),
  })
  const warehousesQuery = useInventoryWarehouseOptionsQuery()
  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data ?? []).map((item) => ({
        value: item.id,
        label: `${item.warehouseCode} · ${item.warehouseName}`,
      })),
    [warehousesQuery.data]
  )
  const productOptions = useMemo(
    () =>
      (lookup.data?.products ?? []).map((item) => ({
        value: item.id,
        label: `${item.sku} · ${item.productName}`,
        unitId: item.unitId,
        unitName: item.unitName,
        isLotTracked: item.isLotTracked,
        units: item.units,
        quantityPrecision: item.quantityPrecision,
      })),
    [lookup.data?.products]
  )
  const slotOptions = useMemo(
    () =>
      (lookup.data?.locations ?? []).map((item) => ({
        value: item.id,
        label: item.label,
        description: openingStockLocationDescription(item),
      })),
    [lookup.data?.locations]
  )
  const lotOptions = useMemo(
    () =>
      (lookup.data?.lots ?? []).map((item) => ({
        value: item.id,
        label: `${item.lotNumber}${item.status === 'Active' ? '' : ' · Hết hạn/bị khóa — chỉ được giữ'}`,
      })),
    [lookup.data?.lots]
  )

  async function create(values: CreateOpeningStockFormValues, lines: OpeningStockDraftLine[]) {
    form.clearErrors('root.server')
    try {
      await draft.save({
        code: values.code,
        warehouseId: values.warehouseId,
        file: values.evidenceFile,
        effectiveDate: values.effectiveDate,
        formVersion: 1,
        acknowledgePendingLots: values.acknowledgePendingLots,
        lines: lines.map((line) => ({
          productId: line.productId,
          slotId: line.slotId,
          ...(line.lotId ? { lotId: line.lotId } : {}),
          ...(line.newLot ? { newLot: line.newLot } : {}),
          quantity: line.quantity,
          enteredUnitId: line.enteredUnitId,
          conversionFactor: line.conversionFactor,
          qualityStatus: line.qualityStatus,
          eligibilityStatus: line.eligibilityStatus,
        })),
      })
      form.reset()
      toast.success('Đã tạo chứng từ tồn đầu ở trạng thái nháp.')
    } catch (error) {
      const message = openingStockErrorMessage(error, 'Không thể tạo chứng từ tồn đầu.')
      form.setError('root.server', { type: 'server', message })
      toast.error(message)
      throw error
    }
  }

  async function update(item: OpeningStockRecord, lines: OpeningStockDraftLine[]) {
    if (!item.version) {
      toast.error('Chứng từ chưa có phiên bản. Vui lòng tải lại.')
      return
    }
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        expectedVersion: item.version,
        ...(item.requiresV1Client || !item.isLegacyDate
          ? { effectiveDate: form.getValues('effectiveDate'), formVersion: 1 as const }
          : {}),
        acknowledgePendingLots: form.getValues('acknowledgePendingLots'),
        lines: lines.map((line) => ({
          ...(line.id ? { id: line.id } : {}),
          productId: line.productId,
          slotId: line.slotId,
          ...(line.lotId ? { lotId: line.lotId } : {}),
          ...(line.newLot ? { newLot: line.newLot } : {}),
          quantity: line.quantity,
          enteredUnitId: line.enteredUnitId,
          conversionFactor: line.conversionFactor,
          qualityStatus: line.qualityStatus,
          eligibilityStatus: line.eligibilityStatus,
        })),
      })
      toast.success('Đã cập nhật các dòng kiểm đếm. Bạn có thể gửi lại để duyệt.')
    } catch (error) {
      toast.error(openingStockErrorMessage(error, 'Không thể cập nhật chứng từ tồn đầu.'))
      throw error
    }
  }

  async function action(
    item: OpeningStockRecord,
    actionName: 'submit' | 'approve' | 'review' | 'cancel' | 'withdraw',
    decision?: 'Returned' | 'Rejected' | 'Cancelled',
    reason?: string,
    selfApprovalAcknowledged = false
  ) {
    if (!item.version) {
      toast.error('Chứng từ chưa có phiên bản. Vui lòng tải lại.')
      return
    }
    try {
      if (actionName === 'review' && decision)
        await actionMutation.mutateAsync({
          action: 'review',
          id: item.id,
          expectedVersion: item.version,
          decision,
          reason: reason ?? '',
          selfApprovalAcknowledged,
        })
      else if (actionName === 'cancel')
        await actionMutation.mutateAsync({
          action: 'cancel',
          id: item.id,
          expectedVersion: item.version,
          reason: reason ?? '',
        })
      else if (actionName === 'withdraw')
        await actionMutation.mutateAsync({
          action: 'withdraw',
          id: item.id,
          expectedVersion: item.version,
          reason: reason ?? '',
        })
      else if (actionName === 'approve') {
        const key = `${item.id}:${item.version}`
        const commandId = approvalCommands.current.get(key) ?? crypto.randomUUID()
        approvalCommands.current.set(key, commandId)
        await actionMutation.mutateAsync({
          action: 'approve',
          id: item.id,
          expectedVersion: item.version,
          selfApprovalAcknowledged,
          formVersion: 1,
          commandId,
        })
        approvalCommands.current.delete(key)
      } else if (actionName === 'submit')
        await actionMutation.mutateAsync({
          action: 'submit',
          id: item.id,
          expectedVersion: item.version,
        })
      toast.success(
        actionName === 'approve' ? 'Đã duyệt và ghi sổ tồn đầu.' : 'Đã cập nhật chứng từ tồn đầu.'
      )
    } catch (error) {
      toast.error(openingStockErrorMessage(error, 'Không thể cập nhật chứng từ tồn đầu.'))
      throw error
    }
  }

  const permissions = meQuery.data?.permissions ?? []
  return (
    <OpeningStockDirectory
      recordId={recordId}
      permissions={permissions}
      isCreateUncertain={draft.uncertain}
      search={search}
      lookupSearch={{ product: productSearch, location: locationSearch, lot: lotSearch }}
      onLookupSearch={(kind, value) => {
        if (kind === 'product') setProductSearch(value)
        else if (kind === 'location') setLocationSearch(value)
        else setLotSearch(value)
      }}
      lookupError={lookup.isError}
      onLookupRetry={() => void lookup.refetch()}
      onSearchChange={(value) => {
        setSearch(value)
        setPage(1)
      }}
      currentUserId={meQuery.data?.id ?? null}
      items={recordsQuery.data?.items ?? []}
      form={form}
      warehouseOptions={warehouseOptions}
      managedWarehouseOptions={warehouseOptions.filter(
        (option) =>
          warehousesQuery.data?.find((warehouse) => warehouse.id === option.value)
            ?.canManageWarehouse
      )}
      page={recordsQuery.data?.pageNumber ?? page}
      pageSize={recordsQuery.data?.pageSize ?? 20}
      totalCount={recordsQuery.data?.totalCount ?? 0}
      filterWarehouseId={filterWarehouseId}
      statusFilter={status}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={(value) => {
        setDateFrom(value)
        setPage(1)
      }}
      onDateToChange={(value) => {
        setDateTo(value)
        setPage(1)
      }}
      onPageChange={setPage}
      onFilterWarehouseChange={(value) => {
        setFilterWarehouseId(value)
        setPage(1)
      }}
      onStatusFilterChange={(value) => {
        setStatus(value)
        setPage(1)
      }}
      productOptions={productOptions}
      slotOptions={slotOptions}
      lotOptions={lotOptions}
      areOptionsLoading={warehousesQuery.isLoading || lookup.isFetching}
      isLoading={recordsQuery.isLoading}
      isFetching={recordsQuery.isFetching}
      isError={recordsQuery.isError}
      isPending={draft.isPending || updateMutation.isPending || actionMutation.isPending}
      canCreate={
        permissions.includes(P.INVENTORY_VIEW) && permissions.includes(P.INVENTORY_RESERVE)
      }
      canApprove={
        permissions.includes(P.INVENTORY_VIEW) && permissions.includes(P.STOCK_ADJUSTMENTS_APPROVE)
      }
      canSelfApprove={permissions.includes(P.INVENTORY_SELF_APPROVE_OPENING_STOCK)}
      onRetry={() => void recordsQuery.refetch()}
      onCreate={create}
      onUpdate={update}
      onAction={action}
    />
  )
}
