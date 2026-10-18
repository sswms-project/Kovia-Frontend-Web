import Link from 'next/link'
import type { UrlObject } from 'url'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export interface WarehouseOperationMetric {
  readonly label: string
  readonly value: number
  readonly description: string
  readonly href?: UrlObject
}

export function WarehouseOperationMetrics({
  metrics,
}: {
  readonly metrics: readonly WarehouseOperationMetric[]
}) {
  return (
    <section aria-label="Chỉ số hiện tại" className="grid shrink-0 grid-cols-4 gap-3">
      {metrics.map((metric) => (
        <Card key={metric.label} size="sm" className="min-w-0 rounded-xl border ring-0">
          <CardHeader>
            <CardTitle>{metric.label}</CardTitle>
            {metric.href ? (
              <CardAction>
                <Button asChild variant="ghost" size="icon-sm">
                  <Link
                    href={metric.href}
                    aria-label={`Xem chi tiết ${metric.label}`}
                    title={`Xem chi tiết ${metric.label}`}
                  >
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <p className="text-2xl font-semibold tabular-nums">
              {metric.value.toLocaleString('vi-VN')}
            </p>
            <CardDescription>{metric.description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
