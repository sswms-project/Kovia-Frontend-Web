import type { ComponentType, ReactNode } from 'react'
import { CheckCircle2, Mail, Pencil, Phone, Warehouse, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { UserProfileResponse } from '@/features/auth/types/auth.types'
import { SectionIconBadge } from '@/features/settings/components/SecurityPage'

interface ProfileViewProps {
  readonly profile: UserProfileResponse
  readonly onEdit: () => void
}

interface InfoRowProps {
  readonly icon: ComponentType<{ className?: string }>
  readonly label: string
  readonly value: string | null | undefined
  readonly suffix?: ReactNode
}

export function ProfileViewSkeleton() {
  return (
    <Card className="@container min-w-0 gap-0 rounded-xl py-0">
      <CardHeader className="grid grid-cols-1 items-start gap-x-4 border-b px-6 pt-5 pb-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-start gap-2.5">
          <Skeleton className="bg-muted-foreground/20 size-[30px] rounded-lg" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="bg-muted-foreground/20 h-4 w-36" />
            <Skeleton className="bg-muted-foreground/20 h-3 w-72 max-w-full" />
          </div>
        </div>
        <Skeleton className="bg-muted-foreground/20 mt-3 h-8 w-24 sm:mt-0" />
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3 px-6 py-5 @min-[40rem]:grid-cols-2">
        <Skeleton className="bg-muted-foreground/20 h-[92px] rounded-lg" />
        <Skeleton className="bg-muted-foreground/20 h-[92px] rounded-lg" />
        <Skeleton className="bg-muted-foreground/20 h-[92px] rounded-lg @min-[40rem]:col-span-2" />
      </CardContent>
    </Card>
  )
}

function InfoRow({ icon: Icon, label, value, suffix }: InfoRowProps) {
  return (
    <div className="bg-muted/30 flex items-start gap-3 rounded-lg border p-4">
      <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="text-muted-foreground size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[11.5px] font-medium tracking-wide uppercase">
          {label}
        </p>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-foreground min-w-0 text-sm font-medium wrap-anywhere">
            {value || 'Chưa cập nhật'}
          </p>
          {suffix}
        </div>
      </div>
    </div>
  )
}

export function ProfileView({ profile, onEdit }: ProfileViewProps) {
  const assignedWarehouses = (profile.assignedWarehouses ?? [])
    .map((warehouse) => `${warehouse.warehouseCode} · ${warehouse.warehouseName}`)
    .join(', ')

  return (
    <Card className="animate-in fade-in slide-in-from-right-4 @container min-w-0 gap-0 rounded-xl py-0 duration-400">
      <CardHeader className="grid grid-cols-1 items-start gap-x-4 border-b px-6 pt-5 pb-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-start gap-2.5">
          <SectionIconBadge icon={Mail} />
          <div className="min-w-0">
            <CardTitle className="text-[14.5px] font-bold">Thông tin liên hệ</CardTitle>
            <CardDescription className="text-[12.5px]">
              Email và số điện thoại được dùng để liên lạc và thông báo
            </CardDescription>
          </div>
        </div>
        <CardAction className="col-start-1 row-start-2 mt-3 justify-self-start sm:col-start-2 sm:row-start-1 sm:mt-0 sm:justify-self-end">
          <Button
            type="button"
            variant="outline"
            className="h-8 cursor-pointer gap-1.5 px-3 text-[12.5px] transition-all hover:shadow-sm active:scale-[0.97]"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Chỉnh sửa
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="grid min-w-0 gap-3 px-6 py-5 @min-[40rem]:grid-cols-2">
        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both delay-75 duration-300">
          <InfoRow
            icon={Mail}
            label="Email"
            value={profile.email}
            suffix={
              profile.emailVerified ? (
                <span className="text-chart-1 flex shrink-0 items-center gap-1 text-xs font-medium">
                  <CheckCircle2 className="size-3.5" />
                  Đã xác thực
                </span>
              ) : (
                <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                  <XCircle className="size-3.5" />
                  Chưa xác thực
                </span>
              )
            }
          />
        </div>
        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both delay-150 duration-300">
          <InfoRow icon={Phone} label="Số điện thoại" value={profile.phone} />
        </div>
        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both delay-200 duration-300 @min-[40rem]:col-span-2">
          <InfoRow
            icon={Warehouse}
            label="Kho đang làm việc"
            value={assignedWarehouses || 'Chưa được phân công kho'}
          />
        </div>
      </CardContent>
    </Card>
  )
}
