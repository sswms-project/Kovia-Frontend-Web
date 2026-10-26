import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { OutlineToggle } from './OutlineToggle'

export function OutlineGroup({
  label,
  count,
  icon,
  open,
  onOpenChange,
  children,
}: {
  readonly label: string
  readonly count: number
  readonly icon: React.ReactNode
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly children: React.ReactNode
}) {
  return (
    <li>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className="flex min-w-0 items-center gap-0.5">
          <OutlineToggle open={open} label={`${open ? 'Thu gọn' : 'Mở'} ${label.toLowerCase()}`} />
          <div className="text-foreground flex min-h-8 min-w-0 flex-1 items-center gap-2 px-2 text-xs font-medium">
            {icon}
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <Badge variant="outline">{count}</Badge>
          </div>
        </div>
        <CollapsibleContent>
          <ul className="border-border ml-3 flex flex-col gap-1 border-l pt-1 pl-1.5">
            {children}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}
