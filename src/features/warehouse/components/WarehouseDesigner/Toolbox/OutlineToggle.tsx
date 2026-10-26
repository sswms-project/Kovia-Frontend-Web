import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CollapsibleTrigger } from '@/components/ui/collapsible'

export function OutlineToggle({
  open,
  label,
  disabled = false,
}: {
  readonly open: boolean
  readonly label: string
  readonly disabled?: boolean
}) {
  return (
    <CollapsibleTrigger asChild>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className="shrink-0"
        disabled={disabled}
        aria-label={label}
      >
        <ChevronRight
          aria-hidden="true"
          className={
            open
              ? 'rotate-90 transition-transform motion-reduce:transition-none'
              : 'transition-transform motion-reduce:transition-none'
          }
        />
      </Button>
    </CollapsibleTrigger>
  )
}
