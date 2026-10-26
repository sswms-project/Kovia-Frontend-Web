import { useMemo } from 'react'
import { LayoutGrid, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type {
  WarehouseLayoutEditorScene,
  WarehouseLayoutSelection,
} from '../../types/warehouse-layout-scene.types'
import { getLayoutLocationLabel, getLayoutPlacementIssues } from '../../utils/layout-placement'

export function WarehouseLayoutPlacementNotice({
  scene,
  canSuggest,
  onSuggest,
  onSelect,
}: {
  readonly scene: WarehouseLayoutEditorScene
  readonly canSuggest?: boolean
  readonly onSuggest?: () => void
  readonly onSelect: (selection: WarehouseLayoutSelection) => void
}) {
  const issues = useMemo(() => getLayoutPlacementIssues(scene), [scene])
  const pending =
    scene.zones.filter((item) => item.status === 'Active' && item.placementPending).length +
    scene.racks.filter(
      (item) =>
        item.status === 'Active' &&
        item.placementPending &&
        scene.zones.some((zone) => zone.id === item.zoneId && zone.status === 'Active')
    ).length
  if (!pending && !issues.length) return null
  return (
    <div
      className="bg-card flex shrink-0 flex-col gap-2 border-b px-3 py-2 text-xs"
      aria-label="Kiểm tra bố cục"
    >
      {pending > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>{pending} khu/kệ chưa bố trí · Xem trong “Chưa sắp xếp”.</p>
          {onSuggest ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canSuggest}
              onClick={onSuggest}
            >
              <LayoutGrid data-icon="inline-start" aria-hidden="true" />
              Sắp xếp gợi ý
            </Button>
          ) : null}
        </div>
      ) : null}
      {issues.length > 0 ? (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto min-h-9 text-left whitespace-normal"
            >
              <TriangleAlert data-icon="inline-start" aria-hidden="true" />
              Xem {issues.length} vị trí cần kiểm tra bố cục
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
              {issues.map((issue) => (
                <li key={`${issue.selection.kind}:${issue.selection.id}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto min-h-11 w-full flex-col items-start gap-1 text-left whitespace-normal"
                    onClick={() => onSelect(issue.selection)}
                  >
                    <span className="break-words">
                      {getLayoutLocationLabel(scene, issue.selection)}
                    </span>
                    <span className="text-muted-foreground text-xs">{issue.message}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  )
}
