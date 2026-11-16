import { useEffect, useEffectEvent, useRef } from 'react'
import { toast } from 'sonner'
import { useAiDraftViewStore } from '@/stores/ai-draft-view.store'

interface UseCloseStaleAiDraftEditorInput {
  readonly draftId: string
  readonly isEditing: boolean
  /** Revision the conversation cache holds for the draft right now. */
  readonly revision: string | null
  readonly onClose: () => void
}

/**
 * Closes the inline editor when the cached revision moves away from the one it was opened on (a chat
 * patch landed), so the user never keeps editing a stale revision. The revision this browser just saved
 * is not "newer". Unsaved values stay in storage under the old revision and are restored only if it
 * ever comes back, as the storage rules say.
 */
export function useCloseStaleAiDraftEditor({
  draftId,
  isEditing,
  revision,
  onClose,
}: UseCloseStaleAiDraftEditorInput) {
  const savedRevision = useAiDraftViewStore((state) => state.savedRevisions[draftId])
  const openedOn = useRef<{ readonly revision: string | null } | null>(null)
  const close = useEffectEvent(() => {
    toast.info('Bản nháp vừa có bản mới hơn nên trình chỉnh sửa đã đóng.')
    onClose()
  })

  useEffect(() => {
    if (!isEditing) {
      openedOn.current = null
      return
    }
    if (!openedOn.current) {
      openedOn.current = { revision }
      return
    }
    if (openedOn.current.revision === revision) return
    if (revision !== null && revision === savedRevision) {
      // The save of this very editor: the cache moved to it before the editor closed.
      openedOn.current = { revision }
      return
    }
    openedOn.current = null
    close()
  }, [isEditing, revision, savedRevision])
}
