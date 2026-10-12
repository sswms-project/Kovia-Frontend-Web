import type { LucideIcon } from 'lucide-react'

/** Khung chung cho mọi thẻ "bước tiếp theo" để thẻ mở trang và thẻ hỏi tiếp trông như một nhóm. */
export const AI_ACTION_TILE_CLASS =
  'group bg-card hover:bg-muted hover:border-primary/40 focus-visible:ring-ring flex w-full min-w-0 items-center gap-3 rounded-md border p-3 text-left transition-colors duration-150 outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-60'

interface AiActionTileBodyProps {
  readonly icon: LucideIcon
  readonly title: string
  readonly description?: string | null
  /** Biểu tượng cuối thẻ cho biết bấm sẽ mở trang hay gửi câu hỏi. */
  readonly trailingIcon: LucideIcon
}

export function AiActionTileBody({
  icon: Icon,
  title,
  description,
  trailingIcon: TrailingIcon,
}: AiActionTileBodyProps) {
  return (
    <>
      <span className="bg-tertiary/10 text-tertiary flex size-9 shrink-0 items-center justify-center rounded-md">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-medium break-words">{title}</span>
        {description ? (
          <span className="text-muted-foreground line-clamp-2 block text-xs break-words">
            {description}
          </span>
        ) : null}
      </span>
      <TrailingIcon
        className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </>
  )
}
