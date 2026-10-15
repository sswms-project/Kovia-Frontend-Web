import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildTransfer } from '../../utils/transfer-test-fixtures'
import { TransferOverview } from './TransferOverview'

describe('TransferOverview dates', () => {
  it('labels both dates and distinguishes legacy date-only arrival from selected midnight', () => {
    render(
      <TransferOverview
        transfer={buildTransfer({
          plannedTransferDate: '2026-10-20T00:00:00+07:00',
          requiredBy: '2026-10-20T23:59:59.999+07:00',
        })}
      />
    )
    expect(screen.getByText('Ngày dự kiến điều chuyển')).toBeInTheDocument()
    expect(screen.getByText('Ngày hàng dự kiến về kho nhập')).toBeInTheDocument()
    expect(screen.getByText('20/10/2026 00:00')).toBeInTheDocument()
    expect(screen.getByText('20/10/2026')).toBeInTheDocument()
    expect(screen.queryByText('Hạn cần hàng')).not.toBeInTheDocument()
  })
})
