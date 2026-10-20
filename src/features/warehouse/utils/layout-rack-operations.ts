import type {
  WarehouseLayoutEditorRack,
  WarehouseLayoutEditorScene,
} from '../types/warehouse-layout-scene.types'
import {
  getLayoutGeometryBounds,
  snapToGrid,
  LAYOUT_DECORATION_MARGIN,
  type LayoutBounds,
} from './layout-grid'

export interface RackPosition {
  readonly id: string
  readonly x: number
  readonly y: number
}
export interface RackGuide {
  readonly axis: 'x' | 'y'
  readonly value: number
}
export type RackAlignment = 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y'
export type RackOperation = RackAlignment | 'distribute-x' | 'distribute-y'
export type RackOperationResult =
  | {
      readonly ok: true
      readonly positions: readonly RackPosition[]
      readonly guides: readonly RackGuide[]
    }
  | { readonly ok: false; readonly message: string }

const precision = 100
const epsilon = 1e-8
const round = (value: number) => Math.round(value * precision) / precision
const precise = (value: number) =>
  Number.isFinite(value) && Math.abs(value - round(value)) < epsilon
const failure = (
  message = 'Không thể đặt các kệ tại vị trí này trong biên kho.'
): RackOperationResult => ({ ok: false, message })

export function eligibleLayoutRacks(scene: WarehouseLayoutEditorScene) {
  const zones = new Set(
    scene.zones.filter((zone) => zone.status === 'Active').map((zone) => zone.id)
  )
  return scene.racks.filter(
    (rack) =>
      rack.status === 'Active' &&
      zones.has(rack.zoneId) &&
      !rack.placementPending &&
      [rack.x, rack.y, rack.width, rack.height, rack.rotation].every(Number.isFinite) &&
      rack.width > 0 &&
      rack.height > 0
  )
}

export function selectedLayoutRacks(scene: WarehouseLayoutEditorScene, ids: readonly string[]) {
  if (!ids.length || new Set(ids).size !== ids.length) return null
  const eligible = new Map(eligibleLayoutRacks(scene).map((rack) => [rack.id, rack]))
  const racks = ids.map((id) => eligible.get(id))
  return racks.every((rack): rack is WarehouseLayoutEditorRack => Boolean(rack)) ? racks : null
}

