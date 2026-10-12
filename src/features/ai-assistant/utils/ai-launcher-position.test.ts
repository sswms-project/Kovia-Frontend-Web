import { describe, expect, it } from 'vitest'
import {
  APP_HEADER_HEIGHT,
  clampLauncherPosition,
  getDefaultLauncherPosition,
  getPanelOffset,
  LAUNCHER_SIZE,
  VIEWPORT_GUTTER,
} from './ai-launcher-position'

const desktop = { width: 1440, height: 900 }

describe('clampLauncherPosition', () => {
  it('never lets the icon sit on the app header', () => {
    const { top } = clampLauncherPosition({ left: 300, top: 10 }, desktop)

    expect(top).toBe(APP_HEADER_HEIGHT + VIEWPORT_GUTTER)
  })

  it('keeps the icon on screen at every other edge', () => {
    const farCorner = clampLauncherPosition({ left: 99_999, top: 99_999 }, desktop)
    const nearCorner = clampLauncherPosition({ left: -50, top: 400 }, desktop)

    expect(farCorner).toEqual({
      left: desktop.width - LAUNCHER_SIZE - VIEWPORT_GUTTER,
      top: desktop.height - LAUNCHER_SIZE - VIEWPORT_GUTTER,
    })
    expect(nearCorner.left).toBe(VIEWPORT_GUTTER)
  })

  it('moves the icon out from under an open panel', () => {
    const { left } = clampLauncherPosition({ left: 1300, top: 400 }, desktop, 420)

    expect(left).toBe(desktop.width - 420 - LAUNCHER_SIZE - VIEWPORT_GUTTER)
  })

  it('leaves a position that is already visible untouched', () => {
    expect(clampLauncherPosition({ left: 200, top: 300 }, desktop, 420)).toEqual({
      left: 200,
      top: 300,
    })
  })
})

describe('getPanelOffset', () => {
  it('is the panel width only while it is open beside the page', () => {
    expect(getPanelOffset(true, 420, desktop)).toBe(420)
    expect(getPanelOffset(false, 420, desktop)).toBe(0)
  })

  it('is zero on narrow screens where the panel covers the whole page', () => {
    expect(getPanelOffset(true, 420, { width: 390, height: 800 })).toBe(0)
  })
})

describe('getDefaultLauncherPosition', () => {
  it('starts bottom-left, below the header', () => {
    expect(getDefaultLauncherPosition(desktop)).toEqual({
      left: VIEWPORT_GUTTER,
      top: desktop.height - LAUNCHER_SIZE - VIEWPORT_GUTTER,
    })
  })

  it('stays below the header on a very short window', () => {
    expect(getDefaultLauncherPosition({ width: 800, height: 120 }).top).toBe(
      APP_HEADER_HEIGHT + VIEWPORT_GUTTER
    )
  })
})
