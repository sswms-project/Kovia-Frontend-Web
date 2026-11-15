'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useAiPanelLayout } from '@/features/ai-assistant/hooks/use-ai-panel-layout'
import { cn } from '@/lib/utils'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'

interface AiAssistantDockProps {
  readonly children: ReactNode
  readonly className?: string
}

/**
 * Chừa chỗ bên phải cho khung trợ lý khi nó đang gắn (docked) để trang co lại thay vì bị che.
 * Khi màn hình quá hẹp, hoặc khung phóng to / phủ kín, khung nổi lên trên và không chừa chỗ.
 */
export function AiAssistantDock({ children, className }: AiAssistantDockProps) {
  const isOpen = useAiAssistantPanelStore((state) => state.isOpen)
  const { reservedWidth } = useAiPanelLayout()

  return (
    <div
      data-slot="ai-assistant-dock"
      className={cn(
        'min-w-0 print:pr-0',
        className,
        // No padding transition: animating it re-lays-out the whole page every frame (measured ~3 long
        // tasks of 50-120ms per open/close on the owner dashboard). The page makes room at once while
        // the panel itself slides in/out with `translate` (see AiAssistantShell).
        isOpen && reservedWidth > 0 && 'pr-(--ai-panel-width)'
      )}
      style={{ '--ai-panel-width': `${reservedWidth}px` } as CSSProperties}
    >
      {children}
    </div>
  )
}
