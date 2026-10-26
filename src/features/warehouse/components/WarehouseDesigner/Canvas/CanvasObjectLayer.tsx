import { Layer } from 'react-konva'
import type { RackEditingControls } from '../../../types/rack-editing.types'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../../types/warehouse-layout-scene.types'
import { CanvasBusinessObject } from './CanvasBusinessObject'
import type { CanvasPalette } from './canvas-palette'
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

interface CanvasObjectLayerProps {
  readonly target: 'zone' | 'rack'
  readonly objects: readonly (CanvasZone | CanvasRack)[]
  readonly scene: WarehouseLayoutEditorScene
  readonly data: CanvasSceneData
  readonly selection: WarehouseLayoutSelection | null
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

/** Một lớp Konva chứa toàn bộ khu vực hoặc toàn bộ kệ, đã sắp theo zIndex. */
export function CanvasObjectLayer({ objects, ...objectProps }: CanvasObjectLayerProps) {
  const { scene, selection, rackEditing } = objectProps
  const selectedRackId =
    selection?.kind === 'rack'
      ? selection.id
      : selection?.kind === 'slot'
        ? scene.slots.find((slot) => slot.id === selection.id)?.rackId
        : rackEditing?.referenceId
  const selectedZoneId =
    selection?.kind === 'zone'
      ? selection.id
      : scene.racks.find((rack) => rack.id === selectedRackId)?.zoneId

  return (
    <Layer>
      {objects.map((object) => (
        <CanvasBusinessObject
          key={`${objectProps.target}:${object.id}`}
          object={object}
          selectedZoneId={selectedZoneId}
          {...objectProps}
        />
      ))}
    </Layer>
  )
}
