import { FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ExcelExportButtonProps {
  readonly isPending: boolean
  readonly disabledReason?: string
  readonly onExport: () => void
  readonly selection?: {
    readonly count: number
    readonly onExport: () => void
    readonly allDisabledReason?: string
  }
}

export function ExcelExportButton({
  isPending,
  disabledReason,
  onExport,
  selection,
}: ExcelExportButtonProps) {
  const description = isPending
    ? 'Đang xuất Excel…'
    : (disabledReason ?? 'Xuất Excel — toàn bộ kết quả theo bộ lọc')
  const disabled = isPending || Boolean(disabledReason)
  const unavailable = Boolean(disabledReason) && !isPending
  const action = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-11 sm:size-8"
      aria-label="Xuất Excel"
      aria-busy={isPending}
      aria-disabled={disabled}
      disabled={unavailable}
      onPointerDown={(event) => {
        if (disabled) event.preventDefault()
      }}
      onKeyDown={(event) => {
        if (disabled && ['Enter', ' ', 'ArrowDown'].includes(event.key)) event.preventDefault()
      }}
      onClick={(event) => {
        if (disabled) event.preventDefault()
        else if (!selection) onExport()
      }}
    >
      {isPending ? (
        <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <FileSpreadsheet aria-hidden="true" />
      )}
    </Button>
  )
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex shrink-0"
          tabIndex={unavailable ? 0 : undefined}
          aria-label={unavailable ? description : undefined}
        >
          {selection ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>{action}</DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4} className="min-w-64">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={disabled || Boolean(selection.allDisabledReason)}
                    onSelect={() => {
                      if (!disabled && !selection.allDisabledReason) onExport()
                    }}
                  >
                    {selection.allDisabledReason ?? 'Toàn bộ kết quả theo bộ lọc'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={disabled}
                    onSelect={() => {
                      if (!disabled) selection.onExport()
                    }}
                  >
                    Các dòng đã chọn ({selection.count})
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            action
          )}
          <span className="sr-only" role="status">
            {isPending ? 'Đang xuất Excel…' : ''}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={4}>{description}</TooltipContent>
    </Tooltip>
  )
}
