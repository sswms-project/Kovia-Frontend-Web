import type { Route } from 'next'

const key = 'auth_return_url'

export function safeReturnUrl(value?: string | null): Route | null {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  return value as Route
}

/**
 * Login URL that brings the user back to `path` (pathname + search) after signing in. Only same-origin app paths
 * are kept (see `safeReturnUrl`); auth pages and the bare home page are dropped so login never redirects to itself.
 */
export function loginUrlFor(path?: string | null): Route {
  const target = safeReturnUrl(path)
  if (!target || target === '/' || target.startsWith('/auth/')) return '/auth/login' as Route
  return `/auth/login?returnUrl=${encodeURIComponent(target)}` as Route
}

export function saveAuthReturnUrl(value?: string | null) {
  const safeValue = safeReturnUrl(value)
  if (safeValue) sessionStorage.setItem(key, safeValue)
  else sessionStorage.removeItem(key)
}

export function takeAuthReturnUrl(): Route | null {
  const value = safeReturnUrl(sessionStorage.getItem(key))
  sessionStorage.removeItem(key)
  return value
}
