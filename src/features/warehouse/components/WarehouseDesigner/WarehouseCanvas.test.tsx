import { createRef, type ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Group as NativeGroup } from 'konva/lib/Group'
import { afterEach, expect, it, vi } from 'vitest'
import type { WarehouseLayoutEditorScene } from '../../types/warehouse-layout-scene.types'
import { WarehouseCanvas, type WarehouseCanvasHandle } from './WarehouseCanvas'

const rackEvents = vi.hoisted(() => new Map<string, (event: unknown) => void>())

vi.mock('konva', () => ({ default: {} }))
vi.mock('react-konva', () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return {
    Stage: Container,
    Layer: Container,
    Group: ({
      children,
      layoutKind,
      onDragStart,
      onDragMove,
      onDragEnd,
    }: {
      children?: ReactNode
      layoutKind?: string
      onDragStart?: (event: unknown) => void
      onDragMove?: (event: unknown) => void
      onDragEnd?: (event: unknown) => void
    }) => {
      if (layoutKind === 'rack') {
        if (onDragStart) rackEvents.set('start', onDragStart)
        if (onDragMove) rackEvents.set('move', onDragMove)
        if (onDragEnd) rackEvents.set('end', onDragEnd)
      }
      return <Container>{children}</Container>
    },
    Circle: () => null,
    Line: () => null,
    Rect: () => null,
    Text: () => null,
    Transformer: () => null,
  }
})
const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo')
afterEach(() => {
  rackEvents.clear()
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

it('cancels a rack drag through DOM touch capture without any Konva touchmove delivery', () => {
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
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() })
  const scene: WarehouseLayoutEditorScene = {
    canvas: { width: 1000, height: 700, gridSize: 20 },
    zones: [
      {
        id: 'zone',
        zoneCode: 'Z',
        zoneName: 'Zone',
        status: 'Active',
        x: 0,
        y: 0,
        width: 1000,
        height: 700,
        rotation: 0,
        zIndex: 0,
      },
    ],
    racks: [
      {
        id: 'rack',
        zoneId: 'zone',
        zoneCode: 'Z',
        rackCode: 'R',
        rackName: 'Rack',
        description: null,
        status: 'Active',
        x: 100,
        y: 100,
        width: 80,
        height: 40,
        rotation: 0,
        zIndex: 1,
      },
    ],
    slots: [],
    decorations: [],
  }
  const onCommit = vi.fn(),
    onGestureChange = vi.fn(),
    onZoomChange = vi.fn()
  render(
    <WarehouseCanvas
      scene={scene}
      selection={null}
      canConfigure
      isGridVisible={false}
      onSelect={vi.fn()}
      onGeometryChange={vi.fn()}
      onZoomChange={onZoomChange}
      onPaletteDrop={vi.fn()}
      rackEditing={{
        ids: ['rack'],
        referenceId: 'rack',
        snapObjects: false,
        locked: false,
        onSelectionChange: vi.fn(),
        onGestureChange,
        onCommit,
        onError: vi.fn(),
      }}
    />
  )
  const node = new NativeGroup({ x: 140, y: 120 })
  const drag = { target: node, evt: new Event('drag'), cancelBubble: false }
  act(() => {
    rackEvents.get('start')!(drag)
    node.position({ x: 160, y: 140 })
    rackEvents.get('move')!(drag)
  })
  expect(onGestureChange).toHaveBeenLastCalledWith(true)
  const surface = screen.getByRole('application')
  expect(surface).toHaveClass('touch-none')
  const touchTarget = document.createElement('div')
  surface.appendChild(touchTarget)
  const nativeTouch = vi.fn()
  for (const type of ['touchstart', 'touchmove', 'touchend']) {
    touchTarget.addEventListener(type, nativeTouch)
  }
  const touches = [
    { identifier: 1, clientX: 100, clientY: 100 },
    { identifier: 2, clientX: 200, clientY: 100 },
  ]
  fireEvent.touchStart(touchTarget, { touches, cancelable: true })
  expect(nativeTouch).not.toHaveBeenCalled()
  expect(onGestureChange).toHaveBeenLastCalledWith(false)
  const initialZoom = onZoomChange.mock.calls.at(-1)![0]
  fireEvent.touchMove(touchTarget, {
    touches: [touches[0], { ...touches[1], clientX: 300 }],
    cancelable: true,
  })
  expect(nativeTouch).not.toHaveBeenCalled()
  expect(onZoomChange).toHaveBeenLastCalledWith(Math.min(400, initialZoom * 2))
  act(() => rackEvents.get('end')!(drag))
  expect(onCommit).not.toHaveBeenCalled()
  fireEvent.touchEnd(touchTarget, { touches: [touches[0]], cancelable: true })
  fireEvent.touchMove(touchTarget, { touches: [touches[0]], cancelable: true })
  fireEvent.touchEnd(touchTarget, { touches: [], cancelable: true })
  expect(nativeTouch).not.toHaveBeenCalled()
  fireEvent.touchStart(touchTarget, { touches: [touches[0]], cancelable: true })
  expect(nativeTouch).toHaveBeenCalledTimes(1)
  node.destroy()
})

