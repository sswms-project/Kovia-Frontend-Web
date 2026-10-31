import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { PropsWithChildren } from 'react'
import type { StockIssueRequestSummary } from '../../types/stock-issue.types'
import { CrossDockSection } from './CrossDockSection'

const data = vi.hoisted(() => ({ expires: 0 }))
vi.mock('../../hooks/use-cross-dock', () => ({
  useCrossDock: () => ({
    canManage: true,
    plan: {},
    scope: 'scope',
    now: 1000,
    demand: {
      data: {
        completedAt: null,
        revokedAt: null,
        validUntil: new Date(data.expires).toISOString(),
      },
    },
    writeReady: true,
    mutation: { isPending: false },
  }),
}))
vi.mock('./CrossDockPanel', () => ({
  CrossDockPanel: ({ children }: PropsWithChildren) => <>{children}</>,
}))
vi.mock('./StockIssueSourceEditor', () => ({
  StockIssueSourceEditor: ({ disabled }: { disabled: boolean }) => (
    <button disabled={disabled}>Đổi nguồn</button>
  ),
}))
afterEach(cleanup)
const order = {
  id: 'order',
  status: 'Pending',
  canAdjustPickingSources: true,
} as StockIssueRequestSummary
it('allows manual selection after automation authorization expires', () => {
  data.expires = 999
  render(<CrossDockSection order={order} onDraft={vi.fn()} />)
  expect(screen.getByRole('button')).toBeEnabled()
})
it('still blocks manual selection while automation authorization is active', () => {
  data.expires = 1001
  render(<CrossDockSection order={order} onDraft={vi.fn()} />)
  expect(screen.getByRole('button')).toBeDisabled()
})
