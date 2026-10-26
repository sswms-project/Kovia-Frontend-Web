import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { APP_ROUTES } from '@/routes/app-routes'
import type { SceneRefetch } from '../types/warehouse-layout-designer-page.types'
import type {
  WarehouseLayoutEditorRack,
  WarehouseLayoutEditorScene,
  WarehouseLayoutEditorZone,
} from '../types/warehouse-layout-scene.types'
import { mapEditorSceneToSaveRequest } from '../utils/layout-scene-mapper'
import { useDeactivateRackMutation, useDeactivateZoneMutation } from './use-warehouse'
import { useSaveWarehouseLayoutSceneMutation } from './use-warehouse-layout-scene'

interface UseLayoutSceneActionsOptions {
  readonly warehouseId: string
  readonly refetchScene: SceneRefetch
  readonly onShowViewer?: () => void
}

export function useLayoutSceneActions({
  warehouseId,
  refetchScene,
  onShowViewer,
}: UseLayoutSceneActionsOptions) {
  const router = useRouter()
  const saveMutation = useSaveWarehouseLayoutSceneMutation()
  const deactivateZoneMutation = useDeactivateZoneMutation()
  const deactivateRackMutation = useDeactivateRackMutation()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasConflict, setHasConflict] = useState(false)
  const [resetRevision, setResetRevision] = useState(0)

  async function saveScene(scene: WarehouseLayoutEditorScene, baseVersion: number) {
    setSaveError(null)
    setHasConflict(false)
    try {
      await saveMutation.mutateAsync({
        warehouseId,
        request: mapEditorSceneToSaveRequest(warehouseId, baseVersion, scene),
      })
      toast.success('Đã lưu bố cục kho.')
      if (onShowViewer) onShowViewer()
      else router.replace(APP_ROUTES.warehouseLayoutViewer(warehouseId) as Route)
    } catch (error) {
      const statusCode =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? error.statusCode
          : null
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Không thể lưu bố cục kho. Vui lòng thử lại.'
      setHasConflict(statusCode === 409)
      setSaveError(
        statusCode === 409
          ? 'Phiên bản trên máy chủ mới hơn bản bạn đang chỉnh sửa. Tải bản mới trước khi tiếp tục.'
          : message
      )
    }
  }

  async function reloadScene() {
    setSaveError(null)
    setHasConflict(false)
    const result = await refetchScene()
    if (result.data) setResetRevision((revision) => revision + 1)
  }

  async function deactivateRack(rack: WarehouseLayoutEditorRack) {
    await deactivateRackMutation.mutateAsync({
      warehouseId,
      zoneId: rack.zoneId,
      rackId: rack.id,
      request: {
        reason: 'Gỡ kệ trống khỏi sơ đồ kho',
        expectedRowVersion: rack.rowVersion ?? '',
        cascadeToChildren: true,
      },
    })
  }

  async function deactivateZone(zone: WarehouseLayoutEditorZone) {
    await deactivateZoneMutation.mutateAsync({
      warehouseId,
      zoneId: zone.id,
      request: {
        reason: 'Gỡ khu vực trống khỏi sơ đồ kho',
        expectedRowVersion: zone.rowVersion ?? '',
        cascadeToChildren: true,
      },
    })
  }

  return {
    saveError,
    hasConflict,
    resetRevision,
    isSaving: saveMutation.isPending,
    isDeactivatingZone: deactivateZoneMutation.isPending,
    isDeactivatingRack: deactivateRackMutation.isPending,
    saveScene,
    reloadScene,
    deactivateRack,
    deactivateZone,
  }
}
