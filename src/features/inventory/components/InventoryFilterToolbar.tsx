'use client'

import { ListFilter, Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export function InventoryWarehouseFilter({
  value,
  options,
  onChange,
  requireWarehouse = false,
  disabled,
}: {
  readonly value: string
  readonly options: readonly { readonly value: string; readonly label: string }[]
  readonly onChange: (value: string) => void
  readonly requireWarehouse?: boolean
  readonly disabled?: boolean
}) {
  return (
    <NativeSelect
      aria-label="Kho"
      className="w-full [&_select]:h-11 sm:[&_select]:h-8"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      <NativeSelectOption value="">
        {requireWarehouse ? 'Chọn kho' : 'Tất cả kho được phép'}
      </NativeSelectOption>
      {value && !options.some((option) => option.value === value) && (
        <NativeSelectOption value={value} disabled>
          {disabled ? 'Đang tải kho…' : 'Kho đã chọn không có trong danh sách'}
        </NativeSelectOption>
      )}
      {options.map((option) => (
        <NativeSelectOption key={option.value} value={option.value}>
          {option.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

export function InventorySearch({
  value,
  onChange,
  placeholder,
}: {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly placeholder: string
}) {
  return (
    <InputGroup className="h-11 w-full sm:h-8">
      <InputGroupAddon>
        <Search aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        maxLength={100}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Xóa nội dung tìm kiếm"
            onClick={() => onChange('')}
          >
            <X aria-hidden="true" />
          </Button>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

export function InventoryFilterToolbar({
  search,
  warehouse,
  actions,
  children,
  appliedFilters = [],
  onReset,
}: {
  readonly search?: ReactNode
  readonly warehouse: ReactNode
  readonly actions?: ReactNode
  readonly children: ReactNode
  readonly appliedFilters?: readonly (
    | { readonly label: string; readonly clear: () => void }
    | false
  )[]
  readonly onReset?: () => void
}) {
  const filters = appliedFilters.filter((filter) => filter !== false)
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 border-b p-3"
      role="search"
      aria-label="Tìm kiếm và lọc"
    >
      {search && <div className="w-full min-w-0 sm:w-64">{search}</div>}
      <div className="min-w-0 flex-1 sm:max-w-64 [&_[data-slot=native-select-wrapper]]:w-full">
        {warehouse}
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="outline" className="h-11 sm:h-8">
            <ListFilter aria-hidden="true" />
            Bộ lọc{filters.length ? ` (${filters.length})` : ''}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Bộ lọc</SheetTitle>
            <SheetDescription>Danh sách cập nhật theo các lựa chọn bên dưới.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 space-y-3 overflow-y-auto px-4 pb-2" data-scrollbar="slim">
            {children}
          </div>
          <SheetFooter>
            {onReset && (
              <Button type="button" variant="outline" onClick={onReset}>
                Đặt lại bộ lọc
              </Button>
            )}
            <SheetClose asChild>
              <Button type="button">Xem kết quả</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {actions && (
        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
      {filters.length > 0 && (
        <div className="flex basis-full flex-wrap gap-1.5" aria-label="Bộ lọc đang áp dụng">
          {filters.map((filter) => (
            <Button
              key={filter.label}
              type="button"
              size="sm"
              variant="outline"
              className="h-auto max-w-full whitespace-normal"
              aria-label={`Bỏ bộ lọc ${filter.label}`}
              onClick={filter.clear}
            >
              {filter.label}
              <X aria-hidden="true" />
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
