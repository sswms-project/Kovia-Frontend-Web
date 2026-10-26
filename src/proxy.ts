import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { USER_ROLES, type UserRole } from '@/config/roles'
import { getAllowedRolesForPath } from '@/config/route-permissions'
import { decodeJwtPayload } from '@/lib/jwt'
import { APP_ROUTES } from '@/routes/app-routes'

const PUBLIC_PATHS = [
  APP_ROUTES.pricing,
  APP_ROUTES.invitations.accept,
  APP_ROUTES.supplierResponse,
  APP_ROUTES.auth.login,
  APP_ROUTES.auth.register,
  APP_ROUTES.auth.verifyEmail,
  APP_ROUTES.auth.forgotPassword,
  APP_ROUTES.auth.resetPassword,
  APP_ROUTES.auth.verify2fa,
  APP_ROUTES.subscriptionPaymentResult,
]

const AUTH_PATHS = Object.values(APP_ROUTES.auth)

const KNOWN_ROLES = Object.values(USER_ROLES)

function getRoleFromToken(token: string): UserRole | null {
  const role = decodeJwtPayload(token)?.role
  return KNOWN_ROLES.includes(role as UserRole) ? (role as UserRole) : null
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('access_token')?.value
  const role = token ? getRoleFromToken(token) : null

  const isPublic = pathname === APP_ROUTES.home || PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p))

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL(APP_ROUTES.auth.login, request.url))
  }

  if (!isPublic && token && !role) {
    const response = NextResponse.redirect(new URL(APP_ROUTES.auth.login, request.url))
    response.cookies.delete('access_token')
    return response
  }

  if ((isAuthPath || pathname === APP_ROUTES.home) && role) {
    return NextResponse.redirect(new URL(APP_ROUTES.dashboard, request.url))
  }

  const allowedRoles = getAllowedRolesForPath(pathname)
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL(APP_ROUTES.unauthorized, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
