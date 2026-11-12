'use client'

import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Route } from 'next'
import { Button } from '@/components/ui/button'
import { isApiErrorResponse } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '../services/auth.service'
import type { LoginResponseDto } from '../types/auth.types'
import { decodeJwtUser } from '../utils/decode-jwt-user'
import { resolvePostLoginRoute } from '../utils/post-login-route'

const formatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

export function LoginSessionSelection({
  initial,
  returnUrl,
  onBack,
}: {
  readonly initial: LoginResponseDto
  readonly returnUrl?: Route | null
  readonly onBack: () => void
}) {
  const setAuth = useAuthStore((state) => state.setAuth)
  const [selection, setSelection] = useState(initial)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [pending, setPending] = useState(false)
  const submitting = useRef(false)
  const sessions = selection.activeSessions ?? []
  const full = sessions.length >= 2

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const ticket = selection.sessionSelectionTicket
    if (submitting.current || expired || !ticket || (full && !selectedId)) return
    submitting.current = true
    setPending(true)
    setError(null)
    try {
      const { data } = await authService.completeSession(ticket, full ? selectedId : null)
      if (data.sessionSelectionTicket) {
        setSelection(data)
        setSelectedId(null)
        setError('Danh sách phiên đã thay đổi. Vui lòng kiểm tra lại.')
        return
      }
      if (!data.accessToken || !data.refreshToken) throw new Error('Missing sign-in tokens')
      const user = decodeJwtUser(data.accessToken)
      setAuth(user, data.accessToken, data.refreshToken)
      window.location.replace(await resolvePostLoginRoute(user, returnUrl ?? undefined))
    } catch (cause) {
      const invalid = isApiErrorResponse(cause) && cause.statusCode === 401
      setExpired(invalid)
      setError(
        invalid
          ? 'Phiên xác thực đã hết hạn. Vui lòng quay lại và đăng nhập lại.'
          : 'Chưa thể hoàn tất đăng nhập. Vui lòng thử lại.'
      )
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <form className="mx-auto grid w-full max-w-md gap-4 p-4" onSubmit={submit}>
      <h1 className="text-xl font-semibold">
        {full ? 'Đã đủ 2 phiên đăng nhập' : 'Có chỗ cho phiên mới'}
      </h1>
      <p className="text-muted-foreground text-sm">
        {full
          ? 'Chọn một phiên để kết thúc và đăng nhập trên thiết bị này.'
          : 'Bạn có thể tiếp tục đăng nhập.'}
      </p>
      {full && (
        <fieldset className="grid gap-2" disabled={pending || expired}>
          <legend className="sr-only">Phiên cần kết thúc</legend>
          {sessions.map((session) => (
            <label
              key={session.id}
              className="bg-card border-border flex min-h-11 cursor-pointer items-start gap-3 border p-3"
            >
              <input
                className="accent-primary mt-1"
                type="radio"
                name="session"
                checked={selectedId === session.id}
                onChange={() => setSelectedId(session.id)}
              />
              <span className="min-w-0 wrap-anywhere">
                <span className="block font-medium">{session.clientLabel}</span>
                <span className="text-muted-foreground text-sm">
                  Hoạt động gần nhất {formatter.format(new Date(session.lastSeenAt))}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <Button
        className="min-h-11"
        type="submit"
        disabled={pending || expired || (full && !selectedId)}
      >
        {pending ? 'Đang đăng nhập…' : full ? 'Kết thúc phiên và đăng nhập' : 'Tiếp tục đăng nhập'}
      </Button>
      <Button
        className="min-h-11"
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={pending}
      >
        Quay lại
      </Button>
    </form>
  )
}
