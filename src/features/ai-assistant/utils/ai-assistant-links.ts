import type { Route } from 'next'
import { APP_ROUTES } from '@/routes/app-routes'
import { AI_ACTIONS } from '../types/ai-assistant.types'

/** Only in-app, relative paths may become links (the BE already filters; this is defense in depth). */
export function isAiAppPath(url?: string | null): url is string {
  return (
    typeof url === 'string' &&
    url.startsWith('/') &&
    !url.startsWith('//') &&
    !url.includes('://') &&
    !url.includes('\\')
  )
}

export interface AiActionResultLink {
  readonly href: Route
  readonly label: string
}

export function getAiActionResultLink(
  action?: string | null,
  resultEntityId?: string | null
): AiActionResultLink | null {
  if (!resultEntityId) return null

  switch (action) {
    case AI_ACTIONS.createInboundRequest:
      // inboundRequestDetail builds a plain string path; the dynamic segment is a server-issued GUID.
      return {
        href: APP_ROUTES.inboundRequestDetail(resultEntityId) as Route,
        label: 'Xem yêu cầu nhập kho',
      }
    case AI_ACTIONS.createTransfer:
      return { href: APP_ROUTES.transfers, label: 'Xem danh sách chuyển kho' }
    case AI_ACTIONS.createStockAdjustment:
      return {
        href: APP_ROUTES.stockAdjustmentDetail(resultEntityId),
        label: 'Xem phiếu điều chỉnh',
      }
    case AI_ACTIONS.createStockIssueRequest:
      return {
        href: APP_ROUTES.stockIssueRequestDetail(resultEntityId) as Route,
        label: 'Xem phiếu xuất kho',
      }
    default:
      return null
  }
}
