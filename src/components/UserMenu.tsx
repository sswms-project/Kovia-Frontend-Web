'use client'

import { useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, LogOut, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getRoleLabel } from '@/config/roles'
import { useLogoutMutation } from '@/features/auth'
import { APP_ROUTES } from '@/routes/app-routes'
import { useAuthStore } from '@/stores/auth.store'

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function UserMenu() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const logoutMutation = useLogoutMutation()

  if (!user) return null

  function finishLogout() {
    clearAuth()
    queryClient.clear()
    router.replace(APP_ROUTES.auth.login)
  }

  function handleLogout() {
    logoutMutation.mutate(undefined, { onSettled: finishLogout })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Mở menu tài khoản của ${user.fullName}`}
          className="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1 transition-colors"
        >
          <Avatar>
            <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="text-foreground text-[13px] leading-tight font-medium">{user.fullName}</p>
            <p className="text-muted-foreground text-[11px] leading-tight">
              {getRoleLabel(user.role)}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-foreground text-sm font-medium">{user.fullName}</p>
          <p className="text-muted-foreground text-xs font-normal">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={APP_ROUTES.profile}>
              <User className="size-4" aria-hidden="true" />
              Hồ sơ cá nhân
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={APP_ROUTES.settings.security}>
              <Settings aria-hidden="true" />
              Cài đặt tài khoản
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={logoutMutation.isPending}
          onSelect={(event) => {
            event.preventDefault()
            handleLogout()
          }}
          variant="destructive"
        >
          {logoutMutation.isPending ? (
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <LogOut className="size-4" aria-hidden="true" />
          )}
          {logoutMutation.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
