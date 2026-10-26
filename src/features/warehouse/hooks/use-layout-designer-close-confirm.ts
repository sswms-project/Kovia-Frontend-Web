'use client'

import { useState, type RefObject } from 'react'
import type { WarehouseCanvasHandle } from '../components/WarehouseDesigner/Canvas'

interface UseLayoutDesignerCloseConfirmOptions {
  readonly canvasRef: RefObject<WarehouseCanvasHandle | null>
  readonly isSaving: boolean
  readonly isDirty: boolean
  readonly canConfigure: boolean
  readonly onClose: () => void
}

export function useLayoutDesignerCloseConfirm({
  canvasRef,
  isSaving,
  isDirty,
  canConfigure,
  onClose,
}: UseLayoutDesignerCloseConfirmOptions) {
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)

  function closeDesigner() {
    canvasRef.current?.cancelGesture()
    if (isSaving) return
    if (isDirty && canConfigure) {
      setIsCloseDialogOpen(true)
      return
    }
    onClose()
  }

  function confirmCloseDesigner() {
    setIsCloseDialogOpen(false)
    onClose()
  }

  return { isCloseDialogOpen, setIsCloseDialogOpen, closeDesigner, confirmCloseDesigner }
}
