import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { AI_TOUCH_MIN_HEIGHT } from '../../../utils/ai-form-touch-classes'

/**
 * Trigger of a Collapsible. Radix supplies aria-expanded / aria-controls; the 44px touch target is the
 * pointer-coarse pattern of utils/ai-form-touch-classes, as min-height so a long label can still wrap.
 */
export function OutcomeToggleTrigger({ children }: { readonly children: ReactNode }) {
  return (
    <CollapsibleTrigger
      className={cn(
        'group text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-7 max-w-full items-center gap-1 rounded-sm text-left text-xs outline-none focus-visible:ring-2',
        AI_TOUCH_MIN_HEIGHT
      )}
    >
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
      <ChevronDown
        className="size-3.5 shrink-0 transition-transform duration-(--ai-motion-expand) group-data-[state=open]:rotate-180 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </CollapsibleTrigger>
  )
}
