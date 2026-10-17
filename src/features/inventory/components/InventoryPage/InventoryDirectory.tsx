'use client'

import { FilterX, RefreshCw, Search, TriangleAlert, X } from 'lucide-react'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { InventoryFilterOption, InventoryStock } from '../../types/inventory.types'
import {
  formatEligibilityStatus,
  formatInventoryDate,
  formatInventoryQuantity,
  formatInventoryLocation,
  formatQualityStatus,
} from '../../utils/inventory-format'
import { InventoryWorkspaceNavigation } from '../InventoryWorkspaceNavigation'

interface InventoryDirectoryProps {
  readonly permissions: readonly string[]
  readonly items: readonly InventoryStock[]
  readonly totalCount: number
  readonly page: number
  readonly pageSize: number
  readonly searchText: string
  readonly warehouseId: string
  readonly productId: string
  readonly slotId: string
  readonly warehouseOptions: readonly InventoryFilterOption[]
  readonly productOptions: readonly InventoryFilterOption[]
  readonly slotOptions: readonly InventoryFilterOption[]
  readonly snapshotAt: string | null
  readonly isLoading: boolean
  readonly isFetching: boolean
  readonly isError: boolean
  readonly areSlotsLoading?: boolean
  readonly areFiltersLoading: boolean
  readonly areFiltersError: boolean
  readonly activeFilterCount: number
  readonly canReportDamaged: boolean
  readonly onSearchChange: (value: string) => void
  readonly onWarehouseChange: (value: string) => void
  readonly onProductChange: (value: string) => void
  readonly onSlotChange: (value: string) => void
  readonly onResetFilters: () => void
  readonly onRetryFilters: () => void
  readonly onPageChange: (page: number) => void
  readonly onPageSizeChange: (pageSize: number) => void
  readonly onRetry: () => void
  readonly onReportDamaged: (item: InventoryStock) => void
}

