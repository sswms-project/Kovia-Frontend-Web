import { describe, expect, it } from 'vitest'
import type { SupplierImportPreviewRow } from '../types/supplier.types'
import { toImportItem } from './supplier-import'

describe('toImportItem', () => {
  it('drops preview-only fields and keeps the BE command payload', () => {
    const row: SupplierImportPreviewRow = {
      rowNumber: 2,
      errors: [],
      fieldErrors: { contactEmail: ['Lỗi xem trước'] },
      supplierCode: null,
      supplierName: 'Công ty A',
      taxCode: null,
      phone: '0900000001',
      email: null,
      address: null,
      contactSalutation: null,
      contactName: 'Nguyễn Văn An',
      contactEmail: 'an@example.com',
      contactMobile: '+84 901 234 567',
      contactChannel: null,
      contactChannelName: null,
    }

    const item = toImportItem(row)

    expect(item.rowNumber).toBe(2)
    expect(item).not.toHaveProperty('errors')
    expect(item).not.toHaveProperty('fieldErrors')
    expect(item).toMatchObject({ supplierName: 'Công ty A', phone: '0900000001' })
    const other = toImportItem({
      ...row,
      rowNumber: 3,
      supplierName: 'Công ty B',
      contactName: 'Trần Thị Bình',
      contactEmail: 'binh@example.com',
      contactMobile: '0901234568',
    })
    expect(item).toMatchObject({
      contactName: 'Nguyễn Văn An',
      contactEmail: 'an@example.com',
      contactMobile: '+84 901 234 567',
    })
    expect(other).toMatchObject({
      contactName: 'Trần Thị Bình',
      contactEmail: 'binh@example.com',
      contactMobile: '0901234568',
    })
  })
})
