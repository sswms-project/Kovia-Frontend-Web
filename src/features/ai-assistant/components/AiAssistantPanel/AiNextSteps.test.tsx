import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AiCard } from '../../types/ai-assistant.types'
import { AiNextSteps } from './AiNextSteps'

const openRequest: AiCard = {
  type: 'navigation_card',
  title: 'Mở yêu cầu IR-1',
  description: 'Đang Nháp · hoàn tất để QA-CAP-12 về kho',
  actionUrl: '/inbound-requests/r-1',
  icon: 'clipboard-list',
}
const openWarehouse: AiCard = {
  type: 'navigation_card',
  title: 'Xem kho Đà Nẵng',
  actionUrl: '/warehouses/w-1',
  icon: 'warehouse',
}
const forecast: AiCard = {
  type: 'suggested_action',
  title: 'Dự báo nhu cầu QA-CAP-12',
  description: 'Xem khi nào hết hàng',
  message: 'Dự báo nhu cầu QA-CAP-12 ở kho Đà Nẵng',
  icon: 'trending-up',
}

describe('AiNextSteps', () => {
  it('groups open-page and send-question steps under one heading', () => {
    render(
      <AiNextSteps
        cards={[openRequest, openWarehouse, forecast]}
        onNavigate={vi.fn()}
        onSend={vi.fn()}
      />
    )

    expect(screen.getByRole('region', { name: 'Bước tiếp theo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mở yêu cầu IR-1/ })).toHaveAttribute(
      'href',
      '/inbound-requests/r-1'
    )
    expect(screen.getByRole('link', { name: /Xem kho Đà Nẵng/ })).toHaveAttribute(
      'href',
      '/warehouses/w-1'
    )
    expect(screen.getByRole('button', { name: /Dự báo nhu cầu QA-CAP-12/ })).toBeInTheDocument()
  })

  it('sends the prepared question, not the label, when a send step is tapped', async () => {
    const onSend = vi.fn()
    render(<AiNextSteps cards={[forecast]} onNavigate={vi.fn()} onSend={onSend} />)

    await userEvent.setup().click(screen.getByRole('button', { name: /Dự báo nhu cầu QA-CAP-12/ }))

    expect(onSend).toHaveBeenCalledWith('Dự báo nhu cầu QA-CAP-12 ở kho Đà Nẵng')
  })

  it('never shows more than three steps', () => {
    const extra: AiCard = { type: 'navigation_card', title: 'Tồn kho', actionUrl: '/inventory' }
    render(
      <AiNextSteps
        cards={[openRequest, openWarehouse, forecast, extra]}
        onNavigate={vi.fn()}
        onSend={vi.fn()}
      />
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByRole('link', { name: /Tồn kho/ })).not.toBeInTheDocument()
  })

  it('keeps page links but drops send steps on older messages', () => {
    render(<AiNextSteps cards={[openWarehouse, forecast]} onNavigate={vi.fn()} />)

    expect(screen.getByRole('link', { name: /Xem kho Đà Nẵng/ })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('Bước tiếp theo')).not.toBeInTheDocument()
  })

  it('shows options written by the model as send steps', async () => {
    const onSend = vi.fn()
    render(
      <AiNextSteps
        cards={[{ type: 'quick_replies', options: ['Có, làm đi', 'Không, cảm ơn'] }]}
        onNavigate={vi.fn()}
        onSend={onSend}
      />
    )

    await userEvent.setup().click(screen.getByRole('button', { name: 'Có, làm đi' }))

    expect(onSend).toHaveBeenCalledWith('Có, làm đi')
  })

  it('ignores draft confirmations and links that leave the app', () => {
    const { container } = render(
      <AiNextSteps
        cards={[
          { type: 'action_confirmation', draftId: 'd1', summary: 'Tạo yêu cầu' },
          { type: 'navigation_card', title: 'Ngoài', actionUrl: 'https://evil.example.com' },
        ]}
        onNavigate={vi.fn()}
        onSend={vi.fn()}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
