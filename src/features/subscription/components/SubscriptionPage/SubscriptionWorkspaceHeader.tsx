'use client'

import Link from 'next/link'
import { APP_ROUTES } from '@/routes/app-routes'

interface SubscriptionWorkspaceHeaderProps {
  readonly currentView: 'plan' | 'payments'
  readonly canViewPlan: boolean
  readonly canViewPayments: boolean
}

export function SubscriptionWorkspaceHeader({
  currentView,
  canViewPlan,
  canViewPayments,
}: SubscriptionWorkspaceHeaderProps) {
  return (
    <header className="flex min-w-0 shrink-0 flex-col gap-3">
      <h1 className="text-foreground text-xl font-semibold">Gói dịch vụ &amp; thanh toán</h1>
      <nav data-slot="operational-workspace-navigation" aria-label="Gói dịch vụ và thanh toán">
        {canViewPlan ? (
          <Link
            href={APP_ROUTES.subscription}
            aria-current={currentView === 'plan' ? 'page' : undefined}
            className="focus-visible:ring-ring touch-manipulation focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
          >
            Gói dịch vụ
          </Link>
        ) : null}
        {canViewPayments ? (
          <Link
            href={APP_ROUTES.subscriptionPayments}
            aria-current={currentView === 'payments' ? 'page' : undefined}
            className="focus-visible:ring-ring touch-manipulation focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
          >
            Thanh toán
          </Link>
        ) : null}
      </nav>
    </header>
  )
}
