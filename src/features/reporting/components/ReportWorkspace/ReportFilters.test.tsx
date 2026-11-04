import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import type { ReportDefinition, ReportFilterValues } from '../../schemas/warehouse-report.schema'
import { initialReportFilters } from '../../utils/report-filters'
import { ReportFilters } from './ReportFilters'

const definition: ReportDefinition = {
  type: 'inventory-balance',
  name: 'Tổng hợp nhập–xuất–tồn',
  group: 'Tồn kho',
  description: '',
  usesPeriod: true,
  requiresProduct: false,
  columns: [],
  formats: ['xlsx'],
}

function TestFilters({ onApply }: { readonly onApply: (values: ReportFilterValues) => boolean }) {
  const form = useForm<ReportFilterValues>({
    defaultValues: initialReportFilters(definition.type, { productId: 'old-product' }),
  })
  return (
    <ReportFilters
      form={form}
      definition={definition}
      options={{
        warehouses: [{ id: 'warehouse', name: 'Đà Nẵng' }],
        products: [{ id: 'old-product', sku: 'SKU001', name: 'Bia', unit: 'Thùng' }],
        categories: Array.from({ length: 60 }, (_, index) => ({
          id: `category-${index}`,
          name: `Nhóm hàng ${index}`,
          parentId: null,
        })),
        assignees: [],
        productsTruncated: false,
      }}
      isFetching={false}
      onApply={onApply}
    />
  )
}

describe('ReportFilters', () => {
  it('keeps the searchable category popup inside the modal and applies the category without the old product', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn<(values: ReportFilterValues) => boolean>(() => true)
    render(<TestFilters onApply={onApply} />)
    await user.click(screen.getByRole('button', { name: 'Tham số' }))
    const dialog = screen.getByRole('dialog')
    const categoryInput = within(dialog).getByRole('combobox', { name: 'Nhóm vật tư / hàng hóa' })
    await user.click(categoryInput)
    expect(await within(dialog).findByRole('listbox')).toBeInTheDocument()
    await user.type(categoryInput, 'Nhóm hàng 59')
    await user.click(await screen.findByRole('option', { name: 'Nhóm hàng 59' }))
    expect(onApply).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Xem báo cáo' }))
    await waitFor(() => expect(onApply).toHaveBeenCalledOnce())
    expect(onApply.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ categoryId: 'category-59', productId: '' })
    )
  })

  it('can return to all categories after selecting one', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn<(values: ReportFilterValues) => boolean>(() => true)
    render(<TestFilters onApply={onApply} />)
    await user.click(screen.getByRole('button', { name: 'Tham số' }))
    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByRole('combobox', { name: 'Nhóm vật tư / hàng hóa' })
    await user.click(input)
    await user.type(input, 'Nhóm hàng 59')
    await user.click(await screen.findByRole('option', { name: 'Nhóm hàng 59' }))
    await user.click(input)
    await user.clear(input)
    await user.click(await screen.findByRole('option', { name: 'Tất cả nhóm hàng' }))
    await user.click(within(dialog).getByRole('button', { name: 'Xem báo cáo' }))
    await waitFor(() => expect(onApply).toHaveBeenCalledOnce())
    expect(onApply.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ categoryId: '', productId: '' })
    )
  })
})
