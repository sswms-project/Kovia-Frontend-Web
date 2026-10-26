import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ReportColumnHeadingProps {
  readonly label: string
  readonly help?: string
}
export function ReportColumnHeading({ label, help }: ReportColumnHeadingProps) {
  return (
    <span className="inline-flex items-center gap-1 py-2 leading-5">
      <span className="whitespace-nowrap">{label}</span>
      {help ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-6 shrink-0"
              aria-label={`Giải thích: ${label}`}
            >
              <CircleHelp className="size-3.5" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={4}
            aria-label={`Giải thích: ${label}`}
            className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out animation-duration-200 text-left leading-relaxed motion-reduce:animate-none"
          >
            <strong>{label}</strong>
            {help}
          </PopoverContent>
        </Popover>
      ) : null}
    </span>
  )
}
