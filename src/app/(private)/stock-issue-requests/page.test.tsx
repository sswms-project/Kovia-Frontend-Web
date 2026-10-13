import { describe, expect, it, vi } from 'vitest'
import StockIssueRequestsRoutePage from './page'

const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  })
)

vi.mock('next/navigation', () => ({ redirect }))
vi.mock('@/features/stock-issue/pages/StockIssueRequestPage', () => ({ default: () => null }))

describe('stock issue deep links', () => {
  it.each([
    [{ requestId: 'report-request' }, 'report-request'],
    [{ id: 'notification-request' }, 'notification-request'],
    [{ requestId: 'report-request', id: 'notification-request' }, 'report-request'],
  ])('redirects %j to the request detail page', async (params, requestId) => {
    await expect(
      StockIssueRequestsRoutePage({ searchParams: Promise.resolve(params) })
    ).rejects.toThrow(`redirect:/stock-issue-requests/${requestId}`)
  })

  it('renders the list when no request is linked', async () => {
    redirect.mockClear()

    const page = await StockIssueRequestsRoutePage({ searchParams: Promise.resolve({}) })

    expect(page).toBeTruthy()
    expect(redirect).not.toHaveBeenCalled()
  })
})
