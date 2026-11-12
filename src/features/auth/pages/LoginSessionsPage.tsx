'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LaptopMinimal } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { APP_ROUTES } from '@/routes/app-routes'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '../services/auth.service'

const formatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

function ConfirmLogout({
  label,
  clientLabel,
  disabled,
  onConfirm,
}: {
  readonly label: string
  readonly clientLabel?: string
  readonly disabled: boolean
  readonly onConfirm: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!disabled || next) setOpen(next)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11" disabled={disabled}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}?</AlertDialogTitle>
          <AlertDialogDescription>
            {clientLabel
              ? `${clientLabel} sẽ cần đăng nhập lại.`
              : 'Tất cả thiết bị, gồm phiên hiện tại, sẽ cần đăng nhập lại.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>Quay lại</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={disabled}
            onClick={async () => {
              await onConfirm()
              setOpen(false)
            }}
          >
            {disabled ? 'Đang đăng xuất…' : 'Xác nhận đăng xuất'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function LoginSessionsPage() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const queryKey = ['auth', 'login-sessions', user?.id, user?.loginSessionId]
  const sessions = useQuery({
    queryKey,
    queryFn: ({ signal }) => authService.listSessions(signal),
    enabled: Boolean(user?.loginSessionId),
  })
  const revoke = useMutation({ mutationFn: authService.revokeSession })

  async function signOut(id: string | null) {
    const sessionId = user?.loginSessionId
    try {
      await revoke.mutateAsync(id)
      if (useAuthStore.getState().user?.loginSessionId !== sessionId) return
      if (id === null || id === sessionId) {
        useAuthStore.getState().clearAuth()
        queryClient.clear()
        window.location.replace(APP_ROUTES.auth.login)
        return
      }
      await queryClient.invalidateQueries({ queryKey })
      toast.success('Đã kết thúc phiên đăng nhập.')
    } catch {
      toast.error('Chưa thể xác nhận kết quả đăng xuất. Vui lòng kiểm tra lại danh sách.')
      await sessions.refetch()
    }
  }

  return (
    <section
      className="mx-auto grid w-full max-w-3xl gap-4 pb-4"
      aria-labelledby="login-sessions-title"
    >
      <header>
        <h1 id="login-sessions-title" className="text-xl font-semibold">
          Thiết bị đăng nhập
        </h1>
        {sessions.data && (
          <p className="text-muted-foreground text-sm">
            {sessions.data.length}/2 phiên đang hoạt động
          </p>
        )}
      </header>
      {!user?.loginSessionId ? (
        <p>Tài khoản chưa sử dụng quản lý thiết bị đăng nhập.</p>
      ) : sessions.isError ? (
        <div className="flex flex-wrap items-center gap-3" role="alert">
          <p>Không thể tải danh sách thiết bị.</p>
          <Button type="button" variant="outline" onClick={() => void sessions.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : sessions.isPending ? (
        <p role="status">Đang tải thiết bị…</p>
      ) : (
        <>
          <ul className="bg-card border-border divide-border divide-y border">
            {sessions.data.map((session) => (
              <li key={session.id} className="flex flex-wrap items-start gap-3 p-4 sm:items-center">
                <LaptopMinimal className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1 basis-40 wrap-anywhere">
                  <p className="font-medium">{session.clientLabel}</p>
                  <p className="text-muted-foreground text-sm">
                    Hoạt động gần nhất {formatter.format(new Date(session.lastSeenAt))}
                  </p>
                  {session.isCurrent && (
                    <Badge className="mt-1" variant="secondary">
                      Phiên hiện tại
                    </Badge>
                  )}
                </div>
                {!session.isCurrent && (
                  <ConfirmLogout
                    label="Đăng xuất thiết bị này"
                    clientLabel={session.clientLabel}
                    disabled={revoke.isPending || sessions.isFetching}
                    onConfirm={() => signOut(session.id)}
                  />
                )}
              </li>
            ))}
          </ul>
          <div className="sm:justify-self-end">
            <ConfirmLogout
              label="Đăng xuất tất cả thiết bị"
              disabled={revoke.isPending || sessions.isFetching}
              onConfirm={() => signOut(null)}
            />
          </div>
        </>
      )}
    </section>
  )
}
