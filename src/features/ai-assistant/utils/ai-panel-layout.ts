export const AI_PANEL_MIN_WIDTH = 360
export const AI_PANEL_MAX_WIDTH = 720
export const AI_PANEL_DEFAULT_WIDTH = 440
/** Expanded workspace: history column + chat; below this width history replaces the chat instead. */
export const AI_PANEL_SPLIT_MIN_WIDTH = 720
const AI_PANEL_EXPANDED_MAX_WIDTH = 1120
const AI_PANEL_EXPANDED_MARGIN = 64
/**
 * Narrowest work area (the page beside the app sidebar, padding included) in which ERP lists, forms and
 * tables stay usable. A docked panel may only take space while the work area keeps this much; below
 * it the panel floats over the page instead of squeezing it.
 */
export const AI_MIN_WORK_AREA_WIDTH = 640
/** Strip of page left visible beside a floating panel, so it reads as a layer and not as a new page. */
const AI_OVERLAY_MARGIN = 48
export const AI_MOBILE_BREAKPOINT = 640

export type AiPanelMode = 'docked' | 'expanded'
export type AiPanelPlacement = 'fullscreen' | 'overlay' | 'docked'

export interface AiPanelLayout {
  readonly placement: AiPanelPlacement
  /** Panel width in px; `null` when the panel fills the viewport. */
  readonly width: number | null
  /** Smallest and largest width the user may drag the panel to in the current placement. */
  readonly minWidth: number
  readonly maxWidth: number
  /** Width the ERP page must give up on the right; non-zero only when docked. */
  readonly reservedWidth: number
  /** History and chat side by side (expanded workspace with enough room). */
  readonly isSplit: boolean
}

export function clampAiPanelWidth(
  width: number,
  limits: Pick<AiPanelLayout, 'minWidth' | 'maxWidth'>
): number {
  return Math.round(Math.min(Math.max(width, limits.minWidth), limits.maxWidth))
}

/**
 * Where the panel goes, from the room that is actually left: the viewport minus the app sidebar
 * (`sidebarWidth`: 0 on phones where it is a sheet, icon width when collapsed) minus the work area
 * the page needs. Docked only when that leaves the panel its minimum width.
 */
export function resolveAiPanelLayout(
  mode: AiPanelMode,
  preferredWidth: number,
  viewportWidth: number,
  sidebarWidth: number
): AiPanelLayout {
  if (viewportWidth < AI_MOBILE_BREAKPOINT) {
    return {
      placement: 'fullscreen',
      width: null,
      minWidth: viewportWidth,
      maxWidth: viewportWidth,
      reservedWidth: 0,
      isSplit: false,
    }
  }
  if (mode === 'expanded') {
    const width = Math.min(viewportWidth - AI_PANEL_EXPANDED_MARGIN, AI_PANEL_EXPANDED_MAX_WIDTH)
    return {
      placement: 'overlay',
      width,
      minWidth: width,
      maxWidth: width,
      reservedWidth: 0,
      isSplit: width >= AI_PANEL_SPLIT_MIN_WIDTH,
    }
  }
  const dockedRoom = viewportWidth - sidebarWidth - AI_MIN_WORK_AREA_WIDTH
  if (dockedRoom >= AI_PANEL_MIN_WIDTH) {
    const limits = {
      minWidth: AI_PANEL_MIN_WIDTH,
      maxWidth: Math.min(AI_PANEL_MAX_WIDTH, dockedRoom),
    }
    const width = clampAiPanelWidth(preferredWidth, limits)
    return { placement: 'docked', width, ...limits, reservedWidth: width, isSplit: false }
  }
  const maxWidth = Math.min(AI_PANEL_MAX_WIDTH, viewportWidth - AI_OVERLAY_MARGIN)
  const limits = { minWidth: Math.min(AI_PANEL_MIN_WIDTH, maxWidth), maxWidth }
  return {
    placement: 'overlay',
    width: clampAiPanelWidth(preferredWidth, limits),
    ...limits,
    reservedWidth: 0,
    isSplit: false,
  }
}
