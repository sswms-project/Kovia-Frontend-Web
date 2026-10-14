export function reportMonthPeriod(previous: boolean, now = new Date()) {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now)
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00Z`)
  if (previous) monthStart.setUTCMonth(monthStart.getUTCMonth() - 1)
  const dateFrom = monthStart.toISOString().slice(0, 10)
  const monthEnd = new Date(monthStart)
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1)
  monthEnd.setUTCDate(0)
  return { dateFrom, dateTo: previous ? monthEnd.toISOString().slice(0, 10) : today }
}
