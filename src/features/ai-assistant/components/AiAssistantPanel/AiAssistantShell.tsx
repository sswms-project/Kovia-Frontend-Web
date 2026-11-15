'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import { useAiPanelLayout } from '../../hooks/use-ai-panel-layout'
import { AI_PANEL_MIN_WIDTH, clampAiPanelWidth } from '../../utils/ai-panel-layout'
import { AiPanelResizeHandle } from './AiPanelResizeHandle'

interface AiAssistantShellProps {
  readonly children: ReactNode
}

/**
 * Fixed right-hand frame. Stays mounted once opened (hidden with `inert`), so the draft, the
 * current conversation and the scroll position survive minimizing and mode changes.
 */
export function AiAssistantShell({ children }: AiAssistantShellProps) {
  const isOpen = useAiAssistantPanelStore((state) => state.isOpen)
  const isResizing = useAiAssistantPanelStore((state) => state.isResizing)
  const mode = useAiAssistantPanelStore((state) => state.mode)
  const setOpen = useAiAssistantPanelStore((state) => state.setOpen)
  const setWidth = useAiAssistantPanelStore((state) => state.setWidth)
  const setResizing = useAiAssistantPanelStore((state) => state.setResizing)
  const layout = useAiPanelLayout()
  const isDocked = layout.placement === 'docked'

  // Docked panels sit beside the page, so Escape belongs to the page; overlays close on Escape.
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && !event.defaultPrevented && !isDocked) setOpen(false)
  }

  return (
    <aside
      data-slot="ai-assistant-panel"
      aria-label="Trợ lý Kovia AI"
      aria-hidden={!isOpen}
      inert={!isOpen}
      onKeyDown={handleKeyDown}
      style={layout.width === null ? undefined : { width: layout.width }}
      className={cn(
        'bg-background fixed right-0 bottom-0 z-40 flex flex-col border-l print:hidden',
        // Docked: below the app header (h-14), beside the page that made room for it; the header and the
        // sidebar never move. Overlay and full screen cover the whole viewport.
        isDocked ? 'top-14' : 'top-0',
        layout.width === null && 'h-dvh w-screen',
        !isDocked && layout.width !== null && 'shadow-lg',
        // Tailwind v4 dịch chuyển bằng thuộc tính `translate`, không phải `transform`.
        'transition-[translate,opacity] duration-(--ai-motion-panel) ease-(--ai-ease-out) motion-reduce:duration-200',
        isResizing && 'transition-none',
        // Trượt hẳn ra mép phải khi đóng. `starting:` cho lần mở đầu tiên (khung vừa được mount đã ở trạng thái mở)
        // cũng trượt vào thay vì hiện ngay. Khi người dùng bật giảm chuyển động của hệ điều hành, quãng trượt
        // giảm xuống còn 1.5rem kèm mờ dần: vẫn thấy khung vào/ra nhưng không có chuyển động lớn.
        isOpen
          ? 'translate-x-0 opacity-100 starting:translate-x-full starting:opacity-0 motion-reduce:starting:translate-x-6'
          : 'pointer-events-none translate-x-full opacity-0 motion-reduce:translate-x-6'
      )}
    >
      {isDocked && mode === 'docked' ? (
        <AiPanelResizeHandle
          width={layout.width ?? AI_PANEL_MIN_WIDTH}
          onResize={(width) => {
            setResizing(true)
            setWidth(clampAiPanelWidth(width, window.innerWidth))
          }}
          onResizeEnd={(width) => {
            setWidth(clampAiPanelWidth(width, window.innerWidth))
            setResizing(false)
          }}
        />
      ) : null}
      {children}
    </aside>
  )
}
