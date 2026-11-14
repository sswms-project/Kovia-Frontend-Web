import { create } from 'zustand'
import {
  AI_PANEL_DEFAULT_WIDTH,
  type AiPanelMode,
} from '@/features/ai-assistant/utils/ai-panel-layout'

export type AiPanelView = 'chat' | 'history'

interface AiAssistantPanelState {
  isOpen: boolean
  /** Preferred docked width in px; the effective width is clamped to the viewport at render time. */
  width: number
  mode: AiPanelMode
  /** Narrow panel shows either the chat or the history; the split workspace shows both. */
  view: AiPanelView
  /** Đang kéo mép khung: bố cục trang phải đi theo ngay, không chạy hiệu ứng trễ. */
  isResizing: boolean
  /** Hội thoại đang mở; giữ ở đây để đóng khung (kể cả khi đang gửi) không làm mất hội thoại hiện tại. */
  conversationId: string | null
  setOpen: (isOpen: boolean) => void
  setConversationId: (conversationId: string | null) => void
  setWidth: (width: number) => void
  setMode: (mode: AiPanelMode) => void
  setView: (view: AiPanelView) => void
  setResizing: (isResizing: boolean) => void
}

// Trạng thái giao diện dùng chung giữa khung trợ lý và bố cục trang (trang nhường chỗ khi khung mở).
export const useAiAssistantPanelStore = create<AiAssistantPanelState>()((set) => ({
  isOpen: false,
  width: AI_PANEL_DEFAULT_WIDTH,
  mode: 'docked',
  view: 'chat',
  isResizing: false,
  conversationId: null,
  setOpen: (isOpen) => set({ isOpen }),
  setConversationId: (conversationId) => set({ conversationId, view: 'chat' }),
  setWidth: (width) => set({ width }),
  setMode: (mode) => set({ mode }),
  setView: (view) => set({ view }),
  setResizing: (isResizing) => set({ isResizing }),
}))
