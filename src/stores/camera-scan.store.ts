import { create } from 'zustand'

interface CameraScanSession {
  readonly activeId: string | null
  readonly open: (id: string) => void
  readonly close: (id: string) => void
}

// Only one location/product input may own the camera on a document.
export const useCameraScanStore = create<CameraScanSession>((set) => ({
  activeId: null,
  open: (id) => set({ activeId: id }),
  close: (id) => set((state) => (state.activeId === id ? { activeId: null } : state)),
}))
