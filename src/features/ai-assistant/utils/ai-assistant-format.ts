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

const asOfFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: OPERATIONAL_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "HH:mm dd/MM/yyyy" theo múi giờ vận hành, cho dòng "Số liệu tại …". */
export function formatAiAsOf(value: string): string {
  const parts = Object.fromEntries(
    asOfFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value])
  )
  return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}/${parts.year}`
}
