import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClickableTableRow } from './ClickableTableRow'

const push = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

afterEach(() => {
  cleanup()
  push.mockClear()
})

function renderRow(row: React.ReactNode) {
  render(
    <table>
      <tbody>{row}</tbody>
    </table>
  )
}

describe('ClickableTableRow', () => {
  it('navigates when any plain cell of the row is clicked', async () => {
    renderRow(
      <ClickableTableRow href="/inbound/receipts/1">
        <td>GR-1</td>
        <td>Kho A</td>
      </ClickableTableRow>
    )

    await userEvent.setup().click(screen.getByText('Kho A'))

    expect(push).toHaveBeenCalledWith('/inbound/receipts/1')
  })

  it('leaves links, buttons and ignored areas to their own behaviour', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    renderRow(
      <ClickableTableRow href="/inbound/receipts/1">
        <td>
          <a href="/other" onClick={(event) => event.preventDefault()}>
            Mã
          </a>
        </td>
        <td>
          <button type="button" onClick={onAction}>
            Duyệt
          </button>
        </td>
        <td data-row-ignore>
          <span>Vùng riêng</span>
        </td>
      </ClickableTableRow>
    )

    await user.click(screen.getByText('Mã'))
    await user.click(screen.getByRole('button', { name: 'Duyệt' }))
    await user.click(screen.getByText('Vùng riêng'))

    expect(onAction).toHaveBeenCalledOnce()
    expect(push).not.toHaveBeenCalled()
  })

  it('calls onActivate for rows that open a sheet instead of a page', async () => {
    const onActivate = vi.fn()
    renderRow(
      <ClickableTableRow onActivate={onActivate}>
        <td>Nhân viên A</td>
      </ClickableTableRow>
    )

    await userEvent.setup().click(screen.getByText('Nhân viên A'))

    expect(onActivate).toHaveBeenCalledOnce()
    expect(push).not.toHaveBeenCalled()
  })

  it('does not navigate while the user is selecting text', async () => {
    renderRow(
      <ClickableTableRow href="/x">
        <td>Văn bản dài</td>
      </ClickableTableRow>
    )
    const selection = vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => 'Văn bản',
    } as Selection)

    await userEvent.setup().click(screen.getByText('Văn bản dài'))

    expect(push).not.toHaveBeenCalled()
    selection.mockRestore()
  })
})
