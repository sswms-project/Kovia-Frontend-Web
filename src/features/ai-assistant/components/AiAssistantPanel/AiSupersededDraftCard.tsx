import { ArrowDown } from 'lucide-react'

interface AiSupersededDraftCardProps {
  /** One-line summary of the older copy, taken from its own card. */
  readonly summary?: string | null
}

/**
 * Stand-in for an older copy of a draft whose current version is a later card in the thread. Plain
 * text on purpose: no status, no actions, nothing to focus, so it can never look live.
 */
export function AiSupersededDraftCard({ summary }: AiSupersededDraftCardProps) {
  return (
    <div className="text-muted-foreground flex min-w-0 items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs">
      <ArrowDown aria-hidden="true" className="size-3.5 shrink-0" />
      <p className="min-w-0 truncate">
        <span className="font-medium">Đã cập nhật ở bên dưới</span>
        {summary ? ` · ${summary}` : null}
      </p>
    </div>
  )
}
