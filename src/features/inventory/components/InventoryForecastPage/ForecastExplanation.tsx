import { useState } from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ForecastExplanationProps {
  readonly label: string
  readonly text: string
}

export function ForecastExplanation({ label, text }: ForecastExplanationProps) {
  const [open, setOpen] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  return (
    <Tooltip open={!open && hintOpen} onOpenChange={setHintOpen}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 sm:size-8"
              aria-label={label}
            >
              <Info className="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          aria-label={label}
          className="max-w-[calc(100vw-2rem)] text-sm break-words whitespace-normal"
        >
          {text}
        </PopoverContent>
      </Popover>
      <TooltipContent sideOffset={4} className="max-w-80 text-sm break-words whitespace-normal">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
