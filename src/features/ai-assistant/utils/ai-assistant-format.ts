import { OPERATIONAL_TIME_ZONE } from '@/lib/operational-date-time'

const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: OPERATIONAL_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: OPERATIONAL_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** Giờ:phút theo múi giờ vận hành, không theo múi giờ của máy. */
export function formatAiTime(value: string): string {
  return timeFormatter.format(new Date(value))
}

/** Ngày/tháng giờ:phút theo múi giờ vận hành. */
export function formatAiDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value))
}
