import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function OutlineButton({
  label,
  detail,
  selected,
  hasStock = false,
  icon,
  count,
  onClick,
}: {
  readonly label: string
  readonly detail: string
  readonly selected: boolean
  readonly hasStock?: boolean
  readonly icon: React.ReactNode
  readonly count?: number
  readonly onClick: () => void
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (selected) buttonRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [selected])

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        'h-auto w-full min-w-0 justify-start border border-transparent py-1.5 [contain-intrinsic-size:32px] [content-visibility:auto]',
        selected
          ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
          : hasStock
            ? 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80'
            : 'bg-card text-card-foreground hover:bg-muted'
      )}
      aria-pressed={selected}
      onClick={onClick}
    >
      {icon}
      <span className="min-w-0 text-left">
        <span translate="no" className="block truncate font-mono text-xs">
          {label}
        </span>
        <span
          className={cn(
            'block truncate text-[10px]',
            selected ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}
        >
          {detail}
        </span>
      </span>
      {count !== undefined ? (
        <span
          className={cn(
            'ml-auto shrink-0 tabular-nums',
            selected ? 'text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          {count}
        </span>
      ) : null}
    </Button>
  )
}
