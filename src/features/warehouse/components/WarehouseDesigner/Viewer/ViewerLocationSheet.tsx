import type { ReactNode } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export function ViewerLocationSheet({
  open,
  onOpenChange,
  tree,
  inventory,
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly tree: ReactNode
  readonly inventory: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[min(92vw,28rem)] gap-0 p-0 sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>Vị trí và hàng hóa</SheetTitle>
          <SheetDescription>Chọn vị trí và xem hàng hóa trong kho.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col pt-10">
          <div className="min-h-0 flex-[4]">{tree}</div>
          <div className="flex min-h-0 min-w-0 flex-[6] overflow-hidden">{inventory}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
