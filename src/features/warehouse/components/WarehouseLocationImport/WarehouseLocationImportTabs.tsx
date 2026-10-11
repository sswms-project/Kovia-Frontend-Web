import { useId } from 'react'
import { Grid2X2, Layers, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { WarehouseLocationImportKind } from '../../schemas/warehouse-location-import.schema'
import type { WarehouseLocationImportRow } from '../../types/warehouse-location-import.types'
import { LOCATION_IMPORT_LABELS } from '../../utils/warehouse-location-import'

const ICONS = { Zone: Grid2X2, Rack: Layers, Slot: MapPin }

interface WarehouseLocationImportTabsProps {
  readonly kinds: readonly WarehouseLocationImportKind[]
  readonly label: string
  readonly rows?: readonly WarehouseLocationImportRow[]
}

export function WarehouseLocationImportTabs({
  kinds,
  label,
  rows,
}: WarehouseLocationImportTabsProps) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <TabsList
        aria-label={label}
        variant="workspace"
        className={cn(
          'grid w-full gap-2 p-0',
          kinds.length === 1 ? 'grid-cols-1' : kinds.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
        )}
      >
        {kinds.map((kind) => {
          const Icon = ICONS[kind]
          const items = rows?.filter((row) => row.kind === kind)
          const invalid = items?.filter((row) => row.issues.length > 0).length ?? 0
          return (
            <TabsTrigger
              key={kind}
              value={kind}
              aria-label={LOCATION_IMPORT_LABELS[kind]}
              aria-describedby={items ? `${id}-${kind}` : undefined}
              className="group/location-tab border-border bg-card min-h-12 min-w-0 flex-wrap gap-2 px-3 py-2 text-sm transition-colors motion-reduce:transition-none"
            >
              <Icon aria-hidden="true" data-icon="inline-start" />
              <span className="whitespace-normal">{LOCATION_IMPORT_LABELS[kind]}</span>
              {items ? (
                <span
                  id={`${id}-${kind}`}
                  className="flex flex-wrap items-center justify-center gap-2 text-xs tabular-nums"
                >
                  <span>{items.length} dòng</span>
                  {invalid > 0 ? (
                    <Badge
                      variant="destructive"
                      className="group-data-[state=active]/location-tab:bg-primary-foreground group-data-[state=active]/location-tab:text-destructive"
                    >
                      {invalid} cần sửa
                    </Badge>
                  ) : null}
                </span>
              ) : null}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </div>
  )
}
