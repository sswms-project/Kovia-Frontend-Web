import { afterEach, describe, expect, it, vi } from 'vitest'
import { inventoryExportSchema } from '../schemas/inventory-export.schema'
import { downloadInventoryExport, inventoryExportFileName } from './inventory-export'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('inventory export contract and file download', () => {
  it('strips pagination and technical fields while retaining every declared filter', () => {
    const filters = {
      warehouseId: crypto.randomUUID(),
      zoneId: crypto.randomUUID(),
      rackId: crypto.randomUUID(),
      slotId: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      categoryId: crypto.randomUUID(),
      searchTerm: '00012',
      inStockOnly: true,
    }
    expect(
      inventoryExportSchema.parse({
        ...filters,
        pageNumber: 3,
        pageSize: 20,
        tenantId: 'injected',
        includeLastCount: true,
      })
    ).toEqual(filters)
    expect(
      inventoryExportSchema.safeParse({ slotId: '00000000-0000-0000-0000-000000000000' }).success
    ).toBe(false)
    expect(inventoryExportSchema.safeParse({ searchTerm: 'a'.repeat(501) }).success).toBe(false)
    expect(
      inventoryExportSchema.safeParse({ warehouseId: null, searchTerm: 'a'.repeat(500) }).success
    ).toBe(true)
  })

  it('accepts server XLSX names and rejects malformed or unsafe filenames', () => {
    expect(inventoryExportFileName('attachment; filename="kovia-ton-kho-20261019.xlsx"')).toBe(
      'kovia-ton-kho-20261019.xlsx'
    )
    expect(inventoryExportFileName("attachment; filename*=UTF-8''t%E1%BB%93n%20kho.xlsx")).toBe(
      'tồn kho.xlsx'
    )
    for (const name of [
      undefined,
      'attachment; filename="../../secret.xlsx"',
      'attachment; filename="file.exe"',
      'attachment; filename="test\r\n.xlsx"',
      "attachment; filename*=UTF-8''%ZZ.xlsx",
      'attachment; filename=".hidden.xlsx"',
    ]) {
      expect(inventoryExportFileName(name)).toBe('kovia-ton-kho-kha-dung.xlsx')
    }
  })

  it('downloads once and releases the object URL after the browser can consume it', () => {
    vi.useFakeTimers()
    const createObjectURL = vi.fn(() => 'blob:inventory-test')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadInventoryExport(new Blob(['test']), 'kovia.xlsx')
    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a[download]')).toBeNull()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:inventory-test')
  })
})
