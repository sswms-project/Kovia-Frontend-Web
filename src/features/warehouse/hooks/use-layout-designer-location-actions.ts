'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import type {
  WarehouseLayoutEditorRack,
  WarehouseLayoutEditorScene,
  WarehouseLayoutEditorZone,
  WarehouseLayoutSelection,
} from '../types/warehouse-layout-scene.types'
import { activeZoneContainsRack } from '../utils/layout-designer-selection'
import { getActionError } from '../utils/layout-designer-interaction'

interface UseLayoutDesignerLocationActionsOptions {
  readonly scene: WarehouseLayoutEditorScene
  readonly selection: WarehouseLayoutSelection | null
  readonly setSelection: (selection: WarehouseLayoutSelection | null) => void
  readonly setIsInspectorOpen: (isOpen: boolean) => void
  readonly canMutate: () => boolean
  readonly onUpdateRackName: (rack: WarehouseLayoutEditorRack, rackName: string) => Promise<void>
  readonly onDeactivateZone: (zone: WarehouseLayoutEditorZone) => Promise<void>
  readonly onDeactivateRack: (rack: WarehouseLayoutEditorRack) => Promise<void>
}

export function useLayoutDesignerLocationActions({
  scene,
  selection,
  setSelection,
  setIsInspectorOpen,
  canMutate,
  onUpdateRackName,
  onDeactivateZone,
  onDeactivateRack,
}: UseLayoutDesignerLocationActionsOptions) {
  const [zoneDeactivateTarget, setZoneDeactivateTarget] =
    useState<WarehouseLayoutEditorZone | null>(null)
  const [rackDeactivateTarget, setRackDeactivateTarget] =
    useState<WarehouseLayoutEditorRack | null>(null)
  const [locationDeactivateError, setLocationDeactivateError] = useState<string | null>(null)

  function getSelectedActiveRack() {
    if (selection?.kind !== 'rack' || !canMutate()) return null
    const rack = scene.racks.find((candidate) => candidate.id === selection.id)
    return rack?.status === 'Active' && activeZoneContainsRack(scene, rack) ? rack : null
  }

  function getSelectedActiveZone() {
    if (selection?.kind !== 'zone' || !canMutate()) return null
    return scene.zones.find((zone) => zone.id === selection.id && zone.status === 'Active') ?? null
  }

  function requestDeactivateSelectedZone() {
    const zone = getSelectedActiveZone()
    if (!zone) return
    setLocationDeactivateError(null)
    setZoneDeactivateTarget(zone)
  }

  function requestDeactivateSelectedRack() {
    const rack = getSelectedActiveRack()
    if (!rack) return
    setLocationDeactivateError(null)
    setRackDeactivateTarget(rack)
  }

  function cancelZoneDeactivate() {
    setZoneDeactivateTarget(null)
    setLocationDeactivateError(null)
  }

  function cancelRackDeactivate() {
    setRackDeactivateTarget(null)
    setLocationDeactivateError(null)
  }

  async function updateSelectedRackName(rackName: string) {
    const rack = getSelectedActiveRack()
    if (!rack) return false
    try {
      await onUpdateRackName(rack, rackName.trim())
      toast.success('Đã cập nhật tên kệ hàng.')
      return true
    } catch (error) {
      logger.error(error)
      toast.error(getActionError(error, 'Không thể cập nhật tên kệ. Vui lòng thử lại.'))
      return false
    }
  }

  async function confirmDeactivateRack() {
    if (!rackDeactivateTarget || !canMutate()) return
    try {
      await onDeactivateRack(rackDeactivateTarget)
      toast.success('Đã ngừng hoạt động kệ hàng và gỡ khỏi sơ đồ.')
      setRackDeactivateTarget(null)
      setLocationDeactivateError(null)
      setSelection(null)
      setIsInspectorOpen(false)
    } catch (error) {
      logger.error(error)
      setLocationDeactivateError(
        getActionError(error, 'Không thể ngừng hoạt động kệ. Vui lòng thử lại.')
      )
    }
  }

  async function confirmDeactivateZone() {
    if (!zoneDeactivateTarget || !canMutate()) return
    try {
      await onDeactivateZone(zoneDeactivateTarget)
      toast.success('Đã ngừng hoạt động khu vực và gỡ khỏi sơ đồ.')
      setZoneDeactivateTarget(null)
      setLocationDeactivateError(null)
      setSelection(null)
      setIsInspectorOpen(false)
    } catch (error) {
      logger.error(error)
      setLocationDeactivateError(
        getActionError(error, 'Không thể ngừng hoạt động khu vực. Vui lòng thử lại.')
      )
    }
  }

  return {
    zoneDeactivateTarget,
    rackDeactivateTarget,
    locationDeactivateError,
    requestDeactivateSelectedZone,
    requestDeactivateSelectedRack,
    cancelZoneDeactivate,
    cancelRackDeactivate,
    updateSelectedRackName,
    confirmDeactivateRack,
    confirmDeactivateZone,
  }
}
