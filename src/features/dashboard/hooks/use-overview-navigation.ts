import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { stockAlertKindSchema } from '../schemas/stock-alert.schema'
import {
  activityPeriodSchema,
  defaultActivityPeriod,
  resolveActivityPeriod,
} from '../schemas/activity-period.schema'

export function useOverviewNavigation() {
  const params = useSearchParams()
  const pathname = usePathname()
  const rawWarehouseId = params.get('warehouseId') ?? ''
  const invalidWarehouse = Boolean(rawWarehouseId) && !z.guid().safeParse(rawWarehouseId).success
  const parsedDays = Number(params.get('expiringDays') ?? 5)
  const expiringDays =
    Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 365 ? parsedDays : 5
  const parsedKind = stockAlertKindSchema.safeParse(params.get('alert'))
  const kind = parsedKind.success ? parsedKind.data : 'below-minimum'
  const tab = params.get('tab') === 'activity' ? 'activity' : 'alerts'
  const defaults = defaultActivityPeriod()
  const parsedPeriod = activityPeriodSchema.shape.period.safeParse(
    params.get('activityPeriod') ?? defaults.period
  )
  const activityPeriod = {
    period: parsedPeriod.success ? parsedPeriod.data : defaults.period,
    week: params.get('activityWeek') ?? defaults.week,
    month: params.get('activityMonth') ?? defaults.month,
    year: params.get('activityYear') ?? defaults.year,
    quarter: params.get('activityQuarter') ?? defaults.quarter,
    dateFrom: params.get('activityFrom') ?? defaults.dateFrom,
    dateTo: params.get('activityTo') ?? defaults.dateTo,
  }
  const validPeriod = parsedPeriod.success && activityPeriodSchema.safeParse(activityPeriod).success
  const activityRange = validPeriod ? resolveActivityPeriod(activityPeriod) : undefined
  const updateLocation = (values: Readonly<Record<string, string>>) => {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    window.history.pushState(null, '', `${pathname}${next.size ? `?${next}` : ''}`)
  }
  return {
    warehouseId: rawWarehouseId,
    invalidWarehouse,
    expiringDays,
    kind,
    tab,
    activityPeriod,
    activityRange,
    updateLocation,
  }
}

export function useOverviewCompactLayout() {
  const ref = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(true)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => setCompact(element.clientWidth < 1000 || window.innerHeight < 720)
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])
  return { ref, compact }
}
