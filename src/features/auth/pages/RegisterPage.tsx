'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { APP_ROUTES } from '@/routes/app-routes'
import { useRegisterMutation } from '../hooks/use-auth'
import { usePublicSubscriptionPlansQuery } from '@/features/subscription/hooks/use-subscription'
import type { BillingCycle } from '@/features/subscription/types/subscription.types'
import type { RegisterFormValues } from '../schemas/register.schema'
import { BenefitsPanel, RegisterForm, RegisterSuccess } from '../components/RegisterPage'
import { useLegalRegistration } from '@/features/legal-documents/hooks/use-legal-documents'

interface RegisterPageProps {
  readonly selectedPlanId?: string
  readonly selectedBillingCycle?: string
}

export function RegisterPage({ selectedPlanId, selectedBillingCycle }: RegisterPageProps) {
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const registerMutation = useRegisterMutation()
  const plansQuery = usePublicSubscriptionPlansQuery()
  const legalQuery = useLegalRegistration()
  const billingCycle: BillingCycle = selectedBillingCycle === 'Yearly' ? 'Yearly' : 'Monthly'
  const selectedPlan = plansQuery.data?.find((plan) => plan.id === selectedPlanId)

  async function handleRegister(values: RegisterFormValues, termsVersionId?: string) {
    try {
      const response = await registerMutation.mutateAsync({
        tenantName: values.tenantName.trim(),
        ownerName: values.ownerName.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        address: values.address.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
        acceptTerms: values.acceptTerms,
        termsVersionId,
        ...(selectedPlan
          ? { selectedPlanId: selectedPlan.id, selectedBillingCycle: billingCycle }
          : {}),
      })
      setSuccessMessage(response.message)
      toast.success('Đăng ký thành công. Vui lòng kiểm tra email xác minh.')
    } catch {
      // onError in useRegisterMutation handles logging + toast
      void legalQuery.refetch()
    }
  }

  return (
    <div className="flex min-h-dvh min-w-0">
      {/* Left brand panel — sticky, full viewport height */}
      <aside className="sticky top-0 hidden h-dvh flex-shrink-0 lg:block lg:w-[42%] xl:w-[45%]">
        <BenefitsPanel logoHref={APP_ROUTES.home} />
      </aside>

      {/* Right scrollable form area */}
      <motion.div
        className="bg-background flex min-w-0 flex-1 flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-12">
          <Logo className="lg:hidden" />
          <div className="hidden lg:block" aria-hidden="true" />
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground hidden text-xs md:inline">
              Hỗ trợ: 1800-KOVIA
            </span>
            <Link
              href={APP_ROUTES.auth.login}
              className="text-foreground border-border hover:bg-muted rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
            >
              Đăng nhập
            </Link>
          </div>
        </header>

        <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-12 xl:px-16">
          <div className="w-full max-w-xl">
            {successMessage ? (
              <RegisterSuccess
                message={successMessage}
                onCreateAnother={() => setSuccessMessage(null)}
              />
            ) : (
              <RegisterForm
                onSubmit={handleRegister}
                legal={legalQuery.data}
                legalUnavailable={legalQuery.isError}
                onRetryLegal={() => void legalQuery.refetch()}
                isLoading={registerMutation.isPending}
                selectedPlan={selectedPlan}
                selectedBillingCycle={billingCycle}
                isPlanLoading={Boolean(selectedPlanId) && plansQuery.isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
