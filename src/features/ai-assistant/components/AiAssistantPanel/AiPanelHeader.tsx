import type { ReactNode } from 'react'
import { History, Maximize2, MessageSquarePlus, Minimize2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { AiPanelMode } from '../../utils/ai-panel-layout'
import { AiAssistantMascot } from './AiAssistantMascot'

interface HeaderIconButtonProps {
  readonly label: string
  readonly onClick: () => void
  readonly disabled?: boolean
  readonly pressed?: boolean
  readonly children: ReactNode
}

function HeaderIconButton({ label, onClick, disabled, pressed, children }: HeaderIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

interface AiPanelHeaderProps {
  readonly mode: AiPanelMode
  /** Split workspace already shows history beside the chat, so the history button is hidden. */
  readonly showHistoryButton: boolean
  readonly isHistoryOpen: boolean
  /** Fullscreen on a phone has no docked/expanded distinction. */
  readonly canExpand: boolean
  readonly canStartNew: boolean
  readonly onNewConversation: () => void
  readonly onToggleHistory: () => void
  readonly onToggleMode: () => void
  readonly onClose: () => void
}

export function AiPanelHeader({
  mode,
  showHistoryButton,
  isHistoryOpen,
  canExpand,
  canStartNew,
  onNewConversation,
  onToggleHistory,
  onToggleMode,
  onClose,
}: AiPanelHeaderProps) {
  const isExpanded = mode === 'expanded'
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <AiAssistantMascot size="md" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm leading-tight font-semibold">Kovia AI</h2>
        <p className="text-muted-foreground truncate text-[11px] leading-tight">
          Trợ lý quản lý kho
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <HeaderIconButton
          label="Cuộc trò chuyện mới"
          disabled={!canStartNew}
          onClick={onNewConversation}
        >
          <MessageSquarePlus aria-hidden="true" />
        </HeaderIconButton>
        {showHistoryButton ? (
          <HeaderIconButton
            label="Lịch sử trò chuyện"
            pressed={isHistoryOpen}
            onClick={onToggleHistory}
          >
            <History aria-hidden="true" />
          </HeaderIconButton>
        ) : null}
        {canExpand ? (
          <HeaderIconButton
            label={isExpanded ? 'Thu về thanh bên' : 'Mở rộng không gian làm việc'}
            onClick={onToggleMode}
          >
            {isExpanded ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </HeaderIconButton>
        ) : null}
        <HeaderIconButton label="Thu nhỏ trợ lý" onClick={onClose}>
          <X aria-hidden="true" />
        </HeaderIconButton>
      </div>
    </header>
  )
}
