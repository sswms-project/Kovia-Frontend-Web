'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import type { ComponentProps, MouseEvent } from 'react'
import { TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, label, [role="button"], [role="menuitem"], [role="checkbox"], [data-row-ignore]'

type ClickableTableRowProps = Omit<ComponentProps<typeof TableRow>, 'onClick'> &
  (
    | { readonly href: Route | string; readonly onActivate?: never }
    | { readonly href?: never; readonly onActivate: () => void }
  )

/**
 * Dòng bảng bấm được ở bất kỳ đâu trên dòng. Chỉ bổ sung cho chuột: bàn phím và trình đọc màn hình
 * vẫn dùng liên kết hoặc nút có sẵn trong dòng, nên mỗi dòng phải giữ một điều khiển thật.
 */
export function ClickableTableRow({
  href,
  onActivate,
  className,
  ...props
}: ClickableTableRowProps) {
  const router = useRouter()

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    const target = event.target
    // Menu/dialog được render qua portal vẫn nổi bọt sự kiện React về dòng; bỏ qua những sự kiện đó.
    if (!(target instanceof Element) || !event.currentTarget.contains(target)) return
    if (target.closest(INTERACTIVE_SELECTOR)) return
    if (window.getSelection()?.toString()) return

    if (onActivate) {
      onActivate()
    } else if (href) {
      if (event.ctrlKey || event.metaKey) window.open(href, '_blank', 'noopener')
      else router.push(href as Route)
    }
  }

  return <TableRow className={cn('cursor-pointer', className)} onClick={handleClick} {...props} />
}
