'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { logger } from '@/lib/logger'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ApiErrorResponse } from '@/types/api'
import { APP_ROUTES } from '@/routes/app-routes'
import { useResendVerificationMutation, useVerifyEmailQuery } from '../hooks/use-auth'
import {
  resendVerificationSchema,
  type ResendVerificationFormValues,
} from '../schemas/resend-verification.schema'
import {
  ErrorState,
  LoadingState,
  MissingTokenState,
  ResendVerificationForm,
  SuccessState,
} from '../components/VerifyEmailPage'

interface VerifyEmailPageProps {
  readonly token?: string
}

function getApiErrorMessage(error: ApiErrorResponse | null) {
  return error?.message ?? 'Không thể xác minh email. Vui lòng thử lại sau.'
}

export function VerifyEmailPage({ token }: VerifyEmailPageProps) {
  const verifyEmailQuery = useVerifyEmailQuery(token)
  const resendMutation = useResendVerificationMutation()
  const resendForm = useForm<ResendVerificationFormValues>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: '' },
  })
  const errorMessage = getApiErrorMessage(verifyEmailQuery.error)
  const successMessage = verifyEmailQuery.data?.message

  React.useEffect(() => {
    if (!verifyEmailQuery.error) return
    logger.error(verifyEmailQuery.error)
    toast.error(getApiErrorMessage(verifyEmailQuery.error))
  }, [verifyEmailQuery.error])

  async function resendVerification(values: ResendVerificationFormValues) {
    try {
      await resendMutation.mutateAsync({ email: values.email })
    } catch {
      // The mutation shows the user-facing error.
    }
  }

  return (
    <main className="bg-background text-foreground min-h-[100dvh]">
      <header className="border-border bg-background/90 border-b px-4 backdrop-blur-md md:px-6">
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between">
          <Logo size="lg" />
          <Button
            asChild
            variant="ghost"
            className="text-primary hover:bg-muted h-9 rounded-md px-3 text-xs font-semibold"
          >
            <Link href={APP_ROUTES.auth.login}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Đăng nhập
            </Link>
          </Button>
        </div>
      </header>

      <section className="animate-in fade-in slide-in-from-bottom-3 mx-auto grid w-full max-w-[960px] grid-cols-1 gap-4 px-4 py-8 duration-500 md:grid-cols-[1fr_320px] md:px-6 md:py-14">
        <Card className="border-border bg-card rounded-lg border py-0 shadow-sm">
          <CardContent className="px-5 py-8 md:px-10 md:py-10">
            <AnimatePresence mode="wait">
              {!token ? (
                <motion.div
                  key="missing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <MissingTokenState />
                </motion.div>
              ) : verifyEmailQuery.isPending ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <LoadingState />
                </motion.div>
              ) : verifyEmailQuery.isSuccess && successMessage ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <SuccessState message={successMessage} />
                </motion.div>
              ) : (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <ErrorState
                    message={errorMessage}
                    resendForm={
                      <ResendVerificationForm
                        form={resendForm}
                        isPending={resendMutation.isPending}
                        onSubmit={resendVerification}
                      />
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Card className="p-5">
          <div className="bg-accent text-primary flex size-10 items-center justify-center rounded-md">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <h2 className="text-foreground mt-4 text-sm font-semibold">Bảo vệ workspace</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Email xác minh giúp KOVIA đảm bảo người tạo doanh nghiệp là chủ sở hữu hợp lệ trước khi
            kích hoạt tài khoản vận hành.
          </p>
          <div className="border-border bg-muted text-muted-foreground mt-5 rounded-md border p-3 text-xs leading-5">
            Link xác minh được hệ thống cấp sau khi đăng ký và có thời hạn 15 phút.
          </div>
        </Card>
      </section>
    </main>
  )
}