export function InventoryDirectory({
  permissions,
  items,
  totalCount,
  page,
  pageSize,
  searchText,
  warehouseId,
  productId,
  slotId,
  warehouseOptions,
  productOptions,
  slotOptions,
  isLoading,
  isFetching,
  isError,
  areFiltersLoading,
  areSlotsLoading = false,
  areFiltersError,
  activeFilterCount,
  canReportDamaged,
  onSearchChange,
  onWarehouseChange,
  onProductChange,
  onSlotChange,
  onResetFilters,
  onRetryFilters,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onReportDamaged,
}: InventoryDirectoryProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <h1 className="sr-only">Tồn kho khả dụng</h1>

      <InventoryWorkspaceNavigation currentView="availability" permissions={permissions} />

      <OperationalListPanel className="@container" aria-label="Tồn kho khả dụng">
        <div className="shrink-0 border-b p-3">
          <FieldGroup
            aria-label="Bộ lọc tồn kho"
            className="[container-type:normal] flex flex-row flex-wrap items-center gap-3"
          >
            <InputGroup className="h-11 w-full min-w-0 sm:h-8 sm:w-72">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Tìm sản phẩm tồn kho"
                placeholder="Tìm SKU hoặc tên sản phẩm"
                value={searchText}
                onChange={(event) => onSearchChange(event.target.value)}
              />
              {searchText ? (
                <InputGroupAddon align="inline-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Xóa nội dung tìm kiếm"
                    onClick={() => onSearchChange('')}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 sm:size-8"
                  disabled={isFetching}
                  aria-label="Làm mới tồn kho"
                  onClick={onRetry}
                >
                  <RefreshCw
                    className={isFetching ? 'animate-spin motion-reduce:animate-none' : undefined}
                    aria-hidden="true"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={4}>Làm mới tồn kho</TooltipContent>
            </Tooltip>
            {areFiltersError ? (
              <div
                className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 border p-3"
                role="alert"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">Không thể tải đầy đủ bộ lọc</p>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={onRetryFilters}
                  >
                    Thử tải lại
                  </Button>
                </div>
              </div>
            ) : null}
            <Field orientation="horizontal" className="w-full sm:w-auto">
              <FieldLabel htmlFor="inventory-warehouse">Kho</FieldLabel>
              <NativeSelect
                id="inventory-warehouse"
                className="w-full sm:w-36"
                value={warehouseId}
                disabled={areFiltersLoading}
                onChange={(event) => onWarehouseChange(event.target.value)}
              >
                <NativeSelectOption value="">Tất cả kho</NativeSelectOption>
                {warehouseOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field orientation="horizontal" className="w-full sm:w-auto">
              <FieldLabel htmlFor="inventory-slot">Vị trí</FieldLabel>
              <NativeSelect
                id="inventory-slot"
                className="w-full sm:w-36"
                value={slotId}
                disabled={areFiltersLoading || areSlotsLoading || !warehouseId}
                onChange={(event) => onSlotChange(event.target.value)}
              >
                <NativeSelectOption value="">
                  {warehouseId ? 'Tất cả vị trí' : 'Chọn kho trước'}
                </NativeSelectOption>
                {slotOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field orientation="horizontal" className="w-full sm:w-auto">
              <FieldLabel htmlFor="inventory-product">Sản phẩm</FieldLabel>
              <NativeSelect
                id="inventory-product"
                className="w-full sm:w-36"
                value={productId}
                disabled={areFiltersLoading}
                onChange={(event) => onProductChange(event.target.value)}
              >
                <NativeSelectOption value="">Tất cả sản phẩm</NativeSelectOption>
                {productOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11 sm:size-8"
                    aria-label="Xóa bộ lọc"
                    disabled={activeFilterCount === 0}
                    onClick={onResetFilters}
                  >
                    <FilterX aria-hidden="true" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent sideOffset={4}>Xóa bộ lọc</TooltipContent>
            </Tooltip>
          </FieldGroup>
        </div>
        <p className="sr-only" aria-live="polite">
          {isFetching ? 'Đang cập nhật tồn kho' : 'Tồn kho đã cập nhật'}
        </p>

        {isError && items.length > 0 ? (
          <div
            className="border-b border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
            role="alert"
          >
            Chưa thể tải dữ liệu mới. Vui lòng kiểm tra thời điểm cập nhật và thử lại.
          </div>
        ) : null}

        {isLoading ? (
          <OperationalLoadingState rows={8} />
        ) : isError && items.length === 0 ? (
          <OperationalErrorState title="Không thể tải tồn kho" onRetry={onRetry} />
        ) : items.length === 0 ? (
          <OperationalEmptyState
            title="Không có tồn kho phù hợp"
            description={
              activeFilterCount || searchText
                ? 'Thử thay đổi từ khóa hoặc đặt lại bộ lọc.'
                : 'Chưa có số dư tồn kho để hiển thị.'
            }
          />
        ) : (
          <>
            <InventoryMobileList
              items={items}
              canReportDamaged={canReportDamaged}
              onReportDamaged={onReportDamaged}
            />
            <InventoryDesktopTable
              items={items}
              canReportDamaged={canReportDamaged}
              onReportDamaged={onReportDamaged}
            />
            <OperationalPagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              isPending={isFetching}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </>
        )}
      </OperationalListPanel>
    </div>
  )
}

function InventoryMobileList({
  items,
  canReportDamaged,
  onReportDamaged,
}: {
  readonly items: readonly InventoryStock[]
  readonly canReportDamaged: boolean
  readonly onReportDamaged: (item: InventoryStock) => void
}) {
  return (
    <ItemGroup className="min-h-0 flex-1 gap-0 overflow-y-auto @min-[980px]:hidden">
      {items.map((item) => (
        <Item key={item.id} className="border-b last:border-b-0">
          <ItemContent className="min-w-0">
            <ItemTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{item.productName}</span>
              <span className="text-primary shrink-0 font-mono tabular-nums">
                {formatInventoryQuantity(item.availableQuantity)} {item.unitName ?? '—'}
              </span>
            </ItemTitle>
            <ItemDescription>
              <span className="font-mono" translate="no">
                {item.sku}
              </span>{' '}
              · {item.warehouseName || 'Kho chưa xác định'} / {formatInventoryLocation(item)}
            </ItemDescription>
            {!item.canManageWarehouse ? (
              <Badge variant="outline" className="mt-1 w-fit">
                Chỉ xem
              </Badge>
            ) : null}
            <ItemDescription>
              {item.lotNumber ? `Lô ${item.lotNumber} · ` : ''}
              {formatQualityStatus(item.qualityStatus)} ·{' '}
              {formatEligibilityStatus(item.eligibilityStatus)}
            </ItemDescription>
            {canReportDamaged && item.canManageWarehouse && item.availableQuantity > 0 ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mt-1 w-fit"
                onClick={() => onReportDamaged(item)}
              >
                Báo hỏng
              </Button>
            ) : null}
            <ItemDescription>
              Thực tế {formatInventoryQuantity(item.quantityOnHand)} {item.unitName ?? '—'} · Đã đặt
              trước {formatInventoryQuantity(item.reservedQuantity)} {item.unitName ?? '—'} · Đang
              giữ {formatInventoryQuantity(item.holdQuantity)} {item.unitName ?? '—'}
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}

function InventoryDesktopTable({
  items,
  canReportDamaged,
  onReportDamaged,
}: {
  readonly items: readonly InventoryStock[]
  readonly canReportDamaged: boolean
  readonly onReportDamaged: (item: InventoryStock) => void
}) {
  return (
    <div className="hidden min-h-0 flex-1 overflow-y-auto @min-[980px]:block">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky top-0 z-10 w-56">Sản phẩm</TableHead>
            <TableHead className="sticky top-0 z-10 w-40">Kho / Vị trí</TableHead>
            <TableHead className="sticky top-0 z-10 w-40">Lô / Trạng thái</TableHead>
            <TableHead className="sticky top-0 z-10 w-24">ĐVT chính</TableHead>
            <TableHead className="sticky top-0 z-10 w-24 text-right">Tồn thực tế</TableHead>
            <TableHead className="sticky top-0 z-10 w-24 text-right">Đặt trước</TableHead>
            <TableHead className="sticky top-0 z-10 w-24 text-right">Đang giữ</TableHead>
            <TableHead className="sticky top-0 z-10 w-24 text-right">Khả dụng</TableHead>
            <TableHead className="sticky top-0 z-10 w-32">Cập nhật</TableHead>
            {canReportDamaged ? (
              <TableHead className="sticky top-0 z-10 w-44 text-right">Thao tác</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="min-w-0">
                <p className="truncate font-medium">{item.productName}</p>
                <p className="text-muted-foreground truncate font-mono text-xs" translate="no">
                  {item.sku}
                </p>
              </TableCell>
              <TableCell className="min-w-0">
                <p className="truncate" title={item.warehouseName || 'Kho chưa xác định'}>
                  {item.warehouseName || 'Kho chưa xác định'}
                </p>
                <p
                  className="text-muted-foreground truncate text-xs"
                  title={formatInventoryLocation(item)}
                >
                  {formatInventoryLocation(item)}
                </p>
                {!item.canManageWarehouse ? (
                  <Badge variant="outline" className="mt-1">
                    Chỉ xem
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell>
                <p className="truncate font-mono text-xs">{item.lotNumber ?? 'Không theo lô'}</p>
                <p className="text-muted-foreground text-xs">
                  {formatQualityStatus(item.qualityStatus)} ·{' '}
                  {formatEligibilityStatus(item.eligibilityStatus)}
                </p>
              </TableCell>
              <TableCell>{item.unitName ?? '—'}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatInventoryQuantity(item.quantityOnHand)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatInventoryQuantity(item.reservedQuantity)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatInventoryQuantity(item.holdQuantity)}
              </TableCell>
              <TableCell className="text-primary text-right font-mono font-semibold tabular-nums">
                {formatInventoryQuantity(item.availableQuantity)}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatInventoryDate(item.updatedAt)}
              </TableCell>
              {canReportDamaged ? (
                <TableCell className="text-right">
                  {item.canManageWarehouse ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={item.availableQuantity <= 0}
                      onClick={() => onReportDamaged(item)}
                    >
                      Báo hỏng
                    </Button>
                  ) : (
                    <span className="text-muted-foreground" aria-label="Không có thao tác">
                      —
                    </span>
                  )}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
