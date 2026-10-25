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
  const zones = scene.zones.filter((zone) => !zone.placementPending)
  const racks = scene.racks.filter(
    (rack) =>
      !rack.placementPending &&
      !scene.zones.find((zone) => zone.id === rack.zoneId)?.placementPending
  )
  const issues: { selection: WarehouseLayoutSelection; message: string }[] = []
  for (const zone of scene.zones.filter(
    (item) => item.placementPending && item.status === 'Active'
  )) {
    if (scene.racks.some((rack) => rack.zoneId === zone.id && !rack.placementPending))
      issues.push({
        selection: { kind: 'zone', id: zone.id },
        message: 'Khu vực chưa bố trí có kệ đã đặt. Hãy đặt khu bao quanh các kệ hiện có.',
      })
  }
  for (const zone of zones) {
    const other = zones.find((item) => item.id !== zone.id && intersects(zone, item))
    if (other)
      issues.push({
        selection: { kind: 'zone', id: zone.id },
        message: `Chồng khu ${other.zoneCode}`,
      })
  }
  for (const rack of racks) {
    const zone = zones.find((item) => item.id === rack.zoneId)
    const other = racks.find((item) => item.id !== rack.id && intersects(rack, item))
    if (other || !zone || !contains(zone, rack))
      issues.push({
        selection: { kind: 'rack', id: rack.id },
        message: [
          other ? `Chồng kệ ${other.rackCode} (khu ${other.zoneCode})` : '',
          !zone ? 'Chưa xác định khu vực' : !contains(zone, rack) ? 'Vượt ranh giới khu vực' : '',
        ]
          .filter(Boolean)
          .join(' · '),
      })
  }
  return issues
}

export function getUnplacedLayoutObject(
  scene: WarehouseLayoutEditorScene,
  selection: WarehouseLayoutSelection
) {
  const object =
    selection.kind === 'zone'
      ? scene.zones.find((zone) => zone.id === selection.id)
      : selection.kind === 'rack'
        ? scene.racks.find((rack) => rack.id === selection.id)
        : undefined
  return object?.placementPending && object.status === 'Active' ? object : null
}

export function getLayoutPlacementError(
  scene: WarehouseLayoutEditorScene,
  selection: WarehouseLayoutSelection,
  geometry: WarehouseLayoutGeometry
): string | null {
  const object = getUnplacedLayoutObject(scene, selection)
  if (!object) return 'Vị trí không còn chờ bố trí hoặc đã ngừng hoạt động. Hãy chọn lại.'
  if (
    ![
      geometry.x,
      geometry.y,
      geometry.width,
      geometry.height,
      geometry.rotation,
      geometry.zIndex,
    ].every(Number.isFinite) ||
    geometry.x < 0 ||
    geometry.y < 0 ||
    geometry.width < MIN_LAYOUT_OBJECT_SIZE ||
    geometry.height < MIN_LAYOUT_OBJECT_SIZE ||
    geometry.rotation < 0 ||
    geometry.rotation >= 360 ||
    !Number.isInteger(geometry.zIndex) ||
    Math.abs(geometry.zIndex) > 1000
  )
    return 'Vị trí, kích thước hoặc góc xoay không hợp lệ.'
  if (!contains({ x: 0, y: 0, ...scene.canvas, rotation: 0, zIndex: 0 }, geometry))
    return 'Đối tượng phải nằm trong mặt bằng kho.'
  const zones = scene.zones.filter((zone) => !zone.placementPending && zone.id !== object.id)
  const racks = scene.racks.filter((rack) => !rack.placementPending && rack.id !== object.id)
  if (selection.kind === 'rack' && 'zoneId' in object) {
    const zone = scene.zones.find((zone) => zone.id === object.zoneId)
    if (!zone || zone.status !== 'Active' || zone.placementPending)
      return 'Hãy bố trí khu vực của kệ trước.'
    if (!contains(zone, geometry))
      return 'Kệ phải nằm trong khu vực của nó. Hãy điều chỉnh vị trí, kích thước hoặc góc xoay.'
    if (zones.some((item) => item.id !== zone.id && intersects(item, geometry)))
      return 'Kệ đang chồng lên khu vực khác.'
    if (racks.some((item) => intersects(item, geometry)))
      return 'Kệ đang chồng lên một kệ hiện có, kể cả kệ ngừng hoạt động.'
    if (
      scene.decorations.some((item) => item.type !== 'DirectionArrow' && intersects(item, geometry))
    )
      return 'Kệ đang chồng lên lối đi hoặc khu chức năng.'
  } else if (selection.kind === 'zone') {
    if (zones.some((item) => intersects(item, geometry)))
      return 'Khu vực đang chồng lên một khu vực hiện có.'
    if (racks.some((item) => item.zoneId !== object.id && intersects(item, geometry)))
      return 'Khu vực đang chồng lên kệ của khu vực khác.'
    if (racks.some((item) => item.zoneId === object.id && !contains(geometry, item)))
      return 'Khu vực phải bao quanh tất cả kệ đã bố trí của nó; các kệ hiện có sẽ được giữ nguyên.'
  }
  return null
}

export function placeUnplacedLayoutObject(
  scene: WarehouseLayoutEditorScene,
  selection: WarehouseLayoutSelection,
  geometry: WarehouseLayoutGeometry
): WarehouseLayoutEditorScene {
  if (getLayoutPlacementError(scene, selection, geometry)) return scene
  const { x, y, width, height, rotation, zIndex } = geometry
  const placement = { x, y, width, height, rotation, zIndex }
  if (selection.kind === 'zone')
    return {
      ...scene,
      zones: scene.zones.map((zone) =>
        zone.id === selection.id ? { ...zone, ...placement, placementPending: false } : zone
      ),
    }
  return {
    ...scene,
    racks: scene.racks.map((rack) =>
      rack.id === selection.id ? { ...rack, ...placement, placementPending: false } : rack
    ),
  }
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
    const children = racks.filter((rack) => rack.zoneId === zone.id && !rack.placementPending)
    if (children.length) {
      const bounds = children.map(getLayoutGeometryBounds)
      const x = Math.max(0, Math.min(...bounds.map((item) => item.minX)) - margin)
      const y = Math.max(0, Math.min(...bounds.map((item) => item.minY)) - Math.max(40, margin))
      const geometry = {
        x,
        y,
        width: Math.max(...bounds.map((item) => item.maxX)) + margin - x,
        height: Math.max(...bounds.map((item) => item.maxY)) + margin - y,
        rotation: 0,
        zIndex: zone.zIndex,
      }
      if (
        !getLayoutPlacementError(
          { ...scene, zones, racks },
          { kind: 'zone', id: zone.id },
          geometry
        )
      )
        zones[index] = { ...zone, ...geometry, placementPending: false }
      continue
    }
    const geometry = findSpace(
      canvas,
      Math.min(zone.width, scene.canvas.width - margin * 2),
      Math.min(zone.height, scene.canvas.height - margin * 2),
      [
        ...zones.filter((item) => !item.placementPending),
        ...racks.filter((item) => !item.placementPending),
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
        ...racks.filter((item) => !item.placementPending),
        ...zones.filter((item) => item.id !== zone.id && !item.placementPending),
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
