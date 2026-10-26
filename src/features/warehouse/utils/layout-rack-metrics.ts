import type {
  WarehouseLayoutRackSceneResponse,
  WarehouseLayoutSlotSceneResponse,
} from '../types/warehouse-layout-scene.types'
import { getCapacityUtilization } from './storage-capacity'

export type LayoutMetric = 'capacity' | 'stock' | 'off'
export type LayoutHeatBand = 'empty' | 'low' | 'mid' | 'high' | 'full'
export type RackLabelMode = 'none' | 'center' | 'header'
/** Trạng thái hiển thị của kệ/ô: quyết định vẽ thanh mức đầy, khung nét đứt, nền gạch chéo hay dấu vô hạn. */
export type LayoutStatus = 'measured' | 'empty' | 'unconfigured' | 'unlimited' | 'nodata'
/** Bộ lọc "Làm nổi": kệ không khớp bị làm mờ. */
export type LayoutHighlight = 'all' | 'near' | 'empty' | 'todo'

export const LAYOUT_METRIC_LABELS: Record<LayoutMetric, string> = {
  capacity: 'Công suất',
  stock: 'Tồn thực tế',
  off: 'Ẩn số liệu',
}

export const LAYOUT_HEAT_BAND_LABELS: Record<LayoutMetric, Record<LayoutHeatBand, string>> = {
  capacity: {
    empty: 'Trống',
    low: 'Dưới 50%',
    mid: '50 đến 79%',
    high: 'Gần đầy, từ 80%',
    full: 'Đầy',
  },
  stock: {
    empty: 'Không có tồn',
    low: 'Tồn thấp',
    mid: 'Tồn vừa',
    high: 'Tồn cao',
    full: 'Tồn cao',
  },
  off: { empty: '', low: '', mid: '', high: '', full: '' },
}

/** Ngưỡng theo kích thước thật trên màn hình (px), không theo % zoom, để kệ nhỏ không bị chữ đè. */
export const RACK_LABEL_MIN_SCREEN_WIDTH = 34
export const RACK_HEADER_MIN_SCREEN_WIDTH = 80
export const RACK_HEADER_MIN_SCREEN_HEIGHT = 30
const RACK_HEADER_ONE_LINE_SCREEN_HEIGHT = 18
export const RACK_HEADER_TWO_LINE_SCREEN_HEIGHT = 30
const RACK_HEADER_SECONDARY_MIN_SCREEN_WIDTH = 100
const RACK_HEADER_SECONDARY_MIN_SCREEN_HEIGHT_WITH_SLOTS = 90
const RACK_HEADER_SECONDARY_MIN_SCREEN_HEIGHT_WITHOUT_SLOTS = 36
export const SLOT_CELL_MIN_SCREEN_WIDTH = 14
export const SLOT_CELL_MIN_SCREEN_HEIGHT = 10
export const SLOT_VALUE_MIN_SCREEN_WIDTH = 26

const LOW_UTILIZATION_PERCENT = 50
const HIGH_UTILIZATION_PERCENT = 80
const FULL_UTILIZATION_PERCENT = 100
const LOW_STOCK_RATIO = 0.25
const MID_STOCK_RATIO = 0.6

export interface LayoutMetricLabel {
  readonly band: LayoutHeatBand | null
  readonly status: LayoutStatus
  readonly primary: string
  /** Bản ngắn dùng khi không đủ chỗ cho `primary` (ví dụ "Chưa cấu hình" trên kệ nhỏ). */
  readonly compact: string
  readonly secondary: string | null
}

type CapacityLocation = Parameters<typeof getCapacityUtilization>[0]

function getUtilizationBand(rawPercent: number): LayoutHeatBand {
  if (rawPercent <= 0) return 'empty'
  if (rawPercent < LOW_UTILIZATION_PERCENT) return 'low'
  if (rawPercent < HIGH_UTILIZATION_PERCENT) return 'mid'
  if (rawPercent < FULL_UTILIZATION_PERCENT) return 'high'
  return 'full'
}

function getStockBand(quantity: number, maximumQuantity: number): LayoutHeatBand {
  if (quantity <= 0 || maximumQuantity <= 0) return 'empty'
  const ratio = quantity / maximumQuantity
  if (ratio <= LOW_STOCK_RATIO) return 'low'
  return ratio <= MID_STOCK_RATIO ? 'mid' : 'high'
}

