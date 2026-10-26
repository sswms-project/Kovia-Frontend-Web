import { useEffect, useState } from 'react'
import type { CanvasPalette } from '../components/WarehouseDesigner/Canvas/canvas-palette'

function readCanvasPalette(): CanvasPalette {
  const styles = getComputedStyle(document.documentElement)
  const read = (token: string) => styles.getPropertyValue(token).trim()
  return {
    background: read('--diagram-canvas-background'),
    foreground: read('--diagram-canvas-foreground'),
    muted: read('--diagram-canvas-muted'),
    border: read('--diagram-canvas-border'),
    primary: read('--diagram-outline'),
    accent: read('--diagram-zone-fill'),
    destructive: read('--destructive'),
    errorContainer: read('--error-container'),
    card: read('--diagram-canvas-card'),
    warning: read('--warning'),
    warningContainer: read('--warning-container'),
    selectionFill: read('--canvas-selection-fill'),
    selectionForeground: read('--canvas-selection-foreground'),
    viewerSelected: read('--diagram-viewer-selected'),
    viewerOccupied: read('--secondary-container'),
    heatLow: read('--canvas-heat-low'),
    heatMid: read('--canvas-heat-mid'),
    heatHigh: read('--canvas-heat-high'),
  }
}

/** Konva không đọc được biến CSS, nên đọc lại bảng màu mỗi khi class sáng/tối của trang đổi. */
export function useCanvasPalette() {
  const [palette, setPalette] = useState<CanvasPalette | null>(null)

  useEffect(() => {
    const updatePalette = () => setPalette(readCanvasPalette())
    updatePalette()
    const observer = new MutationObserver(updatePalette)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return palette
}
