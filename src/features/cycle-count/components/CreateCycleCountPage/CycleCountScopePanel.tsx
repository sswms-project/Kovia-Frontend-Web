'use client'

import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { InventoryStock } from '@/features/inventory/types/inventory.types'
import { APP_ROUTES } from '@/routes/app-routes'
import { MAX_CYCLE_COUNT_ITEMS } from '../../schemas/cycle-count.schema'
import {
  CYCLE_COUNT_QUALITY_LABELS,
  formatCount,
  formatCycleCountDate,
} from '../../utils/cycle-count-format'
import { formatStockLocation, getStockScopeKey } from '../../utils/cycle-count-scope'
import { OptionSelect } from './OptionSelect'
import type { CycleCountFormApi, SelectOption, StockSelection } from './types'

const COLUMN_COUNT = 12

interface CycleCountScopePanelProps {
  readonly form: CycleCountFormApi
  readonly warehouses: readonly SelectOption[]
  readonly zones: readonly SelectOption[]
  readonly racks: readonly SelectOption[]
  readonly categories: readonly SelectOption[]
  readonly rackId: string
  readonly categoryId: string
  readonly searchTerm: string
  readonly inventory: readonly InventoryStock[]
  readonly inventoryPage: number
  readonly inventoryPageSize: number
  readonly inventoryTotalCount: number
  readonly isInventoryLoading: boolean
  readonly isSelectingAll: boolean
  readonly selection: StockSelection
  readonly onWarehouseChange: () => void
  readonly onZoneChange: () => void
  readonly onRackChange: (rackId: string) => void
  readonly onCategoryChange: (categoryId: string) => void
  readonly onSearchTermChange: (value: string) => void
  readonly onInventoryPageChange: (page: number) => void
  readonly onInventoryPageSizeChange: (pageSize: number) => void
  readonly onToggleRows: (rows: readonly InventoryStock[], checked: boolean) => void
  readonly onSelectAllMatching: () => Promise<void>
  readonly onClearSelection: () => void
}

