'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import {
  LAYOUT_HEAT_BAND_LABELS,
  LAYOUT_METRIC_LABELS,
  type LayoutHeatBand,
  type LayoutHighlight,
  type LayoutMetric,
} from '../../../utils/layout-rack-metrics'

const METRICS: readonly LayoutMetric[] = ['capacity', 'stock', 'off']

const HIGHLIGHT_LABELS: Record<LayoutHighlight, string> = {
  all: 'Tất cả',
  near: 'Gần đầy',
  empty: 'Trống',
  todo: 'Cần cấu hình',
}
const HIGHLIGHTS: readonly LayoutHighlight[] = ['all', 'near', 'empty', 'todo']

const HEAT_SWATCH_CLASSES: Record<LayoutHeatBand, string> = {
  empty: 'bg-card',
  low: 'bg-canvas-heat-low',
  mid: 'bg-canvas-heat-mid',
  high: 'bg-canvas-heat-high',
  full: 'bg-destructive',
}

/** Tồn thực tế chia theo tỉ lệ với kệ đông nhất nên không có mức "đầy". */
const HEAT_BANDS_BY_METRIC: Record<LayoutMetric, readonly LayoutHeatBand[]> = {
  capacity: ['empty', 'low', 'mid', 'high', 'full'],
  stock: ['empty', 'low', 'mid', 'high'],
  off: [],
}

function isLayoutMetric(value: string): value is LayoutMetric {
  return METRICS.some((metric) => metric === value)
}

export function LayoutMetricToggle({
  value,
  onChange,
  className,
}: {
  readonly value: LayoutMetric
  readonly onChange: (metric: LayoutMetric) => void
  readonly className?: string
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Số liệu hiển thị trên sơ đồ"
      className={className}
      onValueChange={(next) => {
        if (isLayoutMetric(next)) onChange(next)
      }}
    >
      {METRICS.map((metric) => (
        <ToggleGroupItem key={metric} value={metric}>
          {LAYOUT_METRIC_LABELS[metric]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function isLayoutHighlight(value: string): value is LayoutHighlight {
  return HIGHLIGHTS.some((highlight) => highlight === value)
}

/** Làm mờ các kệ không khớp để thấy ngay kệ nào cần xử lý. */
export function LayoutHighlightFilter({
  value,
  onChange,
}: {
  readonly value: LayoutHighlight
  readonly onChange: (highlight: LayoutHighlight) => void
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Làm nổi kệ cần chú ý"
      onValueChange={(next) => {
        if (isLayoutHighlight(next)) onChange(next)
      }}
    >
      {HIGHLIGHTS.map((highlight) => (
        <ToggleGroupItem key={highlight} value={highlight}>
          {HIGHLIGHT_LABELS[highlight]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function LayoutMetricLegend({ metric }: { readonly metric: LayoutMetric }) {
  const bands = HEAT_BANDS_BY_METRIC[metric]
  if (bands.length === 0) return null
  return (
    <ul
      aria-label={`Chú giải ${LAYOUT_METRIC_LABELS[metric].toLowerCase()}`}
      className="flex gap-3"
    >
      {bands.map((band) => (
        <li key={band} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn('size-3.5 rounded-sm border', HEAT_SWATCH_CLASSES[band])}
          />
          {LAYOUT_HEAT_BAND_LABELS[metric][band]}
        </li>
      ))}
    </ul>
  )
}
