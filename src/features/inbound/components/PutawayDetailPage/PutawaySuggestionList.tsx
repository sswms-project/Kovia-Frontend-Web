'use client'

import { Check, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { formatQuantity } from '@/features/inbound-request/utils/inbound-request-format'
import type { PutAwayItemSuggestions, PutAwaySlotSuggestion } from '../../types/inbound.types'

interface PutawaySuggestionListProps {
  readonly entry: PutAwayItemSuggestions
  readonly unitName: string
  readonly disabled: boolean
  /** Vị trí đã có trong phân bổ của dòng hàng: hiện "Đã dùng" thay cho nút. */
  readonly usedSlotIds?: ReadonlySet<string>
  readonly onApply: (slotId: string) => void
}

/** Các vị trí gợi ý cho một dòng hàng; dùng chung ở màn cấu hình và màn cất hàng. */
export function PutawaySuggestionList({
  entry,
  unitName,
  disabled,
  usedSlotIds,
  onApply,
}: PutawaySuggestionListProps) {
  const proposed = entry.suggestions.filter((suggestion) => suggestion.suggestedQuantity > 0)
  // Phản hồi không kèm số lượng thì mọi vị trí đều là lựa chọn ngang nhau.
  const primary = proposed.length > 0 ? proposed : entry.suggestions
  const alternates =
    proposed.length > 0
      ? entry.suggestions.filter((suggestion) => suggestion.suggestedQuantity <= 0)
      : []
  const row = (suggestion: PutAwaySlotSuggestion) => (
    <SuggestionRow
      key={suggestion.slotId}
      suggestion={suggestion}
      unitName={unitName}
      disabled={disabled}
      used={usedSlotIds?.has(suggestion.slotId) ?? false}
      onApply={onApply}
    />
  )

  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y border">{primary.map(row)}</ul>
      {entry.unallocatedQuantity > 0 ? (
        <p className="text-warning text-xs tabular-nums" role="status">
          Còn {formatQuantity(entry.unallocatedQuantity)} {unitName} chưa có vị trí đủ sức chứa.
        </p>
      ) : null}
      {alternates.length > 0 ? (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground group h-auto px-0 py-1 text-xs"
            >
              <ChevronDown
                aria-hidden="true"
                className="transition-transform group-data-[state=open]:rotate-180"
              />
              {alternates.length} vị trí thay thế
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden motion-reduce:animate-none">
            <ul className="mt-1 divide-y border">{alternates.map(row)}</ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  )
}

function SuggestionRow({
  suggestion,
  unitName,
  disabled,
  used,
  onApply,
}: {
  readonly suggestion: PutAwaySlotSuggestion
  readonly unitName: string
  readonly disabled: boolean
  readonly used: boolean
  readonly onApply: (slotId: string) => void
}) {
  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <strong className="font-mono text-sm">{suggestion.slotCode}</strong>
          {suggestion.suggestedQuantity > 0 ? (
            <span className="font-medium tabular-nums">
              {formatQuantity(suggestion.suggestedQuantity)} {unitName}
            </span>
          ) : null}
          {suggestion.source === 'Ai' ? (
            <Badge className="bg-tertiary-container text-on-tertiary-container">AI</Badge>
          ) : null}
          {suggestion.availableQuantity !== null ? (
            <span className="text-muted-foreground tabular-nums">
              còn nhận {formatQuantity(suggestion.availableQuantity)}
            </span>
          ) : null}
        </p>
        <p className="text-muted-foreground mt-0.5 break-words">
          {suggestion.zoneName} · {suggestion.reason}
        </p>
        {suggestion.warnings.map((warning) => (
          <p key={warning} className="text-warning mt-0.5 break-words">
            {warning}
          </p>
        ))}
      </div>
      {used ? (
        <span className="text-primary animate-in fade-in-0 zoom-in-95 animation-duration-200 flex shrink-0 items-center gap-1 py-1.5 font-medium motion-reduce:animate-none">
          <Check aria-hidden="true" className="size-3.5" />
          Đã dùng
        </span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={disabled}
          onClick={() => onApply(suggestion.slotId)}
        >
          Dùng vị trí này
        </Button>
      )}
    </li>
  )
}
