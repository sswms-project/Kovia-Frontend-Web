import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import type { TransferRequestFormValues } from '../../schemas/transfer-request.schema'
import { emptyTransferForm } from '../../utils/transfer-form'
import { TransferForm } from './TransferForm'

describe('TransferForm advisory load warning', () => {
  it.each([false, true])(
    'disables editing only while saving (%s), never because the destination is busy',
    (isSaving) => {
      const submit = vi.fn()
      const noop = () => undefined
      function Harness() {
        const form = useForm<TransferRequestFormValues>({ defaultValues: emptyTransferForm() })
        return (
          <TransferForm
            form={form}
            fields={[]}
            mode="create"
            destinationOptions={[]}
            sourceOptions={[]}
            warehousesLocked={false}
            productOptions={[]}
            knownProductOptions={{}}
            unitsByProductId={{}}
            isUnitLoading={false}
            isUnitError={false}
            hasWarehouses={false}
            showSourceSlot={false}
            sourceWarehouseId=""
            knownSourceSlots={{}}
            showDestinationSlot={false}
            destinationSlotOptions={[]}
            knownDestinationSlots={{}}
            isDestinationSlotLoading={false}
            lockedDestinationItemIds={new Set()}
            onDestinationSlotSearchChange={noop}
            lockByItemId={{}}
            isProductSearchLoading={false}
            isSaving={isSaving}
            requesterNames={[]}
            canCreateRelocation={false}
            onCodeChange={noop}
            onSelectInternalRelocation={noop}
            onDestinationChange={noop}
            onSourceChange={noop}
            onProductSearchChange={noop}
            onAddLine={noop}
            onRemoveLine={noop}
            onSaveDraft={noop}
            onCancel={noop}
            onSubmit={submit}
            destinationLoad={{ total: 3, threshold: 2, inboundRequestCount: 1, transferCount: 2 }}
          />
        )
      }
      render(<Harness />)
      expect(screen.getByRole('status')).toHaveTextContent('Bạn vẫn có thể tiếp tục.')
      const button = screen.getByRole('button', { name: isSaving ? 'Đang lưu…' : 'Tạo yêu cầu' })
      if (isSaving) {
        expect(screen.getByRole('group', { name: 'Nội dung yêu cầu điều chuyển' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Thêm dòng' })).toBeDisabled()
        fireEvent.submit(button.closest('form')!)
        expect(submit).not.toHaveBeenCalled()
        return
      }
      expect(screen.getByRole('group', { name: 'Thao tác yêu cầu điều chuyển' })).toHaveClass(
        'sticky',
        'bottom-0',
        'shrink-0',
        'py-1.5'
      )
      expect(button.closest('form')).toHaveClass('gap-3', 'overflow-y-auto')
      expect(button).toBeEnabled()
      fireEvent.click(button)
      expect(submit).toHaveBeenCalledOnce()
    }
  )
})
