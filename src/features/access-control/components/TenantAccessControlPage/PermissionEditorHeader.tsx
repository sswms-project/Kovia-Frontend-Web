import { ChevronsUp, RotateCcw, Save } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PermissionSearch } from './PermissionSearch'

interface PermissionEditorHeaderProps {
  readonly selectedCount: number
  readonly permissionCount: number
  readonly categoryCount: number
  readonly searchText: string
  readonly canManage: boolean
  readonly dirty: boolean
  readonly pending: boolean
  readonly canCollapse: boolean
  readonly onSearchChange: (value: string) => void
  readonly onCollapseAll: () => void
  readonly onDiscard: () => void
  readonly onSave: () => void
  readonly templateAction?: ReactNode
}

export function PermissionEditorHeader({
  selectedCount,
  permissionCount,
  categoryCount,
  searchText,
  canManage,
  dirty,
  pending,
  canCollapse,
  onSearchChange,
  onCollapseAll,
  onDiscard,
  onSave,
  templateAction,
}: PermissionEditorHeaderProps) {
  return (
    <div className="border-border bg-muted/20 flex shrink-0 flex-col gap-2 border-b px-3 py-2.5 sm:px-4 xl:flex-row xl:items-center">
      <h2 className="sr-only">Danh sách quyền theo vai trò</h2>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center xl:flex-1">
        <dl className="flex shrink-0 items-center divide-x text-xs" aria-label="Thống kê quyền">
          <div className="flex items-baseline gap-1.5 pr-3">
            <dt className="text-muted-foreground">Đã chọn</dt>
            <dd className="text-foreground font-semibold tabular-nums">{selectedCount}</dd>
          </div>
          <div className="flex items-baseline gap-1.5 px-3">
            <dt className="text-muted-foreground">Tổng quyền</dt>
            <dd className="text-foreground font-semibold tabular-nums">{permissionCount}</dd>
          </div>
          <div className="flex items-baseline gap-1.5 px-3">
            <dt className="text-muted-foreground">Danh mục</dt>
            <dd className="text-foreground font-semibold tabular-nums">{categoryCount}</dd>
          </div>
        </dl>
        <PermissionSearch value={searchText} onChange={onSearchChange} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="Thu gọn tất cả phân hệ"
              disabled={!canCollapse}
              onClick={onCollapseAll}
            >
              <ChevronsUp aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Thu gọn tất cả</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {canManage && templateAction}
        {!canManage && <Badge variant="outline">Chỉ xem</Badge>}
        {canManage && dirty && <Badge variant="secondary">Chưa lưu</Badge>}
        {canManage && dirty && (
          <Button type="button" variant="outline" disabled={pending} onClick={onDiscard}>
            <RotateCcw data-icon="inline-start" aria-hidden="true" />
            Bỏ thay đổi
          </Button>
        )}
        {canManage && (
          <Button type="button" disabled={!dirty || pending} onClick={onSave}>
            {pending ? (
              <Spinner data-icon="inline-start" aria-hidden="true" />
            ) : (
              <Save data-icon="inline-start" aria-hidden="true" />
            )}
            {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        )}
      </div>
    </div>
  )
}
