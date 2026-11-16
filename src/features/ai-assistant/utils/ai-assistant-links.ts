import type { Route } from 'next'
import { APP_ROUTES } from '@/routes/app-routes'
import { AI_ACTIONS } from '../types/ai-assistant.types'

// Control characters (\p{Cc}: < 0x20, 0x7F...) and whitespace: browsers strip tab/CR/LF inside a URL, so
// "/\t/evil.com" would otherwise become the protocol-relative "//evil.com".
const UNSAFE_URL_CHARS = /[\p{Cc}\s]/u

/** Only in-app, relative paths may become links (the BE already filters; this is defense in depth). */
export function isAiAppPath(url?: string | null): url is string {
  return (
    typeof url === 'string' &&
    url.startsWith('/') &&
    !url.startsWith('//') &&
    !url.includes('://') &&
    !url.includes('\\') &&
    !UNSAFE_URL_CHARS.test(url)
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
      // The BE returns the id of the transfer request it created.
      return { href: APP_ROUTES.transferDetail(resultEntityId), label: 'Xem phiếu chuyển kho' }
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
    case AI_ACTIONS.createSupplierReturn:
      return {
        href: APP_ROUTES.supplierReturnDetail(resultEntityId) as Route,
        label: 'Xem phiếu trả NCC',
      }
    // No link while the BE returns no result id (the guard above), so this only needs the rule id.
    case AI_ACTIONS.createWatchRule:
    case AI_ACTIONS.changeWatchRule:
      return { href: APP_ROUTES.aiWatchRule(resultEntityId), label: 'Xem quy tắc cảnh báo' }
    default:
      return null
  }
}
