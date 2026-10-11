import { z } from 'zod'
import { AUDIT_LOG_TIME_RANGES, NOTIFICATION_TYPES } from '../types/platform-services.types'

const optionalFilter = (maximumLength: number) =>
  z.string().trim().max(maximumLength).optional().or(z.literal(''))

export const notificationFiltersSchema = z
  .object({
    search: optionalFilter(255),
    type: z.enum(NOTIFICATION_TYPES).optional().or(z.literal('')).or(z.literal('all')),
    readState: z.enum(['all', 'read', 'unread']).default('all'),
    dateFrom: z.iso.date().optional().or(z.literal('')),
    dateTo: z.iso.date().optional().or(z.literal('')),
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    message: 'Ngày kết thúc phải từ ngày bắt đầu trở đi.',
    path: ['dateTo'],
  })

export const auditLogFiltersSchema = z
  .object({
    search: optionalFilter(255),
    timeRange: z.enum(AUDIT_LOG_TIME_RANGES),
    dateFrom: z.iso.date().optional().or(z.literal('')),
    dateTo: z.iso.date().optional().or(z.literal('')),
  })
  .refine((value) => value.timeRange !== 'custom' || (value.dateFrom && value.dateTo), {
    message: 'Hãy chọn đầy đủ ngày bắt đầu và ngày kết thúc.',
    path: ['dateFrom'],
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    message: 'Ngày kết thúc phải từ ngày bắt đầu trở đi.',
    path: ['dateTo'],
  })

export const notificationCreatedEventSchema = z.object({
  notificationId: z.uuid(),
  type: z.enum(NOTIFICATION_TYPES),
  createdAt: z.iso.datetime({ offset: true }),
  referenceType: z.string().nullish(),
  referenceId: z.uuid().nullish(),
})
