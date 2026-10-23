'use client'

import { P } from '@/config/permissionCodes'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useWarehousesQuery } from '@/features/warehouse/hooks/use-warehouse'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { APP_ROUTES } from '@/routes/app-routes'
import { StockIssueRequestDirectory } from '../components/StockIssueRequestsPage'
import { StockIssueWorkflowDialogs } from '../components/StockIssueWorkflow'
import {
  useStockIssueRequestsQuery,
  useStockRecipientOptionsQuery,
} from '../hooks/use-stock-issue-requests'
import { useStockIssueWorkflow } from '../hooks/use-stock-issue-workflow'
import type { StockIssueRequestStatus } from '../types/stock-issue.types'

export default function StockIssueRequestPage() {
  const [searchText, setSearchText] = useState('')
  const [status, setStatus] = useState<StockIssueRequestStatus | ''>('')
  const [warehouseId, setWarehouseId] = useState('')
  const [stockRecipientId, setStockRecipientId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [assignedToMe, setAssignedToMe] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const debouncedSearchText = useDebouncedValue(searchText, 350)

  const meQuery = useMeQuery()
  const workflow = useStockIssueWorkflow()
  const exportFilters = {
    pageNumber: page,
    pageSize,
    ...(status ? { status } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(debouncedSearchText.trim() ? { searchTerm: debouncedSearchText.trim() } : {}),
    ...(stockRecipientId ? { stockRecipientId } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(assignedToMe ? { assignedToMe } : {}),
  }
  const ordersQuery = useStockIssueRequestsQuery(exportFilters)
  const stockRecipientOptionsQuery = useStockRecipientOptionsQuery({ pageNumber: 1, pageSize: 200 })
  const warehousesQuery = useWarehousesQuery({
    top: 100,
    skip: 0,
    needTotalCount: true,
    isActive: true,
  })
  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.items ?? []).map((warehouse) => ({
        id: warehouse.id,
        name: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
      })),
    [warehousesQuery.data?.items]
  )
  const stockRecipientOptions = useMemo(
    () =>
      (stockRecipientOptionsQuery.data?.items ?? []).map((stockRecipient) => ({
        id: stockRecipient.id,
        name: `${stockRecipient.recipientCode} · ${stockRecipient.recipientName}`,
      })),
    [stockRecipientOptionsQuery.data?.items]
  )

  function updateFilter<TValue>(setValue: (value: TValue) => void, value: TValue) {
    setValue(value)
    setPage(1)
  }

  const listExport = useListExport({
    dataset: 'stock-issues',
    filters: exportFilters,
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: P.STOCK_ISSUE_REQUESTS_VIEW,
    totalCount: ordersQuery.data?.totalCount ?? 0,
    isFetching: ordersQuery.isFetching,
    isError: ordersQuery.isError,
    blocked: searchText !== debouncedSearchText,
  })
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex min-w-0 shrink-0 justify-end gap-2">
        <h1 className="sr-only">Yêu cầu xuất kho</h1>
        {workflow.capabilities.canCreate ? (
          <div className="flex min-w-0 flex-wrap justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={APP_ROUTES.stockIssueRequestImport as Route}>
                <Upload aria-hidden="true" />
                Nhập từ Excel
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={APP_ROUTES.stockIssueRequestCreate as Route}>
                <Plus aria-hidden="true" />
                Tạo yêu cầu xuất kho
              </Link>
            </Button>
          </div>
        ) : null}
      </header>
      <StockIssueRequestDirectory
        exportAction={
          listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
        }
        items={ordersQuery.data?.items ?? []}
        totalCount={ordersQuery.data?.totalCount ?? 0}
        statusCounts={ordersQuery.data?.statusCounts ?? []}
        page={page}
        pageSize={pageSize}
        searchText={searchText}
        status={status}
        warehouseId={warehouseId}
        stockRecipientId={stockRecipientId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        assignedToMe={assignedToMe}
        stockRecipientOptions={stockRecipientOptions}
        warehouseOptions={warehouseOptions}
        capabilities={workflow.capabilities}
        handlers={workflow.handlers}
        isLoading={ordersQuery.isLoading}
        isFetching={ordersQuery.isFetching}
        isError={ordersQuery.isError}
        onSearchChange={(value) => updateFilter(setSearchText, value)}
        onStatusChange={(value) => updateFilter(setStatus, value)}
        onWarehouseChange={(value) => updateFilter(setWarehouseId, value)}
        onStockRecipientChange={(value) => updateFilter(setStockRecipientId, value)}
        onDateFromChange={(value) => updateFilter(setDateFrom, value)}
        onDateToChange={(value) => updateFilter(setDateTo, value)}
        onAssignedToMeChange={(value) => updateFilter(setAssignedToMe, value)}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value)
          setPage(1)
        }}
        onRetry={() => void ordersQuery.refetch()}
      />
      <StockIssueWorkflowDialogs workflow={workflow} />
    </div>
  )
}
