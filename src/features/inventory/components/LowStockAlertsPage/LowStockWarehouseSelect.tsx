'use client'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxEmpty,
} from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
import { getErrorKind } from '@/lib/api-error'
import { lowStockAlertService } from '../../services/low-stock-alert.service'
export interface LowStockWarehouseFailure {
  readonly error: unknown
  readonly retry: () => void
}
export function LowStockWarehouseSelect({
  value,
  onChange,
  scope,
  enabled,
  onFailureChange,
}: {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly scope: string
  readonly enabled: boolean
  readonly onFailureChange?: (failure: LowStockWarehouseFailure | null) => void
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)
  const params = {
    searchTerm: debouncedSearch || undefined,
    pageNumber: page,
    pageSize: 20,
    selectedWarehouseId: value || undefined,
  }
  const query = useQuery({
    queryKey: queryKeys.inventory.lowStockAlerts(scope, 'warehouses', params),
    queryFn: ({ signal }) => lowStockAlertService.warehouses(params, signal),
    enabled,
    retry: false,
  })
  const { isError: lookupFailed, error: lookupError, refetch: retryLookup } = query
  useEffect(() => {
    onFailureChange?.(lookupFailed ? { error: lookupError, retry: () => void retryLookup() } : null)
  }, [lookupFailed, lookupError, retryLookup, onFailureChange])
  const options = query.data?.items ?? []
  const selected = query.data?.selectedOption
  const label = (id: string) => {
    const item =
      options.find((option) => option.id === id) ?? (selected?.id === id ? selected : undefined)
    return item
      ? `${item.warehouseCode} · ${item.warehouseName}${item.status !== 'Active' ? ' (Ngừng hoạt động)' : ''}`
      : 'Kho đã chọn'
  }
  return (
    <div className="flex flex-col gap-1">
      <Combobox
        items={options.map((item) => item.id)}
        filter={null}
        value={value || null}
        itemToStringLabel={label}
        onValueChange={(id: string | null) => onChange(id ?? '')}
        onInputValueChange={(text, details) => {
          if (details.reason === 'input-change') {
            setSearch(text)
            setPage(1)
          }
        }}
      >
        <ComboboxInput
          aria-label="Kho"
          placeholder="Tất cả kho được phép"
          showClear={Boolean(value)}
          disabled={!enabled}
          className="w-full"
        />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxGroup>
              {options.map((item) => (
                <ComboboxItem key={item.id} value={item.id}>
                  {label(item.id)}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
            <ComboboxEmpty>
              {query.isPending
                ? 'Đang tải kho…'
                : query.isError
                  ? 'Không thể tải danh mục kho'
                  : 'Không tìm thấy kho phù hợp'}
            </ComboboxEmpty>
          </ComboboxList>
          {query.isError &&
          !['unauthorized', 'forbidden', 'notFound'].includes(getErrorKind(query.error).kind) ? (
            <div className="border-t p-2">
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Thử tải lại danh mục kho
              </Button>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage(page - 1)}
            >
              Trước
            </Button>
            <span className="text-xs">Trang {page}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!query.data || page * 20 >= query.data.totalCount || query.isFetching}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </Button>
          </div>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
