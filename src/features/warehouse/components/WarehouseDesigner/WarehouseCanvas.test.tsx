import { createRef, type ReactNode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { WarehouseLayoutEditorScene } from '../../types/warehouse-layout-scene.types'
import { WarehouseCanvas, type WarehouseCanvasHandle } from './WarehouseCanvas'

vi.mock('konva', () => ({ default: {} }))
vi.mock('react-konva', () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return {
    Stage: Container,
    Layer: Container,
    Group: Container,
    Circle: () => null,
    Line: () => null,
    Rect: () => null,
    Text: () => null,
    Transformer: () => null,
  }
})
const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo')
afterEach(() => {
  vi.restoreAllMocks()
  if (originalScrollTo) Object.defineProperty(HTMLElement.prototype, 'scrollTo', originalScrollTo)
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
})

it.each(['viewer', 'designer'] as const)(
  'reveals a rotated offscreen rack repeatedly in %s without changing geometry',
  (mode) => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 240,
      right: 320,
      width: 320,
      height: 240,
      toJSON: () => ({}),
    })
    const scrollTo = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    })
    const scene: WarehouseLayoutEditorScene = {
      canvas: { width: 1600, height: 1200, gridSize: 20 },
      zones: [],
      slots: [],
      decorations: [],
      racks: [
        {
          id: 'rack',
          zoneId: 'zone',
          zoneCode: 'Z',
          rackCode: 'R',
          rackName: 'Kệ',
          description: null,
          status: 'Active',
          placementPending: true,
          x: 1200,
          y: 900,
          width: 160,
          height: 60,
          rotation: 90,
          zIndex: 1,
        },
      ],
    }
    const ref = createRef<WarehouseCanvasHandle>()
    const geometryChange = vi.fn()
    render(
      <WarehouseCanvas
        ref={ref}
        scene={scene}
        selection={{ kind: 'rack', id: 'rack' }}
        mode={mode}
        canConfigure={mode === 'designer'}
        isGridVisible={false}
        onGeometryChange={geometryChange}
        onSelect={vi.fn()}
        onZoomChange={vi.fn()}
        onPaletteDrop={vi.fn()}
      />
    )
    scrollTo.mockClear()
    act(() => ref.current?.revealSelection({ kind: 'rack', id: 'rack' }))
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({
        left: expect.any(Number),
        top: expect.any(Number),
        behavior: 'instant',
      })
    )
    expect(scrollTo.mock.calls[0]![0].left).toBeGreaterThan(0)
    expect(scrollTo.mock.calls[0]![0].top).toBeGreaterThan(0)
    expect(screen.getByRole('application')).toHaveFocus()
    scrollTo.mockClear()
    act(() => ref.current?.revealSelection({ kind: 'rack', id: 'rack' }))
    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(geometryChange).not.toHaveBeenCalled()
    expect(scene.racks[0]?.placementPending).toBe(true)
  }
)
