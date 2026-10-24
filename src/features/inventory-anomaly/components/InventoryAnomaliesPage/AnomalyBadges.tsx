import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AnomalyReviewStatus, AnomalySeverity } from '../../types/inventory-anomaly.types'
import { ANOMALY_REVIEW_STATUS_LABELS, ANOMALY_SEVERITY_LABELS } from '../../utils/anomaly-reasons'

export function AnomalySeverityBadge({ severity }: { readonly severity: AnomalySeverity }) {
  return severity === 'High' ? (
    <Badge variant="destructive">{ANOMALY_SEVERITY_LABELS.High}</Badge>
  ) : (
    <Badge className="bg-warning-container text-warning">{ANOMALY_SEVERITY_LABELS.Medium}</Badge>
  )
}

export function AnomalyReviewBadge({ status }: { readonly status: AnomalyReviewStatus }) {
  return (
    <Badge
      variant={status === 'Open' ? 'outline' : 'secondary'}
      className={cn(status === 'Confirmed' && 'text-destructive')}
    >
      {ANOMALY_REVIEW_STATUS_LABELS[status]}
    </Badge>
  )
}
