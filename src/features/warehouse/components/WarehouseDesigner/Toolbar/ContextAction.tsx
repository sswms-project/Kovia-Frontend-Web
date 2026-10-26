'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ContextAction({
  label,
  disabled,
  destructive = false,
  tooltipText,
  onClick,
  children,
}: {
  readonly label: string
  readonly disabled?: boolean
  readonly destructive?: boolean
  readonly tooltipText?: string
  readonly onClick: () => void
  readonly children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={
            destructive
              ? 'text-destructive hover:bg-destructive/10 hover:text-destructive h-14 min-w-16 flex-col gap-1 rounded-none px-3 text-[11px]'
              : 'h-14 min-w-16 flex-col gap-1 rounded-none px-3 text-[11px]'
          }
          disabled={disabled}
          onClick={onClick}
        >
          {children}
          <span>{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltipText ?? label}</TooltipContent>
    </Tooltip>
  )
}
