'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useAuthStore } from '@/stores/auth.store'
import { WarehouseDesignerWorkspace } from '../components/WarehouseDesigner'
import {
  WarehouseDesignerLoadError,
  WarehouseLocationFormSheets,
} from '../components/WarehouseDesignerPage'
import { WarehouseDesignerSkeleton } from '../components/WarehouseLayoutDirectoryPage'
import { useLayoutCloseTransition } from '../hooks/use-layout-close-transition'
import { useLayoutLocationEditor } from '../hooks/use-layout-location-editor'
import { useLayoutSceneActions } from '../hooks/use-layout-scene-actions'
import { useWarehouseQuery } from '../hooks/use-warehouse'
import { useWarehouseLayoutSceneQuery } from '../hooks/use-warehouse-layout-scene'
import type { WarehouseDesignerSummary } from '../types/warehouse-layout-designer-page.types'
import { mapWarehouseLayoutScene } from '../utils/layout-scene-mapper'
import { getWarehouseCapabilities } from '../utils/warehouse-capabilities'
import { WarehouseLayoutViewerPage } from './WarehouseLayoutViewerPage'

interface WarehouseDesignerPageProps {
  readonly warehouseId: string
  /** Already known by the caller; skips the GET /warehouses/{id} request. */
  readonly warehouseSummary?: WarehouseDesignerSummary
  readonly viewOnly?: boolean
  readonly onClose?: () => void
  readonly onEdit?: () => void
  readonly onShowViewer?: () => void
}

export function WarehouseDesignerPage({
  warehouseId,
  warehouseSummary,
  viewOnly = false,
  onClose,
  onEdit,
  onShowViewer,
}: WarehouseDesignerPageProps) {
  const searchParams = useSearchParams()
  const role = useAuthStore((state) => state.user?.role ?? null)
  const meQuery = useMeQuery()
  const capabilities = getWarehouseCapabilities(role, meQuery.data?.permissions)
  const warehouseQuery = useWarehouseQuery(warehouseId, !warehouseSummary)
  const warehouse = warehouseSummary ?? warehouseQuery.data
  const sceneQuery = useWarehouseLayoutSceneQuery(warehouseId)
  const sceneActions = useLayoutSceneActions({
    warehouseId,
    refetchScene: sceneQuery.refetch,
    onShowViewer,
  })
  const locationEditor = useLayoutLocationEditor({ warehouseId, refetchScene: sceneQuery.refetch })
  const { isClosing, closeLayout } = useLayoutCloseTransition(onClose)
  const mappedScene = useMemo(
    () => (sceneQuery.data ? mapWarehouseLayoutScene(sceneQuery.data) : null),
    [sceneQuery.data]
  )

  if (warehouseQuery.isLoading || sceneQuery.isLoading || meQuery.isLoading) {
    return <WarehouseDesignerSkeleton />
  }

  if (
    warehouseQuery.isError ||
    (sceneQuery.isError &&
      (!sceneQuery.data ||
        sceneQuery.error.statusCode === 401 ||
        sceneQuery.error.statusCode === 403)) ||
    meQuery.isError ||
    !warehouse ||
    !sceneQuery.data ||
    !mappedScene ||
    !meQuery.data
  ) {
    return (
      <WarehouseDesignerLoadError
        onRetry={() =>
          void Promise.all([
            warehouseSummary ? undefined : warehouseQuery.refetch(),
            sceneQuery.refetch(),
          ])
        }
      />
    )
  }

  const { editorScene, hasGeneratedGeometry } = mappedScene
  const hasConfigurePermission =
    capabilities.canConfigureLayout &&
    meQuery.data.permissions.includes(P.WAREHOUSES_CONFIGURE_LAYOUT) &&
    warehouse.status === 'Active'
  const isViewMode = viewOnly || searchParams.get('mode') === 'view'
  const canConfigure = !isViewMode && hasConfigurePermission

  if (isViewMode) {
    return (
      <WarehouseLayoutViewerPage
        warehouseId={warehouseId}
        warehouseName={warehouse.warehouseName}
        scene={editorScene}
        canConfigure={hasConfigurePermission}
        isClosing={isClosing}
        onClose={closeLayout}
        onEdit={onEdit}
      />
    )
  }

  return (
    <>
      <WarehouseDesignerWorkspace
        warehouseId={warehouseId}
        warehouseName={warehouse.warehouseName}
        sceneVersion={sceneQuery.data.version}
        resetRevision={sceneActions.resetRevision}
        initialScene={editorScene}
        hasGeneratedGeometry={hasGeneratedGeometry}
        canConfigure={canConfigure}
        isSaving={sceneActions.isSaving}
        isUpdatingRack={locationEditor.isUpdatingRack}
        isDeactivatingZone={sceneActions.isDeactivatingZone}
        isDeactivatingRack={sceneActions.isDeactivatingRack}
        saveError={sceneActions.saveError}
        hasConflict={sceneActions.hasConflict}
        placementToApply={locationEditor.placementToApply}
        onPlacementApplied={locationEditor.onPlacementApplied}
        onCreateZone={locationEditor.openCreateZone}
        onCreateRack={locationEditor.openCreateRack}
        onOpenLocationDetails={(selection) =>
          locationEditor.openLocationDetails(editorScene, selection)
        }
        onUpdateRackName={locationEditor.updateRackName}
        onDeactivateZone={sceneActions.deactivateZone}
        onDeactivateRack={sceneActions.deactivateRack}
        onSave={(scene, baseVersion) => void sceneActions.saveScene(scene, baseVersion)}
        onReload={() => void sceneActions.reloadScene()}
        isClosing={isClosing}
        onClose={closeLayout}
      />
      <WarehouseLocationFormSheets editor={locationEditor.sheetState} scene={editorScene} />
    </>
  )
}
