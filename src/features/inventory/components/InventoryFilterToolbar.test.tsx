import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, it } from 'vitest'
import {
  InventoryFilterToolbar,
  InventorySearch,
  InventoryWarehouseFilter,
} from './InventoryFilterToolbar'
import { InventoryFiltersProvider, useInventoryFilter } from '../hooks/use-inventory-filter'

function InventoryTab({ tab }: { readonly tab: string }) {
  const [warehouse, setWarehouse] = useInventoryFilter<string>('warehouse', '')
  const [search, setSearch] = useInventoryFilter<string>(`${tab}.search`, '')
  const [slot, setSlot] = useInventoryFilter<string>('InventoryPage.slotId', '')
  return (
    <InventoryFilterToolbar
      search={<InventorySearch value={search} onChange={setSearch} placeholder="Tìm mặt hàng" />}
      warehouse={
        <InventoryWarehouseFilter
          value={warehouse}
          onChange={setWarehouse}
          options={[
            { value: 'hanoi', label: 'Kho Hà Nội' },
            { value: 'danang', label: 'Kho Đà Nẵng' },
          ]}
        />
      }
      appliedFilters={[Boolean(slot) && { label: 'Kệ A01', clear: () => setSlot('') }]}
      onReset={() => setSlot('')}
    >
      <button type="button" onClick={() => setSlot('a01')}>
        Chọn kệ A01
      </button>
    </InventoryFilterToolbar>
  )
}

function Workspace() {
  const [tab, setTab] = useState('availability')
  return (
    <InventoryFiltersProvider>
      <button type="button" onClick={() => setTab('availability')}>
        Tồn kho khả dụng
      </button>
      <button type="button" onClick={() => setTab('movements')}>
        Lịch sử biến động
      </button>
      <InventoryTab key={tab} tab={tab} />
    </InventoryFiltersProvider>
  )
}

it('giữ kho và tìm kiếm theo tab, rồi bỏ vị trí khi đổi kho', () => {
  render(<Workspace />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Kho' }), { target: { value: 'hanoi' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Tìm mặt hàng' }), {
    target: { value: 'SKU001' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Bộ lọc' }))
  fireEvent.click(screen.getByRole('button', { name: 'Chọn kệ A01' }))
  fireEvent.click(screen.getByRole('button', { name: 'Xem kết quả' }))
  expect(screen.getByRole('button', { name: 'Bỏ bộ lọc Kệ A01' })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Lịch sử biến động' }))
  expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Kho' }).value).toBe('hanoi')
  expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Tìm mặt hàng' }).value).toBe('')
  fireEvent.change(screen.getByRole('combobox', { name: 'Kho' }), { target: { value: 'danang' } })

  fireEvent.click(screen.getByRole('button', { name: 'Tồn kho khả dụng' }))
  expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Tìm mặt hàng' }).value).toBe(
    'SKU001'
  )
  expect(screen.queryByRole('button', { name: 'Bỏ bộ lọc Kệ A01' })).toBeNull()
})
