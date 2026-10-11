import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GoodsReceiptItem } from '../../types/inbound.types'
import { ReceiptItemsTable } from './ReceiptItemsTable'
import { ReceiptPutAwayTable } from './ReceiptPutAwayTable'
import { ReceiptHistorySheet } from './ReceiptHistorySheet'
import { receiptGoodsPreviewRows } from '../../utils/inbound-goods-preview'

const item: GoodsReceiptItem = {
  id: 'item',
  inboundRequestItemId: 'request-item',
  productId: 'beer',
  productSKU: 'BEER',
  productName: 'Bia',
  baseUnitId: 'can',
  baseUnitName: 'Lon',
  enteredUnitId: 'carton',
  enteredUnitName: 'Thùng',
  conversionFactorSnapshot: 24,
  allowedUnits: [],
  lotId: null,
  lotNumber: null,
  manufacturedDate: null,
  expiryDate: null,
  orderedQuantity: 240,
  receivedQuantity: 240,
  damagedQuantity: 0,
  usableQuantity: 240,
  putAwayQuantity: 96,
  remainingPutAwayQuantity: 144,
  exceptionReason: null,
  putAwayDetails: [
    {
      id: 'putaway',
      inventoryStockId: 'stock',
      stockMovementId: 'movement',
      warehouseId: 'warehouse',
      slotId: 'slot',
      slotCode: '__SYSTEM_DEFAULT__',
      rackCode: 'KE-01',
      isSystemDefaultSlot: true,
      lotId: null,
      lotNumber: null,
      qualityStatus: 'Good',
      performedByUserId: 'staff',
      performedByName: 'Nhân viên',
      quantity: 96,
      putAwayAt: '2026-10-04T00:00:00Z',
      deviationId: null,
      isOffPlan: false,
      deviationReason: null,
      deviationEvidence: [],
      deviationReasonCode: null,
      usedHeldSlot: false,
      isSlotCodeConfirmed: false,
    },
  ],
  putAwayPlan: [],
}

afterEach(cleanup)

describe('receipt units and Vietnamese history', () => {
  it('explains the quantity basis on hover and keyboard focus', async () => {
    render(<ReceiptItemsTable items={[item]} />)
    const user = userEvent.setup()
    await user.hover(screen.getByLabelText('SL thực nhận'))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('bao gồm hàng hỏng')
    await user.unhover(screen.getByLabelText('SL thực nhận'))
    fireEvent.focus(screen.getByLabelText('ĐVT'))
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('Đơn vị tính chính'))
  })
  it('preserves lot rows and base quantities without duplicating receipt totals by placement', () => {
    const rows = receiptGoodsPreviewRows([
      { ...item, lotNumber: 'LOT-01', expiryDate: '2027-10-05' },
      { ...item, id: 'second-lot', lotNumber: 'LOT-02', receivedQuantity: 24, putAwayDetails: [] },
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      unit: 'Lon',
      conversion: '1 Thùng = 24 Lon',
      received: 240,
      lotNumber: 'LOT-01',
      expiryDate: '2027-10-05',
      locations: [{ id: 'putaway', label: 'Kệ KE-01', quantity: 96 }],
    })
    expect(rows[1]).toMatchObject({
      id: 'second-lot',
      lotNumber: 'LOT-02',
      received: 24,
      locations: [],
    })
    expect(
      receiptGoodsPreviewRows([{ ...item, enteredUnitId: item.baseUnitId }])[0]?.conversion
    ).toBeNull()
  })
  it('shows base and snapshot conversion even when the entered unit is no longer selectable', () => {
    render(<ReceiptItemsTable items={[item]} />)
    expect(screen.getByRole('columnheader', { name: 'SL yêu cầu' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'SL thực nhận' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'SL cần cất' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'ĐVT' })).toBeInTheDocument()
    expect(screen.getByText('1 Thùng = 24 Lon')).toBeInTheDocument()
    expect(screen.queryByText('Theo PO')).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Vị trí cất' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Số lô' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Hạn sử dụng' })).toBeInTheDocument()
    expect(screen.getByText('Kệ KE-01 · 96 Lon')).toBeInTheDocument()
    expect(screen.queryByText('__SYSTEM_DEFAULT__')).not.toBeInTheDocument()
  })
  it('labels historical conversion rather than pretending to know the originally entered unit', () => {
    render(<ReceiptPutAwayTable items={[item]} />)
    expect(screen.getByRole('columnheader', { name: 'SL đã cất' })).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Quy đổi theo yêu cầu nhập' })
    ).toBeInTheDocument()
    expect(screen.getByText('4 Thùng (1 Thùng = 24 Lon)')).toBeInTheDocument()
    expect(screen.getByText('96 Lon')).toBeInTheDocument()
    expect(screen.getByText('Đạt')).toBeInTheDocument()
    expect(screen.getByText('Kệ KE-01')).toBeInTheDocument()
    expect(screen.queryByText('__SYSTEM_DEFAULT__')).not.toBeInTheDocument()
  })
  it('marks put-aways that differ from the plan with their reason and downloadable photos', async () => {
    const onDownload = vi.fn()
    const evidence = {
      id: 'evidence-1',
      warehouseId: 'warehouse',
      fileName: 'ke-day.png',
      contentType: 'image/png',
      fileSize: 10,
      uploadedByUserId: 'staff',
      createdAt: '2026-10-04T00:00:00Z',
      referenceType: 'PutAwayDeviation',
      referenceId: 'deviation-1',
    }
    const [detail] = item.putAwayDetails
    render(
      <ReceiptPutAwayTable
        items={[
          {
            ...item,
            putAwayDetails: [
              {
                ...detail!,
                deviationId: 'deviation-1',
                isOffPlan: true,
                deviationReason: 'Kệ kế hoạch đã đầy',
                deviationEvidence: [evidence],
              },
            ],
          },
        ]}
        onDownloadEvidence={onDownload}
      />
    )

    expect(screen.getByText('Khác kế hoạch')).toBeInTheDocument()
    expect(screen.getByText('Lý do: Kệ kế hoạch đã đầy')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ảnh: ke-day.png' }))
    expect(onDownload).toHaveBeenCalledWith(evidence)
  })
  it('translates current inspection workflow actions', async () => {
    const actions = [
      'ApproveInspection',
      'SelfApproveInspection',
      'ReturnInspectionForCorrection',
      'ResubmitInspection',
      'CreatePutAwayTask',
    ]
    render(
      <ReceiptHistorySheet
        receiptCode="GR-001"
        events={actions.map((action) => ({
          action,
          fromState: null,
          toState: null,
          actorId: 'manager',
          actorName: 'Quản lý',
          reason: null,
          createdAt: '2026-10-04T00:00:00Z',
        }))}
      />
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Xem lịch sử xử lý' }))
    for (const action of actions) expect(screen.queryByText(action)).not.toBeInTheDocument()
    expect(screen.getByText('Duyệt kết quả kiểm hàng')).toBeInTheDocument()
    expect(screen.getByText('Gửi lại kết quả kiểm hàng')).toBeInTheDocument()
  })
})
