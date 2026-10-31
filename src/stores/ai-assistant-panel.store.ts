import { create } from 'zustand'

export const AI_PANEL_DEFAULT_WIDTH = 420

interface AiAssistantPanelState {
  isOpen: boolean
  /** Bề rộng người dùng chọn, tính bằng px; dưới breakpoint `sm` khung luôn phủ kín nên không dùng tới. */
  width: number
  /** Đang kéo mép khung: bố cục trang phải đi theo ngay, không chạy hiệu ứng trễ. */
  isResizing: boolean
  /** Hội thoại đang mở; giữ ở đây để đóng khung (kể cả khi đang gửi) không làm mất hội thoại hiện tại. */
  conversationId: string | null
  setOpen: (isOpen: boolean) => void
  setConversationId: (conversationId: string | null) => void
  setWidth: (width: number) => void
  setResizing: (isResizing: boolean) => void
}

// Trạng thái giao diện dùng chung giữa khung trợ lý và bố cục trang (trang nhường chỗ khi khung mở).
export const useAiAssistantPanelStore = create<AiAssistantPanelState>()((set) => ({
  isOpen: false,
  width: AI_PANEL_DEFAULT_WIDTH,
  isResizing: false,
  conversationId: null,
  setOpen: (isOpen) => set({ isOpen }),
  setConversationId: (conversationId) => set({ conversationId }),
  setWidth: (width) => set({ width }),
  setResizing: (isResizing) => set({ isResizing }),
}))
