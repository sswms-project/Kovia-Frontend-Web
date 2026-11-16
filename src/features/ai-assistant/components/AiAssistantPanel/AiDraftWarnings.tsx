import { Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AiDraftWarning } from '../../schemas/ai-draft-edit.schema'
import { isAiDraftInfoWarning, isAiDraftShortageWarning } from '../../utils/ai-draft-edit-warnings'
import { getAiDraftWarningText } from '../../utils/ai-draft-warning-copy'

interface AiDraftWarningsProps {
  readonly warnings: readonly AiDraftWarning[]
  /** Neutral line for rows whose earlier warning no longer applies (an edit made it stale). */
  readonly recheckNote?: string | null
}

const SHORTAGE_ADVICE = 'Có thể không đủ hàng khi xuất; kiểm tra lại ở bước xử lý phiếu.'

/** Advisory notes of a draft (shortage, a reset date, an inactive supplier). They inform; nothing here blocks Save or Confirm. */
export function AiDraftWarnings({ warnings, recheckNote }: AiDraftWarningsProps) {
  if (warnings.length === 0 && !recheckNote) return null

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {warnings.length > 0 ? (
        <ul className="flex min-w-0 flex-col gap-1">
          {warnings.map((warning, index) => {
            const isInfo = isAiDraftInfoWarning(warning)
            const Icon = isInfo ? Info : TriangleAlert
            return (
              <li
                key={`${warning.code}-${warning.field ?? ''}-${index}`}
                className={cn(
                  'flex items-start gap-1.5 text-xs',
                  isInfo ? 'text-muted-foreground' : 'text-warning'
                )}
              >
                <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <span className="min-w-0 break-words">
                  {isAiDraftShortageWarning(warning) ? (
                    <strong className="font-medium">Cảnh báo thiếu tồn: </strong>
                  ) : null}
                  {getAiDraftWarningText(warning)}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
      {warnings.some(isAiDraftShortageWarning) ? (
        <p className="text-muted-foreground text-xs">{SHORTAGE_ADVICE}</p>
      ) : null}
      {recheckNote ? <p className="text-muted-foreground text-xs">{recheckNote}</p> : null}
    </div>
  )
}
