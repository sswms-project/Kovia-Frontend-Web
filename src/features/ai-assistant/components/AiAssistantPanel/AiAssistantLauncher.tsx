'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { USER_ROLES } from '@/config/roles'
import { AI_PANEL_DEFAULT_WIDTH, useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import { useAuthStore } from '@/stores/auth.store'
import {
  clampLauncherPosition,
  getDefaultLauncherPosition,
  getPanelOffset,
  SM_BREAKPOINT_PX,
  VIEWPORT_GUTTER,
  type LauncherPosition,
  type ViewportSize,
} from '../../utils/ai-launcher-position'
import { AiAssistantPanel } from './AiAssistantPanel'
import { AiAssistantMascot } from './AiChatMessageBubble'
import { AiPanelResizeHandle, clampAiPanelWidth } from './AiPanelResizeHandle'

interface DragState {
  readonly pointerId: number
  readonly originX: number
  readonly originY: number
  readonly originLeft: number
  readonly originTop: number
}

const DRAG_THRESHOLD = 5
const POSITION_STORAGE_KEY = 'kovia-ai-assistant-launcher-position'
const PANEL_WIDTH_STORAGE_KEY = 'kovia-ai-assistant-panel-width'
// Dưới ngưỡng này khung trợ lý phủ kín màn hình (xem style width của SheetContent bên dưới).
const FULL_WIDTH_PANEL_QUERY = `(max-width: ${SM_BREAKPOINT_PX - 1}px)`

function getViewport(): ViewportSize {
  return { width: window.innerWidth, height: window.innerHeight }
}

function getStoredPanelWidth() {
  const stored = Number(window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY))
  return clampAiPanelWidth(Number.isFinite(stored) && stored > 0 ? stored : AI_PANEL_DEFAULT_WIDTH)
}

function getStoredPosition(): LauncherPosition | null {
  const value = window.localStorage.getItem(POSITION_STORAGE_KEY)
  if (!value) return null

  try {
    const parsed: unknown = JSON.parse(value)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'left' in parsed &&
      'top' in parsed &&
      typeof parsed.left === 'number' &&
      typeof parsed.top === 'number'
    ) {
      return clampLauncherPosition({ left: parsed.left, top: parsed.top }, getViewport())
    }
  } catch {
    window.localStorage.removeItem(POSITION_STORAGE_KEY)
  }

  return null
}

function getDraggedPosition(
  drag: DragState,
  event: PointerEvent<HTMLButtonElement>,
  panelOffset: number
): LauncherPosition {
  return clampLauncherPosition(
    {
      left: drag.originLeft + event.clientX - drag.originX,
      top: drag.originTop + event.clientY - drag.originY,
    },
    getViewport(),
    panelOffset
  )
}

export function AiAssistantLauncher() {
  const user = useAuthStore((state) => state.user)
  // Bố cục trang cũng đọc trạng thái này để nhường chỗ cho khung khi nó mở.
  const open = useAiAssistantPanelStore((state) => state.isOpen)
  const panelWidth = useAiAssistantPanelStore((state) => state.width)
  const setOpen = useAiAssistantPanelStore((state) => state.setOpen)
  const setPanelWidth = useAiAssistantPanelStore((state) => state.setWidth)
  const setResizing = useAiAssistantPanelStore((state) => state.setResizing)
  // Vị trí người dùng chọn; vị trí hiển thị được kẹp lại theo khung đang mở (xem bên dưới).
  const [position, setPosition] = useState<LauncherPosition | null>(() =>
    typeof window !== 'undefined'
      ? (getStoredPosition() ?? getDefaultLauncherPosition(getViewport()))
      : null
  )
  // Trượt biểu tượng khi khung mở/đóng, nhưng không trễ theo con trỏ lúc người dùng đang kéo.
  const [isDragging, setIsDragging] = useState(false)
  const dragState = useRef<DragState | null>(null)
  const hasDragged = useRef(false)
  // Kept here so closing the sheet does not lose the current conversation.
  const [conversationId, setConversationId] = useState<string | null>(null)

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setPosition(getStoredPosition() ?? getDefaultLauncherPosition(getViewport()))
      setPanelWidth(getStoredPanelWidth())
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [setPanelWidth])

  // Đóng khung khi rời trang đăng nhập hay đổi sang quản trị viên nền tảng, nơi không có trợ lý.
  useEffect(() => () => setOpen(false), [setOpen])

  const finishDragging = () => {
    dragState.current = null
    setIsDragging(false)
    window.setTimeout(() => {
      hasDragged.current = false
    }, 0)
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return

    const currentPosition = displayedPosition ?? getDefaultLauncherPosition(getViewport())
    dragState.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      originLeft: currentPosition.left,
      originTop: currentPosition.top,
    }
    hasDragged.current = false
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragState.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.originX
    const deltaY = event.clientY - drag.originY
    if (Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD) hasDragged.current = true
    if (!hasDragged.current) return

    setIsDragging(true)
    setPosition(getDraggedPosition(drag, event, panelOffset))
  }

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragState.current?.pointerId !== event.pointerId) return
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (hasDragged.current && dragState.current) {
      const finalPosition = getDraggedPosition(dragState.current, event, panelOffset)
      setPosition(finalPosition)
      window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(finalPosition))
    }
    finishDragging()
  }

  const handleClick = () => {
    if (!hasDragged.current) setOpen(true)
  }

  // Khung không che trang nên giữ mở khi người dùng đi tới trang khác và làm việc song song với trợ lý.
  // Chỉ đóng ở màn hình hẹp, nơi khung phủ kín và trang vừa mở sẽ không nhìn thấy được.
  const handleNavigate = () => {
    if (window.matchMedia?.(FULL_WIDTH_PANEL_QUERY).matches) setOpen(false)
  }

  // The assistant works inside one tenant; platform administrators have no tenant scope.
  if (!user || user.role === USER_ROLES.SystemAdmin) return null

  // Biểu tượng luôn nằm trong vùng trang còn nhìn thấy: dưới header và bên trái khung đang mở.
  const panelOffset = getPanelOffset(open, panelWidth, getViewport())
  const displayedPosition = position
    ? clampLauncherPosition(position, getViewport(), panelOffset)
    : null

  return (
    // Không modal: không phủ mờ trang và không khóa thao tác, người dùng vừa hỏi trợ lý vừa làm việc.
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <div
        className={cn(
          'fixed z-40 touch-none',
          !isDragging && 'transition-[left] duration-300 ease-out motion-reduce:transition-none'
        )}
        style={
          displayedPosition
            ? { left: displayedPosition.left, top: displayedPosition.top }
            : { left: VIEWPORT_GUTTER, bottom: VIEWPORT_GUTTER }
        }
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Mở trợ lý AI Kovia"
              className="group focus-visible:ring-ring relative flex size-18 cursor-grab touch-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:cursor-grabbing"
              onClick={handleClick}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={finishDragging}
              onDragStart={(event) => event.preventDefault()}
            >
              <span className="bg-primary/20 absolute inset-2 rounded-full blur-md transition-opacity group-hover:opacity-80" />
              <AiAssistantMascot size="lg" />
              <span className="bg-primary text-primary-foreground border-background absolute right-2 bottom-3 size-2.5 rounded-full border-2" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Kéo để di chuyển, bấm để trò chuyện</TooltipContent>
        </Tooltip>
      </div>
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
        {open ? (
          <AiAssistantPanel
            conversationId={conversationId}
            onConversationChange={setConversationId}
            onNavigate={handleNavigate}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
