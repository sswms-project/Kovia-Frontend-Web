'use client'

import { useCallback, useState } from 'react'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutGeometry,
  WarehouseLayoutSelection,
} from '../types/warehouse-layout-scene.types'
import { getLayoutPlacementError, getUnplacedLayoutObject } from '../utils/layout-placement'
import type { LayoutEditorHistoryAction } from './use-layout-editor-history'

interface UseLayoutDesignerPlacementOptions {
  readonly scene: WarehouseLayoutEditorScene
  readonly dispatch: (action: LayoutEditorHistoryAction) => void
  readonly canMutate: () => boolean
}

export function useLayoutDesignerPlacement({
  scene,
  dispatch,
  canMutate,
}: UseLayoutDesignerPlacementOptions) {
  const [placementTarget, setPlacementTarget] = useState<WarehouseLayoutSelection | null>(null)
  const pendingObject = placementTarget ? getUnplacedLayoutObject(scene, placementTarget) : null
  if (placementTarget && !pendingObject) setPlacementTarget(null)

  const closePlacement = useCallback(() => setPlacementTarget(null), [])

  function requestPlacement(target: WarehouseLayoutSelection) {
    if (canMutate()) setPlacementTarget(target)
  }

  function placePending(
    target: WarehouseLayoutSelection,
    geometry: WarehouseLayoutGeometry
  ): string | null {
    if (!canMutate()) return 'Chưa thể bố trí trong lúc thao tác khác đang xử lý.'
    const error = getLayoutPlacementError(scene, target, geometry)
    if (error) return error
    dispatch({ type: 'place-pending', selection: target, geometry })
    setPlacementTarget(null)
    return null
  }

  return { placementTarget, pendingObject, closePlacement, requestPlacement, placePending }
}
