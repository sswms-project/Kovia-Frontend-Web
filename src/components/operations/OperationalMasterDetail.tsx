'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Separator, type PanelImperativeHandle } from 'react-resizable-panels'
import { Button } from '@/components/ui/button'
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useIsMobile } from '@/hooks/use-mobile'

const DEFAULT_DETAIL_SIZE = 35
const MIN_REOPEN_SIZE = 25

interface OperationalMasterDetailProps {
  readonly children: ReactNode
  readonly detail: ReactNode
  readonly expanded: boolean
  readonly onExpandedChange: (expanded: boolean) => void
  readonly detailId: string
  readonly detailLabel?: string
}

export function OperationalMasterDetail({
  children,
  detail,
  expanded,
  onExpandedChange,
  detailId,
  detailLabel = 'chi tiết hàng hóa',
}: OperationalMasterDetailProps) {
  const groupId = useId()
  const detailPanelId = `${groupId}-detail`
  const resizeInitiated = useRef(false)
  const currentDetailSize = useRef(0)
  const lastExpandedSize = useRef(DEFAULT_DETAIL_SIZE)
  const panelRef = useRef<PanelImperativeHandle | null>(null)
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const separatorRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLDivElement | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (isMobile) return
    if (expanded) panelRef.current?.resize(`${lastExpandedSize.current}%`)
    else panelRef.current?.collapse()
  }, [expanded, isMobile])

  function positionToggle() {
    const workspace = workspaceRef.current
    const separator = separatorRef.current
    const toggle = toggleRef.current
    if (!workspace || !separator || !toggle) return
    // Measure the committed layout, not a ratio emitted before the panels render.
    const gap = separator.getBoundingClientRect()
    toggle.style.top = `${gap.top - workspace.getBoundingClientRect().top + gap.height / 2}px`
  }

  if (isMobile) {
    return (
      <div className="flex min-h-fit min-w-0 shrink-0 flex-col gap-2">
        <div className="min-w-0">{children}</div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          aria-expanded={expanded}
          aria-controls={detailId}
          onClick={() => onExpandedChange(!expanded)}
        >
          {expanded ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
          {expanded ? 'Thu gọn' : 'Mở'} {detailLabel}
        </Button>
        <div hidden={!expanded} className="min-w-0">
          {detail}
        </div>
      </div>
    )
  }

  return (
    <div ref={workspaceRef} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <ResizablePanelGroup
        orientation="vertical"
        className="min-h-0 flex-1"
        aria-label="Danh sách và chi tiết hàng hóa"
        onLayoutChange={(layout) => {
          currentDetailSize.current = layout[detailPanelId] ?? 0
        }}
        onLayoutChanged={(layout) => {
          if (!resizeInitiated.current) return
          resizeInitiated.current = false
          const size = layout[detailPanelId] ?? 0
          if (size > 0) lastExpandedSize.current = Math.max(MIN_REOPEN_SIZE, size)
          else if (expanded) onExpandedChange(false)
        }}
      >
        <ResizablePanel
          defaultSize="100%"
          minSize="40%"
          onResize={positionToggle}
          className="flex min-h-0 min-w-0 flex-col"
        >
          {children}
        </ResizablePanel>
        <Separator
          elementRef={separatorRef}
          disabled={isMobile || !expanded}
          disableDoubleClick
          onPointerDownCapture={() => {
            resizeInitiated.current = true
          }}
          onKeyDownCapture={(event) => {
            if (['ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(event.key))
              resizeInitiated.current = true
          }}
          className="bg-background focus-visible:ring-ring h-3 shrink-0 focus-visible:ring-1 focus-visible:outline-hidden"
          aria-label={`Kéo để thay đổi chiều cao ${detailLabel}`}
        />
        <ResizablePanel
          panelRef={panelRef}
          id={detailPanelId}
          defaultSize="0%"
          minSize="1px"
          maxSize="60%"
          collapsible
          collapsedSize="0%"
          className="flex min-h-0 min-w-0 flex-col overflow-hidden"
        >
          {detail}
        </ResizablePanel>
      </ResizablePanelGroup>
      {/* Outside the resize hit region; its position follows actual panel geometry. */}
      <div
        ref={toggleRef}
        className="absolute top-[calc(100%-0.375rem)] left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2"
      >
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="h-5 cursor-pointer transition-colors active:not-aria-[haspopup]:translate-y-0"
          aria-label={`${expanded ? 'Thu gọn' : 'Mở'} ${detailLabel}`}
          title={expanded ? 'Thu gọn' : 'Mở rộng'}
          aria-expanded={expanded}
          aria-controls={detailId}
          onClick={() => {
            resizeInitiated.current = false
            if (expanded && currentDetailSize.current > 0)
              lastExpandedSize.current = Math.max(MIN_REOPEN_SIZE, currentDetailSize.current)
            onExpandedChange(!expanded)
          }}
        >
          {expanded ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
        </Button>
      </div>
    </div>
  )
}
