import type { KeyboardEvent, MouseEvent } from 'react'
import { cn } from '@/lib/utils'

export function goodsPreviewInteractions(
  onPreview: (() => void) | undefined,
  active: boolean,
  className?: string
) {
  if (!onPreview) return { className }
  return {
    tabIndex: 0,
    'data-state': active ? 'selected' : undefined,
    className: cn(
      'cursor-pointer data-[state=selected]:bg-muted focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2',
      className
    ),
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (
        event.target instanceof Element &&
        event.currentTarget.contains(event.target) &&
        !window.getSelection()?.toString() &&
        !event.target.closest(
          'a, button, input, select, textarea, label, [role="button"], [role="menuitem"], [role="checkbox"], [data-preview-ignore], [data-row-ignore]'
        )
      ) {
        onPreview()
      }
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        onPreview()
      }
    },
  }
}
