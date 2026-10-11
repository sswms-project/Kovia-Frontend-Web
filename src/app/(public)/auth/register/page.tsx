import type { Metadata } from 'next'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'

export const metadata: Metadata = {
  title: 'Đăng ký | KOVIA',
  description: 'Đăng ký doanh nghiệp owner cho Smart SaaS Warehouse Management System',
}

export default async function Page({
  searchParams,
}: {
  readonly searchParams: Promise<{ planId?: string; billingCycle?: string }>
}) {
  const { planId, billingCycle } = await searchParams
  return <RegisterPage selectedPlanId={planId} selectedBillingCycle={billingCycle} />
}
