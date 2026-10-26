'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { toOperationalDateTimeApi, toOperationalDateTimeInput } from '@/lib/operational-date-time'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { useCodeSuggestion } from '@/hooks/use-code-suggestion'
import { getApiErrorMessage } from '@/lib/api-error'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  useFetchAllInventoryMutation,
  useInventoryQuery,
} from '@/features/inventory/hooks/use-inventory'
import { useCategoriesQuery } from '@/features/product/hooks/use-products'
import {
  useWarehouseLayoutQuery,
  useWarehousesQuery,
} from '@/features/warehouse/hooks/use-warehouse'
import { APP_ROUTES } from '@/routes/app-routes'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import { CreateCycleCountForm, type SubmitMode } from '../components/CreateCycleCountPage'
import {
  useCreateCycleCountMutation,
  useNextCycleCountCodeQuery,
  useCycleCountAssignableStaffQuery,
  useCycleCountQuery,
  useCycleCountAllowedActionsQuery,
  useUpdateCycleCountMutation,
} from '../hooks/use-cycle-count'
import {
  createCycleCountSchema,
  type CreateCycleCountFormValues,
} from '../schemas/cycle-count.schema'

export default function CreateCycleCountPage({
  cycleCountId = '',
}: {
  readonly cycleCountId?: string
}) {
  const detail = useCycleCountQuery(cycleCountId)
  const actions = useCycleCountAllowedActionsQuery(cycleCountId)
  const update = useUpdateCycleCountMutation()
  // A background refresh must never replace the version or contents the user started editing.
  const [editingSnapshot, setEditingSnapshot] = useState<typeof detail.data>(undefined)
  const hydratedDocumentId = useRef<string | null>(null)
  if (cycleCountId && detail.data?.id === cycleCountId && editingSnapshot?.id !== cycleCountId) {
    setEditingSnapshot(detail.data)
  }
  const instanceId = useId()
  const [codeSession, setCodeSession] = useState(0)
  const sessionKey = `${instanceId}:${codeSession}`
  const nextCode = useNextCycleCountCodeQuery(sessionKey, !cycleCountId)
  const [inventoryPage, setInventoryPage] = useState(1)
  const [isDiscardOpen, setIsDiscardOpen] = useState(false)
  const [inventoryPageSize, setInventoryPageSize] = useState(50)
  const [searchTerm, setSearchTerm] = useState('')
  const [rackId, setRackId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const debouncedSearch = useDebouncedValue(searchTerm, 300)
  const router = useRouter()
  const mutation = useCreateCycleCountMutation()
  const fetchAllInventory = useFetchAllInventoryMutation()
  const form = useForm<CreateCycleCountFormValues>({
    resolver: zodResolver(createCycleCountSchema),
    defaultValues: {
      code: '',
      warehouseId: '',
      zoneId: '',
      scheduledDate: '',
      priority: 'Normal',
      assignedTo: '',
      items: [],
      isBlindCount: true,
      purpose: '',
      dueDate: '',
    },
  })
  const codeSuggestion = useCodeSuggestion({
    active: !cycleCountId,
    sessionKey,
    suggestedCode: nextCode.data,
    isFetching: nextCode.isFetching,
    isError: nextCode.isError,
    getCurrentCode: () => form.getValues('code') ?? '',
    applyCode: (code) => form.setValue('code', code),
  })
  useEffect(() => {
    if (!form.formState.isDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [form.formState.isDirty])
  useEffect(() => {
    if (!editingSnapshot || hydratedDocumentId.current === editingSnapshot.id) return
    const document = editingSnapshot
    hydratedDocumentId.current = document.id
    form.reset({
      code: document.code,
      warehouseId: document.warehouseId,
      zoneId: document.zoneId ?? '',
      scheduledDate: toOperationalDateTimeInput(document.scheduledDate),
      priority: document.priority,
      assignedTo: document.assignedTo ?? '',
      items: document.items.map(({ productId, slotId, lotId, qualityStatus }) => ({
        productId,
        slotId,
        lotId,
        qualityStatus,
      })),
      isBlindCount: document.isBlindCount,
      purpose: document.purpose ?? '',
      dueDate: toOperationalDateTimeInput(document.dueDate ?? document.dueAt).slice(0, 10),
    })
  }, [editingSnapshot, form])
  const warehouseId = useWatch({ control: form.control, name: 'warehouseId' })
  const zoneId = useWatch({ control: form.control, name: 'zoneId' })
  const inventoryScope = {
    warehouseId,
    inStockOnly: true,
    ...(zoneId ? { zoneId } : {}),
    ...(rackId ? { rackId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(debouncedSearch.trim() ? { searchTerm: debouncedSearch.trim() } : {}),
  }
  const warehouses = useWarehousesQuery({ top: 100, skip: 0, needTotalCount: true, isActive: true })
  const categories = useCategoriesQuery(true, 'Active')
  const layout = useWarehouseLayoutQuery(warehouseId, Boolean(warehouseId))
  const staff = useCycleCountAssignableStaffQuery(warehouseId)
  const inventory = useInventoryQuery(
    {
      pageNumber: inventoryPage,
      pageSize: inventoryPageSize,
      includeLastCount: true,
      ...inventoryScope,
    },
    Boolean(warehouseId)
  )
  const warehouseOptions = useMemo(
    () =>
      (warehouses.data?.items ?? []).map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}`,
      })),
    [warehouses.data?.items]
  )
  const activeZones = useMemo(
    () => (layout.data ?? []).filter((zone) => zone.status === 'Active'),
    [layout.data]
  )
  const zoneOptions = useMemo(
    () =>
      activeZones.map((zone) => ({ value: zone.id, label: `${zone.zoneCode} · ${zone.zoneName}` })),
    [activeZones]
  )
  const rackOptions = useMemo(
    () =>
      activeZones
        .filter((zone) => !zoneId || zone.id === zoneId)
        .flatMap((zone) => zone.racks)
        .filter((rack) => rack.status === 'Active')
        .map((rack) => ({ value: rack.id, label: `${rack.rackCode} · ${rack.rackName}` })),
    [activeZones, zoneId]
  )
  const categoryOptions = useMemo(
    () =>
      [...(categories.data ?? [])]
        .sort((first, second) => first.categoryPath.localeCompare(second.categoryPath, 'vi'))
        .map((category) => ({
          value: category.id,
          // Thụt đầu dòng theo cấp để nhìn ra quan hệ cha - con.
          label: `${'— '.repeat(Math.max(category.level - 1, 0))}${category.categoryCode} · ${category.categoryName}`,
        })),
    [categories.data]
  )
  // Backend đã lọc nhân viên đủ điều kiện tại kho và xếp người ít việc nhất lên đầu.
  const staffOptions = useMemo(
    () =>
      (staff.data ?? []).map((member) => ({
        value: member.id,
        label: [
          member.fullName,
          member.isRecommended ? 'Đề xuất' : null,
          `${member.openCycleCounts ?? 0} phiếu kiểm kê đang mở`,
        ]
          .filter(Boolean)
          .join(' · '),
      })),
    [staff.data]
  )

  async function selectAllMatching() {
    try {
      return await fetchAllInventory.mutateAsync(inventoryScope)
    } catch (error) {
      logger.error(error)
      toast.error('Không thể tải toàn bộ tồn kho theo bộ lọc.')
      return []
    }
  }

  async function submit(values: CreateCycleCountFormValues, mode: SubmitMode) {
    try {
      const deadlineUnchanged =
        editingSnapshot &&
        values.dueDate ===
          toOperationalDateTimeInput(editingSnapshot.dueDate ?? editingSnapshot.dueAt).slice(0, 10)
      const changedDeadline = toOperationalDateTimeApi(values.dueDate)
      const request = {
        code: values.code?.trim() || undefined,
        warehouseId: values.warehouseId,
        zoneId: values.zoneId || null,
        scheduledDate: toOperationalDateTimeApi(
          values.scheduledDate,
          editingSnapshot?.scheduledDate
        )!,
        assignedTo: values.assignedTo,
        items: values.items,
        isBlindCount: values.isBlindCount,
        purpose: values.purpose.trim() || null,
        dueDate: deadlineUnchanged ? editingSnapshot.dueDate : changedDeadline,
        priority: values.priority,
        // Hạn công việc = cuối ngày "kiểm kê đến ngày".
        dueAt: deadlineUnchanged ? editingSnapshot.dueAt : changedDeadline,
      }
      if (cycleCountId) {
        const expectedVersion = editingSnapshot?.version
        if (!expectedVersion || !actions.data?.allowedActions.includes('Update')) {
          toast.error('Phiếu không còn được phép sửa. Vui lòng tải lại.')
          return
        }
        await update.mutateAsync({ id: cycleCountId, expectedVersion, request })
        toast.success('Đã cập nhật phiếu kiểm kê.')
        router.push(APP_ROUTES.cycleCountDetail(cycleCountId))
        return
      }
      const response = await mutation.mutateAsync(request)
      toast.success('Đã tạo phiếu kiểm kê.')
      if (mode === 'saveAndAdd') {
        form.reset({ ...values, code: '', items: [], purpose: '', dueDate: '' })
        codeSuggestion.resetSession()
        setCodeSession((current) => current + 1)
        setInventoryPage(1)
        return
      }
      router.push(APP_ROUTES.cycleCountDetail(response.data))
    } catch (error) {
      logger.error(error)
      toast.error(getApiErrorMessage(error, 'Không thể lưu phiếu kiểm kê.'))
    }
  }

  if (cycleCountId && (detail.isLoading || actions.isLoading)) return <OperationalLoadingState />
  if (cycleCountId && (detail.isError || actions.isError || !detail.data))
    return (
      <OperationalErrorState
        title="Không thể tải phiếu kiểm kê"
        onRetry={() => {
          void detail.refetch()
          void actions.refetch()
        }}
      />
    )
  if (cycleCountId && !actions.data?.allowedActions.includes('Update'))
    return (
      <OperationalErrorState
        title="Phiếu đã bắt đầu hoặc bạn không còn quyền sửa"
        onRetry={() => {
          void actions.refetch()
        }}
      />
    )

  return (
    <>
      <CreateCycleCountForm
        onCancel={(event) => {
          if (!form.formState.isDirty) return
          event.preventDefault()
          setIsDiscardOpen(true)
        }}
        form={form}
        editingDocument={cycleCountId ? editingSnapshot : undefined}
        onCodeChange={codeSuggestion.markEdited}
        codeSuggestionStatus={
          nextCode.isFetching ? 'loading' : nextCode.isError ? 'error' : 'ready'
        }
        warehouses={warehouseOptions}
        zones={zoneOptions}
        racks={rackOptions}
        staff={staffOptions}
        categories={categoryOptions}
        rackId={rackId}
        categoryId={categoryId}
        searchTerm={searchTerm}
        inventory={inventory.data?.items ?? []}
        inventoryPage={inventoryPage}
        inventoryPageSize={inventoryPageSize}
        inventoryTotalCount={inventory.data?.totalCount ?? 0}
        isInventoryLoading={inventory.isLoading}
        isSelectingAll={fetchAllInventory.isPending}
        isPending={mutation.isPending || update.isPending}
        onRackChange={setRackId}
        onCategoryChange={setCategoryId}
        onSearchTermChange={setSearchTerm}
        onInventoryPageChange={setInventoryPage}
        onInventoryPageSizeChange={(value) => {
          setInventoryPageSize(value)
          setInventoryPage(1)
        }}
        onSelectAllMatching={selectAllMatching}
        onSubmit={submit}
      />
      <UnsavedChangesDialog
        open={isDiscardOpen}
        onOpenChange={setIsDiscardOpen}
        onDiscard={() => {
          form.reset(form.getValues())
          router.push(
            cycleCountId ? APP_ROUTES.cycleCountDetail(cycleCountId) : APP_ROUTES.cycleCounts
          )
        }}
      />
    </>
  )
}
