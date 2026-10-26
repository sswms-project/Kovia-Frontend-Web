import { Group, Rect } from 'react-konva'
import type { RackEditingControls } from '../../../types/rack-editing.types'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'
import { snapToGrid } from '../../../utils/layout-grid'
import { getLayoutLocationLabel } from '../../../utils/layout-placement'
import {
  RACK_HEADER_TWO_LINE_SCREEN_HEIGHT,
  getRackHeaderScreenHeight,
  getRackLabelMode,
  matchesLayoutHighlight,
} from '../../../utils/layout-rack-metrics'
import { CanvasRackShapeMarks } from './CanvasRackShapeMarks'
import { CanvasSelectionBadge } from './CanvasSelectionBadge'
import { getReadableCanvasColor, type CanvasPalette } from './canvas-palette'
import { isSelected } from './canvas-selection'
import {
  DIMMED_OPACITY,
  RACK_HEADER_HEIGHT,
  getHeatFill,
  getRackSlotGrid,
  isSlotGridReadable,
  renderRackMetricLabel,
  renderRackSlots,
} from './rack-metric-rendering'
import type {
  CanvasMode,
  CanvasRack,
  CanvasSceneData,
  CanvasZone,
  CommitNodeGeometry,
  HideHoverInfo,
  RackCanvasGestures,
  SetObjectNode,
  ShowHoverInfo,
} from './types'

interface CanvasBusinessObjectProps {
  readonly target: 'zone' | 'rack'
  readonly object: CanvasZone | CanvasRack
  readonly scene: WarehouseLayoutEditorScene
  readonly data: CanvasSceneData
  readonly selection: WarehouseLayoutSelection | null
  readonly selectedZoneId: string | undefined
  readonly mode: CanvasMode
  readonly canConfigure: boolean
  readonly rackEditing?: RackEditingControls
  readonly rackGestures: RackCanvasGestures
  readonly palette: CanvasPalette
  readonly viewportScale: number
  readonly onSelect: (selection: WarehouseLayoutSelection | null) => void
  readonly onCommitGeometry: CommitNodeGeometry
  readonly setObjectNode: SetObjectNode
  readonly showHoverInfo: ShowHoverInfo
  readonly hideHoverInfo: HideHoverInfo
}

