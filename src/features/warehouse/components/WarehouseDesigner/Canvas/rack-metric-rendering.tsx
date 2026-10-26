import type { KonvaEventObject } from 'konva/lib/Node'
import { Group, Line, Rect, Text } from 'react-konva'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'
import {
  SLOT_CELL_MIN_SCREEN_HEIGHT,
  SLOT_CELL_MIN_SCREEN_WIDTH,
  SLOT_VALUE_MIN_SCREEN_WIDTH,
  getSlotMetricLabel,
  type LayoutHeatBand,
  type LayoutMetric,
  type LayoutMetricLabel,
  type RackLabelMode,
} from '../../../utils/layout-rack-metrics'
import { getReadableCanvasColor, type CanvasPalette } from './canvas-palette'
import { isSelected } from './canvas-selection'

const SLOT_GRID_GAP = 3
export const RACK_HEADER_HEIGHT = 42
const METRIC_FONT_SCREEN_PX = 11
/** Đủ mờ để kệ không khớp lùi ra sau nhưng vẫn nhận ra vị trí. */
export const DIMMED_OPACITY = 0.25
/** Chiều rộng ước lượng của một ký tự đậm, theo cỡ chữ; đủ để chọn bản nhãn vừa chỗ. */
const TEXT_WIDTH_PER_FONT_SIZE = 0.72

type EditorRack = WarehouseLayoutEditorScene['racks'][number]
type EditorSlots = WarehouseLayoutEditorScene['slots']

interface RackSlotGrid {
  readonly columns: number
  readonly slotWidth: number
  readonly slotHeight: number
  readonly headerHeight: number
  readonly visibleSlots: EditorSlots
}

export interface RackSlotMetricOptions {
  readonly metric: LayoutMetric
  readonly scale: number
  readonly maximumStock: number
  readonly headerHeight: number
}

/** Lưới ô nằm dưới dải tiêu đề của kệ; chiều cao dải (đơn vị thế giới) do nơi gọi quyết định. */
export function getRackSlotGrid(
  rack: EditorRack,
  slots: EditorSlots,
  headerHeight: number
): RackSlotGrid | null {
  if (slots.length === 0 || rack.width < 60 || rack.height < 45) return null
  const availableWidth = Math.max(rack.width - 20, 1)
  const availableHeight = Math.max(rack.height - headerHeight - 10, 1)
  const visibleSlots = slots.slice(0, 60)
  const columns = Math.min(
    visibleSlots.length,
    Math.max(1, Math.ceil(Math.sqrt(visibleSlots.length * (availableWidth / availableHeight))))
  )
  const rows = Math.ceil(visibleSlots.length / columns)
  const slotWidth = (availableWidth - SLOT_GRID_GAP * (columns - 1)) / columns
  const slotHeight = (availableHeight - SLOT_GRID_GAP * (rows - 1)) / rows
  if (slotWidth < 7 || slotHeight < 7) return null
  return { columns, slotWidth, slotHeight, headerHeight, visibleSlots }
}

export function isSlotGridReadable(grid: RackSlotGrid | null, scale: number) {
  return (
    grid !== null &&
    grid.slotWidth * scale >= SLOT_CELL_MIN_SCREEN_WIDTH &&
    grid.slotHeight * scale >= SLOT_CELL_MIN_SCREEN_HEIGHT
  )
}

export function getHeatFill(band: LayoutHeatBand, palette: CanvasPalette) {
  switch (band) {
    case 'empty':
      return palette.card
    case 'low':
      return palette.heatLow
    case 'mid':
      return palette.heatMid
    case 'high':
      return palette.heatHigh
    case 'full':
      return palette.destructive
  }
}

function getMetricForeground(fill: string, palette: CanvasPalette) {
  return fill === palette.destructive ? palette.card : getReadableCanvasColor(fill, palette)
}

