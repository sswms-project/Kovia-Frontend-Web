import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type OperationalListPanelProps = ComponentProps<'section'>

export function OperationalListPanel({ className, ...props }: OperationalListPanelProps) {
  return (
    <section
      data-slot="operational-list-panel"
      className={cn(
        'bg-card flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border',
        // Mobile: the list takes its natural height and the workspace scrolls, instead of being squeezed into the leftover viewport height.
        'max-md:min-h-fit',
        '[&>[data-slot=table-container]]:min-h-0 [&>[data-slot=table-container]]:flex-1 [&>[data-slot=table-container]]:overflow-auto',
        '[&>[data-slot=operational-list-body]]:min-h-0 [&>[data-slot=operational-list-body]]:flex-1 [&>[data-slot=operational-list-body]]:overflow-auto',
        className
      )}
      {...props}
    />
  )
}
