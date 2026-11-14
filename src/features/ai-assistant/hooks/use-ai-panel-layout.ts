import { useSyncExternalStore } from 'react'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import { resolveAiPanelLayout, type AiPanelLayout } from '../utils/ai-panel-layout'

function subscribeToViewportWidth(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

const getViewportWidth = () => window.innerWidth
// 0 on the server: the panel is closed there, and the first client render re-reads the real width.
const getServerViewportWidth = () => 0

/** Effective placement and size of the panel for the current viewport, mode and preferred width. */
export function useAiPanelLayout(): AiPanelLayout {
  const viewportWidth = useSyncExternalStore(
    subscribeToViewportWidth,
    getViewportWidth,
    getServerViewportWidth
  )
  const mode = useAiAssistantPanelStore((state) => state.mode)
  const width = useAiAssistantPanelStore((state) => state.width)
  return resolveAiPanelLayout(mode, width, viewportWidth)
}