export function renderRackMetricLabel({
  rack,
  label,
  labelMode,
  headerHeight,
  showSecondary,
  rightInset,
  fill,
  slotCellsReadable,
  scale,
  palette,
}: {
  readonly rack: EditorRack
  readonly label: LayoutMetricLabel
  readonly labelMode: RackLabelMode
  readonly headerHeight: number
  readonly showSecondary: boolean
  /** Chừa chỗ bên phải dải cho huy hiệu của kệ đang chọn. */
  readonly rightInset: number
  readonly fill: string
  readonly slotCellsReadable: boolean
  readonly scale: number
  readonly palette: CanvasPalette
}) {
  if (labelMode === 'none') return null
  const foreground = getMetricForeground(fill, palette)
  const isHeader = labelMode === 'header'
  const fontSize = METRIC_FONT_SCREEN_PX / scale
  const padding = (isHeader ? 3 : 6) / scale
  const lineHeight = fontSize * (isHeader ? 1.15 : 1.25)
  const estimateWidth = (value: string) => value.length * fontSize * TEXT_WIDTH_PER_FONT_SIZE

  if (!isHeader) {
    // Kệ quá nhỏ hoặc bị xoay không có chỗ cho dải tiêu đề: nổi nhãn ở giữa kệ.
    const horizontalExtent = rack.rotation % 180 === 0 ? rack.width : rack.height
    const availableWidth = horizontalExtent - padding * 2
    const text =
      [`${rack.rackCode}  ${label.primary}`, label.primary].find(
        (candidate) => estimateWidth(candidate) <= availableWidth
      ) ?? label.compact
    const pillWidth = Math.min(horizontalExtent, estimateWidth(text) + padding * 2)
    return (
      <Group x={rack.width / 2} y={rack.height / 2} rotation={-rack.rotation} listening={false}>
        {slotCellsReadable ? (
          <Rect
            x={-pillWidth / 2}
            y={-lineHeight / 2 - padding / 3}
            width={pillWidth}
            height={lineHeight + (padding * 2) / 3}
            cornerRadius={4 / scale}
            fill={palette.card}
            opacity={0.92}
            stroke={palette.border}
            strokeWidth={1 / scale}
            perfectDrawEnabled={false}
          />
        ) : null}
        <Text
          x={-pillWidth / 2}
          y={-lineHeight / 2}
          width={pillWidth}
          align="center"
          text={text}
          fontSize={fontSize}
          fontStyle="bold"
          fill={slotCellsReadable ? palette.foreground : foreground}
          wrap="none"
          ellipsis
        />
      </Group>
    )
  }

  // Số liệu được ưu tiên chỗ: dùng bản đầy đủ nếu vừa trong 60% dải, không thì bản ngắn; mã kệ lấy phần còn lại.
  const availableWidth = rack.width - padding * 2 - rightInset
  const valueText =
    estimateWidth(label.primary) <= availableWidth * 0.6 ? label.primary : label.compact
  const valueWidth = estimateWidth(valueText) + padding * 2
  const codeWidth = Math.max(availableWidth - valueWidth - padding * 2, 0)

  return (
    <Group listening={false}>
      {slotCellsReadable ? (
        <Line
          points={[0, headerHeight, rack.width, headerHeight]}
          stroke={palette.border}
          strokeWidth={1 / scale}
          opacity={0.6}
        />
      ) : null}
      <Text
        x={padding}
        y={padding}
        width={codeWidth}
        text={rack.rackCode}
        fontSize={fontSize}
        fontStyle="bold"
        fill={foreground}
        wrap="none"
        ellipsis
      />
      <Text
        x={rack.width - padding - rightInset - valueWidth}
        y={padding}
        width={valueWidth}
        align="right"
        text={valueText}
        fontSize={fontSize}
        fontStyle="bold"
        fill={foreground}
        wrap="none"
      />
      {showSecondary ? (
        <Text
          x={padding}
          y={padding + lineHeight}
          width={rack.width - padding * 2}
          text={label.secondary ?? ''}
          fontSize={fontSize}
          fill={foreground}
          opacity={0.85}
          wrap="none"
          ellipsis
        />
      ) : null}
    </Group>
  )
}

