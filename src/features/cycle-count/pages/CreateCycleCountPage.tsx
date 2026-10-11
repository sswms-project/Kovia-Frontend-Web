'use client'

import { useMemo, useState } from 'react'
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
import { useStaffListQuery } from '@/features/staff/hooks/use-staff'
import { STAFF_DIRECTORY_KINDS } from '@/features/staff/types/staff.types'
import {
  useWarehouseLayoutQuery,
  useWarehousesQuery,
} from '@/features/warehouse/hooks/use-warehouse'
import { APP_ROUTES } from '@/routes/app-routes'
import { CreateCycleCountForm, type SubmitMode } from '../components/CreateCycleCountPage'
import { useCreateCycleCountMutation } from '../hooks/use-cycle-count'
import {
  createCycleCountSchema,
  type CreateCycleCountFormValues,
} from '../schemas/cycle-count.schema'

export default function CreateCycleCountPage() {
  const [inventoryPage, setInventoryPage] = useState(1)
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
  const warehouseId = useWatch({ control: form.control, name: 'warehouseId' })
  const zoneId = useWatch({ control: form.control, name: 'zoneId' })
  const inventoryScope = {
    warehouseId,
    ...(zoneId ? { zoneId } : {}),
    ...(rackId ? { rackId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(debouncedSearch.trim() ? { searchTerm: debouncedSearch.trim() } : {}),
  }
  const warehouses = useWarehousesQuery({ top: 100, skip: 0, needTotalCount: true, isActive: true })
  const categories = useCategoriesQuery(true, 'Active')
  const layout = useWarehouseLayoutQuery(warehouseId, Boolean(warehouseId))
  const staff = useStaffListQuery(STAFF_DIRECTORY_KINDS.staff, {
    top: 100,
    skip: 0,
    needTotalCount: true,
  })
  const inventory = useInventoryQuery(
    { pageNumber: inventoryPage, pageSize: inventoryPageSize, ...inventoryScope },
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
  const staffOptions = useMemo(
    () =>
      (staff.data?.items ?? [])
        .filter(
          (member) =>
            member.status === 'Active' && member.assignedWarehouseIds.includes(warehouseId)
        )
        .map((member) => ({ value: member.id, label: `${member.fullName} · ${member.email}` })),
    [staff.data?.items, warehouseId]
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
      const response = await mutation.mutateAsync({
        warehouseId: values.warehouseId,
        zoneId: values.zoneId || null,
        scheduledDate: new Date(values.scheduledDate).toISOString(),
        assignedTo: values.assignedTo,
        items: values.items,
        isBlindCount: values.isBlindCount,
        purpose: values.purpose.trim() || null,
        dueDate: values.dueDate ? new Date(`${values.dueDate}T23:59:59`).toISOString() : null,
        priority: values.priority,
        // Hạn công việc = cuối ngày "kiểm kê đến ngày".
        dueAt: values.dueDate ? new Date(`${values.dueDate}T23:59:59`).toISOString() : null,
      })
      toast.success('Đã tạo phiếu kiểm kê.')
      if (mode === 'saveAndAdd') {
        form.reset({ ...values, items: [], purpose: '', dueDate: '' })
        setInventoryPage(1)
        return
      }
      router.push(APP_ROUTES.cycleCountDetail(response.data))
    } catch (error) {
      logger.error(error)
      toast.error(error instanceof Error ? error.message : 'Không thể tạo phiếu kiểm kê.')
    }
  }

  return (
    <CreateCycleCountForm
      form={form}
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
      isPending={mutation.isPending}
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
  )
}
