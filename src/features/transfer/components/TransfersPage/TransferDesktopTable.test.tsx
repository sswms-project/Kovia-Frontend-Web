import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { TransferSummary } from '../../types/transfer.types'
import { buildTransfer } from '../../utils/transfer-test-fixtures'
import { TransferDesktopTable } from './TransferDesktopTable'

describe('TransferDesktopTable', () => {
  it('keeps status and next action before scheduled dates, with matching row cells', () => {
    const item: TransferSummary = {
      ...buildTransfer(),
      lineCount: 1,
      requestedQuantity: 10,
      dispatchedQuantity: 0,
      receivedQuantity: 0,
      dispatchProgress: 'NotDispatched',
      receiveProgress: 'NotReceived',
      hasPendingPickEscalation: false,
      hasOpenDiscrepancy: false,
      nextActionCode: 'Pick',
      plannedTransferDate: '2026-10-20T08:30:00+07:00',
      requiredBy: '2026-10-21T09:45:00+07:00',
    }
    render(
      <TransferDesktopTable items={[item]} onPreview={vi.fn()} renderRowActions={() => null} />
    )

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers.slice(3, 8)).toEqual([
      'Trạng thái',
      'Tình trạng thực hiện',
      'Việc cần làm',
      'Ngày dự kiến điều chuyển',
      'Ngày hàng dự kiến về kho nhập',
    ])
    const cells = within(screen.getByRole('row', { name: /DC-0001/ })).getAllByRole('cell')
    expect(cells[5]).toHaveTextContent('Chờ lấy hàng')
    expect(cells[6]).toHaveTextContent('20/10/2026 08:30')
    expect(cells[7]).toHaveTextContent('21/10/2026 09:45')
  })
})
