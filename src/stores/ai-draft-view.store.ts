import { create } from 'zustand'
import type { AiDraftWarning } from '@/features/ai-assistant/schemas/ai-draft-edit.schema'

interface AiDraftViewState {
  /** Drafts whose revision the BE refused (409): the card says so until the user reloads it. */
  conflictDraftIds: Readonly<Record<string, true>>
  /** Revision each draft had when this browser last saved an edit to it. */
  savedRevisions: Readonly<Record<string, string>>
  /** Advisory warnings of the last saved edit (shortage, reset date); they never block anything. */
  warnings: Readonly<Record<string, readonly AiDraftWarning[]>>
  /**
   * Drafts with an open inline editor holding unsaved changes. A chat message sent meanwhile could
   * patch the draft and close the editor, so the composer waits until these are saved or discarded.
   */
  dirtyDraftIds: Readonly<Record<string, true>>
  setDirty: (draftId: string, isDirty: boolean) => void
  markConflict: (draftId: string) => void
  clearConflict: (draftId: string) => void
  markSaved: (draftId: string, revision: string, warnings: readonly AiDraftWarning[]) => void
}

// Client-only view facts that the edit hook (a mutation) and the card (a component) both need.
// None of it is server data: the conversation cache stays the source of truth for the draft itself.
export const useAiDraftViewStore = create<AiDraftViewState>()((set) => ({
  conflictDraftIds: {},
  savedRevisions: {},
  warnings: {},
  dirtyDraftIds: {},
  setDirty: (draftId, isDirty) =>
    set((state) => {
      if (Boolean(state.dirtyDraftIds[draftId]) === isDirty) return state
      const rest = { ...state.dirtyDraftIds }
      if (isDirty) rest[draftId] = true
      else delete rest[draftId]
      return { dirtyDraftIds: rest }
    }),
  markConflict: (draftId) =>
    set((state) => ({ conflictDraftIds: { ...state.conflictDraftIds, [draftId]: true } })),
  clearConflict: (draftId) =>
    set((state) => {
      const rest = { ...state.conflictDraftIds }
      delete rest[draftId]
      return { conflictDraftIds: rest }
    }),
  markSaved: (draftId, revision, warnings) =>
    set((state) => ({
      savedRevisions: { ...state.savedRevisions, [draftId]: revision },
      warnings: { ...state.warnings, [draftId]: warnings },
    })),
}))
