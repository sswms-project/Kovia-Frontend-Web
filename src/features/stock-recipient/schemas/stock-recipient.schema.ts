import { z } from 'zod'
import { optionalPhoneSchema } from '@/features/supplier/schemas/supplier.schema'
import type { CreateStockRecipientRequest } from '../types/stock-recipient.types'

export const stockRecipientSchema = z.object({
  recipientCode: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã khách hàng.')
    .max(50, 'Mã khách hàng tối đa 50 ký tự.'),
  recipientName: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên khách hàng.')
    .max(255, 'Tên khách hàng tối đa 255 ký tự.'),
  recipientType: z.enum(['Organization', 'Individual']),
  taxCode: z.string().trim().max(50, 'Mã số thuế tối đa 50 ký tự.'),
  phone: optionalPhoneSchema('Số điện thoại'),
  email: z
    .string()
    .trim()
    .max(255, 'Email tối đa 255 ký tự.')
    .refine((value) => !value || z.email().safeParse(value).success, 'Email không hợp lệ.'),
  address: z.string().trim().max(500, 'Địa chỉ tối đa 500 ký tự.'),
  shippingAddress: z.string().trim().max(500, 'Địa chỉ giao hàng tối đa 500 ký tự.'),
  contactSalutation: z.string().trim().max(30, 'Xưng hô tối đa 30 ký tự.'),
  contactName: z.string().trim().max(255, 'Họ tên người liên hệ tối đa 255 ký tự.'),
  contactMobile: optionalPhoneSchema('Số điện thoại di động'),
  contactChannel: z.string().trim().max(50, 'Kênh liên hệ tối đa 50 ký tự.'),
  contactChannelName: z.string().trim().max(255, 'Tên kênh tối đa 255 ký tự.'),
})

export type StockRecipientFormValues = z.infer<typeof stockRecipientSchema>

export function toStockRecipientRequest(
  values: StockRecipientFormValues
): CreateStockRecipientRequest {
  const isOrganization = values.recipientType === 'Organization'

  return {
    recipientCode: values.recipientCode,
    recipientName: values.recipientName,
    recipientType: values.recipientType,
    taxCode: values.taxCode || null,
    phone: values.phone,
    email: values.email || null,
    address: values.address,
    shippingAddress: values.shippingAddress || null,
    contactSalutation: values.contactSalutation || null,
    contactName: isOrganization ? values.contactName || null : null,
    contactMobile: values.contactMobile || null,
    contactChannel: values.contactChannel || null,
    contactChannelName: values.contactChannelName || null,
  }
}

export const emptyStockRecipientFormValues: StockRecipientFormValues = {
  recipientCode: '',
  recipientName: '',
  recipientType: 'Organization',
  taxCode: '',
  phone: '',
  email: '',
  address: '',
  shippingAddress: '',
  contactSalutation: '',
  contactName: '',
  contactMobile: '',
  contactChannel: '',
  contactChannelName: '',
}
