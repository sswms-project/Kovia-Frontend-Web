import { Badge } from '@/components/ui/badge'
import { formatWarehouseStatus } from '../../../utils/warehouse-labels'

export function InspectorHeader({
  title,
  code,
  status,
}: {
  readonly title: string
  readonly code: string
  readonly status?: string
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 pr-12">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px]">{title}</p>
          <h2 translate="no" className="truncate font-mono text-sm font-semibold">
            {code}
          </h2>
        </div>
        {status ? <Badge variant="outline">{formatWarehouseStatus(status)}</Badge> : null}
      </div>
    </div>
  )
}
