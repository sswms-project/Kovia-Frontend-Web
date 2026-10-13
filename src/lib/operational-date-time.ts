export const OPERATIONAL_TIME_ZONE = 'Asia/Ho_Chi_Minh'
const ISO_FRACTION = /\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/i

function subMillisecondDigits(value: string): string {
  return (value.match(ISO_FRACTION)?.[1] ?? '').slice(3).padEnd(4, '0')
}

/** Preserve the remaining .NET timestamp precision when milliseconds compare equal. */
export function compareOperationalInstants(left: string, right: string): number {
  const milliseconds = Date.parse(left) - Date.parse(right)
  if (milliseconds) return milliseconds
  const leftFraction = subMillisecondDigits(left)
  const rightFraction = subMillisecondDigits(right)
  return leftFraction === rightFraction ? 0 : leftFraction < rightFraction ? -1 : 1
}
const dateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: OPERATIONAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Form values are Vietnam wall dates: yyyy-MM-dd, optionally followed by THH:mm. */
export function toOperationalDateTimeInput(value: string | null | undefined): string {
  if (!value) return ''
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return ''
  const parts = Object.fromEntries(
    dateTimeFormatter.formatToParts(instant).map((part) => [part.type, part.value])
  )
  const day = `${parts.year}-${parts.month}-${parts.day}`
  const isDateOnly =
    parts.hour === '23' &&
    parts.minute === '59' &&
    parts.second === '59' &&
    instant.getUTCMilliseconds() === 999 &&
    !/[1-9]/.test(subMillisecondDigits(value))
  return isDateOnly ? day : `${day}T${parts.hour}:${parts.minute}`
}

export function toOperationalDateTimeApi(value: string, original?: string | null): string | null {
  if (!value) return null
  // Preserve offsets, seconds and fractional precision when an existing date was not edited.
  if (original && toOperationalDateTimeInput(original) === value) return original
  return value.includes('T') ? `${value}:00+07:00` : `${value}T23:59:59.999+07:00`
}

export function isOperationalDateTimeInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d)?$/.test(value)) return false
  const instant = new Date(toOperationalDateTimeApi(value)!)
  return (
    !Number.isNaN(instant.getTime()) &&
    toOperationalDateTimeInput(instant.toISOString()).slice(0, 10) === value.slice(0, 10)
  )
}

export function formatOperationalOptionalTime(value: string | null | undefined): string {
  const input = toOperationalDateTimeInput(value)
  if (!input) return '—'
  const [day = '', time] = input.split('T')
  return `${day.split('-').reverse().join('/')}${time ? ` ${time}` : ''}`
}

export function operationalToday(now = new Date()): string {
  return toOperationalDateTimeInput(now.toISOString()).slice(0, 10)
}
