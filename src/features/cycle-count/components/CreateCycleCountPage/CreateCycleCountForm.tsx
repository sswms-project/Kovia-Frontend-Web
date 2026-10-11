'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { InventoryStock } from '@/features/inventory/types/inventory.types'
import { APP_ROUTES } from '@/routes/app-routes'
import type { CreateCycleCountFormValues } from '../../schemas/cycle-count.schema'
import { getStockScopeKey, toCycleCountItemInput } from '../../utils/cycle-count-scope'
import { CycleCountInfoPanel } from './CycleCountInfoPanel'
import { CycleCountScopePanel } from './CycleCountScopePanel'
import type { CycleCountFormApi, SelectOption, StockSelection, SubmitMode } from './types'

interface CreateCycleCountFormProps {
  readonly form: CycleCountFormApi
  readonly warehouses: readonly SelectOption[]
  readonly zones: readonly SelectOption[]
  readonly racks: readonly SelectOption[]
  readonly categories: readonly SelectOption[]
  readonly staff: readonly SelectOption[]
  readonly rackId: string
  readonly categoryId: string
  readonly searchTerm: string
  readonly inventory: readonly InventoryStock[]
  readonly inventoryPage: number
  readonly inventoryPageSize: number
  readonly inventoryTotalCount: number
  readonly isInventoryLoading: boolean
  readonly isSelectingAll: boolean
  readonly isPending: boolean
  readonly onRackChange: (rackId: string) => void
  readonly onCategoryChange: (categoryId: string) => void
  readonly onSearchTermChange: (value: string) => void
  readonly onInventoryPageChange: (page: number) => void
  readonly onInventoryPageSizeChange: (pageSize: number) => void
  readonly onSelectAllMatching: () => Promise<readonly InventoryStock[]>
  readonly onSubmit: (values: CreateCycleCountFormValues, mode: SubmitMode) => Promise<void>
}

export function CreateCycleCountForm({
  form,
  warehouses,
  zones,
  racks,
  categories,
  staff,
  rackId,
  categoryId,
  searchTerm,
  inventory,
  inventoryPage,
  inventoryPageSize,
  inventoryTotalCount,
  isInventoryLoading,
  isSelectingAll,
  isPending,
  onRackChange,
  onCategoryChange,
  onSearchTermChange,
  onInventoryPageChange,
  onInventoryPageSizeChange,
  onSelectAllMatching,
  onSubmit,
}: CreateCycleCountFormProps) {
  const [selection, setSelection] = useState<StockSelection>({})
  const selectedItems = form.watch('items')
  const selectedQuantity = selectedItems.reduce(
    (sum, item) => sum + (selection[getStockScopeKey(item)]?.quantityOnHand ?? 0),
    0
  )

  function setItems(items: CreateCycleCountFormValues['items']) {
    form.setValue('items', items, { shouldDirty: true, shouldValidate: true })
  }

  function toggleRows(rows: readonly InventoryStock[], checked: boolean) {
    const rowKeys = new Set(rows.map(getStockScopeKey))
    const kept = selectedItems.filter((item) => !rowKeys.has(getStockScopeKey(item)))
    if (!checked) {
      setItems(kept)
      return
    }
    setSelection((current) => ({
      ...current,
      ...Object.fromEntries(rows.map((row) => [getStockScopeKey(row), row])),
    }))
    setItems([...kept, ...rows.map(toCycleCountItemInput)])
  }

  async function selectAllMatching() {
    toggleRows(await onSelectAllMatching(), true)
  }

  function handleWarehouseChange() {
    onInventoryPageChange(1)
    onRackChange('')
    form.setValue('zoneId', '')
    form.setValue('assignedTo', '')
    setItems([])
  }

  function handleZoneChange() {
    onInventoryPageChange(1)
    onRackChange('')
    setItems([])
  }

  return (
    <form
      className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3"
      onSubmit={form.handleSubmit((values) => onSubmit(values, 'save'))}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b pb-2">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={APP_ROUTES.cycleCounts} aria-label="Quay lại">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-base font-semibold">
          <span className="text-primary mr-2 text-xs font-medium">Kiểm kê</span>
          Thêm phiếu kiểm kê
        </h1>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline">
            <Link href={APP_ROUTES.cycleCounts}>Hủy</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => void form.handleSubmit((values) => onSubmit(values, 'saveAndAdd'))()}
          >
            Lưu và thêm phiếu khác
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 gap-3 overflow-auto lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-hidden">
        <div className="flex min-h-[28rem] min-w-0 flex-col lg:min-h-0">
          <CycleCountScopePanel
            form={form}
            warehouses={warehouses}
            zones={zones}
            racks={racks}
            categories={categories}
            rackId={rackId}
            categoryId={categoryId}
            searchTerm={searchTerm}
            inventory={inventory}
            inventoryPage={inventoryPage}
            inventoryPageSize={inventoryPageSize}
            inventoryTotalCount={inventoryTotalCount}
            isInventoryLoading={isInventoryLoading}
            isSelectingAll={isSelectingAll}
            selection={selection}
            onWarehouseChange={handleWarehouseChange}
            onZoneChange={handleZoneChange}
            onRackChange={onRackChange}
            onCategoryChange={onCategoryChange}
            onSearchTermChange={onSearchTermChange}
            onInventoryPageChange={onInventoryPageChange}
            onInventoryPageSizeChange={onInventoryPageSizeChange}
            onToggleRows={toggleRows}
            onSelectAllMatching={selectAllMatching}
            onClearSelection={() => setItems([])}
          />
        </div>
        <CycleCountInfoPanel
          form={form}
          staff={staff}
          hasWarehouse={Boolean(form.watch('warehouseId'))}
          selectedCount={selectedItems.length}
          selectedQuantity={selectedQuantity}
        />
      </div>
    </form>
  )
}
