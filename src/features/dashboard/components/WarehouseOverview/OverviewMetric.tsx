import Link from 'next/link'
import type { Route } from 'next'
import type { UrlObject } from 'url'
import { ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface OverviewMetricProps {
  readonly label: string
  readonly value: number
  readonly description: string
  readonly href?: Route | UrlObject
}
export function OverviewMetric({ label, value, description, href }: OverviewMetricProps) {
  return (
    <Card className="transition-shadow duration-150 hover:shadow-sm motion-reduce:transition-none">
      <CardContent className="p-5">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="mt-3 text-3xl font-semibold tabular-nums">{value.toLocaleString('vi-VN')}</p>
        <p className="text-muted-foreground mt-2 text-xs">{description}</p>
        {href ? (
          <Link
            href={href}
            className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            Xem chi tiết
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}