export function renderRackSlots(
  rack: EditorRack,
  slots: EditorSlots,
  palette: CanvasPalette,
  selection: WarehouseLayoutSelection | null,
  onSelect: (selection: WarehouseLayoutSelection | null) => void,
  mode: 'designer' | 'viewer',
  onHover: (event: KonvaEventObject<MouseEvent>, code: string, name: string) => void,
  onHoverEnd: () => void,
  onRackSelect: ((shift: boolean) => boolean) | undefined,
  metricOptions: RackSlotMetricOptions
) {
  const { metric, scale, maximumStock } = metricOptions
  const grid = getRackSlotGrid(rack, slots, metricOptions.headerHeight)
  if (!grid) return null
  if (metric !== 'off' && !isSlotGridReadable(grid, scale)) return null
  const { columns, slotWidth, slotHeight, headerHeight, visibleSlots } = grid
  const gap = SLOT_GRID_GAP

  return visibleSlots.map((slot, index) => {
    const x = 10 + (index % columns) * (slotWidth + gap)
    const y = headerHeight + Math.floor(index / columns) * (slotHeight + gap)
    const selected = isSelected(selection, 'slot', slot.id)
    const slotLabel = getSlotMetricLabel(metric, slot, maximumStock)
    const slotHeatFill = slotLabel?.band ? getHeatFill(slotLabel.band, palette) : null
    const showSlotValue =
      slotLabel !== null &&
      slotLabel.band !== null &&
      slotLabel.band !== 'empty' &&
      slot.isActive &&
      !selected &&
      slotWidth * scale >= SLOT_VALUE_MIN_SCREEN_WIDTH &&
      slotHeight * scale >= METRIC_FONT_SCREEN_PX + 2
    const fill =
      mode === 'viewer'
        ? !slot.isActive
          ? palette.errorContainer
          : selected
            ? palette.selectionFill
            : (slotHeatFill ?? (slot.currentOccupancy > 0 ? palette.viewerOccupied : palette.card))
        : !slot.isActive
          ? palette.muted
          : slot.occupancyStatus === 'Vacant'
            ? palette.card
            : slot.occupancyStatus === 'Reserved'
              ? palette.warningContainer
              : palette.accent
    return (
      <Group
        key={slot.id}
        x={x}
        y={y}
        onMouseEnter={(event) => onHover(event, slot.slotCode, slot.slotName)}
        onMouseLeave={onHoverEnd}
        onClick={(event) => {
          event.cancelBubble = true
          if (onRackSelect?.(event.evt.shiftKey)) return
          onSelect({ kind: 'slot', id: slot.id })
        }}
        onTap={(event) => {
          event.cancelBubble = true
          if (onRackSelect?.(false)) return
          onSelect({ kind: 'slot', id: slot.id })
        }}
      >
        <Rect
          name={`slot:${slot.id}`}
          width={slotWidth}
          height={slotHeight}
          fill={fill}
          opacity={mode === 'designer' && !slot.isActive ? 0.55 : 1}
          stroke={
            selected
              ? mode === 'viewer'
                ? palette.viewerSelected
                : palette.primary
              : mode === 'viewer' && !slot.isActive
                ? palette.destructive
                : palette.border
          }
          strokeWidth={selected ? (mode === 'viewer' ? 1.5 : 1.25) : 1}
          cornerRadius={2}
          perfectDrawEnabled={false}
        />
        {showSlotValue && slotLabel ? (
          <Text
            y={(slotHeight - METRIC_FONT_SCREEN_PX / scale) / 2}
            width={slotWidth}
            align="center"
            text={slotLabel.primary}
            fontSize={METRIC_FONT_SCREEN_PX / scale}
            fontStyle="bold"
            fill={getMetricForeground(fill, palette)}
            wrap="none"
            ellipsis
            listening={false}
          />
        ) : null}
        {mode === 'viewer' && selected && slotWidth >= 14 && slotHeight >= 10 ? (
          <Line
            points={[
              slotWidth * 0.3,
              slotHeight * 0.52,
              slotWidth * 0.45,
              slotHeight * 0.68,
              slotWidth * 0.72,
              slotHeight * 0.32,
            ]}
            stroke={palette.selectionForeground}
            strokeWidth={1.5}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        ) : null}
      </Group>
    )
  })
}
