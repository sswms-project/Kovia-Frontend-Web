import {
  CircleAlert,
  CircleCheck,
  Info,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AlertSeverity, AlertStatus } from '../../types/ai-alerts.types'
import { ALERT_STATUS_LABELS, SEVERITY_LABELS } from '../../utils/ai-alerts-format'

const SEVERITY_STYLES: Record<AlertSeverity, { icon: LucideIcon; className: string }> = {
  Critical: { icon: OctagonAlert, className: 'text-destructive font-semibold' },
  High: { icon: TriangleAlert, className: 'text-destructive' },
  Medium: { icon: CircleAlert, className: 'text-warning' },
  Low: { icon: Info, className: 'text-muted-foreground' },
  Info: { icon: Info, className: 'text-primary' },
}

export function SeverityIndicator({ severity }: { readonly severity: AlertSeverity }) {
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.Info
  const Icon = style.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', style.className)}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {SEVERITY_LABELS[severity] ?? severity}
    </span>
  )
}

export function AlertStatusBadge({ status }: { readonly status: AlertStatus }) {
  if (status === 'Resolved') {
    return (
      <Badge variant="secondary">
        <CircleCheck aria-hidden="true" />
        {ALERT_STATUS_LABELS.Resolved}
      </Badge>
    )
  }
  return (
    <Badge variant={status === 'Open' ? 'default' : 'outline'}>
      {ALERT_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
