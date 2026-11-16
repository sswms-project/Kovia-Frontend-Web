'use client'

import { useState } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useProductOptionsQuery } from '@/features/inbound-request/hooks/use-inbound-requests'
import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'
import { useInventoryFilter } from './use-inventory-filter'

export function useInventoryProductLookup(labelKey: string, productId: string) {
  const [search, setSearch] = useState('')
  const [label, setLabel] = useInventoryFilter<string>(labelKey, '')
  const searchTerm = useDebouncedValue(search.trim(), 350)
  const query = useProductOptionsQuery({
    pageNumber: 1,
    pageSize: 30,
    searchTerm: searchTerm || undefined,
  })
  const isSearching = search.trim() !== searchTerm || query.isFetching

  return {
    options: isSearching
      ? []
      : (query.data?.items ?? []).map((item) => ({
          value: item.id,
          label: `${item.sku} · ${item.productName}`,
        })),
    selectedOption: productId && label ? { value: productId, label } : undefined,
    placeholder: 'Tìm SKU hoặc tên mặt hàng',
    ariaLabel: 'Tìm và chọn mặt hàng',
    emptyMessage: query.isError ? 'Không thể tải mặt hàng' : 'Không tìm thấy mặt hàng',
    isLoading: isSearching,
    isInvalid: false,
    onSearchChange: setSearch,
    rememberOption: (option?: LookupOption) => setLabel(option?.label ?? ''),
  }
}

export type InventoryProductLookup = ReturnType<typeof useInventoryProductLookup>
