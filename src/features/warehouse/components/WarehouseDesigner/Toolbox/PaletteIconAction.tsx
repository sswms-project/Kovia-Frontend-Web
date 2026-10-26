import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { LayoutPaletteDragData } from '../../../types/warehouse-layout-palette.types'
import { writeLayoutDragData } from '../../../utils/layout-drag-data'

export function PaletteIconAction({
  label,
  disabledReason,
  disabled,
  onClick,
  icon,
  dragData,
}: {
  readonly label: string
  readonly disabledReason: string
  readonly disabled: boolean
  readonly onClick: () => void
  readonly icon: React.ReactNode
  readonly dragData: LayoutPaletteDragData
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="bg-surface-container-low hover:bg-surface-container-high text-foreground hover:border-border focus-visible:ring-ring aspect-square h-auto max-h-16 w-full min-w-0 rounded-lg border border-transparent p-0 transition-colors focus-visible:ring-2 [&_svg]:size-8"
            disabled={disabled}
            draggable={!disabled}
            aria-label={label}
            onDragStart={(event) => writeLayoutDragData(event.dataTransfer, dragData)}
            onClick={onClick}
          >
            {icon}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{disabled ? disabledReason : label}</TooltipContent>
    </Tooltip>
  )
}