export function CycleCountScopePanel({
  form,
  warehouses,
  zones,
  racks,
  categories,
  rackId,
  categoryId,
  searchTerm,
  inventory,
  inventoryPage,
  inventoryPageSize,
  inventoryTotalCount,
  isInventoryLoading,
  isSelectingAll,
  selection,
  onWarehouseChange,
  onZoneChange,
  onRackChange,
  onCategoryChange,
  onSearchTermChange,
  onInventoryPageChange,
  onInventoryPageSizeChange,
  onToggleRows,
  onSelectAllMatching,
  onClearSelection,
}: CycleCountScopePanelProps) {
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const { errors } = form.formState
  const warehouseId = form.watch('warehouseId')
  const zoneId = form.watch('zoneId')
  const selectedItems = form.watch('items')
  const selectedKeys = new Set(selectedItems.map(getStockScopeKey))
  const showingSelected = showSelectedOnly && selectedItems.length > 0
  const visibleRows: readonly InventoryStock[] = showingSelected
    ? selectedItems
        .map((item) => selection[getStockScopeKey(item)])
        .filter((row): row is InventoryStock => Boolean(row))
    : inventory
  const pageSelectedCount = inventory.filter((row) =>
    selectedKeys.has(getStockScopeKey(row))
  ).length
  const pageCheckState =
    inventory.length > 0 && pageSelectedCount === inventory.length
      ? true
      : pageSelectedCount > 0
        ? 'indeterminate'
        : false
  const exceedsItemLimit = inventoryTotalCount > MAX_CYCLE_COUNT_ITEMS
  const hasInventoryToSelect = Boolean(warehouseId) && inventoryTotalCount > 0 && !exceedsItemLimit

  return (
    <OperationalListPanel aria-label="Phạm vi kiểm kê">
      <div className="flex shrink-0 flex-col gap-3 border-b p-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Field data-invalid={Boolean(errors.warehouseId)}>
            <FieldLabel htmlFor="warehouseId">
              Kho kiểm kê <span className="text-destructive">*</span>
            </FieldLabel>
            <OptionSelect
              id="warehouseId"
              value={warehouseId}
              options={warehouses}
              emptyLabel="Chọn kho"
              invalid={Boolean(errors.warehouseId)}
              onValueChange={(value) => {
                form.setValue('warehouseId', value, { shouldDirty: true, shouldValidate: true })
                onWarehouseChange()
              }}
            />
            <FieldError errors={errors.warehouseId ? [errors.warehouseId] : undefined} />
          </Field>
          <Field>
            <FieldLabel htmlFor="zoneId">Khu vực</FieldLabel>
            <OptionSelect
              id="zoneId"
              value={zoneId}
              options={zones}
              emptyLabel="Toàn kho"
              disabled={!warehouseId}
              onValueChange={(value) => {
                form.setValue('zoneId', value, { shouldDirty: true })
                onZoneChange()
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="rackId">Kệ</FieldLabel>
            <OptionSelect
              id="rackId"
              value={rackId}
              options={racks}
              emptyLabel="Tất cả kệ"
              disabled={!warehouseId}
              onValueChange={(value) => {
                onRackChange(value)
                onInventoryPageChange(1)
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="categoryId">Nhóm VTHH</FieldLabel>
            <OptionSelect
              id="categoryId"
              value={categoryId}
              options={categories}
              emptyLabel="Tất cả nhóm"
              disabled={!warehouseId}
              onValueChange={(value) => {
                onCategoryChange(value)
                onInventoryPageChange(1)
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="inventorySearch">Tìm vật tư</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                id="inventorySearch"
                placeholder="Mã hoặc tên VTHH"
                value={searchTerm}
                disabled={!warehouseId || showingSelected}
                onChange={(event) => {
                  onSearchTermChange(event.target.value)
                  onInventoryPageChange(1)
                }}
              />
            </InputGroup>
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasInventoryToSelect || isSelectingAll || showingSelected}
            onClick={() => void onSelectAllMatching()}
          >
            {isSelectingAll ? 'Đang chọn...' : `Chọn tất cả ${inventoryTotalCount} dòng`}
          </Button>
          <Button
            type="button"
            variant={showingSelected ? 'default' : 'outline'}
            size="sm"
            disabled={selectedItems.length === 0}
            onClick={() => setShowSelectedOnly((value) => !value)}
          >
            Chỉ hiện dòng đã chọn
            <Badge variant="secondary">{selectedItems.length}</Badge>
          </Button>
          {exceedsItemLimit ? (
            <p className="text-muted-foreground text-xs">
              Có {inventoryTotalCount} dòng, vượt giới hạn {MAX_CYCLE_COUNT_ITEMS} dòng mỗi phiếu.
              Hãy thu hẹp bộ lọc.
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={selectedItems.length === 0}
            onClick={onClearSelection}
          >
            <X /> Bỏ chọn tất cả
          </Button>
          {errors.items ? <p className="text-destructive text-xs">{errors.items.message}</p> : null}
        </div>
      </div>
      <Table aria-label="Tồn kho cần kiểm kê" className="min-w-[1000px]">
        <TableHeader>
          <TableRow>
            <TableHead className="bg-card sticky top-0 z-10 w-12">
              <Checkbox
                checked={pageCheckState}
                disabled={showingSelected || inventory.length === 0}
                onCheckedChange={(value) => onToggleRows(inventory, value === true)}
                aria-label="Chọn tất cả dòng trong trang"
              />
            </TableHead>
            <TableHead className="bg-card sticky top-0 z-10 w-12">STT</TableHead>
            <TableHead className="bg-card sticky top-0 z-10">Mã VTHH</TableHead>
            <TableHead className="bg-card sticky top-0 z-10">Tên VTHH</TableHead>
            <TableHead className="bg-card sticky top-0 z-10">ĐVT</TableHead>
            <TableHead className="bg-card sticky top-0 z-10">Vị trí</TableHead>
            <TableHead className="bg-card sticky top-0 z-10">Số lô</TableHead>
            <TableHead className="bg-card sticky top-0 z-10">Hạn sử dụng</TableHead>
            <TableHead className="bg-card sticky top-0 z-10">Chất lượng</TableHead>
            <TableHead className="bg-card sticky top-0 z-10 text-right">Tồn hiện tại</TableHead>
            <TableHead className="bg-card sticky top-0 z-10 text-right">Đang giữ</TableHead>
            <TableHead className="bg-card sticky top-0 z-10">Kiểm kê gần nhất</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isInventoryLoading && !showingSelected ? (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="text-muted-foreground h-32 text-center">
                Đang tải tồn kho...
              </TableCell>
            </TableRow>
          ) : !warehouseId ? (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="text-muted-foreground h-32 text-center">
                Chọn kho kiểm kê để xem các vị trí có tồn.
              </TableCell>
            </TableRow>
          ) : visibleRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="text-muted-foreground h-32 text-center">
                Không có tồn kho phù hợp.
              </TableCell>
            </TableRow>
          ) : (
            visibleRows.map((row, index) => {
              const rowKey = getStockScopeKey(row)
              const checked = selectedKeys.has(rowKey)
              return (
                <TableRow key={rowKey} data-state={checked ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => onToggleRows([row], value === true)}
                      aria-label={`Chọn ${row.productName}`}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {showingSelected
                      ? index + 1
                      : (inventoryPage - 1) * inventoryPageSize + index + 1}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                  <TableCell className="font-medium">{row.productName}</TableCell>
                  <TableCell>{row.unitName ?? '—'}</TableCell>
                  <TableCell>
                    <p className="font-mono">{formatStockLocation(row)}</p>
                    {row.zoneCode ? (
                      <p className="text-muted-foreground text-xs">{row.zoneCode}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.lotNumber ?? 'Theo số lượng'}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('vi-VN') : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.qualityStatus === 'Good' ? 'secondary' : 'outline'}>
                      {CYCLE_COUNT_QUALITY_LABELS[row.qualityStatus] ?? row.qualityStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.quantityOnHand}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right font-mono tabular-nums">
                    {row.reservedQuantity + row.holdQuantity}
                  </TableCell>
                  <TableCell>
                    <LastCountCell lastCount={row.lastCount} />
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
      {showingSelected ? null : (
        <OperationalPagination
          page={inventoryPage}
          pageSize={inventoryPageSize}
          totalCount={inventoryTotalCount}
          isPending={isInventoryLoading}
          onPageChange={onInventoryPageChange}
          onPageSizeChange={onInventoryPageSizeChange}
        />
      )}
    </OperationalListPanel>
  )
}

function LastCountCell({ lastCount }: { readonly lastCount: InventoryStock['lastCount'] }) {
  if (!lastCount) return <span className="text-muted-foreground text-xs">Chưa kiểm kê</span>
  const difference = lastCount.difference ?? 0
  return (
    <div className="text-xs">
      <p className="tabular-nums">{formatCycleCountDate(lastCount.countedAt)}</p>
      <p className="text-muted-foreground">
        <Link
          href={APP_ROUTES.cycleCountDetail(lastCount.cycleCountId)}
          className="font-mono underline-offset-2 hover:underline"
        >
          {lastCount.code}
        </Link>
        {lastCount.countedByName ? ` · ${lastCount.countedByName}` : ''}
      </p>
      <p className={difference === 0 ? 'text-muted-foreground' : 'text-destructive font-medium'}>
        {difference === 0
          ? 'Khớp sổ sách'
          : `Lệch ${difference > 0 ? '+' : '−'}${formatCount(Math.abs(difference))}`}
      </p>
    </div>
  )
}
