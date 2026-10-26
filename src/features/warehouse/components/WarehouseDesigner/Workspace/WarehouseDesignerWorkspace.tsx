'use client'

import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useLayoutDesignerCloseConfirm } from '../../../hooks/use-layout-designer-close-confirm'
import { useLayoutDesignerCompact } from '../../../hooks/use-layout-designer-compact'
import { useLayoutDesignerDirtyGuard } from '../../../hooks/use-layout-designer-dirty-guard'
import { useLayoutDesignerEditGate } from '../../../hooks/use-layout-designer-edit-gate'
import { useLayoutDesignerKeyboardShortcuts } from '../../../hooks/use-layout-designer-keyboard-shortcuts'
import { useLayoutDesignerLocationActions } from '../../../hooks/use-layout-designer-location-actions'
import { useLayoutDesignerObjectActions } from '../../../hooks/use-layout-designer-object-actions'
import { useLayoutDesignerPlacement } from '../../../hooks/use-layout-designer-placement'
import { useLayoutDesignerSelection } from '../../../hooks/use-layout-designer-selection'
import { useLayoutDesignerServerSync } from '../../../hooks/use-layout-designer-server-sync'
import { useLayoutEditorHistory } from '../../../hooks/use-layout-editor-history'
import type { WarehouseLayoutSelection } from '../../../types/warehouse-layout-scene.types'
import {
  isSelectionEditable,
  selectionHasInventory,
} from '../../../utils/layout-designer-selection'
import { getRackPresetSize } from '../../../utils/layout-grid'
import { getLayoutLocationLabel, getUnplacedLayoutObject } from '../../../utils/layout-placement'
import { arrangeLayoutRacks, canResizeLayoutCanvas } from '../../../utils/layout-rack-operations'
import { WarehouseLayoutPlacementNotice } from '../WarehouseLayoutPlacementNotice'
import { WarehousePendingPlacementDialog } from '../WarehousePendingPlacementDialog'
import { DesignerInspector } from '../Inspector'
import {
  DesignerContextToolbar,
  DesignerFooter,
  DesignerRackTools,
  DesignerToolbar,
} from '../Toolbar'
import { DesignerToolbox } from '../Toolbox'
import type { WarehouseCanvasHandle } from '../Canvas'
import type { WarehouseDesignerWorkspaceProps } from './types'
import { WorkspaceAlerts } from './WorkspaceAlerts'
import { WorkspaceBody } from './WorkspaceBody'
import { WorkspaceCloseConfirmDialog } from './WorkspaceCloseConfirmDialog'
import { WorkspaceDeactivateDialogs } from './WorkspaceDeactivateDialogs'
import { WorkspaceInspectorDrawer } from './WorkspaceInspectorDrawer'

const WarehouseCanvas = dynamic(
  () => import('../Canvas').then((module) => module.WarehouseCanvas),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full min-h-[28rem] w-full" />,
  }
)

