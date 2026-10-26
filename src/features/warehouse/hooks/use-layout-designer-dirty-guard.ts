'use client'

import { useEffect } from 'react'
import { useWarehouseLayoutEditorStore } from '@/stores/warehouse-layout-editor.store'

interface UseLayoutDesignerDirtyGuardOptions {
  readonly warehouseId: string
  readonly isDirty: boolean
  readonly canConfigure: boolean
}

export function useLayoutDesignerDirtyGuard({
  warehouseId,
  isDirty,
  canConfigure,
}: UseLayoutDesignerDirtyGuardOptions) {
  const setWarehouseDirty = useWarehouseLayoutEditorStore((state) => state.setWarehouseDirty)

  useEffect(() => {
    setWarehouseDirty(warehouseId, isDirty && canConfigure)
  }, [canConfigure, isDirty, setWarehouseDirty, warehouseId])

  useEffect(() => () => setWarehouseDirty(warehouseId, false), [setWarehouseDirty, warehouseId])

  useEffect(() => {
    if (!isDirty || !canConfigure) return
    const preventAccidentalClose = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', preventAccidentalClose)
    return () => window.removeEventListener('beforeunload', preventAccidentalClose)
  }, [canConfigure, isDirty])
}
