import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { LoginSessionSelection } from './LoginSessionSelection'
import { authService } from '../services/auth.service'

vi.mock('../services/auth.service', () => ({ authService: { completeSession: vi.fn() } }))

it('requires a selection and clears it when the server returns a new list', async () => {
  const sessions = ['Chrome', 'Kovia Android'].map((clientLabel, index) => ({
    id: String(index),
    clientLabel,
    lastSeenAt: '2026-11-11T07:00:00Z',
    isCurrent: false,
  }))
  const initial = {
    accessToken: null,
    refreshToken: null,
    expiresIn: 0,
    requires2FA: false,
    tempToken: null,
    sessionSelectionTicket: 'first',
    activeSessions: sessions,
  }
  vi.mocked(authService.completeSession).mockResolvedValue({
    isSuccess: true,
    statusCode: 200,
    message: '',
    data: { ...initial, sessionSelectionTicket: 'second', activeSessions: [...sessions].reverse() },
  })
  render(<LoginSessionSelection initial={initial} onBack={vi.fn()} />)
  const submit = screen.getByRole('button', { name: 'Kết thúc phiên và đăng nhập' })
  expect(submit).toBeDisabled()
  fireEvent.click(screen.getByRole('radio', { name: /Chrome/ }))
  fireEvent.click(submit)
  expect(await screen.findByRole('alert')).toHaveTextContent('Danh sách phiên đã thay đổi')
  expect(authService.completeSession).toHaveBeenCalledWith('first', '0')
  expect(submit).toBeDisabled()
})
