import type { Route } from 'next'
import { APP_ROUTES } from '@/routes/app-routes'
import { AI_ACTIONS } from '../types/ai-assistant.types'

/** Search param the create forms read to prefill themselves from an AI draft. */
export const AI_DRAFT_SEARCH_PARAM = 'aiDraft'

function withDraft(path: string, draftId: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ ...extra, [AI_DRAFT_SEARCH_PARAM]: draftId })
  return `${path}?${params.toString()}`
}

/**
 * Page where the user can finish an AI draft in the normal create form. Null for actions that
 * cannot be opened in a form (stock adjustment).
 */
export function getAiDraftFormLink(
  action: string | null | undefined,
  draftId: string
): Route | null {
  // Typed routes cannot type-check a query string built at runtime; each path is the form's own route.
  switch (action) {
    case AI_ACTIONS.createInboundRequest:
      return withDraft(APP_ROUTES.inboundRequestCreate, draftId) as Route
    case AI_ACTIONS.createTransfer:
      return withDraft(APP_ROUTES.transferCreate, draftId) as Route
    case AI_ACTIONS.createStockIssueRequest:
      return withDraft(APP_ROUTES.stockIssueRequestCreate, draftId) as Route
    case AI_ACTIONS.createSupplierReturn:
      return withDraft(APP_ROUTES.supplierReturns, draftId, { create: '1' }) as Route
    default:
      return null
  }
}
