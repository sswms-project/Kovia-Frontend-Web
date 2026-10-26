import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CycleCountItemsTable } from './CycleCountItemsTable'
import type { CycleCountDetail, CycleCountItem } from '../../types/cycle-count.types'

const viewport = vi.hoisted(() => ({ mobile: true }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => viewport.mobile }))

const item: CycleCountItem = {
  id: 'sample-line',
  productId: 'product',
  productName: 'Sản phẩm kiểm kê',
  productSku: 'SKU-MAU',
  slotId: 'slot',
  slotCode: '__SYSTEM_DEFAULT__',
  rackId: 'rack',
  rackCode: 'A04',
  zoneCode: 'K01',
  zoneName: 'Khu vực dài để nhận diện',
  rackName: 'Kệ hàng mẫu',
  systemQuantity: null,
  countedQuantity: null,
  difference: null,
  countedBy: null,
  countedAt: null,
  requestedRecountRound: null,
  activeAdjustmentId: null,
  activeAdjustmentStatus: null,
  countHistory: [],
  lotId: null,
  lotNumber: null,
  qualityStatus: 'Good',
  unitName: 'Cái',
  isSystemDefaultSlot: true,
  expiryDate: null,
  countedByName: null,
  note: null,
  countedDamagedQuantity: null,
  countMethod: 'Manual',
  scannedBarcode: null,
  productBarcode: null,
  slotBarcode: null,
  damageReason: null,
  damageEvidence: [],
  damageConfirmedAt: null,
  damageCaseId: null,
  damageCaseStatus: null,
}
const detail: CycleCountDetail = {
  id: 'sample-document',
  code: 'KK-MAU',
  warehouseId: 'warehouse',
  warehouseName: 'Kho mẫu',
  zoneId: null,
  zoneName: null,
  status: 'InProgress',
  scheduledDate: '2026-10-25T08:00:00Z',
  priority: 'Normal',
  dueAt: null,
  isBlindCount: true,
  recountRound: 0,
  assignedTo: 'staff',
  assignedToName: 'Nhân viên',
  submittedBy: null,
  submittedAt: null,
  completedAt: null,
  createdAt: '2026-10-25T07:00:00Z',
  items: [item],
  purpose: null,
  dueDate: null,
  cancelledAt: null,
  cancelReason: null,
  createdByName: null,
  submittedByName: null,
  finalizedByName: null,
  finalizedAt: null,
  cancelledByName: null,
}

function setup(overrides: Partial<ComponentProps<typeof CycleCountItemsTable>> = {}) {
  const props: ComponentProps<typeof CycleCountItemsTable> = {
    detail,
    allowedActions: ['Record'],
    isPending: false,
    canCreateAdjustment: false,
    selectedItemIds: [],
    onToggleSelect: vi.fn(),
    canSubmit: false,
    isBeforeSchedule: false,
    evidenceActions: { onUpload: vi.fn(), onDownload: vi.fn() },
    onSaveItems: vi.fn().mockResolvedValue(true),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onCreateAdjustment: vi.fn(),
    ...overrides,
  }
  render(<CycleCountItemsTable {...props} />)
  return props
}
beforeEach(() => {
  viewport.mobile = true
  localStorage.clear()
})
afterEach(cleanup)

describe('staff cycle-count mobile workspace', () => {
  it('keeps blind quantities hidden and saves entered counts with the same business fields', async () => {
    const props = setup()
    const card = within(screen.getByRole('list', { name: 'Dòng kiểm kê' }))
    expect(card.getByText(/Khu vực K01.*Kệ A04/)).toBeInTheDocument()
    expect(card.getByText('Ẩn khi kiểm kê mù')).toBeInTheDocument()
    expect(screen.queryByText(/__SYSTEM_DEFAULT__/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Điền đủ theo sổ sách/ })).not.toBeInTheDocument()
    fireEvent.change(card.getByRole('spinbutton', { name: 'Số đếm (Cái)' }), {
      target: { value: '85' },
    })
    fireEvent.change(card.getByRole('spinbutton', { name: 'Trong đó hỏng' }), {
      target: { value: '0' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu (1)' }))
    await waitFor(() =>
      expect(props.onSaveItems).toHaveBeenCalledWith([
        expect.objectContaining({
          itemId: item.id,
          quantity: 85,
          damagedQuantity: 0,
          countMethod: 'Manual',
        }),
      ])
    )
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('associates invalid quantity messages with the mobile input and prevents saving', () => {
    setup()
    const input = screen.getByRole('spinbutton', { name: 'Số đếm (Cái)' })
    fireEvent.change(input, { target: { value: '-1' } })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(/Số đếm phải từ 0/)
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled()
  })

  it('keeps damage proof mandatory before saving or submitting', () => {
    setup({ canSubmit: true })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Số đếm (Cái)' }), {
      target: { value: '10' },
    })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Trong đó hỏng' }), {
      target: { value: '2' },
    })
    expect(screen.getByRole('button', { name: 'Thêm ảnh và lý do hàng hỏng' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Gửi kết quả cho quản lý' })).toBeDisabled()
  })

  it('requires confirmation before submitting a saved count', async () => {
    const props = setup({
      canSubmit: true,
      detail: { ...detail, items: [{ ...item, countedQuantity: 85, countedDamagedQuantity: 0 }] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi kết quả cho quản lý' }))
    expect(props.onSubmit).not.toHaveBeenCalled()
    const confirmation = screen.getByRole('alertdialog')
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Gửi kết quả' }))
    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1))
  })

  it('keeps the desktop table and its existing inputs', () => {
    viewport.mobile = false
    setup()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Dòng kiểm kê' })).not.toBeInTheDocument()
  })
})
