import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ViewerIconButton({
  label,
  onClick,
  children,
}: {
  readonly label: string
  readonly onClick: () => void
  readonly children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" size="icon-sm" variant="ghost" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
