import { describe, expect, it } from 'vitest'
import type { TransferDetail } from '../types/transfer.types'
import { buildTransferHistory } from './transfer-history'

const detail = {
  createdAt: '2026-11-01T01:00:00Z',
  createdByName: 'Chủ',
  completedAt: '2026-11-01T05:00:00Z',
  completedByName: 'Nhân viên nhận',
  shipments: [
    {
      shipmentNumber: 1,
      createdAt: '2026-11-01T02:00:00Z',
      createdByName: 'Quản lý',
      dispatchedAt: '2026-11-01T03:00:00Z',
      dispatchedByName: 'Nhân viên xuất',
      receivedAt: '2026-11-01T04:00:00Z',
      receivedByName: 'Nhân viên nhận',
    },
  ],
} as unknown as TransferDetail

describe('buildTransferHistory', () => {
  it('shows who created, dispatched, received and completed', () => {
    const actors = Object.fromEntries(
      buildTransferHistory(detail).map((entry) => [entry.action, entry.actorName])
    )

    expect(actors['Tạo đợt xuất 1']).toBe('Quản lý')
    expect(actors['Xuất đợt 1']).toBe('Nhân viên xuất')
    expect(actors['Nhận đợt 1']).toBe('Nhân viên nhận')
    expect(actors['Hoàn tất']).toBe('Nhân viên nhận')
  })
})
