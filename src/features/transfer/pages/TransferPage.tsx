'use client'

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
import type { TransferStatus } from '../types/transfer.types'
import { transferGoodsRows } from '../utils/transfer-goods-rows'
import { parseTransferStage } from '../utils/transfer-stage'

export default function TransferPage() {
  const [searchText, setSearchText] = useState('')
  const stage = parseTransferStage(useSearchParams().get('tab'))
  const [status, setStatus] = useState<TransferStatus | ''>('')
  // Đổi tab thì về trang đầu và bỏ lọc trạng thái của tab trước (các tab có tập trạng thái khác nhau).
  const [seenStage, setSeenStage] = useState(stage)
  const [sourceWarehouseId, setSourceWarehouseId] = useState('')
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [previewId, setPreviewId] = useState('')
  const [isDetailExpanded, setIsDetailExpanded] = useLocalStorage(
    TRANSFER_DETAIL_STORAGE_KEY,
    false
  )

  if (stage !== seenStage) {
    setSeenStage(stage)
    setStatus('')
    setPage(1)
  }

  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const { viewer } = useTransferViewer()
  const transfersQuery = useTransfersQuery({
    pageNumber: page,
    pageSize,
    stage,
    ...(status ? { status } : {}),
    ...(sourceWarehouseId ? { sourceWarehouseId } : {}),
    ...(destinationWarehouseId ? { destinationWarehouseId } : {}),
    ...(debouncedSearchText.trim() ? { searchTerm: debouncedSearchText.trim() } : {}),
    ...(dateFrom ? { dateFrom: toOperationalDateTimeStart(dateFrom) } : {}),
    ...(dateTo ? { dateTo: toOperationalDateTimeEnd(dateTo) } : {}),
  })
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

  function updateFilter<TValue>(setValue: (value: TValue) => void, value: TValue) {
    setValue(value)
    setPage(1)
  }

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
          stage={stage}
          openDiscrepancyCount={transfersQuery.data?.openDiscrepancyCount ?? 0}
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
          onSearchChange={(value) => updateFilter(setSearchText, value)}
          onStatusChange={(value) => updateFilter(setStatus, value)}
          onSourceWarehouseChange={(value) => updateFilter(setSourceWarehouseId, value)}
          onDestinationWarehouseChange={(value) => updateFilter(setDestinationWarehouseId, value)}
          onDateFromChange={(value) => updateFilter(setDateFrom, value)}
          onDateToChange={(value) => updateFilter(setDateTo, value)}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value)
            setPage(1)
          }}
          onRetry={() => void transfersQuery.refetch()}
          onPreview={(transfer) => setPreviewId(transfer.id)}
        />
      </TransferMasterDetail>
    </div>
  )
}
