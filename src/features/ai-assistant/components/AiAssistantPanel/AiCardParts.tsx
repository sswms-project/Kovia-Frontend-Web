'use client'

import type { ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { isAiAppPath } from '../../utils/ai-assistant-links'

const linkClass =
  'decoration-muted-foreground/60 hover:decoration-primary focus-visible:ring-ring rounded-sm underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2'

/** A label that links only when the BE kept a verified in-app URL for it. */
export function AiCardLink({
  url,
  children,
  onNavigate,
  className,
}: {
  readonly url?: string | null
  readonly children: string
  readonly onNavigate: () => void
  /** Replaces the default dotted-underline look for a card that needs its own (e.g. a larger touch target). */
  readonly className?: string
}) {
  return isAiAppPath(url) ? (
    // In-app path rebuilt and permission-checked by the BE, validated by isAiAppPath.
    <Link href={url as Route} onNavigate={onNavigate} className={className ?? linkClass}>
      {children}
    </Link>
  ) : (
    <>{children}</>
  )
}

export function AiCardDetailList({
  title,
  items,
}: {
  readonly title: string
  readonly items?: readonly string[] | null
}) {
  if (!items?.length) return null
  return (
    <div className="space-y-0.5">
      <p className="font-medium">{title}</p>
      <ul className="text-muted-foreground list-disc space-y-0.5 pl-4">
        {items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}

/** Progressive disclosure: the conclusion stays visible, the basis is one tap away. */
export function AiCardDisclosure({
  label,
  children,
  triggerClassName,
}: {
  readonly label: string
  readonly children: ReactNode
  /** Opt-in extras for the trigger (e.g. wrapping, 44px touch target); other cards keep the default look. */
  readonly triggerClassName?: string
}) {
  return (
    <Collapsible className="border-t px-3 py-1.5">
      <CollapsibleTrigger
        className={cn(
          'group text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-7 items-center gap-1 rounded-sm text-xs outline-none focus-visible:ring-2',
          triggerClassName
        )}
      >
        {label}
        <ChevronDown
          className="size-3.5 transition-transform duration-(--ai-motion-expand) group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent data-ai-motion="expand" className="space-y-1.5 pt-1 pb-1 text-xs">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
