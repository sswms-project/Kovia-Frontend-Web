import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTransfer, buildTransferItem } from '../../utils/transfer-test-fixtures'
import { planLine, SLOT_A, SLOT_B } from '../../utils/transfer-plan-test-fixtures'
import { buildTransferPlanDraft } from '../../utils/transfer-putaway-plan'
import type { TransferItem } from '../../types/transfer.types'
import type { useTransferPlanEditor } from '../../hooks/use-transfer-plan-editor'
import { TransferPutawayPlanWorkspace } from './TransferPutawayPlanWorkspace'

vi.mock('../TransferFormPage/TransferSlotMapDialog', () => ({
  TransferSlotMapDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean
    onConfirm: (pick: { slotId: string; label: string }) => void
  }) =>
    open ? (
      <button onClick={() => onConfirm({ slotId: SLOT_B, label: 'Khu B / B01' })}>
        Chọn ô trên sơ đồ
      </button>
    ) : null,
}))
afterEach(cleanup)
beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn()
})
const slots = [
  {
    id: SLOT_A,
    code: 'A01',
    name: '',
    zoneId: 'a',
    zoneLabel: 'Khu A',
    hierarchy: 'Khu A / Kệ A',
    capacityLabel: '2 / 20 Hộp · Còn 18',
  },
  {
    id: SLOT_B,
    code: 'B01',
    name: '',
    zoneId: 'b',
    zoneLabel: 'Khu B',
    hierarchy: 'Khu B / Kệ B',
    capacityLabel: '0 / 20 Hộp · Còn 20',
  },
]
const item = buildTransferItem({
  putAwayPlan: [planLine({ plannedTotal: 10, receivedQuantity: 2 })],
})
const otherItem = buildTransferItem({
  id: 'other-item',
  sku: 'SKU-002',
  putAwayPlan: [
    planLine({ slotId: SLOT_B, path: 'Khu B / B01', plannedTotal: 10, receivedQuantity: 0 }),
  ],
})

function Setup({
  items = [item, otherItem],
  canManage = true,
  submit = vi.fn().mockResolvedValue(true),
  onSaved = vi.fn(),
}: {
  items?: TransferItem[]
  canManage?: boolean
  submit?: () => Promise<boolean>
  onSaved?: () => Promise<void>
}) {
  const transfer = buildTransfer({ items })
  const [draft, setDraft] = useState(() => buildTransferPlanDraft(items))
  const editor: ReturnType<typeof useTransferPlanEditor> = {
    isOpen: true,
    isDirty: true,
    isPending: false,
    draft,
    errors: {},
    reloadRequired: false,
    errorMessage: null,
    open: vi.fn(),
    close: vi.fn(),
    seedSuggestions: vi.fn(),
    apply: vi.fn(),
    rebase: vi.fn(),
    change: setDraft,
    submit,
  }
  return (
    <TransferPutawayPlanWorkspace
      transfer={transfer}
      editor={editor}
      canManage={canManage}
      slotOptions={[]}
      capacitySlots={slots}
      isLoadingSlots={false}
      onSlotSearchChange={vi.fn()}
      isSuggesting={false}
      onSuggest={vi.fn()}
      onReload={vi.fn()}
      onSaved={onSaved}
    />
  )
}