it('anchors selection tools, restores canvas focus after closing, and preserves external focus', async () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() })
  const scene: WarehouseLayoutEditorScene = {
    canvas: { width: 1000, height: 700, gridSize: 20 },
    slots: [],
    decorations: [],
    zones: [
      {
        id: 'zone',
        zoneCode: 'Z',
        zoneName: 'Zone',
        status: 'Active',
        x: 0,
        y: 0,
        width: 1000,
        height: 700,
        rotation: 0,
        zIndex: 0,
      },
    ],
    racks: [
      {
        id: 'rack',
        zoneId: 'zone',
        zoneCode: 'Z',
        rackCode: 'R',
        rackName: 'Rack',
        description: null,
        status: 'Active',
        x: 100,
        y: 100,
        width: 80,
        height: 40,
        rotation: 0,
        zIndex: 1,
      },
    ],
  }
  const controls = {
    ids: ['rack'],
    referenceId: 'rack',
    snapObjects: true,
    locked: false,
    onSelectionChange: vi.fn(),
    onGestureChange: vi.fn(),
    onCommit: vi.fn(),
    onError: vi.fn(),
  }
  const props = {
    scene,
    selection: null,
    canConfigure: true,
    isGridVisible: false,
    onSelect: vi.fn(),
    onGeometryChange: vi.fn(),
    onZoomChange: vi.fn(),
    onPaletteDrop: vi.fn(),
    rackTools: <button>Test selection action</button>,
  }
  const view = render(<WarehouseCanvas {...props} rackEditing={controls} />)
  const surface = screen.getByRole('application')
  const dialog = screen.getByRole('dialog', { name: 'Căn chỉnh nhóm kệ' })
  expect(surface.contains(dialog)).toBe(false)
  expect(surface.querySelector('[data-slot="popover-anchor"]')).toHaveClass('absolute')
  const action = screen.getByRole('button', { name: 'Test selection action' })
  action.focus()
  fireEvent.pointerDown(action)
  expect(action).toHaveFocus()
  view.rerender(<WarehouseCanvas {...props} rackEditing={{ ...controls, locked: true }} />)
  expect(screen.queryByRole('dialog', { name: 'Căn chỉnh nhóm kệ' })).not.toBeInTheDocument()
  await waitFor(() => expect(surface).toHaveFocus())
  view.rerender(<WarehouseCanvas {...props} rackEditing={controls} />)
  screen.getByRole('button', { name: 'Test selection action' }).focus()
  const externalButton = document.createElement('button')
  document.body.appendChild(externalButton)
  try {
    externalButton.focus()
    view.rerender(<WarehouseCanvas {...props} rackEditing={{ ...controls, locked: true }} />)
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)))
    expect(externalButton).toHaveFocus()
  } finally {
    externalButton.remove()
  }
  expect(controls.onCommit).not.toHaveBeenCalled()
})
