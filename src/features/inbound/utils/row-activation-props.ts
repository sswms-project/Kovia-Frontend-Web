import type { KeyboardEvent, MouseEvent } from 'react'
import { cn } from '@/lib/utils'

/**
 * Cho thẻ danh sách trên mobile bấm được ở bất kỳ đâu để mở chi tiết. Các liên kết và nút bên trong
 * thẻ giữ hành vi riêng của chúng.
 */
export function rowActivationProps(onActivate: () => void, className?: string) {
  return {
    tabIndex: 0,
    className: cn(
      'cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2',
      className
    ),
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (
        event.target instanceof Element &&
        event.currentTarget.contains(event.target) &&
        !event.target.closest(
          'a, button, input, select, textarea, label, [role="button"], [role="menuitem"], [role="checkbox"], [data-row-ignore]'
        )
      ) {
        onActivate()
      }
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        onActivate()
      }
    },
  }
}
