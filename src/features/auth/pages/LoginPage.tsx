'use client'

import { logger } from '@/lib/logger'
import { APP_ROUTES } from '@/routes/app-routes'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoginForm } from '../components/LoginPage'
import { useEffect, useState } from 'react'
import { isApiErrorResponse } from '@/lib/api-error'
import {
  useCaptchaMutation,
  useLoginMutation,
  useResendVerificationMutation,
} from '../hooks/use-auth'
import type { LoginFormValues } from '../schemas/login.schema'
import type { AuthUser, CaptchaChallengeResponse } from '../types/auth.types'
import { decodeJwtUser } from '../utils/decode-jwt-user'
import { clearTwoFactorTempToken, saveTwoFactorTempToken } from '../utils/two-factor-temp-token'
import { safeReturnUrl, saveAuthReturnUrl } from '../utils/auth-return-url'
import { getTemporaryLockSeconds } from '../utils/temporary-lock'
import { resolvePostLoginRoute } from '../utils/post-login-route'

export function LoginPage({ returnUrl }: { readonly returnUrl?: string }) {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const loginMutation = useLoginMutation()
  const captchaMutation = useCaptchaMutation()
  const resendMutation = useResendVerificationMutation()
  const [captcha, setCaptcha] = useState<CaptchaChallengeResponse | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [requiresVerification, setRequiresVerification] = useState(false)
  const [lastEmail, setLastEmail] = useState('')
  const [lockSeconds, setLockSeconds] = useState(0)

  useEffect(() => {
    if (lockSeconds <= 0) return
    const timer = window.setInterval(
      () => setLockSeconds((current) => Math.max(0, current - 1)),
      1000
    )
    return () => window.clearInterval(timer)
  }, [lockSeconds])

  async function refreshCaptcha() {
    try {
      const response = await captchaMutation.mutateAsync()
      setCaptcha(response.data)
    } catch {
      // The mutation shows the user-facing error.
    }
  }

  async function resendVerification() {
    if (!lastEmail) return
    try {
      await resendMutation.mutateAsync({ email: lastEmail })
    } catch {
      // The mutation shows the user-facing error.
    }
  }

  async function handleLogin(values: LoginFormValues) {
    clearTwoFactorTempToken()
    setAuthNotice(null)
    setRequiresVerification(false)
    setLastEmail(values.email)

    try {
      const response = await loginMutation.mutateAsync({
        email: values.email,
        password: values.password,
        ...(values.captchaId ? { captchaId: values.captchaId } : {}),
        ...(values.captchaAnswer ? { captchaAnswer: values.captchaAnswer } : {}),
      })
      const data = response.data

      if (data.requires2FA) {
        const tempToken = data.tempToken?.trim()

        if (!tempToken) {
          clearTwoFactorTempToken()
          toast.error('Không thể bắt đầu phiên xác thực hai yếu tố. Vui lòng thử lại.')
          return
        }

        saveTwoFactorTempToken(tempToken)
        saveAuthReturnUrl(returnUrl)
        router.replace(APP_ROUTES.auth.verify2fa)
        return
      }

      const accessToken = data.accessToken?.trim()
      const refreshToken = data.refreshToken?.trim()

      if (!accessToken || !refreshToken) {
        toast.error('Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.')
        return
      }

      let user: AuthUser
      try {
        user = decodeJwtUser(accessToken)
      } catch (error) {
        logger.error('Failed to decode access token', error)
        toast.error('Không thể hoàn tất đăng nhập.')
        return
      }

      clearTwoFactorTempToken()
      setAuth(user, accessToken, refreshToken)
      window.location.replace(await resolvePostLoginRoute(user, safeReturnUrl(returnUrl)))
    } catch (error) {
      if (!isApiErrorResponse(error)) return

      const requiresCaptcha = error.errors?.requiresCaptcha?.includes('true') ?? false
      if (requiresCaptcha) void refreshCaptcha()
      const authState = error.errors?.authState?.[0]
      if (authState === 'EmailVerificationRequired') {
        setRequiresVerification(true)
        setAuthNotice(error.message)
      } else if (
        authState === 'PendingAdminApproval' ||
        authState === 'TenantSuspended' ||
        authState === 'Inactive'
      ) {
        setAuthNotice(error.message)
      }
      if (error.statusCode === 429) {
        setLockSeconds(getTemporaryLockSeconds(error))
      }

      const isInlineError = Boolean(authState) || error.statusCode === 429
      if (!isInlineError) {
        toast.error(error.message ?? 'Đăng nhập thất bại. Vui lòng thử lại.')
      }
    }
  }

  return (
    <>
      <LoginForm
        onSubmit={handleLogin}
        isLoading={loginMutation.isPending}
        captcha={captcha}
        isCaptchaLoading={captchaMutation.isPending}
        authNotice={authNotice}
        requiresVerification={requiresVerification}
        isResending={resendMutation.isPending}
        lockSeconds={lockSeconds}
        onRefreshCaptcha={() => void refreshCaptcha()}
        onResendVerification={() => void resendVerification()}
      />
      <footer className="p-3 text-center text-sm">
        <Link href={APP_ROUTES.legalDocuments} className="text-primary underline">
          Điều khoản và chính sách
        </Link>
      </footer>
    </>
  )
}
