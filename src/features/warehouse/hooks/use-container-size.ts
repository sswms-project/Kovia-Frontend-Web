import { useEffect, useRef, useState } from 'react'

export function useContainerSize() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = (width: number, height: number) => {
      const nextWidth = Math.floor(width)
      const nextHeight = Math.floor(height)
      setSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      )
    }
    const initialBounds = container.getBoundingClientRect()
    updateSize(initialBounds.width, initialBounds.height)

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      updateSize(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return { containerRef, size }
}
