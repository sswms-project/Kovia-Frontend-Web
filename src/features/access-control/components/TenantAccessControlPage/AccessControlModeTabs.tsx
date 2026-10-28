import { ShieldCheck, UserRoundCog } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AccessControlMode } from '../../types/tenant-access-control.types'
import { isAccessControlMode } from '../../utils/tenant-access-control'

interface AccessControlModeTabsProps {
  readonly value: AccessControlMode
  readonly disabled?: boolean
  readonly onChange: (mode: AccessControlMode) => void
}

const modeTabClassName =
  'h-11 flex-1 gap-2 px-3 sm:flex-none group-data-[variant=workspace]/tabs-list:data-[state=inactive]:border-border group-data-[variant=workspace]/tabs-list:data-[state=inactive]:bg-card group-data-[variant=workspace]/tabs-list:data-[state=inactive]:text-foreground group-data-[variant=workspace]/tabs-list:data-[state=inactive]:hover:border-primary group-data-[variant=workspace]/tabs-list:data-[state=inactive]:hover:bg-muted'

export function AccessControlModeTabs({ value, disabled, onChange }: AccessControlModeTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) => {
        if (isAccessControlMode(nextValue)) onChange(nextValue)
      }}
    >
      <header className="border-border flex shrink-0 flex-wrap items-center gap-3 border-b pb-3">
        <div className="flex shrink-0 items-center gap-3">
          <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center">
            <ShieldCheck aria-hidden="true" />
          </span>
          <h1 className="text-xl font-semibold text-balance">Phân quyền</h1>
        </div>

        <TabsList
          variant="workspace"
          aria-label="Chế độ phân quyền"
          className="h-auto w-full gap-2 p-0 sm:w-auto"
        >
          <TabsTrigger value="role" disabled={disabled} className={modeTabClassName}>
            <ShieldCheck aria-hidden="true" />
            Theo vai trò
          </TabsTrigger>
          <TabsTrigger value="personal" disabled={disabled} className={modeTabClassName}>
            <UserRoundCog aria-hidden="true" />
            Theo nhân sự
          </TabsTrigger>
        </TabsList>
      </header>
    </Tabs>
  )
}
