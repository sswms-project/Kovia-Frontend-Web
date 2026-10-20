'use client'

import type { ReactNode } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { InventoryWarehouseOption } from '@/features/inventory/types/inventory.types'
import type { CategoryResponse } from '../../types/product.types'

interface ProductListToolbarProps {
  readonly searchText: string
  readonly categoryId: string
  readonly warehouseId: string
  readonly status: string
  readonly trackingMode: string
  readonly categories: readonly CategoryResponse[]
  readonly warehouses: readonly InventoryWarehouseOption[]
  readonly canViewInventory: boolean
  readonly isFetching: boolean
  readonly onSearchChange: (value: string) => void
  readonly onCategoryChange: (value: string) => void
  readonly onWarehouseChange: (value: string) => void
  readonly onStatusChange: (value: string) => void
  readonly onTrackingModeChange: (value: string) => void
  readonly exportAction?: ReactNode
  readonly onRefresh: () => void
}

export function ProductListToolbar({
  searchText,
  categoryId,
  warehouseId,
  status,
  trackingMode,
  categories,
  warehouses,
  canViewInventory,
  isFetching,
  onSearchChange,
  onCategoryChange,
  onWarehouseChange,
  onStatusChange,
  onTrackingModeChange,
  onRefresh,
  exportAction,
}: ProductListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-4">
      <div className="relative min-w-56 flex-1">
        <Search
          className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          aria-label="Tìm sản phẩm theo mã, tên hoặc mã vạch"
          autoComplete="off"
          placeholder="Tìm theo mã, tên hoặc barcode…"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-8 text-sm"
        />
      </div>
      {canViewInventory ? (
        <NativeSelect
          aria-label="Lọc theo kho hàng"
          className="w-full sm:w-56"
          value={warehouseId}
          onChange={(event) => onWarehouseChange(event.target.value)}
        >
          <NativeSelectOption value="">Tất cả kho trong đơn vị</NativeSelectOption>
          {warehouses.map((warehouse) => (
            <NativeSelectOption key={warehouse.id} value={warehouse.id}>
              {warehouse.warehouseCode} — {warehouse.warehouseName}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : null}
      <NativeSelect
        aria-label="Lọc theo nhóm vật tư hàng hóa"
        className="w-full sm:w-72"
        value={categoryId}
        onChange={(event) => onCategoryChange(event.target.value)}
      >
        <NativeSelectOption value="">Tất cả nhóm vật tư hàng hóa</NativeSelectOption>
        {categories.map((category) => (
          <NativeSelectOption key={category.id} value={category.id}>
            {category.categoryPath}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Lọc theo phương thức quản lý"
        className="w-full sm:w-52"
        value={trackingMode}
        onChange={(event) => onTrackingModeChange(event.target.value)}
      >
        <NativeSelectOption value="">Mọi phương thức quản lý</NativeSelectOption>
        <NativeSelectOption value="quantity">Theo số lượng</NativeSelectOption>
        <NativeSelectOption value="lot">Theo lô</NativeSelectOption>
      </NativeSelect>
      <NativeSelect
        aria-label="Lọc theo trạng thái"
        className="w-full sm:w-44"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        <NativeSelectOption value="">Mọi trạng thái</NativeSelectOption>
        <NativeSelectOption value="Active">Đang sử dụng</NativeSelectOption>
        <NativeSelectOption value="Inactive">Ngừng sử dụng</NativeSelectOption>
      </NativeSelect>
      <div className="flex shrink-0 items-center gap-2">
        {exportAction}
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Làm mới danh sách"
          disabled={isFetching}
          onClick={onRefresh}
        >
          <RefreshCw className={isFetching ? 'animate-spin' : undefined} aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
