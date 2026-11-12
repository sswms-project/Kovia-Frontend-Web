import axios, { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { USER_ROLES } from '@/config/roles'
import { decodeJwtUser } from '@/features/auth/utils/decode-jwt-user'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import { useAuthStore } from '@/stores/auth.store'
import { axiosClient } from './axios'

function token(userId: string, sessionId: string, jti = 'first') {
  const payload = btoa(
    JSON.stringify({
      user_id: userId,
      tenant_id: `tenant-${userId}`,
      email: `${userId}@example.test`,
      role: USER_ROLES.TenantOwner,
      sid: sessionId,
      jti,
    })
  )
  return `header.${payload}.signature`
}

describe('managed session requests', () => {
  const originalAdapter = axiosClient.defaults.adapter
  const current = token('owner-a', 'session-a')

  beforeEach(() => useAuthStore.getState().setAuth(decodeJwtUser(current), current, 'refresh-a'))
  afterEach(() => {
    axiosClient.defaults.adapter = originalAdapter
    useAuthStore.getState().clearAuth()
    vi.restoreAllMocks()
  })

  it('blocks a stale tab before its request uses a different account token', async () => {
    const adapter = vi.fn()
    axiosClient.defaults.adapter = adapter
    localStorage.setItem('access_token', token('owner-b', 'session-b'))

    await expect(axiosClient.post('/inbound-requests', {})).rejects.toMatchObject({
      statusCode: 409,
    })
    expect(adapter).not.toHaveBeenCalled()
  })

  it('retries logout with the same session after a refresh response is lost', async () => {
    const next = token('owner-a', 'session-a', 'next')
    const sent: unknown[] = []
    axiosClient.defaults.adapter = async (config) => {
      sent.push(config.headers.Authorization)
      const response = { data: {}, status: 200, statusText: 'OK', headers: {}, config }
      if (sent.length === 1)
        throw new AxiosError('Expired', 'ERR_BAD_REQUEST', config, undefined, {
          ...response,
          status: 401,
        })
      return response
    }
    const refresh = vi
      .spyOn(axios, 'post')
      .mockRejectedValueOnce(new AxiosError('Timeout', 'ECONNABORTED'))
      .mockResolvedValueOnce({
        data: { data: { accessToken: next, refreshToken: 'refresh-next' } },
      })

    await expect(axiosClient.post(API_ENDPOINTS.auth.logout)).resolves.toMatchObject({
      status: 200,
    })
    expect(refresh).toHaveBeenCalledTimes(2)
    expect(refresh.mock.calls[1]?.[1]).toEqual(refresh.mock.calls[0]?.[1])
    expect(sent).toEqual([`Bearer ${current}`, `Bearer ${next}`])
  })
})
