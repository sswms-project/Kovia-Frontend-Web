import { describe, expect, it } from 'vitest'
import { startImportErrorMessage } from './document-import-error'

describe('startImportErrorMessage', () => {
  it('shows the quota message on 429', () => {
    expect(startImportErrorMessage({ statusCode: 429, message: 'x' })).toContain('hạn mức')
  })

  it('surfaces the server message for unsupported formats', () => {
    const message = 'Định dạng tệp chưa được hỗ trợ. Vui lòng tải ảnh PNG, JPG hoặc WEBP.'
    expect(startImportErrorMessage({ statusCode: 415, message })).toBe(message)
    expect(startImportErrorMessage({ statusCode: 400, message })).toBe(message)
  })

  it('falls back to a generic message for server or unknown errors', () => {
    expect(
      startImportErrorMessage({
        statusCode: 503,
        message: 'Document analysis provider is unavailable',
      })
    ).toBe('Không thể phân tích chứng từ. Bạn vẫn có thể nhập hàng thủ công.')
    expect(startImportErrorMessage(new Error('boom'))).toContain('nhập hàng thủ công')
  })
})
