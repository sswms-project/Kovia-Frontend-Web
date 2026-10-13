import { describe, expect, it } from 'vitest'
import { describeTransferError } from './transfer-errors'

describe('describeTransferError', () => {
  it('treats 409 as a conflict that needs a reload', () => {
    const result = describeTransferError(
      { statusCode: 409, message: 'Phiếu vừa thay đổi.' },
      'Không thể lưu.'
    )
    expect(result.kind).toBe('conflict')
    expect(result.message).toContain('Phiếu vừa thay đổi.')
    expect(result.message).toContain('tải lại')
  })

  it('does not tell the user to reload for a business-rule 409', () => {
    const result = describeTransferError(
      { statusCode: 409, message: 'Vị trí này chỉ được chứa một sản phẩm tại một thời điểm.' },
      'Không thể nhận hàng.'
    )
    expect(result.kind).toBe('rejected')
    expect(result.message).toBe('Vị trí này chỉ được chứa một sản phẩm tại một thời điểm.')
  })
  it.each([
    'Hãy bắt đầu nhận hàng trước khi nộp phiếu kiểm hàng.',
    'Đợt xuất chưa có phiếu kiểm hàng đang chờ cất.',
  ])('requires fresh data for a shipment-state 409: %s', (message) => {
    const result = describeTransferError({ statusCode: 409, message }, 'Không thể lưu.')
    expect(result.kind).toBe('conflict')
    expect(result.message).toContain(message)
    expect(result.message).toContain('tải lại')
  })
  it('classifies missing storage-unit conversion as a correctable business rejection', () => {
    const result = describeTransferError(
      { statusCode: 409, message: 'Sản phẩm SKU00001 chưa có quy đổi sang đơn vị sức chứa.' },
      'Không thể cất.'
    )
    expect(result.kind).toBe('rejected')
    expect(result.message).not.toContain('tải lại')
  })
  it('uses a structured stale-plan code even without the Vietnamese fallback phrase', () => {
    expect(
      describeTransferError(
        {
          statusCode: 409,
          message: 'Kế hoạch không còn hợp lệ.',
          errors: { code: ['TRANSFER_PUTAWAY_PLAN_CHANGED'] },
        },
        'Không thể cất.'
      ).kind
    ).toBe('conflict')
  })

  it('does not mistake a forbidden business change for stale data', () => {
    const result = describeTransferError(
      { statusCode: 409, message: 'Không thể thay đổi đơn vị khi đã có tồn kho.' },
      'Không thể lưu.'
    )
    expect(result.kind).toBe('rejected')
    expect(result.message).not.toContain('tải lại')
  })

  it('capitalises the message and does not repeat the reload hint', () => {
    const result = describeTransferError(
      {
        statusCode: 409,
        message: 'phiếu điều chuyển đã thay đổi. Vui lòng tải lại và thử lại.',
      },
      'Không thể lưu.'
    )
    expect(result.message).toBe('Phiếu điều chuyển đã thay đổi. Vui lòng tải lại và thử lại.')
  })

  it('does not report success or failure when the connection dropped', () => {
    expect(describeTransferError({ statusCode: 500, message: 'Network Error' }, 'x').kind).toBe(
      'unknown-result'
    )
    expect(
      describeTransferError({ statusCode: 500, message: 'timeout of 30000ms exceeded' }, 'x').kind
    ).toBe('unknown-result')
  })

  it('passes validation and business errors through as rejected', () => {
    const result = describeTransferError(
      { statusCode: 400, message: 'Thiếu tồn.', errors: { items: ['Kệ A còn 2'] } },
      'x'
    )
    expect(result.kind).toBe('rejected')
    expect(result.message).toContain('Thiếu tồn.')
    expect(result.message).toContain('Kệ A còn 2')
  })

  it('falls back for unknown error shapes', () => {
    expect(describeTransferError(undefined, 'Không thể lưu.').message).toBe('Không thể lưu.')
    expect(describeTransferError(new Error('boom'), 'Không thể lưu.').message).toBe('boom')
    expect(describeTransferError(new Error('Failed to fetch'), 'x').kind).toBe('unknown-result')
    expect(
      describeTransferError({ statusCode: 503, message: 'Service unavailable' }, 'x').kind
    ).toBe('unknown-result')
  })
})
