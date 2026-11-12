import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { InboundDocumentImport } from '../../../types/inbound.types'
import { ImportState } from './ImportState'

const failedImport: InboundDocumentImport = {
  id: 'import-1',
  fileName: 'phieu.png',
  contentType: 'image/png',
  fileSize: 1024,
  status: 'Failed',
  schemaVersion: 'v1',
  failureCode: 'ProviderUnavailable',
  failureMessage: 'Dịch vụ phân tích chứng từ đang tạm ngưng.',
  extractionProvider: null,
  extractionModel: null,
  createdAt: '2026-11-11T00:00:00Z',
  reviewedAt: null,
  goodsReceiptId: null,
  duplicateFileDetected: false,
  review: null,
}

describe('ImportState', () => {
  it('shows the failure reason and lets the user retry', () => {
    const onRetry = vi.fn()
    render(
      <ImportState
        importData={failedImport}
        draftReceiptId={null}
        isLoading={false}
        onRetry={onRetry}
        onManualFallback={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText('Dịch vụ phân tích chứng từ đang tạm ngưng.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
