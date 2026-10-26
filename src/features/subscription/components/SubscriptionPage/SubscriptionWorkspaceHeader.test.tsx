import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { APP_ROUTES } from '@/routes/app-routes'
import { SubscriptionWorkspaceHeader } from './SubscriptionWorkspaceHeader'

afterEach(cleanup)

describe('subscription workspace navigation', () => {
  it.each(['plan', 'payments'] as const)(
    'marks only the current %s view and preserves URLs',
    (currentView) => {
      render(<SubscriptionWorkspaceHeader currentView={currentView} canViewPlan canViewPayments />)
      expect(screen.getByRole('heading', { name: 'Gói dịch vụ & thanh toán' })).toBeInTheDocument()
      const plan = screen.getByRole('link', { name: 'Gói dịch vụ' })
      const payments = screen.getByRole('link', { name: 'Thanh toán' })
      expect(plan).toHaveAttribute('href', APP_ROUTES.subscription)
      expect(payments).toHaveAttribute('href', APP_ROUTES.subscriptionPayments)
      expect(currentView === 'plan' ? plan : payments).toHaveAttribute('aria-current', 'page')
      expect(currentView === 'plan' ? payments : plan).not.toHaveAttribute('aria-current')
    }
  )

  it('keeps payments reachable without exposing the plan tab to payment-only users', () => {
    render(
      <SubscriptionWorkspaceHeader currentView="payments" canViewPlan={false} canViewPayments />
    )
    expect(screen.queryByRole('link', { name: 'Gói dịch vụ' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Thanh toán' })).toHaveAttribute('aria-current', 'page')
  })

  it('hides payment navigation without payment permission', () => {
    render(<SubscriptionWorkspaceHeader currentView="plan" canViewPlan canViewPayments={false} />)
    expect(screen.getByRole('link', { name: 'Gói dịch vụ' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Thanh toán' })).not.toBeInTheDocument()
  })
})
