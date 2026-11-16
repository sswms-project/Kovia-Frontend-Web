import { create } from 'zustand'
import type { AiDraftWarning } from '@/features/ai-assistant/schemas/ai-draft-edit.schema'

interface AiDraftViewState {
  /** Drafts whose revision the BE refused (409): the card says so until the user reloads it. */
  conflictDraftIds: Readonly<Record<string, true>>
  /** Revision each draft had when this browser last saved an edit to it. */
  savedRevisions: Readonly<Record<string, string>>
  /** Advisory warnings of the last saved edit (shortage, reset date); they never block anything. */
  warnings: Readonly<Record<string, readonly AiDraftWarning[]>>
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
