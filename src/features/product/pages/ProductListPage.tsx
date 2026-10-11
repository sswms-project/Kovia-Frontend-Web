'use client'

import { useState } from 'react'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Package, PackagePlus, Upload } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { formatApiError, getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import { P } from '@/config/permissionCodes'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useInventoryWarehouseOptionsQuery } from '@/features/inventory/hooks/use-inventory'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  ProductListTable,
  ProductListToolbar,
  ProductStockStatusFilter,
} from '../components/ProductListPage'
import { CreateProductDialog } from '../components/ProductForm'
import {
  useCreateProductMutation,
  useUploadProductImageMutation,
  useCreateCategoryMutation,
  useCategoriesQuery,
  useProductListQuery,
  useUnitsQuery,
} from '../hooks/use-products'
import { createProductSchema, type CreateProductFormValues } from '../schemas/product.schema'
import { categorySchema, type CategoryFormValues } from '../schemas/master-data.schema'
import type { ProductListItem, ProductStatus, ProductStockStatus } from '../types/product.types'
import { suggestCategoryCode } from '../utils/category-code'

function parseProductStatus(value: string): ProductStatus | '' {
  return value === 'Active' || value === 'Inactive' ? value : ''
}

function parseTrackingMode(value: string): 'quantity' | 'lot' | '' {
  return value === 'quantity' || value === 'lot' ? value : ''
}

function parseStockStatus(value: string | null): ProductStockStatus | '' {
  return value === 'LowStock' || value === 'OutOfStock' ? value : ''
}

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parsePageSize(value: string | null) {
  const parsed = parsePositiveInteger(value, 20)
  return [10, 20, 30, 50].includes(parsed) ? parsed : 20
}

