import type {
  WarehouseLayoutCanvas,
  WarehouseLayoutGeometry,
} from '../types/warehouse-layout-scene.types'

export const MIN_LAYOUT_OBJECT_SIZE = 20
export const MAX_LAYOUT_EXTENT = 100_000
// Keep aligned with the save-scene validator; only decorative symbols may cross the warehouse wall.
export const LAYOUT_DECORATION_MARGIN = 120

export function getRackPresetSize() {
  return { width: 160, height: 60 }
}

export interface LayoutBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function snapToGrid(value: number, gridSize: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(gridSize) || gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

export function normalizeRotation(rotation: number): number {
  return ((Math.round(rotation) % 360) + 360) % 360
}

function clamp(value: number, minimum: number, maximum: number): number {
  const result = Math.min(Math.max(value, minimum), maximum)
  return Object.is(result, -0) ? 0 : result
}

export function getLayoutGeometryBounds(geometry: WarehouseLayoutGeometry): LayoutBounds {
  const radians = (geometry.rotation * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const centerX = geometry.width / 2
  const centerY = geometry.height / 2
  const corners = [
    { x: -centerX, y: -centerY },
    { x: centerX, y: -centerY },
    { x: -centerX, y: centerY },
    { x: centerX, y: centerY },
  ].map((corner) => ({
    x: centerX + corner.x * cosine - corner.y * sine,
    y: centerY + corner.x * sine + corner.y * cosine,
  }))

  return {
    minX: geometry.x + Math.min(...corners.map((corner) => corner.x)),
    maxX: geometry.x + Math.max(...corners.map((corner) => corner.x)),
    minY: geometry.y + Math.min(...corners.map((corner) => corner.y)),
    maxY: geometry.y + Math.max(...corners.map((corner) => corner.y)),
  }
}

export function normalizeLayoutGeometry(
  geometry: WarehouseLayoutGeometry,
  canvas: WarehouseLayoutCanvas,
  shouldSnap = true
): WarehouseLayoutGeometry {
  const minimumWidth = Math.min(MIN_LAYOUT_OBJECT_SIZE, MAX_LAYOUT_EXTENT)
  const minimumHeight = Math.min(MIN_LAYOUT_OBJECT_SIZE, MAX_LAYOUT_EXTENT)
  const normalizeValue = (value: number) =>
    shouldSnap ? snapToGrid(value, canvas.gridSize) : value

  return {
    x: normalizeValue(geometry.x),
    y: normalizeValue(geometry.y),
    width: clamp(normalizeValue(geometry.width), minimumWidth, MAX_LAYOUT_EXTENT),
    height: clamp(normalizeValue(geometry.height), minimumHeight, MAX_LAYOUT_EXTENT),
    rotation: shouldSnap
      ? normalizeRotation(geometry.rotation)
      : geometry.rotation >= 0 && geometry.rotation < 360
        ? geometry.rotation
        : ((geometry.rotation % 360) + 360) % 360,
    zIndex: clamp(Math.round(geometry.zIndex), -1000, 1000),
  }
}

export function constrainLayoutGeometryToCanvas(
  geometry: WarehouseLayoutGeometry,
  canvas: WarehouseLayoutCanvas,
  shouldSnap = true,
  margin = 0
): WarehouseLayoutGeometry {
  const min = -margin
  const maxX = canvas.width + margin
  const maxY = canvas.height + margin
  const availableWidth = canvas.width + margin * 2
  const availableHeight = canvas.height + margin * 2
  const normalized = normalizeLayoutGeometry(geometry, canvas, shouldSnap)
  let constrained = {
    ...normalized,
    width: Math.min(normalized.width, availableWidth),
    height: Math.min(normalized.height, availableHeight),
  }
  const projectedBounds = getLayoutGeometryBounds({ ...constrained, x: 0, y: 0 })
  const projectedWidth = projectedBounds.maxX - projectedBounds.minX
  const projectedHeight = projectedBounds.maxY - projectedBounds.minY
  const scaleToFit = Math.min(1, availableWidth / projectedWidth, availableHeight / projectedHeight)
  if (scaleToFit < 1) {
    const scaleDimension = (value: number) =>
      shouldSnap
        ? Math.floor((value * scaleToFit) / canvas.gridSize) * canvas.gridSize
        : value * scaleToFit
    constrained = {
      ...constrained,
      width: Math.max(MIN_LAYOUT_OBJECT_SIZE, scaleDimension(constrained.width)),
      height: Math.max(MIN_LAYOUT_OBJECT_SIZE, scaleDimension(constrained.height)),
    }
  }
  const bounds = getLayoutGeometryBounds(constrained)
  const offsetX =
    bounds.minX < min ? min - bounds.minX : bounds.maxX > maxX ? maxX - bounds.maxX : 0
  const offsetY =
    bounds.minY < min ? min - bounds.minY : bounds.maxY > maxY ? maxY - bounds.maxY : 0
  constrained = {
    ...constrained,
    x: shouldSnap ? snapToGrid(constrained.x + offsetX, canvas.gridSize) : constrained.x + offsetX,
    y: shouldSnap ? snapToGrid(constrained.y + offsetY, canvas.gridSize) : constrained.y + offsetY,
  }
  const snappedBounds = getLayoutGeometryBounds(constrained)
  const finalOffsetX =
    snappedBounds.minX < min
      ? min - snappedBounds.minX
      : snappedBounds.maxX > maxX
        ? maxX - snappedBounds.maxX
        : 0
  const finalOffsetY =
    snappedBounds.minY < min
      ? min - snappedBounds.minY
      : snappedBounds.maxY > maxY
        ? maxY - snappedBounds.maxY
        : 0

  return {
    ...constrained,
    x: constrained.x + finalOffsetX,
    y: constrained.y + finalOffsetY,
  }
}

export function getEffectiveCanvasBounds(
  canvas: WarehouseLayoutCanvas,
  geometries: WarehouseLayoutGeometry[]
): LayoutBounds {
  const contentBounds = geometries.reduce<LayoutBounds>(
    (bounds, geometry) => {
      const objectBounds = getLayoutGeometryBounds(geometry)
      return {
        minX: Math.min(bounds.minX, objectBounds.minX),
        minY: Math.min(bounds.minY, objectBounds.minY),
        maxX: Math.max(bounds.maxX, objectBounds.maxX),
        maxY: Math.max(bounds.maxY, objectBounds.maxY),
      }
    },
    { minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height }
  )
  const padding = Math.max(canvas.gridSize * 4, 80)

  return {
    minX:
      contentBounds.minX < 0
        ? Math.floor((contentBounds.minX - padding) / canvas.gridSize) * canvas.gridSize
        : 0,
    minY:
      contentBounds.minY < 0
        ? Math.floor((contentBounds.minY - padding) / canvas.gridSize) * canvas.gridSize
        : 0,
    maxX:
      contentBounds.maxX > canvas.width
        ? Math.ceil((contentBounds.maxX + padding) / canvas.gridSize) * canvas.gridSize
        : canvas.width,
    maxY:
      contentBounds.maxY > canvas.height
        ? Math.ceil((contentBounds.maxY + padding) / canvas.gridSize) * canvas.gridSize
        : canvas.height,
  }
}
