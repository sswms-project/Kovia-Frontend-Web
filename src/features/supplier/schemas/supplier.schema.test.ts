import { describe, expect, it } from 'vitest'
import { emptySupplierFormValues, saveSupplierSchema } from './supplier.schema'

const valid = { ...emptySupplierFormValues, supplierCode: 'NCC1', supplierName: 'NCC A' }

describe('optional supplier contact fields', () => {
  it('allows all contact fields to be blank or whitespace', () => {
    expect(saveSupplierSchema.safeParse(valid).success).toBe(true)
    expect(
      saveSupplierSchema.safeParse({
        ...valid,
        email: ' ',
        contactEmail: ' ',
        phone: ' ',
        contactMobile: ' ',
      }).success
    ).toBe(true)
  })
  it.each(['0901234567', '+84 901 234 567', '028-3456-7890'])('accepts phone %s', (phone) => {
    expect(saveSupplierSchema.safeParse({ ...valid, phone, contactMobile: phone }).success).toBe(
      true
    )
  })
  it.each(['not-a-phone', '123', '1234567890123456', '0901234567abc'])(
    'rejects phone %s',
    (phone) => {
      const result = saveSupplierSchema.safeParse({ ...valid, phone, contactMobile: phone })
      expect(result.success).toBe(false)
      if (!result.success)
        expect(result.error.issues.map((issue) => issue.path[0])).toEqual([
          'phone',
          'contactMobile',
        ])
    }
  )
  it('rejects provided invalid emails without making contact name mandatory', () => {
    const result = saveSupplierSchema.safeParse({
      ...valid,
      email: 'bad-email',
      contactEmail: 'bad-contact-email',
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(['email', 'contactEmail'])
  })
})
