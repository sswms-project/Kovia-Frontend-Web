'use client'

import { Check, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { GoodsReceiptItem, PutAwaySuggestionsResponse } from '../../types/inbound.types'
import { PutawaySuggestionList } from './PutawaySuggestionList'
import { PutawaySuggestionSummary } from './PutawaySuggestionSummary'

export interface PutawaySuggestionState {
  readonly suggestions: PutAwaySuggestionsResponse | null
  readonly isSuggesting: boolean
  readonly onSuggest: () => void
  readonly onApply: (itemId: string, slotId: string) => void
  readonly onApplyBest: () => void
  readonly onClear: () => void
}

interface PutawaySuggestionPanelProps {
  readonly items: readonly GoodsReceiptItem[]
  readonly state: PutawaySuggestionState
  readonly disabled: boolean
  /** Vị trí đang có trong phân bổ, theo dòng hàng. */
  readonly usedSlotIdsByItem?: ReadonlyMap<string, ReadonlySet<string>>
}

/** Gợi ý vị trí cất; chỉ điền vào form, người dùng vẫn phải xác nhận cất hàng. */
export function PutawaySuggestionPanel({
  items,
  state,
  disabled,
  usedSlotIdsByItem,
}: PutawaySuggestionPanelProps) {
  const { suggestions } = state
  const [reviewing, setReviewing] = useState(false)
  if (!suggestions) return null
  const itemById = new Map(items.map((item) => [item.id, item]))
  const entries = suggestions.items.filter(
    (entry) => entry.suggestions.length > 0 || entry.unallocatedQuantity > 0
  )
  const proposed = entries.flatMap((entry) =>
    entry.suggestions
      .filter((suggestion) => suggestion.suggestedQuantity > 0)
      .map((suggestion) => ({ itemId: entry.goodsReceiptItemId, slotId: suggestion.slotId }))
  )
  const allApplied =
    proposed.length > 0 &&
    proposed.every(({ itemId, slotId }) => usedSlotIdsByItem?.get(itemId)?.has(slotId))

  // Đã dùng hết gợi ý thì thu gọn để nhường chỗ cho phần phân bổ; vẫn mở lại xem được.
  if (allApplied && !reviewing)
    return (
      <section
        className="bg-muted/40 animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs motion-reduce:animate-none"
        aria-label="Gợi ý vị trí cất hàng"
      >
        <p className="text-primary flex items-center gap-1.5 font-medium" role="status">
          <Check aria-hidden="true" className="size-4" />
          Đã điền {proposed.length} vị trí theo gợi ý. Kiểm tra lại bên dưới rồi xác nhận cất hàng.
        </p>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setReviewing(true)}>
            Xem lại gợi ý
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Ẩn gợi ý"
            onClick={state.onClear}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </section>
    )

  return (
    <section
      className="bg-muted/40 animate-in fade-in-0 slide-in-from-top-2 animation-duration-250 border-b p-4 motion-reduce:animate-none"
      aria-label="Gợi ý vị trí cất hàng"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles aria-hidden="true" className="text-tertiary size-4" />
          Gợi ý vị trí cất
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {proposed.length > 0 && !allApplied ? (
            <Button type="button" size="sm" disabled={disabled} onClick={state.onApplyBest}>
              Áp dụng phân bổ gợi ý
            </Button>
          ) : null}
          {allApplied ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setReviewing(false)}>
              Thu gọn
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Ẩn gợi ý"
            onClick={state.onClear}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="mb-3">
        <PutawaySuggestionSummary suggestions={suggestions} />
      </div>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Chưa tìm được vị trí còn sức chứa cho các dòng hàng này.
        </p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {entries.map((entry) => {
            const item = itemById.get(entry.goodsReceiptItemId)
            return (
              <li key={entry.goodsReceiptItemId} className="min-w-0">
                <p className="mb-1.5 text-xs font-semibold break-words">
                  {item ? `${item.productSKU} - ${item.productName}` : 'Sản phẩm'}
                </p>
                <PutawaySuggestionList
                  entry={entry}
                  unitName={item?.baseUnitName ?? ''}
                  disabled={disabled}
                  usedSlotIds={usedSlotIdsByItem?.get(entry.goodsReceiptItemId)}
                  onApply={(slotId) => state.onApply(entry.goodsReceiptItemId, slotId)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
