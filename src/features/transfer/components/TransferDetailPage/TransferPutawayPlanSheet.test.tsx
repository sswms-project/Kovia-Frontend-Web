import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildTransfer, buildTransferItem } from '../../utils/transfer-test-fixtures'
import { buildTransferPlanDraft } from '../../utils/transfer-putaway-plan'
import { planLine } from '../../utils/transfer-plan-test-fixtures'
import { TransferPutawayPlanSheet } from './TransferPutawayPlanSheet'
import type { useTransferPlanEditor } from '../../hooks/use-transfer-plan-editor'

vi.mock('../TransferFormPage/TransferSlotMapDialog', () => ({ TransferSlotMapDialog: () => null }))
vi.mock('@/features/inbound-request/components/InboundRequestFormPage/LookupCombobox', () => ({
  LookupCombobox: (props: { disabled: boolean; ariaLabel: string }) => (
    <button type="button" disabled={props.disabled}>
      {props.ariaLabel}
    </button>
  ),
}))
afterEach(cleanup)

function setup({ canManage = true, isDirty = false } = {}) {
  const transfer = buildTransfer({ items: [buildTransferItem({ putAwayPlan: [planLine()] })] })
  const editor: ReturnType<typeof useTransferPlanEditor> = {
    isOpen: true,
    isDirty,
    draft: buildTransferPlanDraft(transfer.items),
    errors: {},
    reloadRequired: false,
    errorMessage: null,
    isPending: false,
    open: vi.fn(),
    close: vi.fn(),
    change: vi.fn(),
    apply: vi.fn(),
    seedSuggestions: vi.fn(),
    rebase: vi.fn(),
    submit: vi.fn().mockResolvedValue(true),
  }
  const suggest = vi.fn()
  render(
    <TransferPutawayPlanSheet
      transfer={transfer}
      editor={editor}
      canManage={canManage}
      slotOptions={[]}
      isLoadingSlots={false}
      onSlotSearchChange={vi.fn()}
      isSuggesting={false}
      onSuggest={suggest}
      onReload={vi.fn()}
    />
  )
  return { editor, suggest }
}
describe('TransferPutawayPlanSheet', () => {
  it('locks the received location and edits remaining as a total without automatic AI requests', () => {
    const { editor, suggest } = setup()
    expect(screen.getByLabelText('Đã nhận')).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Vị trí cất hàng' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Bỏ vị trí/ })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Còn lại'), { target: { value: '3' } })
    expect(editor.change).toHaveBeenCalledWith([
      expect.objectContaining({ lines: [expect.objectContaining({ plannedTotal: 5 })] }),
    ])
    expect(suggest).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý vị trí' }))
    expect(suggest).toHaveBeenCalledTimes(1)
  })
  it('asks before discarding a dirty draft', () => {
    const { editor } = setup({ isDirty: true })
    fireEvent.click(screen.getByRole('button', { name: 'Đóng kế hoạch' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Bỏ nội dung đang sửa?')
    expect(editor.close).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }))
    expect(editor.close).toHaveBeenCalledTimes(1)
  })
  it('is wide enough on desktop because the right-side sheet width overrides its small default', () => {
    setup()
    const classes = screen.getByRole('dialog').className
    expect(classes).toContain('data-[side=right]:sm:max-w-2xl')
    expect(classes).toContain('data-[side=right]:w-full')
    expect(classes).not.toContain('data-[side=right]:sm:max-w-sm')
    expect(classes).not.toContain('data-[side=right]:w-3/4')
  })
  it('warns before reload or tab close only while an unsaved draft is open', () => {
    const first = setup({ isDirty: true })
    const dirtyEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirtyEvent)
    expect(dirtyEvent.defaultPrevented).toBe(true)
    expect(first.editor.close).not.toHaveBeenCalled()
    cleanup()
    setup({ isDirty: false })
    const cleanEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(cleanEvent)
    expect(cleanEvent.defaultPrevented).toBe(false)
  })
  it('asks before the browser Back button throws away an unsaved draft, and goes back only after confirming', () => {
    const forward = vi.spyOn(window.history, 'forward').mockImplementation(() => undefined)
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    const { editor } = setup({ isDirty: true })
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(forward).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Bỏ nội dung đang sửa?')
    expect(back).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }))
    expect(editor.close).toHaveBeenCalledTimes(1)
    expect(back).toHaveBeenCalledTimes(1)
    forward.mockRestore()
    back.mockRestore()
  })
  it('does not intercept the Back button when there is nothing unsaved', () => {
    const forward = vi.spyOn(window.history, 'forward').mockImplementation(() => undefined)
    setup({ isDirty: false })
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(forward).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    forward.mockRestore()
  })
  it('supports viewing without offering write actions', () => {
    setup({ canManage: false })
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Xem kế hoạch cất hàng')
    expect(screen.getByLabelText('Còn lại')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Lưu kế hoạch' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gợi ý vị trí' })).not.toBeInTheDocument()
  })
})
