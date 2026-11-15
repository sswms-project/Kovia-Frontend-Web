export const AI_PANEL_MIN_WIDTH = 360
export const AI_PANEL_MAX_WIDTH = 720
export const AI_PANEL_DEFAULT_WIDTH = 440
/** Expanded workspace: history column + chat; below this width history replaces the chat instead. */
export const AI_PANEL_SPLIT_MIN_WIDTH = 720
const AI_PANEL_EXPANDED_MAX_WIDTH = 1120
const AI_PANEL_EXPANDED_MARGIN = 64
/** The ERP page beside a docked panel keeps at least this much room (sidebar + work area). */
const MIN_PAGE_WIDTH = 480
export const AI_MOBILE_BREAKPOINT = 640
export const AI_DOCK_BREAKPOINT = 1024

export type AiPanelMode = 'docked' | 'expanded'
export type AiPanelPlacement = 'fullscreen' | 'overlay' | 'docked'

export interface AiPanelLayout {
  readonly placement: AiPanelPlacement
  /** Panel width in px; `null` when the panel fills the viewport. */
  readonly width: number | null
  /** Width the ERP page must give up on the right; non-zero only when docked. */
  readonly reservedWidth: number
  /** History and chat side by side (expanded workspace with enough room). */
  readonly isSplit: boolean
}

/** Docked width limit: 360–720px, never leaving the page less than MIN_PAGE_WIDTH. */
export function clampAiPanelWidth(width: number, viewportWidth: number): number {
  const maximum = Math.min(
    AI_PANEL_MAX_WIDTH,
    Math.max(AI_PANEL_MIN_WIDTH, viewportWidth - MIN_PAGE_WIDTH)
  )
  return Math.round(Math.min(Math.max(width, AI_PANEL_MIN_WIDTH), maximum))
}

export function resolveAiPanelLayout(
  mode: AiPanelMode,
  preferredWidth: number,
  viewportWidth: number
): AiPanelLayout {
  if (viewportWidth < AI_MOBILE_BREAKPOINT) {
    return { placement: 'fullscreen', width: null, reservedWidth: 0, isSplit: false }
  }
  if (mode === 'expanded') {
    const width = Math.min(viewportWidth - AI_PANEL_EXPANDED_MARGIN, AI_PANEL_EXPANDED_MAX_WIDTH)
    return {
      placement: 'overlay',
      width,
      reservedWidth: 0,
      isSplit: width >= AI_PANEL_SPLIT_MIN_WIDTH,
    }
  }
  if (viewportWidth < AI_DOCK_BREAKPOINT) {
    // Too narrow to share the screen: controlled overlay instead of squeezing the page.
    return {
      placement: 'overlay',
      width: Math.min(Math.max(preferredWidth, AI_PANEL_MIN_WIDTH), viewportWidth),
      reservedWidth: 0,
      isSplit: false,
    }
  }
  const width = clampAiPanelWidth(preferredWidth, viewportWidth)
  return { placement: 'docked', width, reservedWidth: width, isSplit: false }
}
