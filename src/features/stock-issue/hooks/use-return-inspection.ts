import { useCallback, useEffect, useRef } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { RestockReturnFormValues } from '../schemas/restock-return.schema'

interface InspectionSource {
  id: string
  version?: string | null
  items: readonly {
    id: string
    condition: RestockReturnFormValues['items'][number]['condition']
    restockSlotId: string | null
  }[]
}

/** Own the editable inspection snapshot; only an explicit reload may replace it. */
export function useReturnInspection<T extends InspectionSource>(
  form: UseFormReturn<RestockReturnFormValues>,
  document: T | null,
  sessionId: string | null
) {
  const snapshot = useRef<T | null>(null)
  const reload = useCallback(
    (source: T) => {
      snapshot.current = source
      form.reset({
        items: source.items.map((item) => ({
          returnItemId: item.id,
          condition: item.condition,
          restockSlotId: item.condition === 'Scrap' ? null : item.restockSlotId,
          scannedSlotCode: '',
        })),
      })
    },
    [form]
  )
  useEffect(() => {
    if (!sessionId) {
      snapshot.current = null
      return
    }
    if (document?.id === sessionId && snapshot.current?.id !== sessionId) reload(document)
  }, [document, sessionId, reload])
  return {
    reload,
    get version() {
      return snapshot.current?.version ?? null
    },
    get document() {
      return snapshot.current
    },
    get isConflict() {
      return Boolean(snapshot.current && document && snapshot.current.version !== document.version)
    },
  }
}
