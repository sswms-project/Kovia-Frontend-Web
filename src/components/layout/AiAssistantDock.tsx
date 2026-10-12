'use client'

import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'

interface AiAssistantDockProps {
  readonly children: ReactNode
}

/**
 * Chừa chỗ bên phải cho khung trợ lý AI khi nó mở, để khung nằm cạnh trang thay vì đè lên nội dung.
 * Trang thu hẹp lại (bảng tự cuộn ngang trong vùng của nó); dưới breakpoint `sm` khung phủ kín nên
 * không chừa chỗ.
 */
export function AiAssistantDock({ children }: AiAssistantDockProps) {
  const isOpen = useAiAssistantPanelStore((state) => state.isOpen)
  const width = useAiAssistantPanelStore((state) => state.width)
  const isResizing = useAiAssistantPanelStore((state) => state.isResizing)

  return (
    <div
      data-slot="ai-assistant-dock"
      className={cn(
        'min-w-0 print:pr-0',
        !isResizing &&
          'transition-[padding-right] duration-300 ease-out motion-reduce:transition-none',
        isOpen && 'sm:pr-(--ai-panel-width)'
      )}
      // Biến CSS tùy biến không nằm trong kiểu CSSProperties của React nên cần ép kiểu.
      style={{ '--ai-panel-width': `${width}px` } as CSSProperties}
    >
      {children}
    </div>
  )
}
