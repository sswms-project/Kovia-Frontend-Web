'use client'

import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import type { WarehouseCanvasHandle } from '../components/WarehouseDesigner/Canvas'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../types/warehouse-layout-scene.types'
import { isFormControl } from '../utils/layout-designer-interaction'
import { rackReferenceId } from '../utils/layout-rack-operations'
import type { LayoutEditorHistoryAction } from './use-layout-editor-history'

interface UseLayoutDesignerKeyboardShortcutsOptions {
  readonly scene: WarehouseLayoutEditorScene
  readonly selection: WarehouseLayoutSelection | null
  readonly editableIds: ReadonlySet<string>
  readonly groupIds: readonly string[]
  readonly editLocked: boolean
  readonly gestureActiveRef: RefObject<boolean>
  readonly canvasRef: RefObject<WarehouseCanvasHandle | null>
  readonly dispatch: (action: LayoutEditorHistoryAction) => void
  readonly resetSelection: () => void
  readonly handleRackSelection: (ids: readonly string[], referenceId: string | null) => void
  readonly deleteSelectedDecoration: () => void
}

const ARROW_DIRECTIONS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
}

export function useLayoutDesignerKeyboardShortcuts({
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
}: UseLayoutDesignerKeyboardShortcutsOptions) {
  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (isFormControl(event.target)) return
    if (event.key === 'Escape') {
      if (canvasRef.current?.cancelGesture()) {
        event.preventDefault()
        return
      }
      resetSelection()
      return
    }
    if (editLocked) return
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      const ids = [...editableIds]
      handleRackSelection(ids, rackReferenceId(scene, ids))
      return
    }
    const direction = ARROW_DIRECTIONS[event.key]
    const ids = groupIds.length
      ? groupIds
      : selection?.kind === 'rack' && editableIds.has(selection.id)
        ? [selection.id]
        : []
    if (direction && ids.length && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const step = scene.canvas.gridSize * (event.shiftKey ? 10 : 1)
      canvasRef.current?.nudgeRacks(
        ids,
        { x: direction.x * step, y: direction.y * step },
        event.repeat
      )
      return
    }
    if (gestureActiveRef.current) return
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      dispatch({ type: event.shiftKey ? 'redo' : 'undo' })
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      dispatch({ type: 'redo' })
      return
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selection?.kind === 'decoration') {
      event.preventDefault()
      deleteSelectedDecoration()
    }
  }

  function handleKeyUp(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key.startsWith('Arrow')) canvasRef.current?.finishNudge()
  }

  return { handleKeyDown, handleKeyUp }
}
