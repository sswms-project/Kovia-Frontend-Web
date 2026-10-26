import type Konva from 'konva'
import { useCallback, useEffect, useRef } from 'react'
import type { RackEditingControls } from '../types/rack-editing.types'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../types/warehouse-layout-scene.types'

interface CanvasTransformerOptions {
  readonly scene: WarehouseLayoutEditorScene
  readonly selection: WarehouseLayoutSelection | null
  readonly canConfigure: boolean
  readonly rackEditing?: RackEditingControls
  readonly activeZoneIds: ReadonlySet<string>
}

/** Giữ bản đồ node Konva theo khoá đối tượng và gắn Transformer vào đối tượng đang chọn nếu được phép biến đổi. */
export function useCanvasTransformer({
  scene,
  selection,
  canConfigure,
  rackEditing,
  activeZoneIds,
}: CanvasTransformerOptions) {
  const transformerRef = useRef<Konva.Transformer>(null)
  const objectNodes = useRef(new Map<string, Konva.Node>())

  const canTransformSelection = (() => {
    if (!canConfigure || !selection || rackEditing?.ids.length || rackEditing?.locked) return false
    if (selection.kind === 'decoration') return true
    if (selection.kind === 'zone') {
      return scene.zones.some((zone) => zone.id === selection.id && zone.status === 'Active')
    }
    if (selection.kind === 'rack') {
      return scene.racks.some(
        (rack) =>
          rack.id === selection.id && rack.status === 'Active' && activeZoneIds.has(rack.zoneId)
      )
    }
    return false
  })()
  const selectionKey = selection ? `${selection.kind}:${selection.id}` : null
  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return
    const selectedNode = selectionKey ? objectNodes.current.get(selectionKey) : undefined
    transformer.nodes(selectedNode && canTransformSelection ? [selectedNode] : [])
    transformer.getLayer()?.batchDraw()
  }, [canTransformSelection, selectionKey])

  const setObjectNode = useCallback((key: string, node: Konva.Node | null) => {
    if (node) objectNodes.current.set(key, node)
    else objectNodes.current.delete(key)
  }, [])

  return { transformerRef, objectNodes, setObjectNode }
}
