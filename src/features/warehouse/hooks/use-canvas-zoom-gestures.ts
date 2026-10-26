import { useRef } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { TouchEvent as ReactTouchEvent } from 'react'
import { CANVAS_ZOOM_FACTOR } from '../utils/layout-canvas-view'

interface CanvasZoomGestureOptions {
  readonly zoomAtCenter: (factor: number) => void
  readonly cancelGesture: () => void
}

/** Ctrl + lăn chuột và chụm hai ngón để zoom quanh tâm khung nhìn. */
export function useCanvasZoomGestures({ zoomAtCenter, cancelGesture }: CanvasZoomGestureOptions) {
  const lastPinchDistance = useRef<number | null>(null)

  function handleWheel(event: KonvaEventObject<WheelEvent>) {
    if (!event.evt.ctrlKey) return
    cancelGesture()
    event.evt.preventDefault()
    zoomAtCenter(event.evt.deltaY > 0 ? 1 / CANVAS_ZOOM_FACTOR : CANVAS_ZOOM_FACTOR)
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length < 2) {
      if (lastPinchDistance.current !== null) {
        event.stopPropagation()
      }
      return
    }
    // Capture before Konva suppresses touchmove during drag; touch-none prevents browser zoom.
    event.stopPropagation()
    cancelGesture()
    const [firstTouch, secondTouch] = Array.from(event.touches)
    if (!firstTouch || !secondTouch) return
    const distance = Math.hypot(
      secondTouch.clientX - firstTouch.clientX,
      secondTouch.clientY - firstTouch.clientY
    )
    const previousDistance = lastPinchDistance.current
    lastPinchDistance.current = distance
    if (!previousDistance) return
    zoomAtCenter(distance / previousDistance)
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length >= 2) lastPinchDistance.current = null
    handleTouchMove(event)
  }

  function handleTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    if (lastPinchDistance.current === null) return
    event.stopPropagation()
    if (event.touches.length === 0) lastPinchDistance.current = null
  }

  function handleTouchCancel(event: ReactTouchEvent<HTMLDivElement>) {
    cancelGesture()
    lastPinchDistance.current = event.touches.length ? 0 : null
  }

  return { handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel }
}
