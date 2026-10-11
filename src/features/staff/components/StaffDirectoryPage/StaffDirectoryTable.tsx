import {
  Eye,
  LockKeyhole,
  LockKeyholeOpen,
  MoreHorizontal,
  ShieldCheck,
  UserRoundX,
  Warehouse,
} from 'lucide-react'
import { ClickableTableRow } from '@/components/operations/ClickableTableRow'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { WarehouseSummaryResponse } from '../../types/manager-assignment.types'
import type { StaffResponse } from '../../types/staff.types'
import { getAssignedWarehouseIds, staffWarehouseScopeSummary } from '../../utils/staff-warehouse'
import { StaffStatusBadge } from './StaffStatusBadge'

interface StaffDirectoryTableProps {
  readonly people: readonly StaffResponse[]
  readonly warehouses: readonly WarehouseSummaryResponse[]
  readonly isWarehouseScopeLoading: boolean
  readonly canAssignWarehouse?: boolean
  readonly canTerminate?: boolean
  readonly canManageStatus?: boolean
  readonly onView: (person: StaffResponse) => void
  readonly onAssignWarehouse: (person: StaffResponse) => void
  readonly onTerminate: (person: StaffResponse) => void
  readonly onChangeStatus?: (person: StaffResponse) => void
}

function formatLastLogin(value: string | null) {
  if (!value) return 'Chưa đăng nhập'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value)
  )
}

function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function StaffDirectoryTable({
  people,
  warehouses,
  isWarehouseScopeLoading,
  canAssignWarehouse = false,
  canTerminate = false,
  canManageStatus = false,
  onView,
  onAssignWarehouse,
  onTerminate,
  onChangeStatus = () => undefined,
}: StaffDirectoryTableProps) {
  function warehouseScopeLabel(person: StaffResponse) {
    const assignedWarehouseIds = getAssignedWarehouseIds(person)
    if (isWarehouseScopeLoading && assignedWarehouseIds.length > 0) {
      return 'Đang tải thông tin kho…'
    }

    return staffWarehouseScopeSummary(assignedWarehouseIds, warehouses)
  }

  function terminationItem(person: StaffResponse) {
    return (
      <DropdownMenuItem variant="destructive" onSelect={() => onTerminate(person)}>
        <UserRoundX aria-hidden="true" />
        Chấm dứt làm việc
      </DropdownMenuItem>
    )
  }

  function rowActions(person: StaffResponse) {
    const canTerminatePerson = canTerminate && person.status !== 'Terminated'
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Thao tác với ${person.fullName}`}
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onView(person)}>
            <Eye className="size-4" aria-hidden="true" />
            Xem chi tiết
          </DropdownMenuItem>
          {canAssignWarehouse && person.status === 'Active' && (
            <DropdownMenuItem onSelect={() => onAssignWarehouse(person)}>
              <Warehouse className="size-4" aria-hidden="true" />
              Quản lý vai trò & kho
            </DropdownMenuItem>
          )}
          {canManageStatus && person.status === 'Active' && (
            <DropdownMenuItem variant="destructive" onSelect={() => onChangeStatus(person)}>
              <LockKeyhole aria-hidden="true" />
              Khóa tài khoản
            </DropdownMenuItem>
          )}
          {canManageStatus && person.status === 'Inactive' && (
            <DropdownMenuItem onSelect={() => onChangeStatus(person)}>
              <LockKeyholeOpen aria-hidden="true" />
              Mở khóa tài khoản
            </DropdownMenuItem>
          )}
          {canTerminatePerson && terminationItem(person)}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div data-slot="operational-list-body" className="min-h-0 min-w-0">
      <div className="hidden min-w-0 xl:block">
        <Table className="min-w-[960px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 w-40 pl-4">Nhân sự</TableHead>
              <TableHead className="sticky top-0 z-10 w-48">Liên hệ</TableHead>
              <TableHead className="sticky top-0 z-10 w-36">Vai trò</TableHead>
              <TableHead className="sticky top-0 z-10 w-28">Trạng thái</TableHead>
              <TableHead className="sticky top-0 z-10 w-44">Phạm vi kho</TableHead>
              <TableHead className="sticky top-0 z-10 w-32">Lần đăng nhập cuối</TableHead>
              <TableHead className="sticky top-0 z-10 w-12">
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => (
              <ClickableTableRow key={person.id} onActivate={() => onView(person)}>
                <TableCell className="pl-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="bg-muted text-foreground flex size-8 items-center justify-center text-[11px] font-semibold">
                      {initials(person.fullName)}
                    </span>
                    <span className="truncate font-medium" title={person.fullName}>
                      {person.fullName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <p className="truncate" title={person.email}>
                      {person.email}
                    </p>
                    <p
                      className="text-muted-foreground mt-0.5 truncate"
                      title={person.phone || 'Chưa có số điện thoại'}
                    >
                      {person.phone || 'Chưa có số điện thoại'}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex max-w-full items-center gap-1.5">
                    <ShieldCheck
                      className="text-muted-foreground size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate" title={person.role || 'Chưa gán'}>
                      {person.role || 'Chưa gán'}
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <StaffStatusBadge status={person.status} />
                </TableCell>
                <TableCell>
                  <span
                    className="text-muted-foreground inline-flex max-w-full items-center gap-1.5"
                    title={warehouseScopeLabel(person)}
                  >
                    <Warehouse className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{warehouseScopeLabel(person)}</span>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatLastLogin(person.lastLoginAt)}
                </TableCell>
                <TableCell>{rowActions(person)}</TableCell>
              </ClickableTableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y xl:hidden">
        {people.map((person) => (
          <div key={person.id} className="flex min-h-20 items-center gap-3 px-3 py-3">
            <span className="bg-muted flex size-9 shrink-0 items-center justify-center text-xs font-semibold">
              {initials(person.fullName)}
            </span>
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => onView(person)}
            >
              <span className="block truncate text-sm font-medium">{person.fullName}</span>
              <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                {person.email}
              </span>
              <span className="mt-1 block">
                <StaffStatusBadge status={person.status} />
              </span>
              <span className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
                <Warehouse className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{warehouseScopeLabel(person)}</span>
              </span>
            </button>
            {rowActions(person)}
          </div>
        ))}
      </div>
    </div>
  )
}
