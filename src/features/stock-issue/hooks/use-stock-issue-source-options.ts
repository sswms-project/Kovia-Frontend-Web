import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { stockIssueService } from '../services/stock-issue.service'
import { sourceFactor } from '../schemas/stock-issue-sources.schema'
import type { StockIssueRequestItem, StockIssueRequestSummary } from '../types/stock-issue.types'

/** Each source selector owns its bounded search; the parent form owns the complete allocation. */
export function useStockIssueSourceOptions(
  order: StockIssueRequestSummary,
  item: StockIssueRequestItem,
  scope: string,
  selectedStockId?: string
) {
  const [search, setSearch] = useState('')
  const term = useDebouncedValue(search, 250)
  const sources = useQuery({
    queryKey: [
      'stock-issue-sources',
      scope,
      order.id,
      order.version,
      item.id,
      term,
      selectedStockId,
    ],
    queryFn: async ({ signal }) => {
      const options = await stockIssueService.sourceOptions(
        order.id,
        item.id,
        term,
        signal,
        selectedStockId || undefined
      )
      if (options.some((option) => option.documentVersion !== order.version))
        throw new Error('Phiếu đã thay đổi. Tải lại phiếu để chọn nguồn mới.')
      return options
    },
    retry: false,
    staleTime: 0,
  })
  const factor = sourceFactor(item.conversionFactor)
  const options = (sources.data ?? []).map((source) => ({
    value: source.inventoryStockId,
    label: `${source.path} · ${source.lotNumber ?? 'Không theo lô'}${source.expiryDate ? ` · HSD ${source.expiryDate}` : ''}`,
    description: `Có thể chọn ${(source.freeQuantity + source.ownUnpickedQuantity) / factor} ${item.enteredUnitName} (gồm phần dòng đang giữ)`,
  }))
  return { sources, options, setSearch }
}
