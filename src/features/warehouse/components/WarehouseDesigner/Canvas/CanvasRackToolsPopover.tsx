import type { ReactNode } from 'react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import type { CanvasSize, CanvasViewport } from '../../../utils/layout-canvas-view'
import type { LayoutBounds } from '../../../utils/layout-grid'

interface CanvasRackToolsPopoverProps {
  readonly toolBounds: LayoutBounds
  readonly viewport: CanvasViewport
  readonly size: CanvasSize
  readonly collisionBoundary: HTMLElement | null
  readonly children: ReactNode
  readonly onClose: () => void
  readonly onCloseAutoFocus: () => void
}

/** Thanh công cụ căn chỉnh nhóm kệ, neo vào góc dưới phải của khung bao nhóm. */
export function CanvasRackToolsPopover({
  toolBounds,
  viewport,
  size,
  collisionBoundary,
  children,
  onClose,
  onCloseAutoFocus,
}: CanvasRackToolsPopoverProps) {
  return (
    <Popover
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <PopoverAnchor asChild>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-px"
          style={{
            left: Math.max(
              8,
              Math.min(size.width - 8, viewport.x + toolBounds.maxX * viewport.scale)
            ),
            top: Math.max(
              8,
              Math.min(size.height - 8, viewport.y + toolBounds.maxY * viewport.scale)
            ),
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        aria-label="Căn chỉnh nhóm kệ"
        align="end"
        sideOffset={8}
        collisionBoundary={collisionBoundary}
        collisionPadding={12}
        className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 animation-duration-200 max-h-(--radix-popover-content-available-height) w-76 max-w-(--radix-popover-content-available-width) overflow-y-auto overscroll-contain motion-reduce:animate-none"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onCloseAutoFocus()
        }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