export function WarehouseDesignerWorkspace({
  warehouseId,
  warehouseName,
  sceneVersion,
  resetRevision,
  initialScene,
  hasGeneratedGeometry,
  canConfigure,
  isSaving,
  isUpdatingRack,
  isDeactivatingZone,
  isDeactivatingRack,
  saveError,
  hasConflict,
  onCreateZone,
  onCreateRack,
  onOpenLocationDetails,
  placementToApply,
  onPlacementApplied,
  onUpdateRackName,
  onDeactivateZone,
  onDeactivateRack,
  onSave,
  onReload,
  isClosing,
  onClose,
}: WarehouseDesignerWorkspaceProps) {
  const [history, dispatch] = useLayoutEditorHistory(initialScene)
  const [snapObjects, setSnapObjects] = useState(true)
  const [isGridVisible, setIsGridVisible] = useState(true)
  const [zoomPercent, setZoomPercent] = useState(100)
  const [isToolboxOpen, setIsToolboxOpen] = useState(false)
  const canvasRef = useRef<WarehouseCanvasHandle>(null)
  const pendingUnplacedSelection = useRef<WarehouseLayoutSelection | null>(null)
  const isCompact = useLayoutDesignerCompact()
  const scene = history.present
  const isDirty = hasGeneratedGeometry || history.past.length > 0
  const operationsPending = isSaving || isUpdatingRack || isDeactivatingZone || isDeactivatingRack

  const {
    gestureActive,
    gestureActiveRef,
    handleGestureChange,
    editLocked,
    mutationBlocked,
    canMutate,
  } = useLayoutDesignerEditGate({ canConfigure, operationsPending })
  const {
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
  } = useLayoutDesignerSelection({ scene, canConfigure, editLocked, gestureActiveRef })
  const { placementTarget, pendingObject, closePlacement, requestPlacement, placePending } =
    useLayoutDesignerPlacement({ scene, dispatch, canMutate })
  const { baseVersionRef } = useLayoutDesignerServerSync({
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
  })
  useLayoutDesignerDirtyGuard({ warehouseId, isDirty, canConfigure })

  const {
    updateGeometry,
    updateColor,
    addDecoration,
    handlePaletteDrop,
    duplicateSelectedDecoration,
    deleteSelectedDecoration,
    rotateSelectedObject,
    commitRackPositions,
    arrangeRacks,
  } = useLayoutDesignerObjectActions({
    scene,
    dispatch,
    selection,
    setSelection,
    setIsInspectorOpen,
    setIsToolboxOpen,
    canMutate,
    groupIds,
    rackReferenceId: rackSelection.referenceId,
    getSelectedZoneId,
    onCreateZone,
    onCreateRack,
  })
  const locationActions = useLayoutDesignerLocationActions({
    scene,
    selection,
    setSelection,
    setIsInspectorOpen,
    canMutate,
    onUpdateRackName,
    onDeactivateZone,
    onDeactivateRack,
  })
  const { handleKeyDown, handleKeyUp } = useLayoutDesignerKeyboardShortcuts({
    scene,
    selection,
    editableIds,
    groupIds,
    editLocked,
    gestureActiveRef,
    canvasRef,
    dispatch,
    resetSelection,
    handleRackSelection,
    deleteSelectedDecoration,
  })
  const { isCloseDialogOpen, setIsCloseDialogOpen, closeDesigner, confirmCloseDesigner } =
    useLayoutDesignerCloseConfirm({ canvasRef, isSaving, isDirty, canConfigure, onClose })

  function handleToolboxCloseAutoFocus(event: Event) {
    const nextSelection = pendingUnplacedSelection.current
    if (!nextSelection) return
    event.preventDefault()
    pendingUnplacedSelection.current = null
    canvasRef.current?.revealSelection(nextSelection)
  }

  const toolbox = (
    <DesignerToolbox
      scene={scene}
      selection={selection}
      canConfigure={!mutationBlocked}
      onCreateZone={() => {
        if (!canMutate()) return
        setIsToolboxOpen(false)
        onCreateZone()
      }}
      onCreateRack={(shape) => {
        if (!canMutate()) return
        const zoneId = getSelectedZoneId()
        if (zoneId) {
          setIsToolboxOpen(false)
          onCreateRack(
            zoneId,
            shape
              ? {
                  x: scene.canvas.gridSize * 5,
                  y: scene.canvas.gridSize * 5,
                  ...getRackPresetSize(),
                  layoutShape: shape,
                }
              : undefined
          )
        }
      }}
      onCreateDecoration={addDecoration}
      onSelect={(nextSelection) => {
        handleSelectionChange(nextSelection)
        setIsToolboxOpen(false)
      }}
      onSelectUnplaced={(nextSelection) => {
        if (gestureActiveRef.current) return
        handleSelectionChange(nextSelection)
        if (isCompact) {
          pendingUnplacedSelection.current = nextSelection
          setIsToolboxOpen(false)
        } else {
          canvasRef.current?.revealSelection(nextSelection)
        }
      }}
    />
  )

  const inspector = selection ? (
    <DesignerInspector
      key={`${selection.kind}:${selection.id}`}
      scene={scene}
      selection={selection}
      canConfigure={!mutationBlocked && isSelectionEditable(scene, selection)}
      isUpdatingRack={isUpdatingRack}
      isDeactivatingRack={isDeactivatingRack}
      onRackNameChange={locationActions.updateSelectedRackName}
      onDecorationChange={(decoration) => {
        if (selection.kind === 'decoration' && canMutate()) {
          dispatch({ type: 'update-decoration', id: selection.id, decoration })
        }
      }}
      onClose={() => setIsInspectorOpen(false)}
    />
  ) : null

  const canvas = (
    <WarehouseCanvas
      ref={canvasRef}
      scene={scene}
      selection={selection}
      canConfigure={canConfigure}
      isGridVisible={isGridVisible}
      onSelect={handleSelectionChange}
      onGeometryChange={updateGeometry}
      onZoomChange={setZoomPercent}
      onPaletteDrop={handlePaletteDrop}
      rackEditing={{
        ids: groupIds,
        singleRackId:
          selection?.kind === 'rack' && editableIds.has(selection.id) ? selection.id : undefined,
        referenceId: rackSelection.referenceId,
        snapObjects,
        locked: editLocked,
        onSelectionChange: handleRackSelection,
        onGestureChange: handleGestureChange,
        onCommit: commitRackPositions,
        onError: toast.error,
      }}
      rackTools={
        canConfigure && groupIds.length > 0 && !gestureActive && !operationsPending ? (
          <DesignerRackTools
            count={groupIds.length}
            referenceCode={
              scene.racks.find((rack) => rack.id === rackSelection.referenceId)?.rackCode
            }
            snapObjects={snapObjects}
            disabled={mutationBlocked}
            canArrange={(operation) =>
              Boolean(
                rackSelection.referenceId &&
                arrangeLayoutRacks(scene, groupIds, rackSelection.referenceId, operation).ok
              )
            }
            onToggleSnap={() => {
              if (canMutate()) setSnapObjects(!snapObjects)
            }}
            onArrange={arrangeRacks}
            onFit={() => canvasRef.current?.fitRacks(groupIds)}
            onClear={() => handleRackSelection([], null)}
          />
        ) : null
      }
    />
  )

  const contextToolbar =
    selection && !gestureActive && !operationsPending ? (
      <DesignerContextToolbar
        selection={selection}
        onPlacePending={
          getUnplacedLayoutObject(scene, selection) ? () => requestPlacement(selection) : undefined
        }
        color={getSelectedObjectColor()}
        canConfigure={!mutationBlocked && isSelectionEditable(scene, selection)}
        canCreateRack={
          !mutationBlocked && selection.kind === 'zone' && Boolean(getSelectedZoneId())
        }
        canDuplicate={selection.kind === 'decoration'}
        canRemove={
          selection.kind === 'decoration' || selection.kind === 'rack' || selection.kind === 'zone'
        }
        removeDisabled={selectionHasInventory(scene, selection)}
        removeDisabledReason="Vị trí còn tồn kho nên chưa thể ngừng sử dụng."
        removeLabel={selection.kind === 'decoration' ? 'Xóa' : 'Ngừng dùng'}
        onOpenDetails={() => {
          if (
            selection.kind === 'decoration' ||
            !canConfigure ||
            !isSelectionEditable(scene, selection)
          )
            setIsInspectorOpen(true)
          else onOpenLocationDetails(selection)
        }}
        onCreateRack={() => {
          if (!canMutate()) return
          const zoneId = getSelectedZoneId()
          if (zoneId) onCreateRack(zoneId)
        }}
        onColorChange={(color) => {
          if (selection.kind !== 'slot') updateColor(selection.kind, selection.id, color)
        }}
        onRotate={rotateSelectedObject}
        onDuplicate={duplicateSelectedDecoration}
        onRemove={() => {
          if (selection.kind === 'decoration') deleteSelectedDecoration()
          else if (selection.kind === 'rack') locationActions.requestDeactivateSelectedRack()
          else if (selection.kind === 'zone') locationActions.requestDeactivateSelectedZone()
        }}
      />
    ) : null

  return (
    <section
      className={cn(
        'bg-surface-container-lowest fixed inset-0 z-40 flex min-h-0 min-w-0 flex-col overflow-hidden transition-transform duration-200 ease-in motion-reduce:duration-0',
        isClosing ? 'pointer-events-none translate-y-full' : 'translate-y-0'
      )}
      aria-label="Trình thiết kế bố cục kho"
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <DesignerToolbar
        title={`Thiết lập sơ đồ ${warehouseName}`}
        canvas={scene.canvas}
        isGridVisible={isGridVisible}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        isReadOnly={mutationBlocked}
        onUndo={() => {
          if (canMutate()) dispatch({ type: 'undo' })
        }}
        onRedo={() => {
          if (canMutate()) dispatch({ type: 'redo' })
        }}
        onToggleGrid={() => setIsGridVisible((visible) => !visible)}
        onCanvasChange={(nextCanvas) => {
          if (!canMutate()) return
          if (!canResizeLayoutCanvas(scene, nextCanvas)) {
            toast.error(
              'Kích thước mới không chứa đủ các đối tượng. Hãy bố trí lại hoặc tăng kích thước mặt bằng.'
            )
            return
          }
          dispatch({ type: 'update-canvas', canvas: nextCanvas })
        }}
        onClose={closeDesigner}
      />

      {placementTarget && pendingObject ? (
        <WarehousePendingPlacementDialog
          key={`${placementTarget.kind}:${placementTarget.id}`}
          initialGeometry={pendingObject}
          label={getLayoutLocationLabel(scene, placementTarget)}
          disabled={mutationBlocked}
          onClose={closePlacement}
          onPlace={(geometry) => placePending(placementTarget, geometry)}
        />
      ) : null}

      <WarehouseLayoutPlacementNotice
        scene={scene}
        canSuggest={!mutationBlocked}
        onSelect={handleSelectionChange}
        onSuggest={
          canConfigure
            ? () => {
                if (!canMutate()) return
                dispatch({ type: 'suggest-placement' })
                toast.info('Chỉ đặt khu/kệ còn chỗ trống. Kiểm tra rồi Lưu; có thể Hoàn tác gợi ý.')
              }
            : undefined
        }
      />
      <WorkspaceAlerts
        canConfigure={canConfigure}
        saveError={saveError}
        hasConflict={hasConflict}
        isSaving={isSaving}
        onReload={() => {
          canvasRef.current?.cancelGesture()
          onReload()
        }}
      />

      <WorkspaceBody
        isCompact={isCompact}
        canvas={canvas}
        contextToolbar={contextToolbar}
        toolbox={toolbox}
        inspector={inspector}
        hasSelection={Boolean(selection)}
        isToolboxOpen={isToolboxOpen}
        isInspectorOpen={isInspectorOpen}
        onToolboxOpenChange={setIsToolboxOpen}
        onInspectorOpenChange={setIsInspectorOpen}
        onOpenToolbox={() => {
          setIsInspectorOpen(false)
          setIsToolboxOpen(true)
        }}
        onToolboxCloseAutoFocus={handleToolboxCloseAutoFocus}
      />
      <DesignerFooter
        zoomPercent={zoomPercent}
        canSave={isDirty && !mutationBlocked}
        isSaving={isSaving}
        isReadOnly={!canConfigure}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onZoomTo={(nextZoomPercent) => canvasRef.current?.zoomTo(nextZoomPercent)}
        onFit={() => canvasRef.current?.fit()}
        onCancel={closeDesigner}
        onSave={() => {
          if (canMutate()) onSave(scene, baseVersionRef.current)
        }}
      />
      {!isCompact && selection && isInspectorOpen ? (
        <WorkspaceInspectorDrawer onOpenChange={setIsInspectorOpen}>
          {inspector}
        </WorkspaceInspectorDrawer>
      ) : null}
      <WorkspaceDeactivateDialogs
        rackTarget={locationActions.rackDeactivateTarget}
        zoneTarget={locationActions.zoneDeactivateTarget}
        isDeactivatingRack={isDeactivatingRack}
        isDeactivatingZone={isDeactivatingZone}
        errorMessage={locationActions.locationDeactivateError}
        onCancelRack={locationActions.cancelRackDeactivate}
        onCancelZone={locationActions.cancelZoneDeactivate}
        onConfirmRack={() => void locationActions.confirmDeactivateRack()}
        onConfirmZone={() => void locationActions.confirmDeactivateZone()}
      />
      <WorkspaceCloseConfirmDialog
        open={isCloseDialogOpen}
        onOpenChange={setIsCloseDialogOpen}
        onConfirm={confirmCloseDesigner}
      />
    </section>
  )
}
