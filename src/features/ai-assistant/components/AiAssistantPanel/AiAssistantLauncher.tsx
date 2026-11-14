'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import { useAiPanelLayout } from '../../hooks/use-ai-panel-layout'
import { useAiPanelPreferences } from '../../hooks/use-ai-panel-preferences'
import { AiAssistantMascot } from './AiAssistantMascot'
import { AiAssistantPanel } from './AiAssistantPanel'
import { AiAssistantShell } from './AiAssistantShell'

interface AiAssistantLauncherProps {
  /** Cờ năng lực do header tính từ quyền của người dùng; launcher không tự so sánh vai trò. */
  readonly canUseAiAssistant: boolean
  /** Dùng để lưu bố cục theo từng người dùng và dọn lịch sử khi đổi người dùng. */
  readonly userId: string | null
}

/** The single Kovia entry point: this button is the minimized state; the panel stays mounted once opened. */
export function AiAssistantLauncher({ canUseAiAssistant, userId }: AiAssistantLauncherProps) {
  const isOpen = useAiAssistantPanelStore((state) => state.isOpen)
  const setOpen = useAiAssistantPanelStore((state) => state.setOpen)
  const layout = useAiPanelLayout()
  const [hasOpened, setHasOpened] = useState(false)
  // Mount lazily so users who never open the assistant never fetch its history.
  if (isOpen && !hasOpened) setHasOpened(true)

  useAiPanelPreferences(canUseAiAssistant ? userId : null)

  if (!canUseAiAssistant) return null

  // The page keeps working beside a docked panel; an overlay or full-screen panel would hide the
  // page the user just navigated to, so it minimizes itself.
  const handleNavigate = () => {
    if (layout.placement !== 'docked') setOpen(false)
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            aria-label={isOpen ? 'Thu nhỏ trợ lý Kovia AI' : 'Mở trợ lý Kovia AI'}
            aria-pressed={isOpen}
            className="bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/85 aria-pressed:ring-tertiary-fixed aria-pressed:ring-offset-sidebar h-9 gap-2 rounded-full pr-1 pl-1 text-sm font-semibold shadow-[0_0_14px_color-mix(in_oklab,var(--tertiary-container)_45%,transparent)] aria-pressed:ring-2 aria-pressed:ring-offset-2 sm:pr-3.5"
            onClick={() => setOpen(!isOpen)}
          >
            <AiAssistantMascot size="sm" />
            <span className="hidden sm:inline">Trợ lý AI</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{isOpen ? 'Thu nhỏ trợ lý' : 'Hỏi Kovia AI'}</TooltipContent>
      </Tooltip>
      {hasOpened
        ? // Portal: the header sets its own (dark) theme tokens, which the panel must not inherit.
          createPortal(
            <AiAssistantShell>
              <AiAssistantPanel onNavigate={handleNavigate} />
            </AiAssistantShell>,
            document.body
          )
        : null}
    </>
  )
}
