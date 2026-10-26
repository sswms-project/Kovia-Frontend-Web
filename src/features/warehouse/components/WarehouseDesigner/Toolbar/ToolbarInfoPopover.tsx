'use client'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ToolbarInfoPopover({
  label,
  icon,
  children,
}: {
  readonly label: string
  readonly icon: React.ReactNode
  readonly children: React.ReactNode
}) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button type="button" size="icon-sm" variant="ghost" aria-label={label}>
              {icon}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 text-sm">
        {children}
      </PopoverContent>
    </Popover>
  )
}
