import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutGeometry,
  WarehouseLayoutSelection,
} from '../types/warehouse-layout-scene.types'
import {
  getLayoutGeometryBounds,
  getRackPresetSize,
  MIN_LAYOUT_OBJECT_SIZE,
  type LayoutBounds,
} from './layout-grid'

export function getLayoutLocationLabel(
  scene: WarehouseLayoutEditorScene,
  selection: WarehouseLayoutSelection
): string {
  const slot =
    selection.kind === 'slot' ? scene.slots.find((item) => item.id === selection.id) : null
  const rack = scene.racks.find((item) =>
    selection.kind === 'rack' ? item.id === selection.id : item.id === slot?.rackId
  )
  const zone = scene.zones.find((item) =>
    selection.kind === 'zone' ? item.id === selection.id : item.id === rack?.zoneId
  )
  return [
    zone ? `Khu ${zone.zoneCode} · ${zone.zoneName}` : rack ? `Khu ${rack.zoneCode}` : '',
    rack ? `Kệ ${rack.rackCode} · ${rack.rackName}` : '',
    slot ? `${slot.slotCode} · ${slot.slotName}` : '',
  ]
    .filter(Boolean)
    .join(' → ')
}

function overlaps(first: LayoutBounds, second: LayoutBounds, gap = 0) {
  return (
    first.minX < second.maxX + gap &&
    first.maxX + gap > second.minX &&
    first.minY < second.maxY + gap &&
    first.maxY + gap > second.minY
  )
}

function corners(geometry: WarehouseLayoutGeometry) {
  const radians = (geometry.rotation * Math.PI) / 180
  const cosine = Math.cos(radians),
    sine = Math.sin(radians)
  return [
    [0, 0],
    [geometry.width, 0],
    [geometry.width, geometry.height],
    [0, geometry.height],
  ].map(([x, y]) => {
    const dx = x! - geometry.width / 2,
      dy = y! - geometry.height / 2
    return {
      x: geometry.x + geometry.width / 2 + dx * cosine - dy * sine,
      y: geometry.y + geometry.height / 2 + dx * sine + dy * cosine,
    }
  })
}

function contains(container: WarehouseLayoutGeometry, item: WarehouseLayoutGeometry) {
  const radians = (-container.rotation * Math.PI) / 180
  return corners(item).every((point) => {
    const dx = point.x - container.x - container.width / 2
    const dy = point.y - container.y - container.height / 2
    const x = dx * Math.cos(radians) - dy * Math.sin(radians) + container.width / 2
    const y = dx * Math.sin(radians) + dy * Math.cos(radians) + container.height / 2
    return x >= -0.01 && y >= -0.01 && x <= container.width + 0.01 && y <= container.height + 0.01
  })
}

// Separating axes keep rotated shelves from generating false collision warnings.
function intersects(first: WarehouseLayoutGeometry, second: WarehouseLayoutGeometry) {
  if (!overlaps(getLayoutGeometryBounds(first), getLayoutGeometryBounds(second))) return false
  const a = corners(first),
    b = corners(second)
  return [first.rotation, first.rotation + 90, second.rotation, second.rotation + 90].every(
    (angle) => {
      const radians = (angle * Math.PI) / 180
      const project = (points: typeof a) =>
        points.map((point) => point.x * Math.cos(radians) + point.y * Math.sin(radians))
      const pa = project(a),
        pb = project(b)
      return Math.min(...pa) < Math.max(...pb) - 0.01 && Math.min(...pb) < Math.max(...pa) - 0.01
    }
  )
}

