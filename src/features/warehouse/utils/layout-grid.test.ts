import { describe, expect, it } from 'vitest'
import {
  constrainLayoutGeometryToCanvas,
  getLayoutGeometryBounds,
  getRackPresetSize,
  LAYOUT_DECORATION_MARGIN,
} from './layout-grid'

const canvas = { width: 1000, height: 600, gridSize: 20 }

describe('constrainLayoutGeometryToCanvas', () => {
  it.each([
    [-40, 100, 0],
    [960, 100, 0],
    [100, -40, 0],
    [100, 560, 0],
    [-40, -40, 45],
  ])('preserves a decorative symbol crossing a wall at %s/%s/%s', (x, y, rotation) => {
    const source = { x, y, width: 80, height: 80, rotation, zIndex: 1 }
    expect(
      constrainLayoutGeometryToCanvas(source, canvas, false, LAYOUT_DECORATION_MARGIN)
    ).toEqual(source)
  })

  it.each([0, 45, 90, 270])(
    'limits decorations to the outer margin after snapping at %s degrees',
    (rotation) => {
      const geometry = constrainLayoutGeometryToCanvas(
        { x: -1000, y: 900, width: 180, height: 80, rotation, zIndex: 1 },
        canvas,
        true,
        LAYOUT_DECORATION_MARGIN
      )
      const bounds = getLayoutGeometryBounds(geometry)
      expect(bounds.minX).toBeGreaterThanOrEqual(-LAYOUT_DECORATION_MARGIN - 0.000001)
      expect(bounds.minY).toBeGreaterThanOrEqual(-LAYOUT_DECORATION_MARGIN - 0.000001)
      expect(bounds.maxX).toBeLessThanOrEqual(canvas.width + LAYOUT_DECORATION_MARGIN + 0.000001)
      expect(bounds.maxY).toBeLessThanOrEqual(canvas.height + LAYOUT_DECORATION_MARGIN + 0.000001)
    }
  )
  it('calculates rotated bounds around the same center used by the canvas', () => {
    const bounds = getLayoutGeometryBounds({
      x: 40,
      y: 0,
      width: 80,
      height: 20,
      rotation: 90,
      zIndex: 1,
    })

    expect(bounds.minX).toBeCloseTo(70)
    expect(bounds.maxX).toBeCloseTo(90)
    expect(bounds.minY).toBeCloseTo(-30)
    expect(bounds.maxY).toBeCloseTo(50)
  })

  it('keeps a dropped object inside the fixed canvas', () => {
    const geometry = constrainLayoutGeometryToCanvas(
      { x: 960, y: 580, width: 180, height: 100, rotation: 0, zIndex: 1 },
      canvas
    )
    const bounds = getLayoutGeometryBounds(geometry)

    expect(bounds.minX).toBeGreaterThanOrEqual(0)
    expect(bounds.minY).toBeGreaterThanOrEqual(0)
    expect(bounds.maxX).toBeLessThanOrEqual(canvas.width)
    expect(bounds.maxY).toBeLessThanOrEqual(canvas.height)
  })

  it('limits an oversized object to the canvas dimensions', () => {
    const geometry = constrainLayoutGeometryToCanvas(
      { x: -100, y: -100, width: 2000, height: 900, rotation: 0, zIndex: 1 },
      canvas
    )

    expect(geometry).toMatchObject({ x: 0, y: 0, width: 1000, height: 600 })
  })

  it('keeps a rotated object inside after grid snapping', () => {
    const geometry = constrainLayoutGeometryToCanvas(
      { x: 980, y: 580, width: 180, height: 80, rotation: 45, zIndex: 1 },
      canvas
    )
    const bounds = getLayoutGeometryBounds(geometry)

    expect(bounds.minX).toBeGreaterThanOrEqual(0)
    expect(bounds.minY).toBeGreaterThanOrEqual(0)
    expect(bounds.maxX).toBeLessThanOrEqual(canvas.width)
    expect(bounds.maxY).toBeLessThanOrEqual(canvas.height)
  })

  it('scales down a rotated object whose projected bounds exceed the canvas', () => {
    const geometry = constrainLayoutGeometryToCanvas(
      { x: 0, y: 0, width: 1000, height: 600, rotation: 45, zIndex: 1 },
      canvas
    )
    const bounds = getLayoutGeometryBounds(geometry)

    expect(bounds.minX).toBeGreaterThanOrEqual(0)
    expect(bounds.minY).toBeGreaterThanOrEqual(0)
    expect(bounds.maxX).toBeLessThanOrEqual(canvas.width)
    expect(bounds.maxY).toBeLessThanOrEqual(canvas.height)
  })
})

describe('getRackPresetSize', () => {
  it('uses the same compact 120×40 initial footprint for every rack style', () => {
    expect(getRackPresetSize()).toEqual({ width: 120, height: 40 })
  })
})
