import { describe, expect, it, vi } from 'vitest'
import StockIssueRequestsRoutePage from './page'

vi.mock('@/features/stock-issue/pages/StockIssueRequestPage', () => ({ default: () => null }))

describe('stock issue deep links', () => {
  it.each([
    [{ requestId: 'report-request' }, 'report-request'],
    [{ id: 'notification-request' }, 'notification-request'],
    [{ requestId: 'report-request', id: 'notification-request' }, 'report-request'],
    [{}, undefined],
  ])('opens the linked request and keys the workspace for %j', async (params, requestId) => {
    const page = await StockIssueRequestsRoutePage({ searchParams: Promise.resolve(params) })

    expect(page.props.initialRequestId).toBe(requestId)
    expect(page.key).toBe(requestId ?? 'list')
  })
})
