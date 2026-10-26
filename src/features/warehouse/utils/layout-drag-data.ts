import type { LayoutPaletteDragData } from '../types/warehouse-layout-palette.types'
import { DECORATION_OPTIONS } from './layout-decoration-options'

const LAYOUT_DRAG_DATA_TYPE = 'application/x-sswms-layout-object'

export function writeLayoutDragData(dataTransfer: DataTransfer, payload: LayoutPaletteDragData) {
  dataTransfer.effectAllowed = 'copy'
  dataTransfer.setData(LAYOUT_DRAG_DATA_TYPE, JSON.stringify(payload))
}

export function hasLayoutDragData(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(LAYOUT_DRAG_DATA_TYPE)
}

export function readLayoutDragData(dataTransfer: DataTransfer): LayoutPaletteDragData | null {
  const value = dataTransfer.getData(LAYOUT_DRAG_DATA_TYPE)
  if (!value) return null
  try {
    const payload = JSON.parse(value) as LayoutPaletteDragData
    if (payload.kind === 'zone') return payload
    if (
      payload.kind === 'rack' &&
      (!payload.shape || ['Standard', 'Vertical', 'CrossBraced', 'Pallet'].includes(payload.shape))
    )
      return payload
    if (
      payload.kind === 'decoration' &&
      DECORATION_OPTIONS.some((option) => option.type === payload.type)
    )
      return payload
  } catch {
    return null
  }
  return null
}
