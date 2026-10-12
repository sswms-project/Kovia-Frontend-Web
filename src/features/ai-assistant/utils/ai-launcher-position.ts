export interface LauncherPosition {
  readonly left: number
  readonly top: number
}

export interface ViewportSize {
  readonly width: number
  readonly height: number
}

export const LAUNCHER_SIZE = 72
export const VIEWPORT_GUTTER = 16
/** Chiều cao `h-14` của AppHeader: biểu tượng không được nằm đè lên các nút trên header. */
export const APP_HEADER_HEIGHT = 56
/** Breakpoint `sm` của Tailwind: từ đây trở lên khung trợ lý nằm cạnh trang, dưới đó phủ kín. */
export const SM_BREAKPOINT_PX = 640

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

/** Phần bề rộng bên phải mà khung trợ lý đang chiếm, nơi biểu tượng không được đặt vào. */
export function getPanelOffset(isOpen: boolean, panelWidth: number, viewport: ViewportSize) {
  return isOpen && viewport.width >= SM_BREAKPOINT_PX ? panelWidth : 0
}

/** Giữ biểu tượng trong vùng nhìn thấy của trang: dưới header, và bên trái khung trợ lý nếu đang mở. */
export function clampLauncherPosition(
  position: LauncherPosition,
  viewport: ViewportSize,
  panelOffset = 0
): LauncherPosition {
  return {
    left: clamp(
      position.left,
      VIEWPORT_GUTTER,
      viewport.width - panelOffset - LAUNCHER_SIZE - VIEWPORT_GUTTER
    ),
    top: clamp(
      position.top,
      APP_HEADER_HEIGHT + VIEWPORT_GUTTER,
      viewport.height - LAUNCHER_SIZE - VIEWPORT_GUTTER
    ),
  }
}

export function getDefaultLauncherPosition(viewport: ViewportSize): LauncherPosition {
  return clampLauncherPosition(
    { left: VIEWPORT_GUTTER, top: viewport.height - LAUNCHER_SIZE - VIEWPORT_GUTTER },
    viewport
  )
}
