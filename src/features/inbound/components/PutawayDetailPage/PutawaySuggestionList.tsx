'use client'

import { PutawaySuggestionList as SharedList } from '@/components/operations/putaway'
import type { PutAwayItemSuggestions } from '../../types/inbound.types'

export function PutawaySuggestionList(props: {
  readonly entry: PutAwayItemSuggestions
  readonly unitName: string
  readonly disabled: boolean
  readonly usedSlotIds?: ReadonlySet<string>
  readonly onApply: (slotId: string) => void
}) {
  return (
    <SharedList {...props} entry={{ ...props.entry, itemId: props.entry.goodsReceiptItemId }} />
  )
}
