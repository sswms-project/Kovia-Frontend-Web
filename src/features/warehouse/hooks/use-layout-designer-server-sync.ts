'use client'

import { useEffect, useRef, type RefObject } from 'react'
import type { WarehouseCanvasHandle } from '../components/WarehouseDesigner/Canvas'
import type { WarehouseLayoutEditorScene } from '../types/warehouse-layout-scene.types'
import type { WarehouseLayoutCreatedPlacement } from '../types/warehouse-layout-workspace.types'
import { constrainLayoutGeometryToCanvas } from '../utils/layout-grid'
import type { LayoutEditorHistoryAction } from './use-layout-editor-history'

interface UseLayoutDesignerServerSyncOptions {
  readonly scene: WarehouseLayoutEditorScene
  readonly initialScene: WarehouseLayoutEditorScene
  readonly sceneVersion: number
  readonly resetRevision: number
  readonly isDirty: boolean
  readonly placementToApply: WarehouseLayoutCreatedPlacement | null
  readonly canvasRef: RefObject<WarehouseCanvasHandle | null>
  readonly dispatch: (action: LayoutEditorHistoryAction) => void
  readonly resetSelection: () => void
  readonly closePlacement: () => void
  readonly onPlacementApplied: () => void
}

export function useLayoutDesignerServerSync({
  scene,
  initialScene,
  sceneVersion,
  resetRevision,
  isDirty,
  placementToApply,
  canvasRef,
  dispatch,
  resetSelection,
  closePlacement,
  onPlacementApplied,
}: UseLayoutDesignerServerSyncOptions) {
  const initialSceneRef = useRef(initialScene)
  const resetRevisionRef = useRef(resetRevision)
  const baseVersionRef = useRef(sceneVersion)

  useEffect(() => {
    const resetRequested = resetRevisionRef.current !== resetRevision
    const serverSceneChanged = initialSceneRef.current !== initialScene
    if (!resetRequested && !serverSceneChanged) return

    initialSceneRef.current = initialScene
    resetRevisionRef.current = resetRevision
    canvasRef.current?.cancelGesture()
    if (resetRequested || !isDirty) {
      baseVersionRef.current = sceneVersion
      dispatch({ type: 'reset', scene: initialScene })
      resetSelection()
      closePlacement()
      return
    }

    dispatch({ type: 'reconcile-server-scene', scene: initialScene })
  }, [
    canvasRef,
    closePlacement,
    dispatch,
    initialScene,
    isDirty,
    resetRevision,
    resetSelection,
    sceneVersion,
  ])

  useEffect(() => {
    if (!placementToApply) return
    const entity =
      placementToApply.kind === 'zone'
        ? scene.zones.find((zone) => zone.id === placementToApply.entityId)
        : scene.racks.find((rack) => rack.id === placementToApply.entityId)
    if (!entity) return
    dispatch({
      type: 'update-geometry',
      target: placementToApply.kind,
      id: placementToApply.entityId,
      geometry: constrainLayoutGeometryToCanvas(
        {
          ...entity,
          x: placementToApply.x,
          y: placementToApply.y,
          width: placementToApply.width ?? entity.width,
          height: placementToApply.height ?? entity.height,
        },
        scene.canvas
      ),
      ...(placementToApply.kind === 'rack'
        ? { rackShape: placementToApply.layoutShape ?? 'Standard' }
        : {}),
    })
    onPlacementApplied()
  }, [dispatch, onPlacementApplied, placementToApply, scene.canvas, scene.racks, scene.zones])

  return { baseVersionRef }
}
