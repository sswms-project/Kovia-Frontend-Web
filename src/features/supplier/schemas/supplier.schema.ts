import { z } from 'zod'

const optionalPhoneSchema = (label: string) =>
  z
    .string()
    .trim()
    .max(30, `${label} tối đa 30 ký tự.`)
    .refine(
      (value) =>
        value === '' ||
        (/^\+?[0-9][0-9 ()-]*[0-9]$/.test(value) &&
          (value.match(/[0-9]/g)?.length ?? 0) >= 7 &&
          (value.match(/[0-9]/g)?.length ?? 0) <= 15),
      `${label} không hợp lệ.`
    )

export const saveSupplierSchema = z.object({
  supplierCode: z
    .string()
    .trim()
    .min(1, 'Mã nhà cung cấp là bắt buộc.')
    .max(50, 'Mã nhà cung cấp tối đa 50 ký tự.'),
  supplierName: z
    .string()
    .trim()
    .min(1, 'Tên nhà cung cấp là bắt buộc.')
    .max(255, 'Tên nhà cung cấp tối đa 255 ký tự.'),
  taxCode: z.string().trim().max(50, 'Mã số thuế tối đa 50 ký tự.'),
  phone: optionalPhoneSchema('Số điện thoại'),
  email: z
    .string()
    .trim()
    .max(255, 'Email tối đa 255 ký tự.')
    .refine((value) => value === '' || z.string().email().safeParse(value).success, {
      message: 'Email không hợp lệ.',
    }),
  address: z.string().trim().max(500, 'Địa chỉ tối đa 500 ký tự.'),
  contactSalutation: z.string().trim().max(30, 'Xưng hô tối đa 30 ký tự.'),
  contactName: z.string().trim().max(255, 'Tên người liên hệ tối đa 255 ký tự.'),
  contactEmail: z
    .string()
    .trim()
    .max(255, 'Email người liên hệ tối đa 255 ký tự.')
    .refine((value) => value === '' || z.string().email().safeParse(value).success, {
      message: 'Email người liên hệ không hợp lệ.',
    }),
  contactMobile: optionalPhoneSchema('Số điện thoại người liên hệ'),
  contactChannel: z.string().trim().max(50, 'Kênh liên hệ tối đa 50 ký tự.'),
  contactChannelName: z.string().trim().max(255, 'Tên kênh tối đa 255 ký tự.'),
})

export type SaveSupplierFormValues = z.infer<typeof saveSupplierSchema>

export const emptySupplierFormValues: SaveSupplierFormValues = {
  supplierCode: '',
  supplierName: '',
  taxCode: '',
  phone: '',
  email: '',
  address: '',
  contactSalutation: '',
  contactName: '',
  contactEmail: '',
  contactMobile: '',
  contactChannel: '',
  contactChannelName: '',
}
