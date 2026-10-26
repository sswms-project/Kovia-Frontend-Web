'use client'

import { useCallback, useEffect, useState, type RefObject } from 'react'
import { toast } from 'sonner'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../types/warehouse-layout-scene.types'
import type { LayoutDesignerRackSelection } from '../types/warehouse-layout-workspace.types'
import { eligibleLayoutRacks, rackReferenceId } from '../utils/layout-rack-operations'

interface UseLayoutDesignerSelectionOptions {
  readonly scene: WarehouseLayoutEditorScene
  readonly canConfigure: boolean
  readonly editLocked: boolean
  readonly gestureActiveRef: RefObject<boolean>
}

export function useLayoutDesignerSelection({
  scene,
  canConfigure,
  editLocked,
  gestureActiveRef,
}: UseLayoutDesignerSelectionOptions) {
  const [selection, setSelection] = useState<WarehouseLayoutSelection | null>(null)
  const [rackSelection, setRackSelection] = useState<LayoutDesignerRackSelection>({
    ids: [],
    referenceId: null,
  })
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)

  const editableIds = new Set(canConfigure ? eligibleLayoutRacks(scene).map((rack) => rack.id) : [])
  const groupIds = rackSelection.ids.filter((id) => editableIds.has(id))
  if (groupIds.length !== rackSelection.ids.length) {
    setRackSelection({
      ids: groupIds,
      referenceId: rackReferenceId(scene, groupIds),
      notice: (rackSelection.notice ?? 0) + 1,
    })
  }
  useEffect(() => {
    if (rackSelection.notice)
      toast.info('Tập chọn đã được cập nhật vì có kệ không còn được phép chỉnh sửa.')
  }, [rackSelection.notice])

  const resetSelection = useCallback(() => {
    setSelection(null)
    setRackSelection({ ids: [], referenceId: null })
    setIsInspectorOpen(false)
  }, [])

  function handleSelectionChange(nextSelection: WarehouseLayoutSelection | null) {
    if (gestureActiveRef.current) return
    setRackSelection({ ids: [], referenceId: null })
    setSelection(nextSelection)
    setIsInspectorOpen(false)
  }

  function handleRackSelection(ids: readonly string[], referenceId: string | null) {
    if (editLocked || gestureActiveRef.current) return
    setSelection(null)
    setIsInspectorOpen(false)
    setRackSelection({ ids, referenceId })
  }

  function getSelectedZoneId() {
    if (selection?.kind === 'zone') {
      return scene.zones.find((zone) => zone.id === selection.id && zone.status === 'Active')?.id
    }
    if (selection?.kind === 'rack') {
      const rack = scene.racks.find((candidate) => candidate.id === selection.id)
      return rack?.status === 'Active' &&
        scene.zones.some((zone) => zone.id === rack.zoneId && zone.status === 'Active')
        ? rack.zoneId
        : null
    }
    return null
  }

  function getSelectedObjectColor() {
    if (!selection || selection.kind === 'slot') return null
    if (selection.kind === 'zone') {
      return scene.zones.find((zone) => zone.id === selection.id)?.color ?? null
    }
    if (selection.kind === 'rack') {
      return scene.racks.find((rack) => rack.id === selection.id)?.color ?? null
    }
    return (
      scene.decorations.find((decoration) => decoration.clientKey === selection.id)?.color ?? null
    )
  }

  return {
    selection,
    setSelection,
    rackSelection,
    isInspectorOpen,
    setIsInspectorOpen,
    editableIds,
    groupIds,
    resetSelection,
    handleSelectionChange,
    handleRackSelection,
    getSelectedZoneId,
    getSelectedObjectColor,
  }
}
