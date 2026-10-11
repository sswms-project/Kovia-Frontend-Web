'use client'

import Link from 'next/link'
import { APP_ROUTES } from '@/routes/app-routes'

import { useMemo, useState } from 'react'
import {
  ChevronRight,
  ChevronsUpDown,
  FolderTree,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Upload,
} from 'lucide-react'
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
import type { CategoryFormValues } from '../../schemas/master-data.schema'
import type { CategoryResponse } from '../../types/product.types'
import { cn } from '@/lib/utils'

interface CategoryTree {
  readonly roots: readonly CategoryResponse[]
  readonly childrenByParent: ReadonlyMap<string, readonly CategoryResponse[]>
}

function buildCategoryTree(items: readonly CategoryResponse[]): CategoryTree {
  const itemIds = new Set(items.map((item) => item.id))
  const roots: CategoryResponse[] = []
  const childrenByParent = new Map<string, CategoryResponse[]>()
  const sortedItems = [...items].sort((left, right) =>
    left.categoryPath.localeCompare(right.categoryPath, 'vi')
  )

  for (const item of sortedItems) {
    if (!item.parentCategoryId || !itemIds.has(item.parentCategoryId)) {
      roots.push(item)
      continue
    }

    const siblings = childrenByParent.get(item.parentCategoryId) ?? []
    siblings.push(item)
    childrenByParent.set(item.parentCategoryId, siblings)
  }

  return { roots, childrenByParent }
}

function getVisibleCategories(
  roots: readonly CategoryResponse[],
  childrenByParent: ReadonlyMap<string, readonly CategoryResponse[]>,
  expandedIds: ReadonlySet<string>,
  includedIds?: ReadonlySet<string>
): CategoryResponse[] {
  const visible: CategoryResponse[] = []

  function appendBranch(category: CategoryResponse) {
    if (includedIds && !includedIds.has(category.id)) return
    visible.push(category)
    if (!expandedIds.has(category.id)) return
    for (const child of childrenByParent.get(category.id) ?? []) appendBranch(child)
  }

  for (const root of roots) appendBranch(root)
  return visible
}

function getIdsWithAncestors(
  matchingItems: readonly CategoryResponse[],
  allItems: readonly CategoryResponse[]
): Set<string> {
  const includedIds = new Set<string>()
  const categoriesById = new Map(allItems.map((category) => [category.id, category]))

  for (const category of matchingItems) {
    let current: CategoryResponse | undefined = category
    while (current && !includedIds.has(current.id)) {
      includedIds.add(current.id)
      current = current.parentCategoryId ? categoriesById.get(current.parentCategoryId) : undefined
    }
  }

  return includedIds
}

interface CategoryCatalogProps {
  readonly items: readonly CategoryResponse[]
  readonly editingCategory: CategoryResponse | null
  readonly form: UseFormReturn<CategoryFormValues>
  readonly isFormOpen: boolean
  readonly canCreate: boolean
  readonly canUpdate: boolean
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isPending: boolean
  readonly onRetry: () => void
  readonly onCreate: (parentCategoryId: string | null) => void
  readonly onEdit: (category: CategoryResponse) => void
  readonly onFormOpenChange: (open: boolean) => void
  readonly onSubmit: (values: CategoryFormValues) => void
  readonly onChangeStatus: (category: CategoryResponse) => void
  readonly onBulkDeactivate?: (categories: readonly CategoryResponse[]) => void
}

