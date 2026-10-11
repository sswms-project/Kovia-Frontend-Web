'use client'

import Link from 'next/link'
import { APP_ROUTES } from '@/routes/app-routes'

import { useState } from 'react'
import { Pencil, Plus, Power, RotateCcw, Scale, Upload } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { StatusChangeDialog } from '@/components/operations/StatusChangeDialog'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import {
  parseActiveStatusFilter,
  type ActiveStatusFilter,
} from '@/components/operations/status-filter'
import type { UnitFormValues } from '../../schemas/master-data.schema'
import type { UnitResponse } from '../../types/product.types'

interface UnitCatalogProps {
  readonly items: readonly UnitResponse[]
  readonly editingUnit: UnitResponse | null
  readonly form: UseFormReturn<UnitFormValues>
  readonly isFormOpen: boolean
  readonly canManage: boolean
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isPending: boolean
  readonly onRetry: () => void
  readonly onCreate: () => void
  readonly onEdit: (unit: UnitResponse) => void
  readonly onFormOpenChange: (open: boolean) => void
  readonly onSubmit: (values: UnitFormValues) => void
  readonly onChangeStatus: (unit: UnitResponse) => void
  readonly onBulkDeactivate?: (units: readonly UnitResponse[]) => void
}

export function UnitCatalog({
  items,
  editingUnit,
  form,
  isFormOpen,
  canManage,
  isLoading,
  isError,
  isPending,
  onRetry,
  onCreate,
  onEdit,
  onFormOpenChange,
  onSubmit,
  onChangeStatus,
  onBulkDeactivate = () => undefined,
}: UnitCatalogProps) {
  const [statusTarget, setStatusTarget] = useState<UnitResponse | null>(null)
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<ActiveStatusFilter>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const filteredItems = statusFilter ? items.filter((unit) => unit.status === statusFilter) : items
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize)
  const selectedUnits = items.filter((unit) => selectedIds.has(unit.id))
  const allSelected = pagedItems.length > 0 && pagedItems.every((unit) => selectedIds.has(unit.id))
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-start gap-3">
          <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center">
            <Scale aria-hidden="true" />
          </span>
          <div>
            <p className="text-primary text-xs font-medium">Danh mục</p>
            <h1 className="text-xl font-semibold">Đơn vị tính</h1>
          </div>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={APP_ROUTES.unitImport}>
                <Upload data-icon="inline-start" aria-hidden="true" />
                Nhập từ tệp
              </Link>
            </Button>
            <Button onClick={onCreate}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Thêm đơn vị tính
            </Button>
          </div>
        ) : null}
      </header>

      <OperationalListPanel aria-label="Danh sách đơn vị tính">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b p-3">
          <div>
            <h2 className="text-sm font-semibold">Danh sách đơn vị tính</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && selectedUnits.length > 0 ? (
              <Button
                variant="outline"
                disabled={isPending || selectedUnits.every((unit) => unit.status !== 'Active')}
                onClick={() => setIsBulkStatusOpen(true)}
              >
                Ngừng sử dụng ({selectedUnits.length})
              </Button>
            ) : null}
            <NativeSelect
              aria-label="Lọc đơn vị tính theo trạng thái"
              className="w-44"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(parseActiveStatusFilter(event.target.value))
                setSelectedIds(new Set())
                setPage(1)
              }}
            >
              <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
              <NativeSelectOption value="Active">Đang hoạt động</NativeSelectOption>
              <NativeSelectOption value="Inactive">Ngừng hoạt động</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        {isLoading ? (
          <OperationalLoadingState />
        ) : isError ? (
          <OperationalErrorState title="Không thể tải đơn vị tính" onRetry={onRetry} />
        ) : filteredItems.length === 0 ? (
          <OperationalEmptyState
            title={items.length === 0 ? 'Chưa có đơn vị tính' : 'Không có đơn vị tính phù hợp'}
            description={
              items.length === 0
                ? 'Thêm đơn vị tính đầu tiên để sử dụng khi tạo sản phẩm.'
                : 'Thử chọn trạng thái khác để xem các đơn vị tính còn lại.'
            }
          />
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                {canManage ? (
                  <TableHead className="w-12">
                    <Checkbox
                      aria-label="Chọn tất cả đơn vị tính"
                      checked={allSelected ? true : selectedIds.size > 0 ? 'indeterminate' : false}
                      onCheckedChange={(checked) =>
                        setSelectedIds((current) =>
                          checked
                            ? new Set([...current, ...pagedItems.map((unit) => unit.id)])
                            : new Set(
                                [...current].filter(
                                  (id) => !pagedItems.some((unit) => unit.id === id)
                                )
                              )
                        )
                      }
                    />
                  </TableHead>
                ) : null}
                <TableHead>Tên đơn vị</TableHead>
                <TableHead>Ký hiệu</TableHead>
                <TableHead>Trạng thái</TableHead>
                {canManage ? <TableHead className="text-right">Thao tác</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((unit) => (
                <TableRow key={unit.id}>
                  {canManage ? (
                    <TableCell>
                      <Checkbox
                        aria-label={`Chọn ${unit.unitName}`}
                        checked={selectedIds.has(unit.id)}
                        onCheckedChange={(checked) =>
                          setSelectedIds((current) => {
                            const next = new Set(current)
                            if (checked) next.add(unit.id)
                            else next.delete(unit.id)
                            return next
                          })
                        }
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>{unit.unitName}</TableCell>
                  <TableCell>{unit.symbol ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={unit.status === 'Active' ? 'default' : 'outline'}>
                      {unit.status === 'Active' ? 'Hoạt động' : 'Ngừng hoạt động'}
                    </Badge>
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={unit.status !== 'Active'}
                          onClick={() => onEdit(unit)}
                        >
                          <Pencil data-icon="inline-start" aria-hidden="true" />
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => setStatusTarget(unit)}
                        >
                          {unit.status === 'Active' ? (
                            <Power data-icon="inline-start" aria-hidden="true" />
                          ) : (
                            <RotateCcw data-icon="inline-start" aria-hidden="true" />
                          )}
                          {unit.status === 'Active' ? 'Ngừng' : 'Kích hoạt'}
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {filteredItems.length > 0 ? (
          <OperationalPagination
            page={page}
            pageSize={pageSize}
            totalCount={filteredItems.length}
            isPending={isPending}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value)
              setPage(1)
            }}
          />
        ) : null}
      </OperationalListPanel>

      <Dialog open={isFormOpen} onOpenChange={onFormOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Chỉnh sửa đơn vị tính' : 'Thêm đơn vị tính'}</DialogTitle>
            <DialogDescription>
              Đơn vị quy đổi của từng hàng hóa được thiết lập trong form tạo hoặc chỉnh sửa hàng
              hóa.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(form.formState.errors.unitCode)}>
                <FieldLabel htmlFor="unitCode">Mã đơn vị</FieldLabel>
                <Input id="unitCode" autoComplete="off" {...form.register('unitCode')} />
                <FieldError
                  errors={
                    form.formState.errors.unitCode ? [form.formState.errors.unitCode] : undefined
                  }
                />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.unitName)}>
                <FieldLabel htmlFor="unitName">Tên đơn vị</FieldLabel>
                <Input id="unitName" autoComplete="off" {...form.register('unitName')} />
                <FieldError
                  errors={
                    form.formState.errors.unitName ? [form.formState.errors.unitName] : undefined
                  }
                />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.symbol)}>
                <FieldLabel htmlFor="unitSymbol">Ký hiệu</FieldLabel>
                <Input id="unitSymbol" autoComplete="off" {...form.register('symbol')} />
                <FieldError
                  errors={form.formState.errors.symbol ? [form.formState.errors.symbol] : undefined}
                />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.quantityPrecision)}>
                <FieldLabel htmlFor="quantityPrecision">Cách nhập số lượng</FieldLabel>
                <select
                  id="quantityPrecision"
                  className="border-input bg-background h-9 w-full border px-3 text-sm"
                  {...form.register('quantityPrecision', { valueAsNumber: true })}
                >
                  <option value={0}>Chỉ số nguyên — ví dụ 1, 2, 3</option>
                  <option value={1}>Cho phép 1 số lẻ — ví dụ 1,5</option>
                  <option value={2}>Cho phép 2 số lẻ — ví dụ 1,25</option>
                  <option value={3}>Cho phép 3 số lẻ — ví dụ 1,125</option>
                </select>
                <FieldError
                  errors={
                    form.formState.errors.quantityPrecision
                      ? [form.formState.errors.quantityPrecision]
                      : undefined
                  }
                />
              </Field>
              <Field
                className="sm:col-span-2"
                data-invalid={Boolean(form.formState.errors.description)}
              >
                <FieldLabel htmlFor="unitDescription">Mô tả</FieldLabel>
                <Textarea
                  id="unitDescription"
                  rows={3}
                  autoComplete="off"
                  {...form.register('description')}
                />
                <FieldError
                  errors={
                    form.formState.errors.description
                      ? [form.formState.errors.description]
                      : undefined
                  }
                />
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => onFormOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <StatusChangeDialog
        open={Boolean(statusTarget)}
        subject={`đơn vị tính “${statusTarget?.unitName ?? ''}”`}
        nextStatus={statusTarget?.status === 'Active' ? 'Inactive' : 'Active'}
        isPending={isPending}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        onConfirm={() => {
          if (!statusTarget) return
          onChangeStatus(statusTarget)
          setStatusTarget(null)
        }}
      />
      <StatusChangeDialog
        open={isBulkStatusOpen}
        subject={`${selectedUnits.length} đơn vị tính đã chọn`}
        nextStatus="Inactive"
        isPending={isPending}
        onOpenChange={setIsBulkStatusOpen}
        onConfirm={() => {
          onBulkDeactivate(selectedUnits)
          setIsBulkStatusOpen(false)
          setSelectedIds(new Set())
        }}
      />
    </div>
  )
}
