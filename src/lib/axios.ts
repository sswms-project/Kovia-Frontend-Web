import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import { APP_ROUTES } from '@/routes/app-routes'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import { decodeJwtUser } from '@/features/auth/utils/decode-jwt-user'
import { useAuthStore } from '@/stores/auth.store'

interface RefreshSessionResponse {
  accessToken: string | null
  refreshToken: string | null
}

const normalizeApiBaseUrl = (baseUrl: string) => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')

  return normalizedBaseUrl.endsWith('/api') ? normalizedBaseUrl : `${normalizedBaseUrl}/api`
}

const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:7070'
)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const normalizeApiError = (error: AxiosError): ApiErrorResponse => {
  const data = error.response?.data
  const statusCode =
    isRecord(data) && typeof data.statusCode === 'number'
      ? data.statusCode
      : (error.response?.status ?? 500)
  const message =
    isRecord(data) && typeof data.message === 'string' && data.message.trim().length > 0
      ? data.message
      : error.message || 'Something went wrong. Please try again.'
  const errors =
    isRecord(data) && isRecord(data.errors) ? (data.errors as Record<string, string[]>) : undefined

  return {
    statusCode,
    message,
    ...(errors ? { errors } : {}),
  }
}

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Token helpers ──────────────────────────────────────────────

const isClient = typeof window !== 'undefined'

export const getStoredAccessToken = (): string | null =>
  isClient ? localStorage.getItem('access_token') : null

const getRefreshToken = (): string | null =>
  isClient ? localStorage.getItem('refresh_token') : null

const setTokens = (accessToken: string, refreshToken: string): void => {
  if (!isClient) return
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
  document.cookie = `access_token=${accessToken}; path=/; SameSite=Strict`
}

const clearTokens = (): void => {
  if (!isClient) return
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  document.cookie = 'access_token=; path=/; max-age=0'
}

const redirectToLogin = (): void => {
  clearTokens()
  window.location.href = APP_ROUTES.auth.login
}

// ── Pre-authentication endpoints — never trigger refresh-token retry ───
// A stale refresh_token (lives 14 days) left over in localStorage from a
// previous session must not be silently used to "resurrect" an unrelated
// session when login/verify-2fa itself returns 401. refreshToken already
// bypasses this interceptor (uses the raw `axios` instance, not
// `axiosClient`) — listed here defensively in case that ever changes.
const AUTH_401_PASSTHROUGH_ENDPOINTS: string[] = [
  API_ENDPOINTS.auth.login,
  API_ENDPOINTS.auth.verify2fa,
  API_ENDPOINTS.auth.completeSession,
  API_ENDPOINTS.auth.refreshToken,
]

// ── Token refresh with queuing ─────────────────────────────────

function isSameSession(first: string, second: string) {
  if (first === second) return true
  try {
    const a = decodeJwtUser(first)
    const b = decodeJwtUser(second)
    return a.id === b.id && a.tenantId === b.tenantId && a.loginSessionId === b.loginSessionId
  } catch {
    return false
  }
}

export function tokenMatchesUser(token: string, user: ReturnType<typeof decodeJwtUser> | null) {
  if (!user) return false
  try {
    const identity = decodeJwtUser(token)
    return (
      identity.id === user.id &&
      identity.tenantId === user.tenantId &&
      identity.loginSessionId === user.loginSessionId
    )
  } catch {
    return false
  }
}

const refreshAccessToken = async (failedToken: string): Promise<string> => {
  const accessToken = getStoredAccessToken()
  const refreshToken = getRefreshToken()
  if (!accessToken || !refreshToken) throw new Error('Missing session token')
  if (!isSameSession(failedToken, accessToken)) throw new Error('Session changed')
  if (failedToken !== accessToken) return accessToken

  const send = () =>
    axios.post<ApiResponse<RefreshSessionResponse>>(
      `${API_BASE_URL}${API_ENDPOINTS.auth.refreshToken}`,
      { accessToken, refreshToken },
      { timeout: 30_000 }
    )
  const response = await send()
    .catch((error: unknown) => {
      if (
        axios.isAxiosError(error) &&
        !axios.isCancel(error) &&
        (!error.response || [502, 503, 504].includes(error.response.status)) &&
        decodeJwtUser(accessToken).loginSessionId &&
        getStoredAccessToken() === accessToken &&
        getRefreshToken() === refreshToken
      )
        return send()
      throw error
    })
    .catch((error: unknown) => {
      const current = getStoredAccessToken()
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        current === accessToken &&
        getRefreshToken() === refreshToken
      )
        redirectToLogin()
      throw error
    })
  const refreshedSession = response.data.data

  if (!refreshedSession.accessToken || !refreshedSession.refreshToken) {
    throw new Error('Refresh response is missing session tokens')
  }

  if (getStoredAccessToken() !== accessToken || getRefreshToken() !== refreshToken)
    throw new Error('Session changed during refresh')
  setTokens(refreshedSession.accessToken, refreshedSession.refreshToken)
  return refreshedSession.accessToken
}

const refreshes = new Map<string, Promise<string>>()

const handleTokenRefresh = (failedToken: string): Promise<string> => {
  const pending = refreshes.get(failedToken)
  if (pending) return pending
  const run = () => refreshAccessToken(failedToken)
  const refresh = (
    navigator.locks ? navigator.locks.request('kovia-auth-refresh', run) : run()
  ).finally(() => refreshes.delete(failedToken))
  refreshes.set(failedToken, refresh)
  return refresh
}

// ── Request interceptor ────────────────────────────────────────

type RetryConfig = InternalAxiosRequestConfig & { _retryToken?: string }

axiosClient.interceptors.request.use((config: RetryConfig) => {
  if (AUTH_401_PASSTHROUGH_ENDPOINTS.includes(config.url ?? '')) return config
  const token = getStoredAccessToken()
  const user = useAuthStore.getState().user
  if (config._retryToken && token !== config._retryToken)
    throw new Error('Session changed before retry')
  if (token) {
    if (!tokenMatchesUser(token, user))
      throw {
        statusCode: 409,
        message: 'Tài khoản hoặc phiên đã thay đổi. Vui lòng tải lại trang.',
      }
    config.headers.Authorization = `Bearer ${token}`
  } else if (user) {
    throw { statusCode: 401, message: 'Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.' }
  }
  return config
})

// ── Response interceptor ───────────────────────────────────────

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)
    const originalRequest = error.config as RetryConfig | undefined
    const authorization = originalRequest?.headers.Authorization
    const failedToken =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice(7)
        : null
    const isPassthroughEndpoint = AUTH_401_PASSTHROUGH_ENDPOINTS.some(
      (endpoint) => originalRequest?.url === endpoint
    )

    if (
      error.response?.status === 401 &&
      !isPassthroughEndpoint &&
      originalRequest &&
      !originalRequest._retryToken &&
      failedToken &&
      getRefreshToken()
    ) {
      try {
        originalRequest._retryToken = await handleTokenRefresh(failedToken)
        return axiosClient(originalRequest)
      } catch {
        return Promise.reject(normalizeApiError(error))
      }
    }

    const apiError = normalizeApiError(error)

    return Promise.reject(apiError)
  }
)
