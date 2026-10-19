import { FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface InventoryExportButtonProps {
  readonly isPending: boolean
  readonly disabledReason?: string
  readonly onExport: () => void
}

export function InventoryExportButton({
  isPending,
  disabledReason,
  onExport,
}: InventoryExportButtonProps) {
  const description = isPending ? 'Đang xuất Excel…' : (disabledReason ?? 'Xuất Excel')
  const disabled = isPending || Boolean(disabledReason)
  const unavailable = Boolean(disabledReason) && !isPending
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex shrink-0"
          tabIndex={unavailable ? 0 : undefined}
          aria-label={unavailable ? description : undefined}
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 sm:size-8"
            aria-label="Xuất Excel"
            aria-busy={isPending}
            aria-disabled={disabled}
            disabled={unavailable}
            onClick={() => {
              if (!disabled) onExport()
            }}
          >
            {isPending ? (
              <LoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <FileSpreadsheet aria-hidden="true" />
            )}
          </Button>
          <span className="sr-only" role="status">
            {isPending ? 'Đang xuất Excel…' : ''}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={4}>{description}</TooltipContent>
    </Tooltip>
  )
}
