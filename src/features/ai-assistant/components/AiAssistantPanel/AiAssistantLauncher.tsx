'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AI_PANEL_DEFAULT_WIDTH, useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import { AiAssistantPanel } from './AiAssistantPanel'
import { AiAssistantMascot } from './AiAssistantMascot'
import { AiPanelResizeHandle, clampAiPanelWidth } from './AiPanelResizeHandle'

const PANEL_WIDTH_STORAGE_KEY = 'kovia-ai-assistant-panel-width'
// Vị trí của nút nổi kéo được trước đây; nút giờ cố định trên header nên dọn giá trị cũ đi.
const LEGACY_POSITION_STORAGE_KEY = 'kovia-ai-assistant-launcher-position'
/** Breakpoint `sm` của Tailwind: dưới ngưỡng này khung trợ lý phủ kín màn hình. */
const SM_BREAKPOINT_PX = 640
const FULL_WIDTH_PANEL_QUERY = `(max-width: ${SM_BREAKPOINT_PX - 1}px)`

function getStoredPanelWidth() {
  const stored = Number(window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY))
  return clampAiPanelWidth(Number.isFinite(stored) && stored > 0 ? stored : AI_PANEL_DEFAULT_WIDTH)
}

interface AiAssistantLauncherProps {
  /** Cờ năng lực do header tính từ quyền của người dùng; launcher không tự so sánh vai trò. */
  readonly canUseAiAssistant: boolean
}

export function AiAssistantLauncher({ canUseAiAssistant }: AiAssistantLauncherProps) {
  // Bố cục trang cũng đọc trạng thái này để nhường chỗ cho khung khi nó mở.
  const open = useAiAssistantPanelStore((state) => state.isOpen)
  const panelWidth = useAiAssistantPanelStore((state) => state.width)
  const setOpen = useAiAssistantPanelStore((state) => state.setOpen)
  const setConversationId = useAiAssistantPanelStore((state) => state.setConversationId)
  const setPanelWidth = useAiAssistantPanelStore((state) => state.setWidth)
  const setResizing = useAiAssistantPanelStore((state) => state.setResizing)

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_POSITION_STORAGE_KEY)
    const animationFrame = window.requestAnimationFrame(() => setPanelWidth(getStoredPanelWidth()))

    return () => window.cancelAnimationFrame(animationFrame)
  }, [setPanelWidth])

  // Đóng khung và bỏ hội thoại khi rời trang đăng nhập hay đổi sang quản trị viên nền tảng, nơi không có trợ lý.
  useEffect(
    () => () => {
      setOpen(false)
      setConversationId(null)
    },
    [setConversationId, setOpen]
  )

  // Khung không che trang nên giữ mở khi người dùng đi tới trang khác và làm việc song song với trợ lý.
  // Chỉ đóng ở màn hình hẹp, nơi khung phủ kín và trang vừa mở sẽ không nhìn thấy được.
  const handleNavigate = () => {
    if (window.matchMedia?.(FULL_WIDTH_PANEL_QUERY).matches) setOpen(false)
  }

  if (!canUseAiAssistant) return null

  const toggleLabel = open ? 'Đóng trợ lý AI Kovia' : 'Mở trợ lý AI Kovia'

  return (
    // Không modal: không phủ mờ trang và không khóa thao tác, người dùng vừa hỏi trợ lý vừa làm việc.
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Không dùng SheetTrigger: khung không modal và bấm ra ngoài không đóng, nên nút tự bật/tắt. */}
          <Button
            type="button"
            aria-label={toggleLabel}
            aria-pressed={open}
            className="bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/85 aria-pressed:ring-tertiary-fixed aria-pressed:ring-offset-sidebar h-9 gap-2 rounded-full pr-1 pl-1 text-sm font-semibold shadow-[0_0_14px_color-mix(in_oklab,var(--tertiary-container)_45%,transparent)] aria-pressed:ring-2 aria-pressed:ring-offset-2 sm:pr-3.5"
            onClick={() => setOpen(!open)}
          >
            <AiAssistantMascot size="sm" />
            <span className="hidden sm:inline">Trợ lý AI</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {open ? 'Đóng trợ lý AI' : 'Hỏi trợ lý AI Kovia'}
        </TooltipContent>
      </Tooltip>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0"
        // Bề rộng do người dùng kéo; trên màn hình hẹp khung chiếm trọn chiều ngang.
        style={{ width: `min(100vw, ${panelWidth}px)`, maxWidth: 'none' }}
        // Bấm ra ngoài là đang làm việc với trang, không phải muốn đóng trợ lý.
        onInteractOutside={(event) => event.preventDefault()}
      >
        <AiPanelResizeHandle
          width={panelWidth}
          onResize={(width) => {
            setResizing(true)
            setPanelWidth(width)
          }}
          onResizeEnd={(width) => {
            setPanelWidth(width)
            setResizing(false)
            window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(Math.round(width)))
          }}
        />
        {open ? <AiAssistantPanel onNavigate={handleNavigate} /> : null}
      </SheetContent>
    </Sheet>
  )
}
