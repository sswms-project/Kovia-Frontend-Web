import { useWatch, type UseFormReturn } from 'react-hook-form'
import { useId, useState, type ReactNode } from 'react'
import { ChartNoAxesCombined, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import type {
  ReportDefinition,
  ReportFilterValues,
  ReportOptions,
} from '../../schemas/warehouse-report.schema'
import { reportStatusLabel } from '../../utils/report-status'
import { reportMonthPeriod } from '../../utils/report-period'

interface ReportFiltersProps {
  readonly form: UseFormReturn<ReportFilterValues>
  readonly definition: ReportDefinition
  readonly options?: ReportOptions
  readonly isFetching: boolean
  readonly onApply: (values: ReportFilterValues) => boolean
  readonly hasUnappliedChanges?: boolean
  readonly exportAction?: ReactNode
  readonly heading?: ReactNode
}
export function ReportFilters({
  form,
  definition,
  options,
  isFetching,
  onApply,
  exportAction,
  heading,
  hasUnappliedChanges,
}: ReportFiltersProps) {
  const formId = useId()
  const [parametersOpen, setParametersOpen] = useState(false)
  const isTask = definition.type === 'task-progress'
  const allDates = useWatch({ control: form.control, name: 'allDates' })
  const warehouseId = useWatch({ control: form.control, name: 'warehouseId' })
  const productId = useWatch({ control: form.control, name: 'productId' })
  const categoryId = useWatch({ control: form.control, name: 'categoryId' })
  const assigneeId = useWatch({ control: form.control, name: 'assigneeId' })
  const dateFrom = useWatch({ control: form.control, name: 'dateFrom' })
  const dateTo = useWatch({ control: form.control, name: 'dateTo' })
  const currentMonth = reportMonthPeriod(false)
  const previousMonth = reportMonthPeriod(true)
  const period = allDates
    ? 'all'
    : dateFrom === currentMonth.dateFrom && dateTo === currentMonth.dateTo
      ? 'current'
      : dateFrom === previousMonth.dateFrom && dateTo === previousMonth.dateTo
        ? 'previous'
        : 'custom'
  const submit = form.handleSubmit(
    (values) => {
      setParametersOpen(!onApply(values))
    },
    () => setParametersOpen(true)
  )
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
    <form id={formId} onSubmit={submit} className="min-w-0 shrink-0">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        {heading}
        <div className="flex flex-wrap items-center gap-2 [&_button]:h-10 [&_button]:text-sm">
          <Button type="button" variant="outline" onClick={() => setParametersOpen(true)}>
            <SlidersHorizontal aria-hidden="true" />
            Tham số
          </Button>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button
              type="submit"
              className="w-28 rounded-md shadow-sm sm:w-32"
              disabled={isFetching}
            >
              <ChartNoAxesCombined aria-hidden="true" />
              {isFetching ? 'Đang tải…' : 'Xem báo cáo'}
            </Button>
            {exportAction}
          </div>
        </div>
      </div>
      {hasUnappliedChanges ? (
        <p role="status" className="text-warning mt-2 text-xs">
          Tham số đã thay đổi. Bấm “Xem báo cáo” để cập nhật; Excel vẫn dùng phạm vi đã áp dụng.
        </p>
      ) : null}
      <Sheet open={parametersOpen} onOpenChange={setParametersOpen}>
        <SheetContent className="data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right animation-duration-300 data-[side=right]:w-full motion-reduce:animate-none data-[side=right]:sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Chọn tham số báo cáo</SheetTitle>
            <SheetDescription>
              {definition.name}. Chỉ cập nhật kết quả khi bấm “Xem báo cáo”.
            </SheetDescription>
          </SheetHeader>
          <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-4 overflow-y-auto px-4 pb-4 sm:grid-cols-2 [&_input]:h-10 [&_input]:text-sm [&_label]:w-full [&_label]:min-w-0 [&_label]:text-sm [&_select]:h-10 [&_select]:text-sm">
            <label className="min-w-0 space-y-1 text-sm sm:col-span-2">
              <span>Kho</span>
              <NativeSelect
                form={formId}
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
            {!isTask ? (
              <label className="w-52 min-w-0 space-y-1 text-xs">
                <span>Nhóm vật tư / hàng hóa</span>
                <NativeSelect
                  form={formId}
                  className="w-full"
                  aria-label="Nhóm vật tư / hàng hóa"
                  value={categoryId}
                  onChange={(event) => {
                    form.setValue('categoryId', event.target.value)
                    form.setValue('productId', '', { shouldValidate: true })
                  }}
                >
                  <NativeSelectOption value="">Tất cả nhóm hàng</NativeSelectOption>
                  {options?.categories?.map((category) => (
                    <NativeSelectOption key={category.id} value={category.id}>
                      {category.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
            ) : null}
            {!isTask ? (
              <label className="w-64 min-w-0 shrink-0 space-y-1 text-xs">
                <span>Mặt hàng{definition.requiresProduct ? ' *' : ''}</span>
                <NativeSelect
                  form={formId}
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
                <NativeSelect form={formId} className="w-full" {...form.register('status')}>
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
                    form={formId}
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
                  <NativeSelect form={formId} className="w-full" {...form.register('taskType')}>
                    <NativeSelectOption value="">Tất cả loại</NativeSelectOption>
                    {[
                      'Receiving',
                      'PutAway',
                      'CycleCount',
                      'Relocation',
                      'TransferPick',
                      'TransferReceive',
                      'TransferPutAway',
                    ].map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {reportStatusLabel(value)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </label>
                <label className="w-44 min-w-0 shrink-0 space-y-1 text-xs">
                  <span>Hạn xử lý</span>
                  <NativeSelect form={formId} className="w-full" {...form.register('deadline')}>
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
            {definition.usesPeriod ? (
              <label className="min-w-0 space-y-1 text-sm sm:col-span-2">
                <span>Kỳ báo cáo</span>
                <NativeSelect
                  form={formId}
                  className="w-full"
                  aria-label="Kỳ báo cáo"
                  value={period}
                  onChange={(event) => {
                    const value = event.target.value
                    form.setValue('allDates', value === 'all')
                    if (value === 'current' || value === 'previous') {
                      const dates = reportMonthPeriod(value === 'previous')
                      form.setValue('dateFrom', dates.dateFrom, { shouldValidate: true })
                      form.setValue('dateTo', dates.dateTo, { shouldValidate: true })
                    }
                    if (value === 'custom') setParametersOpen(true)
                  }}
                >
                  <NativeSelectOption value="current">Tháng này</NativeSelectOption>
                  <NativeSelectOption value="previous">Tháng trước</NativeSelectOption>
                  <NativeSelectOption value="custom">Tùy chọn ngày</NativeSelectOption>
                  {!['inventory-balance', 'slow-moving'].includes(definition.type) ? (
                    <NativeSelectOption value="all">Tất cả ngày</NativeSelectOption>
                  ) : null}
                </NativeSelect>
              </label>
            ) : (
              <span className="text-muted-foreground py-2 text-xs">
                Tồn kho tại thời điểm hiện tại
              </span>
            )}

            {definition.usesPeriod ? (
              <>
                <label className="w-44 min-w-0 shrink-0 space-y-1 text-xs">
                  <span>Từ ngày</span>
                  <Input
                    form={formId}
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
                    form={formId}
                    type="date"
                    readOnly={allDates}
                    aria-disabled={allDates}
                    className={allDates ? 'bg-muted text-muted-foreground' : undefined}
                    {...form.register('dateTo')}
                  />
                </label>
              </>
            ) : null}
            <label className="space-y-1 text-xs sm:col-span-2">
              <span>{isTask ? 'Tìm công việc / nhân viên' : 'Tìm SKU / tên mặt hàng'}</span>
              <Input
                form={formId}
                {...form.register('search')}
                placeholder="Tìm để thu hẹp danh sách"
                className="w-full"
              />
            </label>
          </div>
          {options?.productsTruncated ? (
            <p className="text-muted-foreground px-4 text-xs">
              Đang hiển thị tối đa 200 mặt hàng. Nhập SKU/tên để tìm mặt hàng khác.
            </p>
          ) : null}
          {Object.values(form.formState.errors).map((error) => (
            <p key={error.message} role="alert" className="text-destructive px-4 text-xs">
              {error.message}
            </p>
          ))}
          <SheetFooter className="border-t sm:flex-row sm:justify-end [&_button]:h-10 [&_button]:text-sm">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Đóng
              </Button>
            </SheetClose>
            <Button type="button" onClick={submit} disabled={isFetching}>
              Xem báo cáo
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {!parametersOpen &&
        Object.values(form.formState.errors).map((error) => (
          <p key={error.message} role="alert" className="text-destructive mt-2 text-xs">
            {error.message}
          </p>
        ))}
    </form>
  )
}