describe('Kế hoạch điều chuyển dùng thiết kế cất hàng Nhập kho', () => {
  it('renders the same allocation sections, capacity selector, columns and full allocation state', () => {
    render(<Setup />)
    expect(
      screen.getByRole('heading', { name: 'Vị trí cất do quản lý cấu hình' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Chọn vị trí cất cho từng sản phẩm' })
    ).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Tiến độ phân bổ' })).toHaveAttribute(
      'aria-valuenow',
      '100'
    )
    expect(screen.getAllByText('Đã đủ')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Gợi ý vị trí bằng AI' })).toBeInTheDocument()
    expect(screen.getAllByRole('combobox', { name: /Vị trí lưu trữ/ })[0]).toHaveTextContent(
      'Còn 18'
    )
    expect(screen.getAllByLabelText('Đơn vị cất')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Thêm vị trí' })).not.toBeInTheDocument()
  })
  it('preserves edited base quantity across collapse/expand and locks stored locations', async () => {
    const user = userEvent.setup()
    render(<Setup />)
    expect(screen.getAllByRole('combobox', { name: /Vị trí lưu trữ/ })[0]).toBeDisabled()
    expect(screen.getByRole('button', { name: /Xóa phân bổ Khu A/ })).toBeDisabled()
    fireEvent.change(screen.getAllByLabelText('Số lượng cất')[0]!, { target: { value: '3' } })
    expect(screen.getByText('Còn thiếu 5 Hộp')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Thu gọn tất cả' }))
    expect(screen.queryByLabelText('Số lượng cất')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mở tất cả' }))
    expect(screen.getAllByLabelText('Số lượng cất')[0]).toHaveValue(3)
    expect(screen.getAllByRole('combobox', { name: /Vị trí lưu trữ/ })[0]).toBeDisabled()
  })
  it('fills the remainder without double counting stored quantity and supports map selection', async () => {
    const user = userEvent.setup()
    render(<Setup />)
    fireEvent.change(screen.getAllByLabelText('Số lượng cất')[0]!, { target: { value: '1' } })
    await user.click(screen.getAllByRole('button', { name: 'Cất toàn bộ còn lại' })[0]!)
    expect(screen.getAllByLabelText('Số lượng cất')[0]).toHaveValue(8)
    await user.click(screen.getAllByRole('combobox', { name: /Vị trí lưu trữ/ })[1]!)
    await user.click(screen.getByRole('button', { name: 'Chọn trên sơ đồ kho' }))
    await user.click(screen.getByRole('button', { name: 'Chọn ô trên sơ đồ' }))
    expect(screen.getAllByRole('combobox', { name: /Vị trí lưu trữ/ })[1]).toHaveTextContent('B01')
    expect(screen.getAllByLabelText('Số lượng cất')[0]).toHaveValue(8)
  })
  it('uses the transfer snapshot conversion without changing base quantity on unit selection', () => {
    render(
      <Setup
        items={[
          buildTransferItem({
            ...otherItem,
            unitId: 'carton',
            unitName: 'Thùng',
            conversionFactor: 5,
          }),
        ]}
      />
    )
    fireEvent.change(screen.getByLabelText('Đơn vị cất'), { target: { value: 'carton' } })
    expect(screen.getByLabelText('Số lượng cất')).toHaveValue(2)
    fireEvent.change(screen.getByLabelText('Số lượng cất'), { target: { value: '1' } })
    expect(screen.getByText('= 5 Hộp')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Đơn vị cất'), {
      target: { value: otherItem.baseUnitId },
    })
    expect(screen.getByLabelText('Số lượng cất')).toHaveValue(5)
  })
  it('never submits or invokes AI when merely opening and prevents duplicate saves', async () => {
    let finish: (result: boolean) => void = () => undefined
    const submit = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve
        })
    )
    const onSaved = vi.fn().mockResolvedValue(undefined)
    render(<Setup submit={submit} onSaved={onSaved} />)
    expect(submit).not.toHaveBeenCalled()
    const save = screen.getByRole('button', { name: 'Lưu vị trí cất hàng' })
    fireEvent.click(save)
    fireEvent.click(save)
    expect(submit).toHaveBeenCalledTimes(1)
    await act(async () => finish(true))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  })
  it('keeps viewing available while refusing editing and saving without capability', () => {
    render(<Setup canManage={false} />)
    expect(screen.queryByRole('button', { name: 'Lưu vị trí cất hàng' })).not.toBeInTheDocument()
    expect(
      screen.getAllByLabelText('Số lượng cất').every((input) => input.hasAttribute('disabled'))
    ).toBe(true)
    expect(
      screen
        .getAllByRole('button', { name: 'Chia sang vị trí khác' })
        .every((button) => button.hasAttribute('disabled'))
    ).toBe(true)
  })
})
