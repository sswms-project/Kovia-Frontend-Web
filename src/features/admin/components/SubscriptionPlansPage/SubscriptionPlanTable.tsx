'use client'

import {
  CircleCheck,
  CircleMinus,
  CircleOff,
  MoreHorizontal,
  PackageCheck,
  Pencil,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrency } from '@/features/subscription/utils/format-subscription'
import { cn } from '@/lib/utils'
import type { SubscriptionPlanResponse } from '../../types/admin.types'

interface SubscriptionPlanTableProps {
  readonly plans: readonly SubscriptionPlanResponse[]
  readonly onEdit: (plan: SubscriptionPlanResponse) => void
  readonly onDeactivate: (plan: SubscriptionPlanResponse) => void
  readonly onActivate: (plan: SubscriptionPlanResponse) => void
}

function PlanStatus({ status }: { readonly status: SubscriptionPlanResponse['status'] }) {
  const isActive = status === 'Active'
  const StatusIcon = isActive ? CircleCheck : CircleMinus

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 font-normal',
        isActive
          ? 'border-primary/25 bg-primary/5 text-primary'
          : 'bg-muted/40 text-muted-foreground'
      )}
    >
      <StatusIcon className="size-3" aria-hidden="true" />
      {isActive ? 'Đang cung cấp' : 'Ngừng cung cấp'}
    </Badge>
  )
}

function PlanFeatures({ plan }: { readonly plan: SubscriptionPlanResponse }) {
  if (plan.features.length === 0) {
    return <span className="text-muted-foreground">Không có</span>
  }

  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 whitespace-normal">
      {plan.features.map((feature) => (
        <li key={feature.featureCode} className="flex items-center gap-1">
          {feature.featureType === 'Limit' ? (
            <>
              <span className="text-foreground tabular-nums">{feature.limitValue}</span>{' '}
              {feature.displayName}
            </>
          ) : (
            feature.displayName
          )}
        </li>
      ))}
    </ul>
  )
}

function PlanActions({
  plan,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  readonly plan: SubscriptionPlanResponse
  readonly onEdit: (plan: SubscriptionPlanResponse) => void
  readonly onDeactivate: (plan: SubscriptionPlanResponse) => void
  readonly onActivate: (plan: SubscriptionPlanResponse) => void
}) {
  const isActive = plan.status === 'Active'

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-10 sm:size-8"
              aria-label={`Thao tác với gói ${plan.planName}`}
            >
              <MoreHorizontal
                className="transition-transform duration-200 group-aria-expanded/button:rotate-90 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={4}>Thao tác</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={() => onEdit(plan)}>
          <Pencil aria-hidden="true" />
          Chỉnh sửa
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isActive ? (
          <DropdownMenuItem variant="destructive" onSelect={() => onDeactivate(plan)}>
            <CircleOff aria-hidden="true" />
            Vô hiệu hóa
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onActivate(plan)}>
            <CircleCheck aria-hidden="true" />
            Kích hoạt
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PlanPrice({ plan }: { readonly plan: SubscriptionPlanResponse }) {
  return (
    <div>
      <p className="text-foreground text-sm font-semibold tabular-nums">
        {plan.monthlyPrice === 0 ? 'Miễn phí' : formatCurrency(plan.monthlyPrice, plan.currency)}
        <span className="text-muted-foreground text-xs font-normal">/tháng</span>
      </p>
      {plan.yearlyDiscountPercent > 0 && (
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatCurrency(plan.yearlyPrice, plan.currency)}/năm
          <span className="text-primary ml-1">−{plan.yearlyDiscountPercent}%</span>
        </p>
      )}
    </div>
  )
}

function PlanIdentity({ plan }: { readonly plan: SubscriptionPlanResponse }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="text-primary border-primary/20 bg-primary/5 group-hover/plan-row:border-primary/40 group-hover/plan-row:bg-primary/10 flex size-8 shrink-0 items-center justify-center border transition-colors duration-200 motion-reduce:transition-none">
        <PackageCheck className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-foreground truncate text-sm font-semibold">{plan.planName}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              aria-label={`Mã gói ${plan.id}`}
              className="text-muted-foreground focus-visible:ring-ring mt-0.5 inline-block max-w-32 truncate font-mono text-[11px] outline-none focus-visible:ring-1"
            >
              #{plan.id.slice(0, 8)}
            </span>
          </TooltipTrigger>
          <TooltipContent sideOffset={4}>{plan.id}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

export function SubscriptionPlanTable({
  plans,
  onEdit,
  onDeactivate,
  onActivate,
}: SubscriptionPlanTableProps) {
  return (
    <>
      <div className="hidden xl:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[25%] pl-4">Gói dịch vụ</TableHead>
              <TableHead className="w-[18%]">Giá</TableHead>
              <TableHead>Tính năng</TableHead>
              <TableHead className="w-[10%] text-center">Đang dùng</TableHead>
              <TableHead className="w-[10%] text-center">Chờ đổi</TableHead>
              <TableHead className="w-[15%]">Trạng thái</TableHead>
              <TableHead className="w-12 pr-3">
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow
                key={plan.id}
                className="group/plan-row hover:border-l-primary hover:bg-primary/[0.03] border-l-2 border-l-transparent"
              >
                <TableCell className="py-3 pl-4">
                  <PlanIdentity plan={plan} />
                </TableCell>
                <TableCell className="py-3">
                  <PlanPrice plan={plan} />
                </TableCell>
                <TableCell className="max-w-72 py-3">
                  <PlanFeatures plan={plan} />
                </TableCell>
                <TableCell className="py-3 text-center tabular-nums">
                  {plan.currentSubscriberCount}
                </TableCell>
                <TableCell className="py-3 text-center tabular-nums">
                  {plan.pendingSubscriberCount}
                </TableCell>
                <TableCell className="py-3">
                  <PlanStatus status={plan.status} />
                </TableCell>
                <TableCell className="py-3 pr-3 text-right">
                  <PlanActions
                    plan={plan}
                    onEdit={onEdit}
                    onDeactivate={onDeactivate}
                    onActivate={onActivate}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y xl:hidden">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="group/plan-row hover:border-l-primary hover:bg-primary/[0.03] border-l-2 border-l-transparent px-3 py-4 transition-colors duration-200 motion-reduce:transition-none"
          >
            <div className="flex items-start justify-between gap-3">
              <PlanIdentity plan={plan} />
              <PlanActions
                plan={plan}
                onEdit={onEdit}
                onDeactivate={onDeactivate}
                onActivate={onActivate}
              />
            </div>
            <div className="mt-2">
              <PlanStatus status={plan.status} />
            </div>

            <div className="bg-muted/20 mt-3 border-y py-3 text-xs">
              <PlanPrice plan={plan} />
            </div>
            <div className="mt-3 text-xs">
              <p className="text-muted-foreground mb-1.5">Tính năng</p>
              <PlanFeatures plan={plan} />
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              {plan.currentSubscriberCount} doanh nghiệp đang dùng · {plan.pendingSubscriberCount}{' '}
              thay đổi chờ áp dụng
            </p>
          </div>
        ))}
      </div>
    </>
  )
}
