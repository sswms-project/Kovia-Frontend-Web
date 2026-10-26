'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ArrowRight, MapPinned, PencilRuler, RefreshCw, TriangleAlert } from 'lucide-react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { WarehouseDesignerSkeleton } from '../components/WarehouseLayoutDirectoryPage'
import { useWarehouseLayoutPrefetch } from '../hooks/use-prefetch-warehouse-layout'
import { useWarehousesQuery } from '../hooks/use-warehouse'

// Konva and the canvas only load when a layout is opened (or prefetched on hover).
const WarehouseDesignerPage = dynamic(
  () => import('./WarehouseDesignerPage').then((module) => module.WarehouseDesignerPage),
  { ssr: false, loading: () => <WarehouseDesignerSkeleton /> }
)
// Same specifier as the dynamic import above, so hover prefetch warms the chunk it renders.
const preloadWarehouseDesigner = () => void import('./WarehouseDesignerPage')

type OpenLayout = {
  readonly warehouseId: string
  readonly mode: 'viewer' | 'designer'
}

export default function WarehouseLayoutDirectoryPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [openLayout, setOpenLayout] = useState<OpenLayout | null>(null)
  const warehousesQuery = useWarehousesQuery({
    top: pageSize,
    skip: (page - 1) * pageSize,
    needTotalCount: true,
  })
  const getPrefetchHandlers = useWarehouseLayoutPrefetch(preloadWarehouseDesigner)
  const meQuery = useMeQuery()
  const canConfigure = meQuery.data?.permissions.includes(P.WAREHOUSES_CONFIGURE_LAYOUT) ?? false
  const warehouses = warehousesQuery.data?.items ?? []

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="shrink-0 border-b pb-4">
        <div className="flex items-start gap-3">
          <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center">
            <MapPinned aria-hidden="true" />
          </span>
          <div>
            <p className="text-primary text-xs font-medium">Vận hành kho</p>
            <h1 className="mt-0.5 text-xl font-semibold">Sơ đồ kho</h1>
          </div>
        </div>
      </header>

      <OperationalListPanel aria-labelledby="warehouse-layout-list-title">
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div>
            <h2 id="warehouse-layout-list-title" className="text-sm font-semibold">
              Kho được phép xem
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {warehousesQuery.data?.totalCount ?? 0} kho
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Tải lại"
            onClick={() => void warehousesQuery.refetch()}
          >
            <RefreshCw
              className={warehousesQuery.isFetching ? 'animate-spin' : undefined}
              aria-hidden="true"
            />
          </Button>
        </div>
        <div data-slot="operational-list-body">
          {warehousesQuery.isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : warehousesQuery.isError ? (
            <Empty className="h-full min-h-64 border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TriangleAlert className="text-destructive" aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Không thể tải danh sách kho</EmptyTitle>
                <EmptyDescription>Kiểm tra quyền truy cập rồi thử lại.</EmptyDescription>
              </EmptyHeader>
              <Button
                type="button"
                variant="outline"
                onClick={() => void warehousesQuery.refetch()}
              >
                Thử lại
              </Button>
            </Empty>
          ) : warehouses.length === 0 ? (
            <Empty className="h-full min-h-64 border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MapPinned aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Chưa có kho được phân công</EmptyTitle>
                <EmptyDescription>
                  Liên hệ Quản lý kho để được phân công kho làm việc.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="hidden min-w-0 md:block [&>[data-slot=table-container]]:overflow-visible">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 z-10 pl-4">Tên sơ đồ</TableHead>
                      <TableHead className="sticky top-0 z-10">Kho</TableHead>
                      <TableHead className="sticky top-0 z-10 w-56 text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouses.map((warehouse) => (
                      <TableRow key={warehouse.id}>
                        <TableCell className="pl-4 font-medium">
                          Sơ đồ {warehouse.warehouseName}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{warehouse.warehouseName}</p>
                          <p className="text-muted-foreground font-mono text-xs">
                            {warehouse.warehouseCode}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              {...getPrefetchHandlers(warehouse.id)}
                              onClick={() =>
                                setOpenLayout({ warehouseId: warehouse.id, mode: 'viewer' })
                              }
                            >
                              Mở sơ đồ
                              <ArrowRight data-icon="inline-end" aria-hidden="true" />
                            </Button>
                            {canConfigure ? (
                              <Button
                                type="button"
                                size="sm"
                                {...getPrefetchHandlers(warehouse.id)}
                                onClick={() =>
                                  setOpenLayout({ warehouseId: warehouse.id, mode: 'designer' })
                                }
                              >
                                <PencilRuler data-icon="inline-start" aria-hidden="true" />
                                Thiết lập
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="divide-y md:hidden">
                {warehouses.map((warehouse) => (
                  <article key={warehouse.id} className="flex items-center gap-3 px-3 py-3">
                    <MapPinned className="text-primary size-5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{warehouse.warehouseName}</p>
                      <p className="text-muted-foreground truncate font-mono text-xs">
                        {warehouse.warehouseCode}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      {...getPrefetchHandlers(warehouse.id)}
                      onClick={() => setOpenLayout({ warehouseId: warehouse.id, mode: 'viewer' })}
                    >
                      Mở sơ đồ
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </Button>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
        {!warehousesQuery.isLoading && !warehousesQuery.isError && warehouses.length > 0 ? (
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
        ) : null}
      </OperationalListPanel>

      {openLayout ? (
        <WarehouseDesignerPage
          warehouseId={openLayout.warehouseId}
          warehouseSummary={warehouses.find((warehouse) => warehouse.id === openLayout.warehouseId)}
          viewOnly={openLayout.mode === 'viewer'}
          onClose={() => setOpenLayout(null)}
          onEdit={() =>
            setOpenLayout((current) => (current ? { ...current, mode: 'designer' } : current))
          }
          onShowViewer={() =>
            setOpenLayout((current) => (current ? { ...current, mode: 'viewer' } : current))
          }
        />
      ) : null}
    </div>
  )
}