export function rackGroupBounds(racks: readonly WarehouseLayoutEditorRack[]): LayoutBounds {
  return racks.map(getLayoutGeometryBounds).reduce(
    (group, bounds) => ({
      minX: Math.min(group.minX, bounds.minX),
      minY: Math.min(group.minY, bounds.minY),
      maxX: Math.max(group.maxX, bounds.maxX),
      maxY: Math.max(group.maxY, bounds.maxY),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  )
}

export function rackReferenceId(scene: WarehouseLayoutEditorScene, ids: readonly string[]) {
  return (
    selectedLayoutRacks(scene, ids)?.toSorted((first, second) => {
      const a = getLayoutGeometryBounds(first),
        b = getLayoutGeometryBounds(second)
      return a.minY - b.minY || a.minX - b.minX || first.id.localeCompare(second.id)
    })[0]?.id ?? null
  )
}

function inside(
  scene: WarehouseLayoutEditorScene,
  rack: WarehouseLayoutEditorRack,
  position: RackPosition
) {
  const bounds = getLayoutGeometryBounds({ ...rack, ...position })
  return (
    bounds.minX >= 0 &&
    bounds.minY >= 0 &&
    bounds.maxX <= scene.canvas.width &&
    bounds.maxY <= scene.canvas.height
  )
}

export function validRackPositions(
  scene: WarehouseLayoutEditorScene,
  positions: readonly RackPosition[]
) {
  const racks = selectedLayoutRacks(
    scene,
    positions.map((position) => position.id)
  )
  return Boolean(
    racks &&
    positions.every(
      (position, index) =>
        precise(position.x) && precise(position.y) && inside(scene, racks[index]!, position)
    )
  )
}

export function applyRackPositions(
  scene: WarehouseLayoutEditorScene,
  positions: readonly RackPosition[]
) {
  if (!validRackPositions(scene, positions)) return scene
  const updates = new Map(positions.map((position) => [position.id, position]))
  return {
    ...scene,
    racks: scene.racks.map((rack) => {
      const position = updates.get(rack.id)
      return position ? { ...rack, x: position.x, y: position.y } : rack
    }),
  }
}

export function canResizeLayoutCanvas(
  scene: WarehouseLayoutEditorScene,
  canvas: WarehouseLayoutEditorScene['canvas']
) {
  const activeZones = new Set(
    scene.zones.filter((zone) => zone.status === 'Active').map((zone) => zone.id)
  )
  const fits = (
    geometry:
      | WarehouseLayoutEditorRack
      | WarehouseLayoutEditorScene['zones'][number]
      | WarehouseLayoutEditorScene['decorations'][number],
    margin = 0
  ) => {
    const bounds = getLayoutGeometryBounds(geometry)
    return (
      bounds.minX >= -margin &&
      bounds.minY >= -margin &&
      bounds.maxX <= canvas.width + margin &&
      bounds.maxY <= canvas.height + margin
    )
  }
  return (
    scene.zones
      .filter((zone) => zone.status === 'Active' && !zone.placementPending)
      .every((zone) => fits(zone)) &&
    scene.racks
      .filter(
        (rack) => rack.status === 'Active' && activeZones.has(rack.zoneId) && !rack.placementPending
      )
      .every((rack) => fits(rack)) &&
    scene.decorations.every((decoration) => fits(decoration, LAYOUT_DECORATION_MARGIN))
  )
}

function boundedDelta(value: number, minimum: number, maximum: number) {
  const low = Math.ceil(minimum * precision) / precision
  const high = Math.floor(maximum * precision) / precision
  if (low > high) return null
  return Math.max(low, Math.min(high, round(value)))
}

const axisStops = (bounds: LayoutBounds, axis: 'x' | 'y') =>
  axis === 'x'
    ? [bounds.minX, (bounds.minX + bounds.maxX) / 2, bounds.maxX]
    : [bounds.minY, (bounds.minY + bounds.maxY) / 2, bounds.maxY]

export function moveLayoutRacks(
  scene: WarehouseLayoutEditorScene,
  ids: readonly string[],
  delta: { readonly x: number; readonly y: number },
  options: {
    readonly scale?: number
    readonly snapObjects?: boolean
    readonly snapGrid?: boolean
    readonly referenceId?: string
  } = {}
): RackOperationResult {
  const racks = selectedLayoutRacks(scene, ids)
  if (
    !racks ||
    !racks.every((rack) => precise(rack.x) && precise(rack.y)) ||
    !Number.isFinite(delta.x) ||
    !Number.isFinite(delta.y)
  )
    return failure(
      'Kệ chưa bố trí, không còn được phép chỉnh sửa hoặc tọa độ chưa hợp lệ. Vui lòng tải lại sơ đồ.'
    )
  const bounds = rackGroupBounds(racks)
  const reference = racks.find((rack) => rack.id === options.referenceId) ?? racks[0]!
  const candidates = options.snapObjects
    ? eligibleLayoutRacks(scene).filter((rack) => !ids.includes(rack.id))
    : []
  const threshold = 6 / Math.max(0.2, options.scale ?? 1)
  const proposed = { ...delta }
  const guides: RackGuide[] = []
  for (const axis of ['x', 'y'] as const) {
    let nearest: { distance: number; delta: number; value: number } | undefined
    const movingStops = axisStops(bounds, axis)
    for (const target of candidates.toSorted((a, b) => a.id.localeCompare(b.id))) {
      for (const stop of axisStops(getLayoutGeometryBounds(target), axis)) {
        for (const moving of movingStops) {
          const distance = Math.abs(stop - moving - delta[axis])
          if (distance <= threshold && (!nearest || distance < nearest.distance - epsilon))
            nearest = { distance, delta: stop - moving, value: stop }
        }
      }
    }
    if (nearest) {
      proposed[axis] = nearest.delta
      guides.push({ axis, value: nearest.value })
    } else if (options.snapGrid !== false)
      proposed[axis] =
        snapToGrid(reference[axis] + delta[axis], scene.canvas.gridSize) - reference[axis]
  }
  let x = boundedDelta(proposed.x, -bounds.minX, scene.canvas.width - bounds.maxX)
  let y = boundedDelta(proposed.y, -bounds.minY, scene.canvas.height - bounds.maxY)
  if (x === null || y === null) return failure()
  // Decimal addition can put a rotated corner microscopically outside a strict API bound.
  for (const rack of racks) {
    const moved = getLayoutGeometryBounds({ ...rack, x: round(rack.x + x), y: round(rack.y + y) })
    if (moved.minX < 0) x = round(x + 0.01)
    if (moved.maxX > scene.canvas.width) x = round(x - 0.01)
    if (moved.minY < 0) y = round(y + 0.01)
    if (moved.maxY > scene.canvas.height) y = round(y - 0.01)
  }
  const positions = racks.map((rack) => ({
    id: rack.id,
    x: round(rack.x + x),
    y: round(rack.y + y),
  }))
  if (!validRackPositions(scene, positions)) return failure()
  return {
    ok: true,
    positions,
    guides: guides.filter((guide) =>
      axisStops(bounds, guide.axis).some(
        (stop) => Math.abs(stop + (guide.axis === 'x' ? x : y) - guide.value) <= 0.01 + epsilon
      )
    ),
  }
}

export function arrangeLayoutRacks(
  scene: WarehouseLayoutEditorScene,
  ids: readonly string[],
  referenceId: string,
  operation: RackOperation
): RackOperationResult {
  const racks = selectedLayoutRacks(scene, ids)
  if (!racks || racks.length < 2) return failure('Chọn ít nhất hai kệ đã bố trí và đang hoạt động.')
  if (!racks.every((rack) => precise(rack.x) && precise(rack.y)))
    return failure('Tọa độ kệ chưa hợp lệ. Vui lòng tải lại sơ đồ.')
  const reference = racks.find((rack) => rack.id === referenceId)
  if (!reference) return failure('Vui lòng chọn lại kệ làm chuẩn.')
  let positions: RackPosition[]
  if (operation === 'distribute-x' || operation === 'distribute-y') {
    if (racks.length < 3) return failure('Chọn ít nhất ba kệ để giãn đều.')
    const axis = operation === 'distribute-x' ? 'x' : 'y'
    const min = axis === 'x' ? 'minX' : 'minY',
      max = axis === 'x' ? 'maxX' : 'maxY'
    const sorted = racks
      .map((rack) => ({ rack, bounds: getLayoutGeometryBounds(rack) }))
      .toSorted(
        (a, b) =>
          a.bounds[min] - b.bounds[min] ||
          a.bounds[min] + a.bounds[max] - (b.bounds[min] + b.bounds[max]) ||
          a.rack.id.localeCompare(b.rack.id)
      )
    const extent = sorted.at(-1)!.bounds[max] - sorted[0]!.bounds[min]
    const gap =
      (extent - sorted.reduce((sum, item) => sum + item.bounds[max] - item.bounds[min], 0)) /
      (racks.length - 1)
    if (gap < 0) return failure('Không đủ khoảng trống để giãn đều trên trục này.')
    let cursor = sorted[0]!.bounds[min]
    positions = sorted.map(({ rack, bounds }, index) => {
      const value =
        index === 0 || index === sorted.length - 1
          ? rack[axis]
          : round(rack[axis] + cursor - bounds[min])
      cursor += bounds[max] - bounds[min] + gap
      return { id: rack.id, x: axis === 'x' ? value : rack.x, y: axis === 'y' ? value : rack.y }
    })
  } else {
    const target = getLayoutGeometryBounds(reference)
    positions = racks.map((rack) => {
      const bounds = getLayoutGeometryBounds(rack)
      let x = rack.x,
        y = rack.y
      if (rack.id !== reference.id) {
        if (operation === 'left') x += target.minX - bounds.minX
        if (operation === 'right') x += target.maxX - bounds.maxX
        if (operation === 'center-x')
          x += (target.minX + target.maxX - bounds.minX - bounds.maxX) / 2
        if (operation === 'top') y += target.minY - bounds.minY
        if (operation === 'bottom') y += target.maxY - bounds.maxY
        if (operation === 'center-y')
          y += (target.minY + target.maxY - bounds.minY - bounds.maxY) / 2
      }
      const position = { id: rack.id, x: round(x), y: round(y) }
      if (rack.id !== reference.id) {
        const settled = getLayoutGeometryBounds({ ...rack, ...position })
        if (operation === 'left' || operation === 'right' || operation === 'center-x') {
          if (settled.minX < 0) position.x = round(position.x + 0.01)
          if (settled.maxX > scene.canvas.width) position.x = round(position.x - 0.01)
        } else {
          if (settled.minY < 0) position.y = round(position.y + 0.01)
          if (settled.maxY > scene.canvas.height) position.y = round(position.y - 0.01)
        }
      }
      return position
    })
  }
  return validRackPositions(scene, positions) ? { ok: true, positions, guides: [] } : failure()
}
