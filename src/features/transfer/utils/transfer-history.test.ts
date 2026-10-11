import { describe, expect, it } from 'vitest'
import { buildTransferHistory } from './transfer-history'
import { buildShipment, buildTransfer } from './transfer-test-fixtures'

describe('buildTransferHistory', () => {
  it('lists the milestones that have a timestamp in chronological order', () => {
    const history = buildTransferHistory(
      buildTransfer({
        createdAt: '2026-10-08T00:00:00Z',
        submittedAt: '2026-10-08T00:05:00Z',
        completedAt: '2026-10-10T00:00:00Z',
        shipments: [
          buildShipment({
            shipmentNumber: 1,
            createdAt: '2026-10-08T01:00:00Z',
            dispatchedAt: '2026-10-08T03:00:00Z',
            receivedAt: '2026-10-09T03:00:00Z',
          }),
        ],
      })
    )
    expect(history.map((entry) => entry.action)).toEqual([
      'Tạo phiếu',
      'Gửi yêu cầu và giữ chỗ tồn kho',
      'Tạo đợt xuất 1',
      'Xuất đợt 1',
      'Nhận đợt 1',
      'Hoàn tất',
    ])
  })

  it('skips unset milestones and records reasons for stop and cancel', () => {
    const history = buildTransferHistory(
      buildTransfer({
        submittedAt: null,
        stoppedAt: '2026-10-09T00:00:00Z',
        stopReason: 'Kho nhập đầy',
      })
    )
    const stop = history.find((entry) => entry.action === 'Dừng phần còn lại')
    expect(stop?.reason).toBe('Kho nhập đầy')
    expect(history.some((entry) => entry.action.startsWith('Gửi yêu cầu'))).toBe(false)
  })

  it('shows feedback with its author and the reply', () => {
    const history = buildTransferHistory(
      buildTransfer({
        feedbacks: [
          {
            id: 'f1',
            itemId: null,
            reasonCode: 'InsufficientStock',
            message: 'Kệ A hết hàng',
            status: 'Answered',
            reply: 'Đã bổ sung tồn',
            authorId: 'u1',
            authorName: 'Quản lý Kho A',
            createdAt: '2026-10-08T05:00:00Z',
            repliedAt: '2026-10-08T06:00:00Z',
          },
        ],
      })
    )
    expect(history.find((entry) => entry.action.startsWith('Phản hồi'))).toMatchObject({
      actorName: 'Quản lý Kho A',
      reason: 'Kệ A hết hàng',
    })
    expect(history.find((entry) => entry.action === 'Trả lời phản hồi')?.reason).toBe(
      'Đã bổ sung tồn'
    )
  })
})
