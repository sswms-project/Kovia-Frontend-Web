'use client'

import { PutawaySuggestionPanel as SharedPanel } from '@/components/operations/putaway'
import type { GoodsReceiptItem, PutAwaySuggestionsResponse } from '../../types/inbound.types'

export interface PutawaySuggestionState {
  readonly suggestions: PutAwaySuggestionsResponse | null
  readonly isSuggesting: boolean
  readonly onSuggest: () => void
  readonly onApply: (itemId: string, slotId: string) => void
  readonly onApplyBest: () => void
  readonly onClear: () => void
}

/** Adapter dữ liệu Nhập kho; component chung không phụ thuộc hợp đồng API của tính năng. */
export function PutawaySuggestionPanel(props: {
  readonly items: readonly GoodsReceiptItem[]
  readonly state: PutawaySuggestionState
  readonly disabled: boolean
  readonly usedSlotIdsByItem?: ReadonlyMap<string, ReadonlySet<string>>
}) {
  const source = props.state.suggestions
  return (
    <SharedPanel
      {...props}
      state={{
        ...props.state,
        suggestions: source
          ? {
              ...source,
              items: source.items.map((item) => ({ ...item, itemId: item.goodsReceiptItemId })),
            }
          : null,
      }}
    />
  )
}