export default function ProductListPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const page = parsePositiveInteger(searchParams.get('page'), 1)
  const pageSize = parsePageSize(searchParams.get('pageSize'))
  const searchText = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('category') ?? ''
  const warehouseId = searchParams.get('warehouse') ?? ''
  const status = parseProductStatus(searchParams.get('status') ?? '')
  const trackingMode = parseTrackingMode(searchParams.get('tracking') ?? '')
  const stockStatus = parseStockStatus(searchParams.get('stock'))
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreateImageDirty, setIsCreateImageDirty] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [discardTarget, setDiscardTarget] = useState<'product' | 'category' | null>(null)
  const debouncedSearch = useDebouncedValue(searchText.trim(), 300)
  const productForm = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      sku: '',
      productName: '',
      description: null,
      unitId: '',
      categoryId: '',
      isLotTracked: false,
      shelfLifeDays: null,
      unitConversions: [],
    },
  })
  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      categoryCode: '',
      categoryName: '',
      parentCategoryId: null,
      description: '',
    },
  })

  const meQuery = useMeQuery()
  const permissions = new Set(meQuery.data?.permissions ?? [])
  const canViewInventory = permissions.has(P.INVENTORY_VIEW)
  const warehousesQuery = useInventoryWarehouseOptionsQuery(canViewInventory)
  const listQuery = useProductListQuery({
    pageNumber: page,
    pageSize,
    ...(debouncedSearch ? { searchTerm: debouncedSearch } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(canViewInventory && warehouseId ? { warehouseId } : {}),
    ...(status ? { status } : {}),
    ...(trackingMode ? { isLotTracked: trackingMode === 'lot' } : {}),
    ...(canViewInventory && stockStatus ? { stockStatus } : {}),
  })

  const createMutation = useCreateProductMutation()
  const uploadImageMutation = useUploadProductImageMutation()
  const createCategoryMutation = useCreateCategoryMutation()
  const unitsQuery = useUnitsQuery(isCreateOpen, 'Active')
  const categoriesQuery = useCategoriesQuery(true, 'Active')

  const listData = listQuery.isPlaceholderData ? undefined : listQuery.data
  const stockStatusCounts = listQuery.data?.stockStatusCounts
  const products = listData?.items ?? []
  const isListLoading = listQuery.isLoading || listQuery.isPlaceholderData
  const canCreate = permissions.has(P.PRODUCTS_CREATE)
  const canEdit = permissions.has(P.PRODUCTS_UPDATE)
  const canManageUnits = permissions.has(P.UNITS_MANAGE)
  const canManageCategories = permissions.has(P.CATEGORIES_MANAGE)

  function updateListParams(
    updates: Readonly<Record<string, string | null>>,
    history: 'push' | 'replace' = 'push'
  ) {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([name, value]) => {
      if (value) next.set(name, value)
      else next.delete(name)
    })
    const query = next.toString()
    const url = query ? `${pathname}?${query}` : pathname
    if (history === 'replace') window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
  }

  function handleSearchChange(value: string) {
    updateListParams({ search: value || null, page: null }, 'replace')
  }

  async function handleCreate(
    values: CreateProductFormValues,
    createAnother: boolean,
    imageFile: File | null
  ) {
    let id: string
    try {
      id = await createMutation.mutateAsync(values)
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể thêm sản phẩm. Vui lòng thử lại.'))
      return false
    }

    let imageUploadFailed = false
    if (imageFile) {
      try {
        await uploadImageMutation.mutateAsync({ id, file: imageFile })
      } catch (error) {
        logger.error(formatApiError(error))
        imageUploadFailed = true
        toast.error('Sản phẩm đã được tạo nhưng chưa tải được ảnh. Bạn có thể cập nhật ảnh sau.')
      }
    }

    if (!imageUploadFailed) toast.success('Đã thêm sản phẩm mới.')
    setIsCreateImageDirty(false)
    if (!createAnother) {
      productForm.reset()
      setIsCreateOpen(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(APP_ROUTES.productDetail(id) as any)
    }
    return true
  }

  function handleCreateOpenChange(open: boolean) {
    if (!open && (productForm.formState.isDirty || isCreateImageDirty)) {
      setDiscardTarget('product')
      return
    }
    if (!open) productForm.reset()
    if (!open) setIsCreateImageDirty(false)
    setIsCreateOpen(open)
  }

  function handleCategoryDialogOpenChange(open: boolean) {
    if (!open && categoryForm.formState.isDirty) {
      setDiscardTarget('category')
      return
    }
    if (open) {
      categoryForm.reset({
        categoryCode: '',
        categoryName: '',
        parentCategoryId: null,
        description: '',
      })
    }
    setIsCategoryDialogOpen(open)
  }

  async function handleCreateCategory(values: CategoryFormValues) {
    try {
      const categoryId = await createCategoryMutation.mutateAsync({
        ...values,
        categoryCode: suggestCategoryCode(values.categoryName, categoriesQuery.data ?? []),
        description: values.description || null,
      })
      toast.success('Đã tạo và chọn nhóm vật tư hàng hóa.')
      return categoryId
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể tạo nhóm vật tư hàng hóa.'))
      return null
    }
  }

  function handleView(product: ProductListItem) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(APP_ROUTES.productDetail(product.id) as any)
  }

  function handleEdit(product: ProductListItem) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(`${APP_ROUTES.productDetail(product.id)}?edit=1` as any)
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <header className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center">
            <Package className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-primary text-xs font-medium">Kho hàng</p>
            <h1 className="mt-0.5 text-xl font-semibold">Danh mục vật tư hàng hóa</h1>
          </div>
        </div>
        {(canCreate || permissions.has(P.PRODUCTS_IMPORT)) && (
          <div className="flex items-center gap-2">
            {permissions.has(P.PRODUCTS_IMPORT) ? (
              <Button asChild variant="outline">
                <Link href={APP_ROUTES.productImport}>
                  <Upload data-icon="inline-start" aria-hidden="true" />
                  Nhập từ tệp
                </Link>
              </Button>
            ) : null}
            {canCreate && (
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => handleCreateOpenChange(true)}
              >
                <PackagePlus className="size-4" aria-hidden="true" />
                Thêm sản phẩm
              </Button>
            )}
          </div>
        )}
      </header>

      <OperationalListPanel aria-label="Danh sách sản phẩm">
        <div className="grid min-h-12 grid-cols-1 gap-2 border-b px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:px-4">
          <div className="min-w-0 sm:col-start-1 sm:row-start-1">
            <h2 className="text-sm font-semibold">
              {stockStatus === 'LowStock'
                ? 'Sản phẩm sắp hết hàng'
                : stockStatus === 'OutOfStock'
                  ? 'Sản phẩm hết hàng'
                  : 'Tất cả sản phẩm'}
            </h2>
          </div>
          {canViewInventory && stockStatusCounts ? (
            <div
              aria-busy={listQuery.isFetching}
              className="min-w-0 justify-self-center sm:col-start-2 sm:row-start-1"
            >
              <ProductStockStatusFilter
                value={stockStatus}
                counts={stockStatusCounts}
                onValueChange={(value) => {
                  updateListParams({ stock: value || null, page: null })
                }}
              />
            </div>
          ) : null}
        </div>

        <ProductListToolbar
          searchText={searchText}
          categoryId={categoryId}
          warehouseId={warehouseId}
          status={status}
          trackingMode={trackingMode}
          categories={categoriesQuery.data ?? []}
          warehouses={warehousesQuery.data ?? []}
          canViewInventory={canViewInventory}
          isFetching={listQuery.isFetching}
          onSearchChange={handleSearchChange}
          onCategoryChange={(value) => {
            updateListParams({ category: value || null, page: null })
          }}
          onWarehouseChange={(value) => {
            updateListParams({ warehouse: value || null, page: null })
          }}
          onStatusChange={(value) => {
            updateListParams({ status: parseProductStatus(value) || null, page: null })
          }}
          onTrackingModeChange={(value) => {
            updateListParams({ tracking: parseTrackingMode(value) || null, page: null })
          }}
          onRefresh={() => void listQuery.refetch()}
        />

        {isListLoading && (
          <div className="flex-1 divide-y overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex h-14 items-center gap-3 px-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="ml-auto h-4 w-20" />
              </div>
            ))}
          </div>
        )}

        {listQuery.isError && (
          <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <Package className="text-destructive size-10" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Không thể tải danh sách sản phẩm</p>
              <p className="text-muted-foreground mt-1 text-xs">Vui lòng thử lại.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={listQuery.isFetching}
              onClick={() => void listQuery.refetch()}
            >
              Thử lại
            </Button>
          </div>
        )}

        {!isListLoading && !listQuery.isError && products.length === 0 && (
          <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <div className="bg-muted flex size-12 items-center justify-center">
              <Package className="text-muted-foreground size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">Không tìm thấy sản phẩm</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {debouncedSearch ? 'Thử tên hoặc SKU khác.' : 'Chưa có sản phẩm nào.'}
              </p>
            </div>
            {searchText && (
              <Button type="button" variant="outline" onClick={() => handleSearchChange('')}>
                Xóa tìm kiếm
              </Button>
            )}
          </div>
        )}

        {products.length > 0 && (
          <>
            <ProductListTable
              products={products}
              canEdit={canEdit}
              canViewInventory={canViewInventory}
              onView={handleView}
              onEdit={handleEdit}
            />
            <OperationalPagination
              page={page}
              pageSize={pageSize}
              totalCount={listData?.totalCount ?? 0}
              isPending={listQuery.isFetching}
              onPageChange={(value) =>
                updateListParams({ page: value === 1 ? null : String(value) })
              }
              onPageSizeChange={(value) => {
                updateListParams({ pageSize: value === 20 ? null : String(value), page: null })
              }}
            />
          </>
        )}
      </OperationalListPanel>

      {canCreate && (
        <CreateProductDialog
          form={productForm}
          categoryForm={categoryForm}
          isCategoryDialogOpen={isCategoryDialogOpen}
          units={unitsQuery.data ?? []}
          categories={categoriesQuery.data ?? []}
          areOptionsLoading={unitsQuery.isLoading || categoriesQuery.isLoading}
          areOptionsError={unitsQuery.isError || categoriesQuery.isError}
          onRetryOptions={() => {
            void unitsQuery.refetch()
            void categoriesQuery.refetch()
          }}
          canManageUnits={canManageUnits}
          canManageCategories={canManageCategories}
          isCreatingCategory={createCategoryMutation.isPending}
          onCreateCategory={handleCreateCategory}
          open={isCreateOpen}
          isPending={createMutation.isPending || uploadImageMutation.isPending}
          onOpenChange={handleCreateOpenChange}
          onImageDirtyChange={setIsCreateImageDirty}
          onCategoryDialogOpenChange={handleCategoryDialogOpenChange}
          onSubmit={handleCreate}
        />
      )}
      <UnsavedChangesDialog
        open={discardTarget !== null}
        onOpenChange={(open) => !open && setDiscardTarget(null)}
        onDiscard={() => {
          if (discardTarget === 'product') {
            productForm.reset()
            setIsCreateOpen(false)
            setIsCreateImageDirty(false)
          } else if (discardTarget === 'category') {
            categoryForm.reset()
            setIsCategoryDialogOpen(false)
          }
          setDiscardTarget(null)
        }}
      />
    </div>
  )
}