export function CategoryCatalog({
  items,
  editingCategory,
  form,
  isFormOpen,
  canCreate,
  canUpdate,
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
}: CategoryCatalogProps) {
  const [statusTarget, setStatusTarget] = useState<CategoryResponse | null>(null)
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<ActiveStatusFilter>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const filteredItems = statusFilter
    ? items.filter((category) => category.status === statusFilter)
    : items
  const categoryTree = useMemo(() => buildCategoryTree(items), [items])
  const includedIds = useMemo(
    () => getIdsWithAncestors(filteredItems, items),
    [filteredItems, items]
  )
  const filteredRoots = categoryTree.roots.filter((root) => includedIds.has(root.id))
  const pagedRoots = filteredRoots.slice((page - 1) * pageSize, page * pageSize)
  const visibleItems = getVisibleCategories(
    pagedRoots,
    categoryTree.childrenByParent,
    expandedIds,
    includedIds
  )
  const expandableIds = items
    .filter((category) =>
      (categoryTree.childrenByParent.get(category.id) ?? []).some((child) =>
        includedIds.has(child.id)
      )
    )
    .map((category) => category.id)
  const areAllExpanded =
    expandableIds.length > 0 && expandableIds.every((id) => expandedIds.has(id))
  const selectedCategories = items.filter((category) => selectedIds.has(category.id))
  const allSelected =
    visibleItems.length > 0 && visibleItems.every((item) => selectedIds.has(item.id))
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-start gap-3">
          <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center">
            <FolderTree aria-hidden="true" />
          </span>
          <div>
            <p className="text-primary text-xs font-medium">Danh mục</p>
            <h1 className="text-xl font-semibold">Nhóm vật tư hàng hóa</h1>
          </div>
        </div>
        {canCreate ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={APP_ROUTES.categoryImport}>
                <Upload data-icon="inline-start" aria-hidden="true" />
                Nhập từ tệp
              </Link>
            </Button>
            <Button onClick={() => onCreate(null)}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Thêm nhóm
            </Button>
          </div>
        ) : null}
      </header>

      <OperationalListPanel aria-label="Danh sách nhóm vật tư hàng hóa">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b p-3">
          <div>
            <h2 className="text-sm font-semibold">Danh sách nhóm vật tư hàng hóa</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {expandableIds.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExpandedIds(areAllExpanded ? new Set() : new Set(expandableIds))}
              >
                <ChevronsUpDown data-icon="inline-start" aria-hidden="true" />
                {areAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
              </Button>
            ) : null}
            {canUpdate && selectedCategories.length > 0 ? (
              <Button
                variant="outline"
                disabled={isPending || selectedCategories.every((item) => item.status !== 'Active')}
                onClick={() => setIsBulkStatusOpen(true)}
              >
                Ngừng sử dụng ({selectedCategories.length})
              </Button>
            ) : null}
            <NativeSelect
              aria-label="Lọc nhóm vật tư hàng hóa theo trạng thái"
              className="w-44"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(parseActiveStatusFilter(event.target.value))
                setSelectedIds(new Set())
                setExpandedIds(
                  new Set(
                    items
                      .filter(
                        (category) =>
                          (categoryTree.childrenByParent.get(category.id) ?? []).length > 0
                      )
                      .map((category) => category.id)
                  )
                )
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
          <OperationalErrorState title="Không thể tải nhóm vật tư hàng hóa" onRetry={onRetry} />
        ) : filteredItems.length === 0 ? (
          <OperationalEmptyState
            title={items.length === 0 ? 'Chưa có nhóm vật tư hàng hóa' : 'Không có nhóm phù hợp'}
            description={
              items.length === 0
                ? 'Thêm nhóm cấp cao đầu tiên trước khi tạo sản phẩm.'
                : 'Thử chọn trạng thái khác để xem các nhóm còn lại.'
            }
          />
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow>
                {canUpdate ? (
                  <TableHead className="w-12">
                    <Checkbox
                      aria-label="Chọn tất cả nhóm vật tư hàng hóa"
                      checked={allSelected ? true : selectedIds.size > 0 ? 'indeterminate' : false}
                      onCheckedChange={(checked) =>
                        setSelectedIds((current) =>
                          checked
                            ? new Set([...current, ...visibleItems.map((item) => item.id)])
                            : new Set(
                                [...current].filter(
                                  (id) => !visibleItems.some((item) => item.id === id)
                                )
                              )
                        )
                      }
                    />
                  </TableHead>
                ) : null}
                <TableHead>Tên nhóm</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Trạng thái</TableHead>
                {canUpdate ? <TableHead className="text-right">Thao tác</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((category) => {
                const children = categoryTree.childrenByParent.get(category.id) ?? []
                const hasVisibleChildren = children.some((child) => includedIds.has(child.id))
                const isExpanded = expandedIds.has(category.id)
                return (
                  <TableRow key={category.id} className={cn(category.level > 1 && 'bg-muted/20')}>
                    {canUpdate ? (
                      <TableCell>
                        <Checkbox
                          aria-label={`Chọn ${category.categoryName}`}
                          checked={selectedIds.has(category.id)}
                          onCheckedChange={(checked) =>
                            setSelectedIds((current) => {
                              const next = new Set(current)
                              if (checked) next.add(category.id)
                              else next.delete(category.id)
                              return next
                            })
                          }
                        />
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <div
                        className="flex min-w-0 items-center gap-1.5"
                        style={{ paddingLeft: `${(category.level - 1) * 24}px` }}
                      >
                        {hasVisibleChildren ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-7 shrink-0"
                            aria-label={`${isExpanded ? 'Thu gọn' : 'Mở rộng'} nhóm ${category.categoryName}`}
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedIds((current) => {
                                const next = new Set(current)
                                if (isExpanded) next.delete(category.id)
                                else next.add(category.id)
                                return next
                              })
                            }
                          >
                            <ChevronRight
                              aria-hidden="true"
                              className={cn('transition-transform', isExpanded && 'rotate-90')}
                            />
                          </Button>
                        ) : (
                          <span className="size-7 shrink-0" aria-hidden="true" />
                        )}
                        <span className="truncate font-medium">{category.categoryName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-lg break-words">
                      {category.description ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.status === 'Active' ? 'default' : 'outline'}>
                        {category.status === 'Active' ? 'Hoạt động' : 'Ngừng hoạt động'}
                      </Badge>
                    </TableCell>
                    {canUpdate ? (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {category.status === 'Active' && category.level < 5 ? (
                            <Button variant="ghost" size="sm" onClick={() => onCreate(category.id)}>
                              <Plus data-icon="inline-start" aria-hidden="true" />
                              Nhóm con
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={category.status !== 'Active'}
                            onClick={() => onEdit(category)}
                          >
                            <Pencil data-icon="inline-start" aria-hidden="true" />
                            Sửa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => setStatusTarget(category)}
                          >
                            {category.status === 'Active' ? (
                              <Power data-icon="inline-start" aria-hidden="true" />
                            ) : (
                              <RotateCcw data-icon="inline-start" aria-hidden="true" />
                            )}
                            {category.status === 'Active' ? 'Ngừng' : 'Kích hoạt'}
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {filteredItems.length > 0 ? (
          <OperationalPagination
            page={page}
            pageSize={pageSize}
            totalCount={filteredRoots.length}
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
            <DialogTitle>{editingCategory ? 'Chỉnh sửa nhóm' : 'Thêm nhóm'}</DialogTitle>
            <DialogDescription>
              Danh mục đang được sản phẩm sử dụng không thể ngừng hoạt động.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.categoryName)}>
                <FieldLabel htmlFor="categoryName">Tên nhóm *</FieldLabel>
                <Input id="categoryName" autoComplete="off" {...form.register('categoryName')} />
                <FieldError
                  errors={
                    form.formState.errors.categoryName
                      ? [form.formState.errors.categoryName]
                      : undefined
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="parentCategoryId">Nhóm cha</FieldLabel>
                <NativeSelect
                  id="parentCategoryId"
                  value={form.watch('parentCategoryId') ?? ''}
                  onChange={(event) =>
                    form.setValue('parentCategoryId', event.target.value || null, {
                      shouldDirty: true,
                    })
                  }
                >
                  <NativeSelectOption value="">Không có — nhóm cấp cao</NativeSelectOption>
                  {items
                    .filter((category) => {
                      if (category.status !== 'Active' || category.level >= 5) return false
                      if (!editingCategory) return true
                      return (
                        category.id !== editingCategory.id &&
                        !category.categoryPath.startsWith(`${editingCategory.categoryPath} /`)
                      )
                    })
                    .map((category) => (
                      <NativeSelectOption key={category.id} value={category.id}>
                        {`${'\u00A0\u00A0'.repeat(Math.max(category.level - 1, 0))}${category.level > 1 ? '└─ ' : ''}${category.categoryName}`}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.description)}>
                <FieldLabel htmlFor="categoryDescription">Mô tả</FieldLabel>
                <Textarea
                  id="categoryDescription"
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
        subject={`nhóm “${statusTarget?.categoryName ?? ''}”`}
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
        subject={`${selectedCategories.length} nhóm vật tư hàng hóa đã chọn`}
        nextStatus="Inactive"
        isPending={isPending}
        onOpenChange={setIsBulkStatusOpen}
        onConfirm={() => {
          onBulkDeactivate(selectedCategories)
          setIsBulkStatusOpen(false)
          setSelectedIds(new Set())
        }}
      />
    </div>
  )
}
