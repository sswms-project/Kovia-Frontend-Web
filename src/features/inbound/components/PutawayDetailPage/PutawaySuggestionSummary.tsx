'use client'

import { TriangleAlert } from 'lucide-react'
import type { PutAwaySuggestionsResponse } from '../../types/inbound.types'

/** Tóm tắt phương án gợi ý và các rủi ro cần xem trước khi áp dụng. */
export function PutawaySuggestionSummary({
  suggestions,
}: {
  readonly suggestions: PutAwaySuggestionsResponse
}) {
  return (
    <div className="flex flex-col gap-2 text-xs" role="status">
      <p>
        {suggestions.summary ?? 'Gợi ý theo quy tắc kho.'}{' '}
        <span className="text-muted-foreground">
          {suggestions.isAiAssisted
            ? 'AI đề xuất, hệ thống đã kiểm tra lại sức chứa; bạn vẫn quyết định cuối cùng.'
            : (suggestions.aiNotice ?? 'Gợi ý theo quy tắc kho.')}
        </span>
      </p>
      {suggestions.risks.length > 0 ? (
        <div className="border-warning/50 border-l-2 pl-3">
          <p className="text-warning flex items-center gap-1.5 font-medium">
            <TriangleAlert aria-hidden="true" className="size-3.5" />
            Cần lưu ý
          </p>
          <ul className="text-muted-foreground mt-1 list-disc pl-4">
            {suggestions.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
