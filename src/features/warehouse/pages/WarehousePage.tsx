'use client'

import { useMeQuery } from '@/features/auth/hooks/use-auth'

import { P } from '@/config/permissionCodes'

import { ExcelExportButton } from '@/components/operations/ExcelExportButton'
import { useListExport } from '@/features/list-export/hooks/use-list-export'

import { useState } from 'react'
import { Building2, Plus, RefreshCw, TriangleAlert, Warehouse } from 'lucide-react'
import { toast } from 'sonner'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { logger } from '@/lib/logger'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiErrorResponse } from '@/types/api'
import { WarehouseCreateDialog, WarehouseList, WarehouseToolbar } from '../components/WarehousePage'
import { useCreateWarehouseMutation, useWarehousesQuery } from '../hooks/use-warehouse'
import type { CreateWarehouseFormValues } from '../schemas/warehouse.schema'
import { getWarehouseCodeError } from '../utils/get-warehouse-code-error'
import { buildWarehouseQuery } from '../utils/warehouse-query'
import { getWarehouseCapabilities } from '../utils/warehouse-capabilities'

function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    'message' in error &&
    typeof error.message === 'string'
  )
}

export function WarehousePage() {
  const meQuery = useMeQuery()
  const role = useAuthStore((state) => state.user?.role ?? null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [warehouseCodeError, setWarehouseCodeError] = useState<string>()
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const debouncedSearchText = useDebouncedValue(searchText, 350)
  const createMutation = useCreateWarehouseMutation()
  const warehousesQuery = useWarehousesQuery(
    buildWarehouseQuery(debouncedSearchText, page, pageSize)
  )
  const warehouses = warehousesQuery.data?.items ?? []
  const capabilities = getWarehouseCapabilities(role)

  function handleSearchChange(value: string) {
    setSearchText(value)
    setPage(1)
  }

  function handleCreateDialogOpenChange(open: boolean) {
    if (!open) setWarehouseCodeError(undefined)
    setIsCreateDialogOpen(open)
  }

  async function handleCreate(values: CreateWarehouseFormValues): Promise<boolean> {
    try {
      setWarehouseCodeError(undefined)
      await createMutation.mutateAsync({
        ...values,
        address: values.address || null,
      })
      toast.success('Đã tạo kho mới.')
      setIsCreateDialogOpen(false)
      return true
    } catch (error) {
      logger.error(error)
      const codeError = isApiErrorResponse(error) ? getWarehouseCodeError(error) : undefined
      if (codeError) {
        setWarehouseCodeError(codeError)
        toast.error(codeError)
      } else {
        toast.error(
          isApiErrorResponse(error) && error.message
            ? error.message
            : 'Không thể tạo kho. Vui lòng thử lại.'
        )
      }
      return false
    }
  }

  const listExport = useListExport({
    dataset: 'warehouses',
    filters: buildWarehouseQuery(debouncedSearchText, page, pageSize),
    permissions: meQuery.data?.permissions ?? [],
    viewPermission: P.WAREHOUSES_VIEW,
    totalCount: warehousesQuery.data?.totalCount ?? 0,
    isFetching: warehousesQuery.isFetching,
    isError: warehousesQuery.isError,
    blocked: searchText !== debouncedSearchText,
  })
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center">
            <Building2 aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-primary text-xs font-medium">Vận hành kho</p>
            <h1 className="mt-0.5 text-xl font-semibold">Kho hàng</h1>
          </div>
        </div>
        {capabilities.canCreateWarehouse ? (
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            Tạo kho
          </Button>
        ) : null}
      </header>

      <OperationalListPanel aria-labelledby="warehouse-list-title">
        <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <h2 id="warehouse-list-title" className="text-sm font-semibold">
              Danh sách kho
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {warehousesQuery.data?.totalCount ?? 0} kho
            </p>
          </div>
        </div>

        <WarehouseToolbar
          exportAction={
            listExport.canExport ? <ExcelExportButton {...listExport.buttonProps} /> : undefined
          }
          searchText={searchText}
          isFetching={warehousesQuery.isFetching}
          onSearchChange={handleSearchChange}
          onRefresh={() => void warehousesQuery.refetch()}
        />

        {warehousesQuery.isLoading && (
          <div className="divide-y" aria-label="Đang tải danh sách kho">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex h-16 items-center gap-3 px-4">
                <Skeleton className="size-8" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="ml-auto hidden h-4 w-24 md:block" />
              </div>
            ))}
          </div>
        )}

        {warehousesQuery.isError && (
          <Empty className="min-h-64 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlert className="text-destructive" aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Không thể tải danh sách kho</EmptyTitle>
              <EmptyDescription>Kiểm tra kết nối hoặc quyền truy cập rồi thử lại.</EmptyDescription>
            </EmptyHeader>
            <Button
              type="button"
              variant="outline"
              disabled={warehousesQuery.isFetching}
              onClick={() => void warehousesQuery.refetch()}
            >
              <RefreshCw
                data-icon="inline-start"
                className={warehousesQuery.isFetching ? 'animate-spin' : undefined}
                aria-hidden="true"
              />
              Thử lại
            </Button>
          </Empty>
        )}

        {!warehousesQuery.isLoading && !warehousesQuery.isError && warehouses.length === 0 && (
          <Empty className="min-h-64 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Warehouse className="text-muted-foreground" aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Chưa có kho phù hợp</EmptyTitle>
              <EmptyDescription>
                {debouncedSearchText
                  ? 'Thử tìm bằng mã hoặc tên kho khác.'
                  : 'Tạo kho đầu tiên để bắt đầu vận hành.'}
              </EmptyDescription>
            </EmptyHeader>
            {!debouncedSearchText && capabilities.canCreateWarehouse ? (
              <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Tạo kho
              </Button>
            ) : null}
          </Empty>
        )}

        {!warehousesQuery.isLoading && !warehousesQuery.isError && warehouses.length > 0 && (
          <>
            <WarehouseList warehouses={warehouses} />
            <OperationalPagination
              page={page}
              pageSize={pageSize}
              totalCount={warehousesQuery.data?.totalCount ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value)
                setPage(1)
              }}
            />
          </>
        )}
      </OperationalListPanel>

      {capabilities.canCreateWarehouse ? (
        <WarehouseCreateDialog
          open={isCreateDialogOpen}
          isPending={createMutation.isPending}
          warehouseCodeError={warehouseCodeError}
          onOpenChange={handleCreateDialogOpenChange}
          onSubmit={handleCreate}
        />
      ) : null}
    </div>
  )
}
