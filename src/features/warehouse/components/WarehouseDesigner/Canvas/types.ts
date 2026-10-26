import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Ref, ReactNode } from 'react'
import type { useRackCanvasGestures } from '../../../hooks/use-rack-canvas-gestures'
import type {
  LayoutHighlight,
  LayoutMetric,
  LayoutMetricLabel,
} from '../../../utils/layout-rack-metrics'
import type { RackEditingControls } from '../../../types/rack-editing.types'
import type { LayoutPaletteDragData } from '../../../types/warehouse-layout-palette.types'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutGeometry,
  WarehouseLayoutGeometryTarget,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'

export interface WarehouseCanvasProps {
  readonly rackEditing?: RackEditingControls
  readonly rackTools?: ReactNode
  readonly ref?: Ref<WarehouseCanvasHandle>
  readonly scene: WarehouseLayoutEditorScene
  readonly selection: WarehouseLayoutSelection | null
  readonly canConfigure: boolean
  readonly mode?: CanvasMode
  /** Chỉ số vẽ trực tiếp lên kệ và ô; chỉ có tác dụng ở chế độ xem. */
  readonly metric?: LayoutMetric
  /** Làm mờ kệ không khớp bộ lọc; chỉ có tác dụng ở chế độ xem. */
  readonly highlight?: LayoutHighlight
  readonly isGridVisible: boolean
  readonly onSelect: (selection: WarehouseLayoutSelection | null) => void
  readonly onGeometryChange: (
    target: WarehouseLayoutGeometryTarget,
    id: string,
    geometry: WarehouseLayoutGeometry
  ) => void
  readonly onZoomChange: (zoomPercent: number) => void
  readonly onPaletteDrop: (payload: LayoutPaletteDragData, x: number, y: number) => void
}

export interface WarehouseCanvasHandle {
  cancelGesture: () => boolean
  nudgeRacks: (ids: readonly string[], delta: { x: number; y: number }, repeat?: boolean) => void
  finishNudge: () => void
  fitRacks: (ids: readonly string[]) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomTo: (zoomPercent: number) => void
  fit: () => void
  revealSelection: (selection: WarehouseLayoutSelection) => void
}

export type CanvasMode = 'designer' | 'viewer'

export type CanvasZone = WarehouseLayoutEditorScene['zones'][number]
export type CanvasRack = WarehouseLayoutEditorScene['racks'][number]
export type CanvasDecoration = WarehouseLayoutEditorScene['decorations'][number]
export type RackCanvasGestures = ReturnType<typeof useRackCanvasGestures>

export type ShowHoverInfo = (
  event: KonvaEventObject<MouseEvent>,
  code: string,
  name: string
) => void
export type HideHoverInfo = () => void

export type SetObjectNode = (key: string, node: Konva.Node | null) => void
export type CommitNodeGeometry = (
  target: WarehouseLayoutGeometryTarget,
  id: string,
  node: Konva.Node,
  zIndex: number
) => void

/** Dữ liệu dẫn xuất từ scene dùng chung cho các lớp vẽ; tính một lần mỗi khi scene hoặc chế độ đo đổi. */
export interface CanvasSceneData {
  readonly activeZoneIds: ReadonlySet<string>
  readonly sortedZones: readonly CanvasZone[]
  readonly sortedRacks: readonly CanvasRack[]
  readonly sortedDecorations: readonly CanvasDecoration[]
  readonly slotsByRack: ReadonlyMap<string, WarehouseLayoutEditorScene['slots']>
  readonly maximumSlotStock: number
  readonly rackMetricLabels: ReadonlyMap<string, LayoutMetricLabel | null>
  readonly activeMetric: LayoutMetric
  readonly activeHighlight: LayoutHighlight
}