/** Một khu vực hoặc một kệ trên canvas: thân, ô, nhãn số liệu, huy hiệu chọn và các thao tác kéo/chọn. */
export function CanvasBusinessObject({
  target,
  object,
  scene,
  data,
  selection,
  selectedZoneId,
  mode,
  canConfigure,
  rackEditing,
  rackGestures,
  palette,
  viewportScale,
  onSelect,
  onCommitGeometry,
  setObjectNode,
  showHoverInfo,
  hideHoverInfo,
}: CanvasBusinessObjectProps) {
  const { activeZoneIds, slotsByRack, rackMetricLabels, activeMetric, activeHighlight } = data
  const isRack = 'rackCode' in object
  const code = isRack ? object.rackCode : object.zoneCode
  const key = `${target}:${object.id}`
  const selected =
    isSelected(selection, target, object.id) ||
    (isRack && Boolean(rackEditing?.ids.includes(object.id)))
  const isZone = !isRack
  const parentHighlighted = isZone && object.id === selectedZoneId
  const rack = isRack ? object : null
  const usesRackGestures = Boolean(rackEditing && rack && !rack.placementPending)
  const isEditableRack = Boolean(
    usesRackGestures && rack?.status === 'Active' && activeZoneIds.has(rack.zoneId)
  )
  const rackSlots = rack ? (slotsByRack.get(rack.id) ?? []) : []
  const hasStock = isZone
    ? scene.slots.some((slot) => slot.zoneId === object.id && slot.currentOccupancy > 0)
    : rackSlots.some((slot) => slot.currentOccupancy > 0)
  const metricLabel = rack ? (rackMetricLabels.get(rack.id) ?? null) : null
  const labelMode =
    rack && metricLabel
      ? getRackLabelMode(rack.width * viewportScale, rack.height * viewportScale, rack.rotation)
      : 'none'
  const headerScreenHeight =
    rack && labelMode === 'header'
      ? getRackHeaderScreenHeight(
          rack.width * viewportScale,
          rack.height * viewportScale,
          metricLabel?.secondary != null,
          rackSlots.length > 0
        )
      : null
  const showHeaderSecondary = headerScreenHeight === RACK_HEADER_TWO_LINE_SCREEN_HEIGHT
  const metricHeaderHeight = headerScreenHeight
    ? headerScreenHeight / viewportScale
    : RACK_HEADER_HEIGHT
  const slotCellsReadable =
    rack !== null &&
    activeMetric !== 'off' &&
    isSlotGridReadable(getRackSlotGrid(rack, rackSlots, metricHeaderHeight), viewportScale)
  const rackHeatFill =
    metricLabel?.band && !slotCellsReadable ? getHeatFill(metricLabel.band, palette) : null
  const isDimmed = rack !== null && !matchesLayoutHighlight(metricLabel, activeHighlight)
  const objectFill =
    mode === 'viewer'
      ? object.status === 'Inactive'
        ? palette.errorContainer
        : // Kệ đang hiện số liệu giữ màu công suất khi được chọn; chỉ đổi viền để vẫn đọc được số.
          selected && (isZone || !metricLabel)
          ? palette.selectionFill
          : isZone
            ? palette.accent
            : metricLabel
              ? (rackHeatFill ?? palette.card)
              : hasStock
                ? palette.viewerOccupied
                : palette.card
      : isZone
        ? palette.accent
        : (object.color ?? palette.card)
  const objectForeground = object.color
    ? getReadableCanvasColor(object.color, palette)
    : palette.foreground
  const selectionStroke = mode === 'viewer' ? palette.viewerSelected : palette.primary
  // Huy hiệu của kệ có dải tiêu đề phải nằm gọn trong dải để không che số.
  const checkBadgeSize = Math.min(
    22 / viewportScale,
    object.width * 0.45,
    object.height * 0.45,
    labelMode === 'header' ? metricHeaderHeight - 4 / viewportScale : Infinity
  )
  const checkBadgeInset = Math.min(
    4 / viewportScale,
    Math.max(0, (Math.min(object.width, object.height) - checkBadgeSize) / 2)
  )
  const canMoveObject =
    canConfigure &&
    !rackEditing?.locked &&
    (!isZone || !rackEditing || selected) &&
    object.status === 'Active' &&
    (isZone || (rack !== null && activeZoneIds.has(rack.zoneId)))

  return (
    <Group
      layoutKind={target}
      ref={(node) => setObjectNode(key, node)}
      x={object.x + object.width / 2}
      y={object.y + object.height / 2}
      offsetX={object.width / 2}
      offsetY={object.height / 2}
      width={object.width}
      height={object.height}
      rotation={object.rotation}
      opacity={isDimmed ? DIMMED_OPACITY : 1}
      draggable={canMoveObject}
      dragBoundFunc={
        isEditableRack
          ? (position) => position
          : (position) => ({
              x:
                snapToGrid(position.x - object.width / 2, scene.canvas.gridSize) + object.width / 2,
              y:
                snapToGrid(position.y - object.height / 2, scene.canvas.gridSize) +
                object.height / 2,
            })
      }
      onMouseEnter={(event) =>
        showHoverInfo(event, code, getLayoutLocationLabel(scene, { kind: target, id: object.id }))
      }
      onMouseLeave={hideHoverInfo}
      onClick={(event) => {
        event.cancelBubble = true
        if (rackGestures.isClickSuppressed()) return
        if (isRack && rackGestures.selectRack(object.id, event.evt.shiftKey)) return
        onSelect({ kind: target, id: object.id })
      }}
      onTap={(event) => {
        event.cancelBubble = true
        if (rackGestures.isClickSuppressed()) return
        if (isRack && rackGestures.selectRack(object.id, false)) return
        onSelect({ kind: target, id: object.id })
      }}
      onDragStart={(event) => {
        if (!isEditableRack) return
        event.cancelBubble = true
        if (!rackGestures.dragStart(object.id)) event.target.stopDrag()
      }}
      onDragMove={(event) => {
        if (!isEditableRack) return
        event.cancelBubble = true
        rackGestures.dragMove(object.id, event.target)
      }}
      onDragEnd={(event) => {
        event.cancelBubble = true
        if (usesRackGestures) {
          rackGestures.dragEnd(object.id)
          return
        }
        onCommitGeometry(target, object.id, event.target, object.zIndex)
      }}
      onTransformEnd={(event) => {
        event.cancelBubble = true
        onCommitGeometry(target, object.id, event.target, object.zIndex)
      }}
    >
      <Rect
        name={`${target}:${object.id}`}
        width={object.width}
        height={object.height}
        fill={objectFill}
        stroke={
          selected || parentHighlighted
            ? selectionStroke
            : object.status === 'Inactive'
              ? palette.destructive
              : isZone
                ? (object.color ?? palette.primary)
                : palette.foreground
        }
        strokeWidth={
          selected || parentHighlighted
            ? (rackEditing?.referenceId === object.id ? 2.5 : mode === 'viewer' ? 1.5 : 1.25) /
              viewportScale
            : 1 / viewportScale
        }
        cornerRadius={isZone ? 4 : 2}
      />
      {rack ? (
        <CanvasRackShapeMarks rack={rack} stroke={objectForeground} viewportScale={viewportScale} />
      ) : null}
      {rack
        ? renderRackSlots(
            rack,
            rackSlots,
            palette,
            selection,
            (next) => {
              if (!rackGestures.isClickSuppressed()) onSelect(next)
            },
            mode,
            showHoverInfo,
            hideHoverInfo,
            (shift) => rackGestures.isClickSuppressed() || rackGestures.selectRack(rack.id, shift),
            {
              metric: activeMetric,
              scale: viewportScale,
              maximumStock: data.maximumSlotStock,
              headerHeight: metricHeaderHeight,
            }
          )
        : null}
      {rack && metricLabel
        ? renderRackMetricLabel({
            rack,
            label: metricLabel,
            labelMode,
            headerHeight: metricHeaderHeight,
            showSecondary: showHeaderSecondary,
            rightInset: selected ? checkBadgeSize + checkBadgeInset * 2 : 0,
            fill: objectFill,
            slotCellsReadable,
            scale: viewportScale,
            palette,
          })
        : null}
      {mode === 'viewer' && selected && target === 'rack' ? (
        <CanvasSelectionBadge
          x={object.width - checkBadgeSize - checkBadgeInset}
          y={checkBadgeInset}
          size={checkBadgeSize}
          viewportScale={viewportScale}
          palette={palette}
        />
      ) : null}
    </Group>
  )
}
