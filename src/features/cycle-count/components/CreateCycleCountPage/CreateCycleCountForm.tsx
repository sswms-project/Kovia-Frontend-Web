'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { InventoryStock } from '@/features/inventory/types/inventory.types'
import { APP_ROUTES } from '@/routes/app-routes'
import type { CreateCycleCountFormValues } from '../../schemas/cycle-count.schema'
import type { CycleCountDetail } from '../../types/cycle-count.types'
import { formatStockLocation } from '../../utils/cycle-count-scope'
import { getStockScopeKey, toCycleCountItemInput } from '../../utils/cycle-count-scope'
import { CycleCountInfoPanel } from './CycleCountInfoPanel'
import { CycleCountScopePanel } from './CycleCountScopePanel'
import type { CycleCountFormApi, SelectOption, StockSelection, SubmitMode } from './types'

interface CreateCycleCountFormProps {
  readonly onCancel?: (event: MouseEvent<HTMLAnchorElement>) => void
  readonly editingDocument?: CycleCountDetail
  readonly onCodeChange?: () => void
  readonly codeSuggestionStatus?: 'loading' | 'error' | 'ready'
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
  onCancel,
  editingDocument,
  onCodeChange,
  codeSuggestionStatus,
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
  const [isChangingScope, setIsChangingScope] = useState(false)
  const backHref = editingDocument
    ? APP_ROUTES.cycleCountDetail(editingDocument.id)
    : APP_ROUTES.cycleCounts
  const selectedItems = form.watch('items')
  const selectedQuantity = selectedItems.reduce(
    (sum, item) => sum + (selection[getStockScopeKey(item)]?.quantityOnHand ?? 0),
    0
  )

  function setItems(items: CreateCycleCountFormValues['items']) {
    form.setValue('items', items, { shouldDirty: true, shouldValidate: true })
  }

  function toggleRows(rows: readonly InventoryStock[], checked: boolean) {
    // Kiểm kê đếm theo vị trí vật lý: các dòng tồn khác trạng thái sử dụng của cùng phạm vi gộp thành một dòng phiếu.
    const rowsByKey = new Map<string, InventoryStock>()
    for (const row of rows) {
      const key = getStockScopeKey(row)
      const existing = rowsByKey.get(key)
      rowsByKey.set(
        key,
        existing
          ? { ...existing, quantityOnHand: existing.quantityOnHand + row.quantityOnHand }
          : row
      )
    }
    const kept = selectedItems.filter((item) => !rowsByKey.has(getStockScopeKey(item)))
    if (!checked) {
      setItems(kept)
      return
    }
    setSelection((current) => ({ ...current, ...Object.fromEntries(rowsByKey) }))
    setItems([...kept, ...[...rowsByKey.values()].map(toCycleCountItemInput)])
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
          <Link href={backHref} onClick={onCancel} aria-label="Quay lại">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-base font-semibold">
          <span className="text-primary mr-2 text-xs font-medium">Kiểm kê</span>
          {editingDocument ? 'Sửa phiếu kiểm kê' : 'Thêm phiếu kiểm kê'}
        </h1>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline">
            <Link href={backHref} onClick={onCancel}>
              Hủy
            </Link>
          </Button>
          {!editingDocument ? (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => void form.handleSubmit((values) => onSubmit(values, 'saveAndAdd'))()}
            >
              Lưu và thêm phiếu khác
            </Button>
          ) : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 gap-3 overflow-auto lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-hidden">
        <div className="flex min-h-[28rem] min-w-0 flex-col lg:min-h-0">
          {editingDocument && !isChangingScope ? (
            <section className="bg-card min-h-0 overflow-auto border p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Phạm vi đã chọn · {editingDocument.warehouseName}</h2>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    setIsChangingScope(true)
                    setItems([])
                  }}
                >
                  Thay đổi phạm vi
                </Button>
              </div>
              <ul className="divide-y">
                {editingDocument.items.map((item) => (
                  <li key={item.id} className="py-3 text-sm">
                    <p className="font-medium">
                      {item.productSku} · {item.productName}
                    </p>
                    <p className="text-muted-foreground">
                      {formatStockLocation(item)} · {item.lotNumber ?? 'Không theo lô'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <>
              {editingDocument ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mb-2 shrink-0"
                  onClick={() => {
                    form.setValue('warehouseId', editingDocument.warehouseId)
                    form.setValue('zoneId', editingDocument.zoneId ?? '')
                    setItems(
                      editingDocument.items.map(({ productId, slotId, lotId, qualityStatus }) => ({
                        productId,
                        slotId,
                        lotId,
                        qualityStatus,
                      }))
                    )
                    setIsChangingScope(false)
                  }}
                >
                  Giữ phạm vi ban đầu
                </Button>
              ) : null}
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
            </>
          )}
        </div>
        <CycleCountInfoPanel
          onCodeChange={onCodeChange}
          codeSuggestionStatus={codeSuggestionStatus}
          form={form}
          staff={staff}
          hasWarehouse={Boolean(form.watch('warehouseId'))}
          selectedCount={selectedItems.length}
          selectedQuantity={editingDocument && !isChangingScope ? null : selectedQuantity}
        />
      </div>
    </form>
  )
}
