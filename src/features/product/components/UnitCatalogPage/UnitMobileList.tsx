import { Pencil, Power, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from '@/components/ui/item'
import type { UnitResponse } from '../../types/product.types'

interface UnitMobileListProps {
  readonly units: readonly UnitResponse[]
  readonly canManage: boolean
  readonly isPending: boolean
  readonly selectedIds: ReadonlySet<string>
  readonly onSelectedChange: (unit: UnitResponse, selected: boolean) => void
  readonly onEdit: (unit: UnitResponse) => void
  readonly onStatusChange: (unit: UnitResponse) => void
}

export function UnitMobileList({
  units,
  canManage,
  isPending,
  selectedIds,
  onSelectedChange,
  onEdit,
  onStatusChange,
}: UnitMobileListProps) {
  return (
    <ItemGroup className="gap-0">
      {units.map((unit) => (
        <Item key={unit.id} className="border-b last:border-b-0">
          {canManage ? (
            <Checkbox
              aria-label={`Chọn ${unit.unitName}`}
              checked={selectedIds.has(unit.id)}
              onCheckedChange={(checked) => onSelectedChange(unit, checked === true)}
            />
          ) : null}
          <ItemContent className="min-w-0">
            <ItemTitle className="flex w-full min-w-0 flex-wrap items-center gap-2">
              <span className="min-w-0 break-words">{unit.unitName}</span>
              {unit.symbol ? (
                <span className="text-muted-foreground font-normal">({unit.symbol})</span>
              ) : null}
            </ItemTitle>
            <Badge variant={unit.status === 'Active' ? 'default' : 'outline'}>
              {unit.status === 'Active' ? 'Hoạt động' : 'Ngừng hoạt động'}
            </Badge>
          </ItemContent>
          {canManage ? (
            <ItemActions>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Sửa ${unit.unitName}`}
                disabled={unit.status !== 'Active'}
                onClick={() => onEdit(unit)}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${unit.status === 'Active' ? 'Ngừng' : 'Kích hoạt'} ${unit.unitName}`}
                disabled={isPending}
                onClick={() => onStatusChange(unit)}
              >
                {unit.status === 'Active' ? (
                  <Power aria-hidden="true" />
                ) : (
                  <RotateCcw aria-hidden="true" />
                )}
              </Button>
            </ItemActions>
          ) : null}
        </Item>
      ))}
    </ItemGroup>
  )
}
