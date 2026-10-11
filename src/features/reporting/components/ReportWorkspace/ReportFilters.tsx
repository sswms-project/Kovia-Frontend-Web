import { useWatch, type UseFormReturn } from 'react-hook-form'
import type { ReactNode } from 'react'
import { ChartNoAxesCombined } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type {
  ReportDefinition,
  ReportFilterValues,
  ReportOptions,
} from '../../schemas/warehouse-report.schema'
import { reportStatusLabel } from '../../utils/report-status'

interface ReportFiltersProps {
  readonly form: UseFormReturn<ReportFilterValues>
  readonly definition: ReportDefinition
  readonly options?: ReportOptions
  readonly isFetching: boolean
  readonly onApply: (values: ReportFilterValues) => void
  readonly exportAction?: ReactNode
}
export function ReportFilters({
  form,
  definition,
  options,
  isFetching,
  onApply,
  exportAction,
}: ReportFiltersProps) {
  const isTask = definition.type === 'task-progress'
  const allDates = useWatch({ control: form.control, name: 'allDates' })
  const warehouseId = useWatch({ control: form.control, name: 'warehouseId' })
  const productId = useWatch({ control: form.control, name: 'productId' })
  const assigneeId = useWatch({ control: form.control, name: 'assigneeId' })
  const states: Record<string, readonly string[]> = {
    'inventory-snapshot': ['Available', 'InspectionHold', 'DamageHold', 'Quarantine'],
    'outbound-progress': [
      'Pending',
      'ReleasedForPicking',
      'Picking',
      'Picked',
      'AuthorizedForDispatch',
      'Dispatched',
      'Cancelled',
    ],
    'transfer-reconciliation': [
      'Draft',
      'InProgress',
      'AwaitingResolution',
      'PendingSourceApproval',
      'Approved',
      'InTransit',
      'Completed',
      'ReceivedWithVariance',
      'Rejected',
      'Cancelled',
    ],
    'task-progress': ['Queued', 'InProgress', 'Paused', 'Completed', 'Cancelled'],
  }
  return (
    <form
      onSubmit={form.handleSubmit(onApply)}
      className="bg-card border-primary/20 min-w-0 shrink-0 rounded-xl border p-3 shadow-sm"
    >
      <div className="flex min-w-0 items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-nowrap items-end gap-3 overflow-x-auto pb-1">
          <label className="w-44 min-w-0 shrink-0 space-y-1 text-xs">
            <span>Kho</span>
            <NativeSelect
              className="w-full"
              {...form.register('warehouseId')}
              value={warehouseId}
              aria-label="Kho"
            >
              <NativeSelectOption value="">Tất cả kho được phép</NativeSelectOption>
              {options?.warehouses.map((warehouse) => (
                <NativeSelectOption key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <label className="w-44 min-w-0 shrink-0 space-y-1 text-xs">
            <span>{isTask ? 'Tìm công việc / nhân viên' : 'Tìm SKU / tên mặt hàng'}</span>
            <Input
              {...form.register('search')}
              placeholder="Tìm để thu hẹp danh sách"
              className="w-full"
            />
          </label>
          {!isTask ? (
            <label className="w-64 min-w-0 shrink-0 space-y-1 text-xs">
              <span>Mặt hàng{definition.requiresProduct ? ' *' : ''}</span>
              <NativeSelect
                className="w-full"
                {...form.register('productId')}
                value={productId}
                aria-label="Mặt hàng"
              >
                <NativeSelectOption value="">
                  {definition.requiresProduct ? 'Chọn mặt hàng' : 'Tất cả mặt hàng'}
                </NativeSelectOption>
                {options?.products.map((product) => (
                  <NativeSelectOption key={product.id} value={product.id}>
                    {product.sku} · {product.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          ) : null}
          {states[definition.type] ? (
            <label className="w-44 min-w-0 shrink-0 space-y-1 text-xs">
              <span>Trạng thái</span>
              <NativeSelect className="w-full" {...form.register('status')}>
                <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
                {states[definition.type]?.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {reportStatusLabel(value)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          ) : null}
          {isTask ? (
            <>
              <label className="w-44 min-w-0 shrink-0 space-y-1 text-xs">
                <span>Người được giao</span>
                <NativeSelect
                  className="w-full"
                  {...form.register('assigneeId')}
                  value={assigneeId}
                  aria-label="Người được giao"
                >
                  <NativeSelectOption value="">Tất cả nhân viên</NativeSelectOption>
                  {options?.assignees.map((user) => (
                    <NativeSelectOption key={user.id} value={user.id}>
                      {user.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
              <label className="w-44 min-w-0 shrink-0 space-y-1 text-xs">
                <span>Loại công việc</span>
                <NativeSelect className="w-full" {...form.register('taskType')}>
                  <NativeSelectOption value="">Tất cả loại</NativeSelectOption>
                  {[
                    'Receiving',
                    'PutAway',
                    'CycleCount',
                    'Relocation',
                    'TransferPick',
                    'TransferReceive',
                  ].map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {reportStatusLabel(value)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
              <label className="w-44 min-w-0 shrink-0 space-y-1 text-xs">
                <span>Hạn xử lý</span>
                <NativeSelect className="w-full" {...form.register('deadline')}>
                  <NativeSelectOption value="">Tất cả tình trạng hạn</NativeSelectOption>
                  {['Overdue', 'DueSoon', 'NoDeadline', 'OnTrack', 'Terminal'].map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {reportStatusLabel(value)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
            </>
          ) : null}
          {definition.usesPeriod &&
          !['inventory-balance', 'slow-moving'].includes(definition.type) ? (
            <label className="flex h-8 shrink-0 items-center gap-2 text-xs whitespace-nowrap">
              <input type="checkbox" {...form.register('allDates')} />
              Tất cả ngày
            </label>
          ) : null}
          {definition.usesPeriod ? (
            <>
              <label className="w-44 min-w-0 shrink-0 space-y-1 text-xs">
                <span>Từ ngày</span>
                <Input
                  type="date"
                  readOnly={allDates}
                  aria-disabled={allDates}
                  className={allDates ? 'bg-muted text-muted-foreground' : undefined}
                  {...form.register('dateFrom')}
                />
              </label>
              <label className="w-44 min-w-0 shrink-0 space-y-1 text-xs">
                <span>Đến ngày</span>
                <Input
                  type="date"
                  readOnly={allDates}
                  aria-disabled={allDates}
                  className={allDates ? 'bg-muted text-muted-foreground' : undefined}
                  {...form.register('dateTo')}
                />
              </label>
            </>
          ) : null}
        </div>
        <div className="border-primary/20 mt-4 flex shrink-0 items-center gap-2 self-start border-l pb-1 pl-3">
          <Button type="submit" className="w-32 rounded-md shadow-sm" disabled={isFetching}>
            <ChartNoAxesCombined aria-hidden="true" />
            {isFetching ? 'Đang tải…' : 'Xem báo cáo'}
          </Button>
          {exportAction}
        </div>
      </div>
      {options?.productsTruncated ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Đang hiển thị tối đa 200 mặt hàng. Nhập SKU/tên để tìm mặt hàng khác.
        </p>
      ) : null}
      {Object.values(form.formState.errors).map((error) => (
        <p key={error.message} role="alert" className="text-destructive mt-2 text-xs">
          {error.message}
        </p>
      ))}
    </form>
  )
}
