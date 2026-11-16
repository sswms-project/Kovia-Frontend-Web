import { useMemo, useSyncExternalStore } from 'react'
import {
  APP_SIDEBAR_ICON_WIDTH_REM,
  APP_SIDEBAR_WIDTH_REM,
} from '@/components/layout/app-sidebar-metrics'
import { useSidebar } from '@/components/ui/sidebar'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import { resolveAiPanelLayout, type AiPanelLayout } from '../utils/ai-panel-layout'

function subscribeToViewportWidth(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

const getViewportWidth = () => window.innerWidth
// 0 on the server: the panel is closed there, and the first client render re-reads the real width.
const getServerViewportWidth = () => 0

const DEFAULT_REM_PX = 16
const readRemPx = () =>
  typeof document === 'undefined'
    ? DEFAULT_REM_PX
    : parseFloat(getComputedStyle(document.documentElement).fontSize) || DEFAULT_REM_PX

/**
 * Effective placement and size of the panel for the current viewport, mode and preferred width.
 * The app sidebar counts: a docked panel is only allowed while the work area beside the (expanded or
 * collapsed) sidebar keeps its minimum width, otherwise the panel floats over the page.
 */
export function useAiPanelLayout(): AiPanelLayout {
  const viewportWidth = useSyncExternalStore(
    subscribeToViewportWidth,
    getViewportWidth,
    getServerViewportWidth
  )
  const { isMobile, state } = useSidebar()
  const mode = useAiAssistantPanelStore((store) => store.mode)
  const width = useAiAssistantPanelStore((store) => store.width)
  // On phones the sidebar is an off-canvas sheet and takes no room beside the page.
  const sidebarRem = isMobile
    ? 0
    : state === 'collapsed'
      ? APP_SIDEBAR_ICON_WIDTH_REM
      : APP_SIDEBAR_WIDTH_REM
  // Root font size is read once per mount: a forced style read on every render of the four consumers is waste.
  const remPx = useMemo(() => readRemPx(), [])
  return resolveAiPanelLayout(mode, width, viewportWidth, sidebarRem * remPx)
}
