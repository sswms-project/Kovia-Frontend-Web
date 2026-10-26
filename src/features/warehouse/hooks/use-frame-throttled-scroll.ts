import { useCallback, useEffect, useRef, type UIEvent } from 'react'

interface ScrollOffset {
  readonly left: number
  readonly top: number
}

/**
 * Cuộn nhanh bắn nhiều sự kiện hơn số khung hình; chỉ báo vị trí mới nhất một lần mỗi khung
 * để canvas không dựng lại nhiều lần cho cùng một khung hình.
 */
export function useFrameThrottledScroll(onOffset: (offset: ScrollOffset) => void) {
  const frameRef = useRef<number | null>(null)
  const latestRef = useRef<ScrollOffset>({ left: 0, top: 0 })
  const onOffsetRef = useRef(onOffset)

  useEffect(() => {
    onOffsetRef.current = onOffset
  }, [onOffset])

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    },
    []
  )

  return useCallback((event: UIEvent<HTMLElement>) => {
    latestRef.current = {
      left: event.currentTarget.scrollLeft,
      top: event.currentTarget.scrollTop,
    }
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      onOffsetRef.current(latestRef.current)
    })
  }, [])
}