export function getLayoutPlacementIssues(scene: WarehouseLayoutEditorScene) {
  const zones = scene.zones.filter((zone) => zone.status === 'Active' && !zone.placementPending)
  const racks = scene.racks.filter(
    (rack) =>
      rack.status === 'Active' &&
      !rack.placementPending &&
      zones.some((zone) => zone.id === rack.zoneId)
  )
  const issues: { selection: WarehouseLayoutSelection; message: string }[] = []
  for (const zone of zones) {
    const other = zones.find((item) => item.id !== zone.id && intersects(zone, item))
    if (other)
      issues.push({
        selection: { kind: 'zone', id: zone.id },
        message: `Chồng khu ${other.zoneCode}`,
      })
  }
  for (const rack of racks) {
    const zone = zones.find((item) => item.id === rack.zoneId)!
    const other = racks.find((item) => item.id !== rack.id && intersects(rack, item))
    if (other || !contains(zone, rack))
      issues.push({
        selection: { kind: 'rack', id: rack.id },
        message: [
          other ? `Chồng kệ ${other.rackCode} (khu ${other.zoneCode})` : '',
          !contains(zone, rack) ? 'Vượt ranh giới khu vực' : '',
        ]
          .filter(Boolean)
          .join(' · '),
      })
  }
  return issues
}

function findSpace(
  region: WarehouseLayoutGeometry,
  width: number,
  height: number,
  obstacles: readonly WarehouseLayoutGeometry[],
  gridSize: number,
  header: number
) {
  if (
    width < MIN_LAYOUT_OBJECT_SIZE ||
    height < MIN_LAYOUT_OBJECT_SIZE ||
    !Number.isFinite(gridSize) ||
    gridSize <= 0
  )
    return null
  const bounds = getLayoutGeometryBounds(region)
  const gap = Math.max(10, gridSize)
  const occupied = obstacles.map(getLayoutGeometryBounds)
  const align = (value: number) => Math.ceil(value / gridSize) * gridSize
  let attempts = 0
  // ponytail: bounded first-fit keeps large imports responsive; unplaced items remain in the queue.
  for (
    let y = align(bounds.minY + header);
    y + height + gap <= bounds.maxY;
    y += align(height + gap)
  ) {
    for (let x = align(bounds.minX + gap); x + width + gap <= bounds.maxX; ) {
      if (++attempts > 4096) return null
      const candidate = { x, y, width, height, rotation: 0, zIndex: 0 }
      const candidateBounds = getLayoutGeometryBounds(candidate)
      const blocked = occupied.find((item) => overlaps(candidateBounds, item, gap))
      if (!blocked && contains(region, candidate)) return candidate
      x = blocked ? align(blocked.maxX + gap) : x + align(width + gap)
    }
  }
  return null
}

export function suggestUnplacedLayout(
  scene: WarehouseLayoutEditorScene
): WarehouseLayoutEditorScene {
  const zones = [...scene.zones],
    racks = [...scene.racks]
  const canvas = { x: 0, y: 0, ...scene.canvas, rotation: 0, zIndex: 0 }
  const decorations = scene.decorations.filter((item) => item.type !== 'DirectionArrow')
  for (const [index, zone] of zones.entries()) {
    if (!zone.placementPending || zone.status !== 'Active') continue
    const margin = Math.max(10, scene.canvas.gridSize)
    const geometry = findSpace(
      canvas,
      Math.min(zone.width, scene.canvas.width - margin * 2),
      Math.min(zone.height, scene.canvas.height - margin * 2),
      [
        ...zones.filter((item) => item.status === 'Active' && !item.placementPending),
        ...racks.filter((item) => item.status === 'Active' && !item.placementPending),
        ...decorations,
      ],
      scene.canvas.gridSize,
      Math.max(10, scene.canvas.gridSize)
    )
    if (geometry)
      zones[index] = { ...zone, ...geometry, zIndex: zone.zIndex, placementPending: false }
  }
  for (const [index, rack] of racks.entries()) {
    const zone = zones.find(
      (item) => item.id === rack.zoneId && item.status === 'Active' && !item.placementPending
    )
    if (!rack.placementPending || rack.status !== 'Active' || !zone) continue
    const size = getRackPresetSize()
    const geometry = findSpace(
      zone,
      size.width,
      size.height,
      [
        ...racks.filter((item) => item.status === 'Active' && !item.placementPending),
        ...zones.filter(
          (item) => item.id !== zone.id && item.status === 'Active' && !item.placementPending
        ),
        ...decorations,
      ],
      scene.canvas.gridSize,
      Math.max(40, scene.canvas.gridSize * 2)
    )
    if (geometry)
      racks[index] = { ...rack, ...geometry, zIndex: rack.zIndex, placementPending: false }
  }
  return { ...scene, zones, racks }
}
