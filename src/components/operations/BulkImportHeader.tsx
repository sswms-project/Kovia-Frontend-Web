import type { ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BulkImportHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  children,
}: {
  readonly eyebrow: string
  readonly title: string
  readonly description?: string
  readonly backHref: Route
  readonly backLabel: string
  readonly children: ReactNode
}) {
  return (
    <header className="flex min-w-0 shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Button asChild variant="outline" size="icon">
          <Link href={backHref} aria-label={backLabel}>
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="text-primary text-xs font-medium">{eyebrow}</p>
          <h1 className="text-xl font-semibold wrap-anywhere">{title}</h1>
          {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
        </div>
      </div>
      {children}
    </header>
  )
}
