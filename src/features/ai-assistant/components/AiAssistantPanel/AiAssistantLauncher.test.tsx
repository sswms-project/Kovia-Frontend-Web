import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { USER_ROLES } from '@/config/roles'
import type { AuthUser } from '@/features/auth/types/auth.types'
import { useAiAssistantPanelStore } from '@/stores/ai-assistant-panel.store'
import { useAuthStore } from '@/stores/auth.store'
import { AiAssistantLauncher } from './AiAssistantLauncher'

// The panel talks to the API; these tests only cover the header button.
vi.mock('./AiAssistantPanel', () => ({ AiAssistantPanel: () => <p>Khung trợ lý</p> }))

const user: AuthUser = {
  id: 'user-1',
  tenantId: 'tenant-1',
  fullName: 'Lan',
  email: 'lan@example.com',
  role: USER_ROLES.TenantOwner,
  isActive: true,
}
const initialPanel = useAiAssistantPanelStore.getState()

function renderLauncher() {
  render(
    <TooltipProvider>
      <AiAssistantLauncher />
    </TooltipProvider>
  )
}

beforeEach(() => useAuthStore.setState({ user }))

afterEach(() => {
  act(() => useAiAssistantPanelStore.setState(initialPanel, true))
  useAuthStore.setState({ user: null })
  window.localStorage.clear()
})

describe('AiAssistantLauncher', () => {
  it('sits in the header flow as a labelled button instead of a floating, draggable icon', () => {
    renderLauncher()

    const button = screen.getByRole('button', { name: 'Mở trợ lý AI Kovia' })
    expect(button).toHaveTextContent('Trợ lý AI')
    expect(button.closest('.fixed')).toBeNull()
    expect(button).not.toHaveClass('cursor-grab')
  })

  it('toggles the panel and reports whether it is open', async () => {
    renderLauncher()
    const button = screen.getByRole('button', { name: 'Mở trợ lý AI Kovia' })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(button)
    expect(useAiAssistantPanelStore.getState().isOpen).toBe(true)
    expect(screen.getByText('Khung trợ lý')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đóng trợ lý AI Kovia' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    await userEvent.click(screen.getByRole('button', { name: 'Đóng trợ lý AI Kovia' }))
    expect(useAiAssistantPanelStore.getState().isOpen).toBe(false)
  })

  it('forgets the position saved by the old draggable launcher', () => {
    window.localStorage.setItem('kovia-ai-assistant-launcher-position', '{"left":10,"top":10}')

    renderLauncher()

    expect(window.localStorage.getItem('kovia-ai-assistant-launcher-position')).toBeNull()
  })

  it('is hidden for platform administrators, who have no tenant to ask about', () => {
    useAuthStore.setState({ user: { ...user, tenantId: null, role: USER_ROLES.SystemAdmin } })

    renderLauncher()

    expect(screen.queryByRole('button', { name: /trợ lý AI/i })).toBeNull()
  })
})
