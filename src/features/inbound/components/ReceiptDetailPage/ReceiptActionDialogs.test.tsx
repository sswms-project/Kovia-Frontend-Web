import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReceiptActionDialogs } from './ReceiptActionDialogs'

describe('ReceiptActionDialogs refusal approval', () => {
  it.each([false, true])(
    'explains no stock posting and retains self approval=%s',
    (selfApprovalRequired) => {
      render(
        <ReceiptActionDialogs
          isRefusalOnly
          confirmationAction="Approve"
          isRejectOpen={false}
          isPending={false}
          selfApprovalRequired={selfApprovalRequired}
          onConfirm={vi.fn()}
          onCancelConfirmation={vi.fn()}
          onReject={vi.fn()}
          onRejectOpenChange={vi.fn()}
        />
      )
      expect(screen.getByRole('alertdialog')).toHaveTextContent(
        'không ghi tồn hoặc tạo việc cất hàng'
      )
      if (selfApprovalRequired)
        expect(screen.getByRole('alertdialog')).toHaveTextContent('xác nhận tự duyệt')
    }
  )
})