function formatCompactNumber(value: number) {
  const trim = (scaled: number) => scaled.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`
  if (value >= 1_000) return `${trim(value / 1_000)}K`
  return trim(value)
}

/** Kệ quản lý theo ô không có công suất riêng: cộng các ô cùng đơn vị, khác đơn vị thì bỏ qua vì không cộng được. */
function getRackCapacityLocation(
  rack: WarehouseLayoutRackSceneResponse,
  slots: readonly WarehouseLayoutSlotSceneResponse[]
): CapacityLocation | null {
  if (rack.storageMode !== 'SlotLevel') return rack
  const measured = slots.filter(
    (slot) => slot.isActive && slot.capacityUnitId && getCapacityUtilization(slot) !== null
  )
  const [first] = measured
  if (!first || measured.some((slot) => slot.capacityUnitId !== first.capacityUnitId)) return null
  return {
    capacityType: 'Quantity',
    capacityUnitId: first.capacityUnitId,
    capacityUnitSymbol: first.capacityUnitSymbol,
    capacityUnitName: first.capacityUnitName,
    capacityUsed: measured.reduce((sum, slot) => sum + (slot.capacityUsed ?? 0), 0),
    capacity: measured.reduce((sum, slot) => sum + (slot.capacity ?? 0), 0),
  }
}

const UNLIMITED_CAPACITY_LABEL: LayoutMetricLabel = {
  band: null,
  status: 'unlimited',
  primary: 'Không giới hạn',
  compact: '∞',
  secondary: null,
}

/** Kệ rỗng hoặc các ô khác đơn vị: vẫn cho kệ một nhãn để thấy mã kệ trên sơ đồ. */
const NO_CAPACITY_DATA_LABEL: LayoutMetricLabel = {
  band: null,
  status: 'nodata',
  primary: '—',
  compact: '—',
  secondary: null,
}

function getCapacityLabel(location: CapacityLocation | null): LayoutMetricLabel | null {
  if (!location) return null
  if (location.requiresCapacityConfiguration) {
    return {
      band: null,
      status: 'unconfigured',
      primary: 'Chưa cấu hình',
      compact: '!',
      secondary: null,
    }
  }
  if (location.capacityType === 'None') return UNLIMITED_CAPACITY_LABEL
  const utilization = getCapacityUtilization(location)
  if (!utilization) return null
  const unit = location.capacityUnitSymbol ?? location.capacityUnitName
  const percent = `${Math.round(utilization.rawPercent)}%`
  const band = getUtilizationBand(utilization.rawPercent)
  return {
    band,
    status: band === 'empty' ? 'empty' : 'measured',
    primary: percent,
    compact: percent,
    secondary: `${formatCompactNumber(utilization.used)}/${formatCompactNumber(utilization.maximum)}${unit ? ` ${unit}` : ''}`,
  }
}

function getStockLabel(
  location: { onHandQuantity?: number; skuCount?: number },
  maximumQuantity: number
): LayoutMetricLabel {
  const quantity = location.onHandQuantity ?? 0
  const skuCount = location.skuCount ?? 0
  const formatted = formatCompactNumber(quantity)
  const band = getStockBand(quantity, maximumQuantity)
  return {
    band,
    status: band === 'empty' ? 'empty' : 'measured',
    primary: formatted,
    compact: formatted,
    secondary: skuCount > 0 ? `${skuCount} mã hàng` : null,
  }
}

export function getRackMetricLabel(
  metric: LayoutMetric,
  rack: WarehouseLayoutRackSceneResponse,
  slots: readonly WarehouseLayoutSlotSceneResponse[],
  maximumRackStock: number
): LayoutMetricLabel | null {
  if (metric === 'off') return null
  if (metric === 'stock') return getStockLabel(rack, maximumRackStock)
  const label = getCapacityLabel(getRackCapacityLocation(rack, slots))
  if (label) return label
  // Kệ theo ô mà không ô nào có sức chứa: không có gì để cộng, nên coi là không giới hạn thay vì để trống.
  const hasOnlyUnlimitedSlots =
    rack.storageMode === 'SlotLevel' &&
    slots.length > 0 &&
    slots.every((slot) => slot.capacityType === 'None')
  return hasOnlyUnlimitedSlots ? UNLIMITED_CAPACITY_LABEL : NO_CAPACITY_DATA_LABEL
}

export function getSlotMetricLabel(
  metric: LayoutMetric,
  slot: WarehouseLayoutSlotSceneResponse,
  maximumSlotStock: number
): LayoutMetricLabel | null {
  if (metric === 'off') return null
  if (metric === 'stock') return getStockLabel(slot, maximumSlotStock)
  return getCapacityLabel(slot)
}

export function getMaximumStock(locations: readonly { readonly onHandQuantity?: number }[]) {
  return locations.reduce((maximum, location) => Math.max(maximum, location.onHandQuantity ?? 0), 0)
}

/** Kệ có khớp bộ lọc "Làm nổi" không; kệ không có nhãn (số liệu đang tắt) không bao giờ bị làm mờ. */
export function matchesLayoutHighlight(
  label: LayoutMetricLabel | null,
  highlight: LayoutHighlight
): boolean {
  if (highlight === 'all' || !label) return true
  if (highlight === 'near') return label.band === 'high' || label.band === 'full'
  if (highlight === 'empty') return label.status === 'empty'
  return label.status === 'unconfigured'
}

/** Chiều cao dải tiêu đề tính bằng px trên màn hình: giữ cố định theo zoom để chữ luôn đọc được. */
export function getRackHeaderScreenHeight(
  screenWidth: number,
  screenHeight: number,
  hasSecondaryLine: boolean,
  hasSlotGrid: boolean
) {
  // Kệ không có ô không cần chừa chỗ cho lưới nên dòng phụ hiện được ở kệ thấp hơn.
  const minimumHeight = hasSlotGrid
    ? RACK_HEADER_SECONDARY_MIN_SCREEN_HEIGHT_WITH_SLOTS
    : RACK_HEADER_SECONDARY_MIN_SCREEN_HEIGHT_WITHOUT_SLOTS
  const hasRoomForSecondary =
    screenWidth >= RACK_HEADER_SECONDARY_MIN_SCREEN_WIDTH && screenHeight >= minimumHeight
  return hasSecondaryLine && hasRoomForSecondary
    ? RACK_HEADER_TWO_LINE_SCREEN_HEIGHT
    : RACK_HEADER_ONE_LINE_SCREEN_HEIGHT
}

/** Kệ xoay không vẽ tiêu đề (chữ sẽ nghiêng hoặc ngược), chỉ hiện số ở giữa. */
export function getRackLabelMode(
  screenWidth: number,
  screenHeight: number,
  rotation: number
): RackLabelMode {
  if (screenWidth < RACK_LABEL_MIN_SCREEN_WIDTH) return 'none'
  const canShowHeader =
    rotation === 0 &&
    screenWidth >= RACK_HEADER_MIN_SCREEN_WIDTH &&
    screenHeight >= RACK_HEADER_MIN_SCREEN_HEIGHT
  return canShowHeader ? 'header' : 'center'
}
