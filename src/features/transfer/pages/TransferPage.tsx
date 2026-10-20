'use client'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { P } from '@/config/permissionCodes'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import {
  toOperationalDateTimeEnd,
  toOperationalDateTimeStart,
} from '@/features/inbound-request/utils/inbound-request-format'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useLocalStorage } from '@/hooks/use-local-storage'
import {
  TRANSFER_DETAIL_STORAGE_KEY,
  TransferGoodsTable,
  TransferMasterDetail,
} from '../components/TransferGoods'
import { TransferDirectory } from '../components/TransfersPage'
import { useTransferRealtime } from '../hooks/use-transfer-realtime'
import { useTransferViewer } from '../hooks/use-transfer-viewer'
import { useTransferQuery, useTransfersQuery } from '../hooks/use-transfers'
import { transferGoodsRows } from '../utils/transfer-goods-rows'
import { readTransferListState } from '../utils/transfer-list-state'

export default function TransferPage() {
  const searchParams = useSearchParams()
  const { status, page, pageSize, search: searchText } = readTransferListState(searchParams)
  const sourceWarehouseId = searchParams.get('source') ?? ''
  const destinationWarehouseId = searchParams.get('destination') ?? ''
  const dateFrom = searchParams.get('from') ?? ''
  const dateTo = searchParams.get('to') ?? ''
  const [previewId, setPreviewId] = useState('')
  const [isDetailExpanded, setIsDetailExpanded] = useLocalStorage(
    TRANSFER_DETAIL_STORAGE_KEY,
    false
  )

  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const { viewer } = useTransferViewer()
  const exportFilters = {
    pageNumber: page,
    pageSize,
    ...(status ? { status } : {}),
    ...(sourceWarehouseId ? { sourceWarehouseId } : {}),
    ...(destinationWarehouseId ? { destinationWarehouseId } : {}),
    ...(debouncedSearchText.trim() ? { searchTerm: debouncedSearchText.trim() } : {}),
    ...(dateFrom ? { dateFrom: toOperationalDateTimeStart(dateFrom) } : {}),
    ...(dateTo ? { dateTo: toOperationalDateTimeEnd(dateTo) } : {}),
  }
  const transfersQuery = useTransfersQuery(exportFilters)
  const warehousesQuery = useWarehousesQuery({
    top: 100,
    skip: 0,
    needTotalCount: true,
    isActive: true,
  })

  const warehouses = warehousesQuery.data?.items
  const warehouseOptions = useMemo(
    () =>
      (warehouses ?? []).map((warehouse) => ({
        id: warehouse.id,
        name: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
      })),
    [warehouses]
  )
  const warehouseIds = useMemo(
    () => warehouseOptions.map((warehouse) => warehouse.id),
    [warehouseOptions]
  )
  useTransferRealtime({ warehouseIds })

  const preview =
    !transfersQuery.isError && !transfersQuery.isPlaceholderData
      ? transfersQuery.data?.items.find((item) => item.id === previewId)
      : undefined
  const previewQuery = useTransferQuery(isDetailExpanded && preview ? preview.id : null)

  function updateFilter(key: string, value: string | number, resetPage = true, replace = false) {
    const params = new URLSearchParams(window.location.search)
    params.delete('tab')
    // Giữ ý nghĩa bookmark cũ khi chuyển sang URL mới.
    if (status) params.set('status', status)
    if (String(value)) params.set(key, String(value))
    else params.delete(key)
    if (resetPage) params.delete('page')
    const url = params.size ? `${window.location.pathname}?${params}` : window.location.pathname
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
  }

  const listExport = useListExport({
    dataset: 'transfers',
    filters: exportFilters,
    permissions: viewer.permissions,
    viewPermission: P.TRANSFERS_VIEW,
    totalCount: transfersQuery.data?.totalCount ?? 0,
    isFetching: transfersQuery.isFetching,
    isError: transfersQuery.isError,
    blocked: searchText !== debouncedSearchText,
  })
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <TransferMasterDetail
        expanded={isDetailExpanded}
        onExpandedChange={setIsDetailExpanded}
        referenceCode={preview?.transferCode}
        detail={
          <TransferGoodsTable
            key={preview?.id ?? ''}
            selected={Boolean(preview)}
            rows={transferGoodsRows(previewQuery.data)}
            isLoading={Boolean(preview) && previewQuery.isLoading}
            isError={previewQuery.isError}
            onRetry={() => void previewQuery.refetch()}
          />
        }
      >
        <TransferDirectory
          exportAction={
            listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
          }
          statusCounts={
            !transfersQuery.isPlaceholderData ? transfersQuery.data?.statusCounts : undefined
          }
          items={transfersQuery.data?.items ?? []}
          totalCount={transfersQuery.data?.totalCount ?? 0}
          page={page}
          pageSize={pageSize}
          searchText={searchText}
          status={status}
          sourceWarehouseId={sourceWarehouseId}
          destinationWarehouseId={destinationWarehouseId}
          dateFrom={dateFrom}
          dateTo={dateTo}
          warehouseOptions={warehouseOptions}
          previewId={preview?.id}
          canCreate={viewer.permissions.includes(P.TRANSFERS_CREATE)}
          currentUserId={viewer.currentUserId}
          isLoading={transfersQuery.isLoading}
          isFetching={transfersQuery.isFetching}
          isError={transfersQuery.isError}
          onSearchChange={(value) => updateFilter('search', value, true, true)}
          onStatusChange={(value) => updateFilter('status', value)}
          onSourceWarehouseChange={(value) => updateFilter('source', value)}
          onDestinationWarehouseChange={(value) => updateFilter('destination', value)}
          onDateFromChange={(value) => updateFilter('from', value)}
          onDateToChange={(value) => updateFilter('to', value)}
          onPageChange={(value) => updateFilter('page', value, false)}
          onPageSizeChange={(value) => updateFilter('pageSize', value)}
          onRetry={() => void transfersQuery.refetch()}
          onPreview={(transfer) => setPreviewId(transfer.id)}
        />
      </TransferMasterDetail>
    </div>
  )
}
