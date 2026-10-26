import { Search, SearchX } from 'lucide-react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatInventoryDateOnly,
  formatInventoryQuantity,
} from '@/features/inventory/utils/inventory-format'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'
import type { LayoutViewerInventoryState } from '../../../types/warehouse-layout-viewer.types'
import { getLayoutLocationLabel } from '../../../utils/layout-placement'
import type { ViewerSelectedLocation } from '../../../utils/layout-viewer-location'
import { StorageCapacitySummary } from '../../WarehouseDetailPage'

export function ViewerInventoryPanel({
  scene,
  selection,
  selectedLocation,
  inventoryState,
  canConfigure,
  onEdit,
}: {
  readonly scene: WarehouseLayoutEditorScene
  readonly selection: WarehouseLayoutSelection | null
  readonly selectedLocation: ViewerSelectedLocation | null
  readonly inventoryState: LayoutViewerInventoryState
  readonly canConfigure: boolean
  readonly onEdit?: () => void
}) {
  const {
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    inventorySearchTerm,
    setInventorySearchTerm,
    debouncedInventorySearchTerm,
    inventoryQuery,
  } = inventoryState

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t"
      aria-labelledby="viewer-inventory-title"
    >
      <div className="flex shrink-0 items-center gap-3 px-3 py-2.5">
        <h2 id="viewer-inventory-title" className="shrink-0 text-sm font-semibold">
          Hàng hóa tại vị trí
        </h2>
        <InputGroup className="ml-auto max-w-64">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            name="warehouse-layout-inventory-search"
            autoComplete="off"
            value={inventorySearchTerm}
            placeholder="Tìm hàng hóa…"
            aria-label="Tìm hàng hóa tại vị trí"
            disabled={!selectedLocation}
            onChange={(event) => {
              setInventorySearchTerm(event.target.value)
              setPageNumber(1)
            }}
          />
        </InputGroup>
      </div>
      {selectedLocation ? (
        <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 px-3 pb-2 text-xs">
          <p className="w-full font-medium break-words" aria-label="Đường dẫn vị trí">
            {selection ? getLayoutLocationLabel(scene, selection) : null}
          </p>
          <span>
            Mã vị trí:{' '}
            <strong translate="no" className="font-mono">
              {selectedLocation.code}
            </strong>
          </span>
          <span className="min-w-0">
            Tên vị trí: <strong className="break-words">{selectedLocation.name}</strong>
          </span>
          {selectedLocation.capacity ? (
            <StorageCapacitySummary location={selectedLocation.capacity} />
          ) : null}
          {selectedLocation.pending && canConfigure && onEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              Cấu hình sức chứa
            </Button>
          ) : null}
        </div>
      ) : null}
      <OperationalListPanel aria-label="Danh sách hàng hóa tại vị trí" className="border-0">
        {!selectedLocation ? (
          <div data-slot="operational-list-body" className="flex items-center justify-center">
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {selection?.kind === 'decoration'
                    ? 'Khu chức năng không chứa hàng hóa'
                    : 'Chưa chọn vị trí'}
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          </div>
        ) : inventoryQuery.isPending ||
          (inventoryQuery.isFetching && inventoryQuery.isPlaceholderData) ? (
          <div
            data-slot="operational-list-body"
            className="space-y-2 p-3"
            aria-label="Đang tải hàng hóa"
          >
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : inventoryQuery.isError ? (
          <div
            data-slot="operational-list-body"
            className="text-destructive flex items-center justify-center p-3 text-xs"
            role="alert"
          >
            Không thể tải hàng hóa tại vị trí. Hãy thử chọn lại vị trí.
          </div>
        ) : (inventoryQuery.data?.items.length ?? 0) === 0 ? (
          <div
            data-slot="operational-list-body"
            className="text-muted-foreground flex items-center justify-center p-4 text-center text-xs"
          >
            {debouncedInventorySearchTerm
              ? 'Không tìm thấy hàng hóa phù hợp.'
              : 'Vị trí chưa có hàng hóa.'}
          </div>
        ) : (
          <Table className="min-w-[46rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10">Mã hàng</TableHead>
                <TableHead className="sticky top-0 z-10">Tên hàng</TableHead>
                <TableHead className="sticky top-0 z-10 text-right">Tồn thực tế</TableHead>
                <TableHead className="sticky top-0 z-10 text-right">Đang giữ</TableHead>
                <TableHead className="sticky top-0 z-10 text-right">Khả dụng</TableHead>
                <TableHead className="sticky top-0 z-10">ĐVT</TableHead>
                <TableHead className="sticky top-0 z-10">Số lô</TableHead>
                <TableHead className="sticky top-0 z-10">Hạn dùng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryQuery.data?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell translate="no" className="font-mono text-[11px]">
                    {item.sku}
                  </TableCell>
                  <TableCell className="max-w-44 truncate" title={item.productName}>
                    {item.productName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInventoryQuantity(item.quantityOnHand)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInventoryQuantity(item.reservedQuantity + item.holdQuantity)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInventoryQuantity(item.availableQuantity)}
                  </TableCell>
                  <TableCell>{item.unitName || '—'}</TableCell>
                  <TableCell translate="no">{item.lotNumber || '—'}</TableCell>
                  <TableCell>
                    {item.expiryDate ? formatInventoryDateOnly(item.expiryDate) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {selectedLocation ? (
          <OperationalPagination
            page={pageNumber}
            pageSize={pageSize}
            totalCount={inventoryQuery.data?.totalCount ?? 0}
            isPending={inventoryQuery.isFetching}
            onPageChange={setPageNumber}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setPageNumber(1)
            }}
          />
        ) : null}
      </OperationalListPanel>
    </section>
  )
}
