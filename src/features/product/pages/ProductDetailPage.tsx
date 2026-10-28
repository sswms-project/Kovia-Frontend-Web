'use client'

import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft,
  Boxes,
  Pencil,
  Power,
  QrCode,
  RefreshCw,
  RotateCcw,
  Scale,
  Settings2,
  Store,
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatApiError, getApiErrorMessage } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { StatusChangeDialog } from '@/components/operations/StatusChangeDialog'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import { P } from '@/config/permissionCodes'
import { USER_ROLES } from '@/config/roles'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import {
  useWarehouseLocationsQuery,
  useWarehousesQuery,
} from '@/features/warehouse/hooks/use-warehouse'
import { useSuppliersQuery } from '@/features/supplier/hooks/use-suppliers'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { APP_ROUTES } from '@/routes/app-routes'
import {
  ProductDetailSidebar,
  ProductBarcodePanel,
  ProductSuppliersPanel,
  ProductLotsPanel,
  ProductWarehousePoliciesPanel,
  ProductUnitConversionsPanel,
} from '../components/ProductDetailPage'
import { UpdateProductDialog } from '../components/ProductForm'
import { ProductStockPolicyDialog } from '../components/ProductStockPolicyForm'
import {
  useProductDetailQuery,
  useChangeProductStatusMutation,
  useChangeStockPolicyStatusMutation,
  useChangeProductUnitConversionStatusMutation,
  useAddProductSupplierMutation,
  useCreateProductUnitConversionMutation,
  useCategoriesQuery,
  useUpdateProductMutation,
  useConfigureStockPolicyMutation,
  useGenerateBarcodeMutation,
  useProductLotsQuery,
  useProductLotImpactQuery,
  useProductStockPoliciesQuery,
  useProductSuppliersQuery,
  useProductUnitConversionsQuery,
  useUpdateProductUnitConversionMutation,
  useUpdateProductSupplierMutation,
  useDeleteProductSupplierMutation,
  useBlockProductLotMutation,
  useUnlockProductLotMutation,
  useUploadProductImageMutation,
  useUnitsQuery,
} from '../hooks/use-products'
import {
  productUnitConversionSchema,
  type ProductUnitConversionFormValues,
} from '../schemas/master-data.schema'
import {
  stockPolicySchema,
  updateProductSchema,
  type StockPolicyFormValues,
  type UpdateProductFormValues,
} from '../schemas/product.schema'
import type { ProductLot, ProductLotStatus, ProductUnitConversion } from '../types/product.types'

interface ProductDetailPageProps {
  readonly productId: string
}

export default function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isEditOpen, setIsEditOpen] = useState(() => searchParams.get('edit') === '1')
  const [isEditImageDirty, setIsEditImageDirty] = useState(false)
  const [isStockPolicyOpen, setIsStockPolicyOpen] = useState(false)
  const [policyWarehouseId, setPolicyWarehouseId] = useState('')
  const [isConversionOpen, setIsConversionOpen] = useState(false)
  const [isProductStatusOpen, setIsProductStatusOpen] = useState(false)
  const [discardTarget, setDiscardTarget] = useState<'product' | 'policy' | null>(null)
  const [editingConversion, setEditingConversion] = useState<ProductUnitConversion | null>(null)
  const [lotWarehouseId, setLotWarehouseId] = useState('')
  const [lotStatus, setLotStatus] = useState<ProductLotStatus | ''>('')
  const [onlyAvailableLots, setOnlyAvailableLots] = useState(false)
  const [expiresOnOrBefore, setExpiresOnOrBefore] = useState('')
  const [impactLotId, setImpactLotId] = useState<string | null>(null)

  const detailQuery = useProductDetailQuery(productId)
  const meQuery = useMeQuery()
  const updateMutation = useUpdateProductMutation(productId)
  const uploadImageMutation = useUploadProductImageMutation()
  const productStatusMutation = useChangeProductStatusMutation(productId)
  const stockPolicyMutation = useConfigureStockPolicyMutation(productId)
  const barcodeMutation = useGenerateBarcodeMutation(productId)
  const policiesQuery = useProductStockPoliciesQuery(productId)
  const policyStatusMutation = useChangeStockPolicyStatusMutation(productId)
  const conversionsQuery = useProductUnitConversionsQuery(productId)
  const createConversionMutation = useCreateProductUnitConversionMutation(productId)
  const updateConversionMutation = useUpdateProductUnitConversionMutation(productId)
  const conversionStatusMutation = useChangeProductUnitConversionStatusMutation(productId)
  const warehousesQuery = useWarehousesQuery({ top: 100, skip: 0, needTotalCount: true })
  const policyLocationsQuery = useWarehouseLocationsQuery(policyWarehouseId, {
    top: 1000,
    skip: 0,
    needTotalCount: true,
    type: 'Slot',
    lifecycleStatus: 'Active',
  })
  const suppliersQuery = useSuppliersQuery({ pageNumber: 1, pageSize: 100, status: 'Active' })
  const productSuppliersQuery = useProductSuppliersQuery(productId)
  const addSupplierMutation = useAddProductSupplierMutation(productId)
  const updateSupplierMutation = useUpdateProductSupplierMutation(productId)
  const deleteSupplierMutation = useDeleteProductSupplierMutation(productId)
  const lotsQuery = useProductLotsQuery(
    productId,
    {
      ...(lotWarehouseId ? { warehouseId: lotWarehouseId } : {}),
      ...(lotStatus ? { status: lotStatus } : {}),
      ...(onlyAvailableLots ? { onlyAvailable: true } : {}),
      ...(expiresOnOrBefore ? { expiresOnOrBefore } : {}),
    },
    Boolean(detailQuery.data?.isLotTracked)
  )
  const impactQuery = useProductLotImpactQuery(productId, impactLotId)
  const blockLotMutation = useBlockProductLotMutation(productId)
  const unlockLotMutation = useUnlockProductLotMutation(productId)
  const unitsQuery = useUnitsQuery(isEditOpen || isConversionOpen, 'Active')
  const categoriesQuery = useCategoriesQuery(isEditOpen, 'Active')
  const conversionForm = useForm<ProductUnitConversionFormValues>({
    resolver: zodResolver(productUnitConversionSchema),
    defaultValues: { unitId: '', conversionFactor: 1 },
  })
  const updateProductForm = useForm<UpdateProductFormValues>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: {
      productName: '',
      description: null,
      unitId: '',
      categoryId: '',
      isLotTracked: false,
      shelfLifeDays: null,
    },
  })
  const stockPolicyForm = useForm<StockPolicyFormValues>({
    resolver: zodResolver(stockPolicySchema),
    defaultValues: {
      scope: 'single',
      warehouseId: '',
      preferredSlotId: null,
      minStockThreshold: 0,
      maxStockThreshold: null,
      reorderPoint: null,
      safetyStock: 0,
      leadTimeDays: null,
    },
  })

  const product = detailQuery.data
  const permissions = new Set(meQuery.data?.permissions ?? [])
  const canUpdate = permissions.has(P.PRODUCTS_UPDATE)
  const canBlockLot =
    canUpdate &&
    (meQuery.data?.role === USER_ROLES.TenantOwner ||
      meQuery.data?.role === USER_ROLES.WarehouseManager)
  const canUnlockLot = canUpdate && meQuery.data?.role === USER_ROLES.TenantOwner
  const canConfigureStockPolicy = permissions.has(P.PRODUCTS_CONFIGURE_POLICY)
  const canGenerateBarcode = permissions.has(P.PRODUCTS_GENERATE_BARCODE)
  const canManageConversions = permissions.has(P.UNITS_MANAGE)
  const canManageCategories = permissions.has(P.CATEGORIES_MANAGE)

  useEffect(() => {
    if (searchParams.get('edit') !== '1' || !product || !canUpdate || !isEditOpen) return
    updateProductForm.reset({
      productName: product.productName,
      description: product.description,
      unitId: product.unitId,
      categoryId: product.categoryId ?? '',
      isLotTracked: product.isLotTracked,
      shelfLifeDays: product.shelfLifeDays,
    })
  }, [canUpdate, isEditOpen, product, searchParams, updateProductForm])

  async function handleProductStatus() {
    if (!product) return
    const status = product.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await productStatusMutation.mutateAsync(status)
      toast.success(status === 'Active' ? 'Đã kích hoạt sản phẩm.' : 'Đã ngừng sản phẩm.')
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể thay đổi trạng thái sản phẩm.'))
    }
  }

  function openCreateConversion() {
    setEditingConversion(null)
    conversionForm.reset({ unitId: '', conversionFactor: 1 })
    setIsConversionOpen(true)
  }

  function openEditConversion(conversion: ProductUnitConversion) {
    setEditingConversion(conversion)
    conversionForm.reset({
      unitId: conversion.unitId,
      conversionFactor: conversion.conversionFactor,
    })
    setIsConversionOpen(true)
  }

  async function saveConversion(values: ProductUnitConversionFormValues) {
    try {
      if (editingConversion) {
        await updateConversionMutation.mutateAsync({
          conversionId: editingConversion.id,
          request: { conversionFactor: values.conversionFactor },
        })
        toast.success('Đã cập nhật quy đổi đơn vị.')
      } else {
        await createConversionMutation.mutateAsync(values)
        toast.success('Đã thêm quy đổi đơn vị.')
      }
      setIsConversionOpen(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lưu quy đổi đơn vị.'))
    }
  }

  async function changeConversionStatus(conversion: ProductUnitConversion) {
    const status = conversion.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await conversionStatusMutation.mutateAsync({ conversionId: conversion.id, status })
      toast.success(status === 'Active' ? 'Đã kích hoạt quy đổi.' : 'Đã ngừng quy đổi.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể thay đổi trạng thái quy đổi.'))
    }
  }

  async function handleUpdate(values: UpdateProductFormValues, imageFile: File | null) {
    try {
      if (updateProductForm.formState.isDirty) {
        await updateMutation.mutateAsync(values)
        updateProductForm.reset(values)
      }
      if (imageFile) await uploadImageMutation.mutateAsync({ id: productId, file: imageFile })
      toast.success('Đã cập nhật sản phẩm.')
      closeProductEditor()
      return true
    } catch (error) {
      logger.error(formatApiError(error))
      const message =
        imageFile && !updateProductForm.formState.isDirty
          ? 'Thông tin sản phẩm đã được lưu nhưng chưa tải được ảnh. Hãy thử lại.'
          : getApiErrorMessage(error, 'Không thể cập nhật sản phẩm.')
      toast.error(message)
      if (
        message ===
        'Không thể thay đổi phương thức quản lý tồn kho vì sản phẩm đã phát sinh dữ liệu kho.'
      ) {
        await detailQuery.refetch()
      }
      return false
    }
  }

  function openProductEditor() {
    if (!product) return
    updateProductForm.reset({
      productName: product.productName,
      description: product.description,
      unitId: product.unitId,
      categoryId: product.categoryId ?? '',
      isLotTracked: product.isLotTracked,
      shelfLifeDays: product.shelfLifeDays,
    })
    setIsEditOpen(true)
  }

  function changeProductEditorOpen(open: boolean) {
    if (open) {
      setIsEditOpen(true)
      return
    }
    if (updateProductForm.formState.isDirty || isEditImageDirty) {
      setDiscardTarget('product')
      return
    }
    closeProductEditor()
  }

  function closeProductEditor() {
    setIsEditOpen(false)
    setIsEditImageDirty(false)
    if (searchParams.get('edit') !== '1') return
    const next = new URLSearchParams(searchParams.toString())
    next.delete('edit')
    const query = next.toString()
    router.replace((query ? `${pathname}?${query}` : pathname) as never)
  }

  async function handleBlockLot(lot: ProductLot, reason: string) {
    try {
      await blockLotMutation.mutateAsync({ lotId: lot.id, reason })
      toast.success('Đã khóa lô và chặn xuất tại mọi kho.')
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể khóa lô.'))
    }
  }

  async function handleUnlockLot(lot: ProductLot, reason: string) {
    try {
      await unlockLotMutation.mutateAsync({ lotId: lot.id, reason })
      toast.success('Đã mở khóa lô.')
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể mở khóa lô.'))
    }
  }

  async function handleStockPolicy(values: StockPolicyFormValues) {
    try {
      await stockPolicyMutation.mutateAsync({
        warehouseId: values.scope === 'single' ? values.warehouseId : null,
        applyToAllWarehouses: values.scope === 'all',
        preferredSlotId: values.scope === 'single' ? values.preferredSlotId : null,
        minStockThreshold: values.minStockThreshold,
        maxStockThreshold: values.maxStockThreshold,
        reorderPoint: values.reorderPoint,
        safetyStock: values.safetyStock,
        leadTimeDays: values.leadTimeDays,
      })
      toast.success(
        values.scope === 'all'
          ? 'Đã áp dụng chính sách cho tất cả kho được quản lý.'
          : 'Đã cập nhật chính sách tồn kho.'
      )
      stockPolicyForm.reset(values)
      setIsStockPolicyOpen(false)
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật chính sách tồn kho.'))
    }
  }

  function openStockPolicyEditor() {
    const warehouseId =
      policiesQuery.data?.[0]?.warehouseId ?? warehousesQuery.data?.items[0]?.id ?? ''
    const policy = policiesQuery.data?.find((item) => item.warehouseId === warehouseId)
    setPolicyWarehouseId(warehouseId)
    stockPolicyForm.reset({
      scope: 'single',
      warehouseId,
      preferredSlotId: policy?.preferredSlotId ?? null,
      minStockThreshold: policy?.minStockThreshold ?? 0,
      maxStockThreshold: policy?.maxStockThreshold ?? null,
      reorderPoint: policy?.reorderPoint ?? null,
      safetyStock: policy?.safetyStock ?? 0,
      leadTimeDays: policy?.leadTimeDays ?? null,
    })
    setIsStockPolicyOpen(true)
  }

  function changeStockPolicyOpen(open: boolean) {
    if (!open && stockPolicyForm.formState.isDirty) {
      setDiscardTarget('policy')
      return
    }
    setIsStockPolicyOpen(open)
  }

  async function handlePolicyStatus(policyId: string, currentStatus: 'Active' | 'Inactive') {
    const status = currentStatus === 'Active' ? 'Inactive' : 'Active'
    try {
      await policyStatusMutation.mutateAsync({ policyId, status })
      toast.success(
        status === 'Active' ? 'Đã kích hoạt chính sách tồn kho.' : 'Đã ngừng chính sách tồn kho.'
      )
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể thay đổi trạng thái chính sách tồn kho.'))
    }
  }

  async function handleGenerateBarcode() {
    try {
      await barcodeMutation.mutateAsync()
      toast.success('Đã tạo mã vạch.')
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể tạo mã vạch.'))
    }
  }

  async function addProductSupplier(
    request: Parameters<typeof addSupplierMutation.mutateAsync>[0]
  ) {
    try {
      await addSupplierMutation.mutateAsync(request)
      toast.success('Đã liên kết nhà cung cấp.')
      return true
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể liên kết nhà cung cấp.'))
      return false
    }
  }

  async function updateProductSupplier(
    linkId: string,
    request: Parameters<typeof updateSupplierMutation.mutateAsync>[0]['request']
  ) {
    try {
      await updateSupplierMutation.mutateAsync({ linkId, request })
      toast.success('Đã cập nhật nhà cung cấp.')
      return true
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật nhà cung cấp.'))
      return false
    }
  }

  async function deleteProductSupplier(linkId: string) {
    try {
      await deleteSupplierMutation.mutateAsync(linkId)
      toast.success('Đã xóa liên kết nhà cung cấp.')
      return true
    } catch (error) {
      logger.error(formatApiError(error))
      toast.error(getApiErrorMessage(error, 'Không thể xóa liên kết nhà cung cấp.'))
      return false
    }
  }

  if (detailQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    )
  }

  if (detailQuery.isError || !product) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium">Không thể tải thông tin sản phẩm</p>
        <Button
          type="button"
          variant="outline"
          disabled={detailQuery.isFetching}
          onClick={() => void detailQuery.refetch()}
        >
          <RefreshCw
            className={detailQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
            aria-hidden="true"
          />
          Thử lại
        </Button>
      </div>
    )
  }

  const requestedTab = searchParams.get('tab')
  const activeTab =
    requestedTab === 'stock' ||
    requestedTab === 'conversions' ||
    requestedTab === 'barcode' ||
    requestedTab === 'suppliers' ||
    (requestedTab === 'lots' && product.isLotTracked)
      ? requestedTab
      : 'info'

  function handleTabChange(tab: string) {
    const next = new URLSearchParams(searchParams.toString())
    if (tab === 'info') next.delete('tab')
    else next.set('tab', tab)
    const query = next.toString()
    window.history.pushState(null, '', query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon">
            <Link href={APP_ROUTES.products} aria-label="Quay lại danh sách sản phẩm">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Chi tiết sản phẩm</h1>
        </div>
        {canUpdate ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={productStatusMutation.isPending}
              onClick={() => setIsProductStatusOpen(true)}
            >
              {product.status === 'Active' ? (
                <Power data-icon="inline-start" aria-hidden="true" />
              ) : (
                <RotateCcw data-icon="inline-start" aria-hidden="true" />
              )}
              {product.status === 'Active' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={product.status !== 'Active'}
              onClick={openProductEditor}
            >
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Chỉnh sửa
            </Button>
          </div>
        ) : null}
      </div>

      {/* Two-column layout */}
      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left sidebar */}
        <div className="lg:sticky lg:top-20">
          <ProductDetailSidebar product={product} />
        </div>

        {/* Right tabbed panel */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="min-w-0">
          <TabsList
            variant="line"
            aria-label="Các phần thông tin sản phẩm"
            className="scroll-fade-x h-10 w-full max-w-full min-w-0 justify-start overflow-x-auto overflow-y-hidden overscroll-x-contain border-b p-0"
          >
            <TabsTrigger value="info" className="h-10 flex-none px-3">
              Thông tin cơ bản
            </TabsTrigger>
            <TabsTrigger value="stock" className="h-10 flex-none px-3">
              <Settings2 aria-hidden="true" />
              Chính sách tồn kho
            </TabsTrigger>
            <TabsTrigger value="conversions" className="h-10 flex-none px-3">
              <Scale aria-hidden="true" />
              Quy đổi đơn vị
            </TabsTrigger>
            <TabsTrigger value="barcode" className="h-10 flex-none px-3">
              <QrCode aria-hidden="true" />
              Mã vạch
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="h-10 flex-none px-3">
              <Store aria-hidden="true" />
              Nhà cung cấp
            </TabsTrigger>
            {product.isLotTracked ? (
              <TabsTrigger value="lots" className="h-10 flex-none px-3">
                <Boxes aria-hidden="true" />
                Lô sản phẩm
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <div className="bg-card space-y-4 rounded-lg border p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Tên sản phẩm
                  </p>
                  <p className="mt-1 text-sm font-medium">{product.productName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Mã hàng hóa
                  </p>
                  <p className="mt-1 font-mono text-sm">{product.sku}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Nhóm vật tư hàng hóa
                  </p>
                  <p className="mt-1 text-sm">{product.categoryPath ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Đơn vị tính
                  </p>
                  <p className="mt-1 text-sm">{product.unitName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Quản lý tồn kho
                  </p>
                  <p className="mt-1 text-sm">
                    {product.isLotTracked ? 'Theo lô' : 'Theo số lượng'}
                  </p>
                </div>
                {product.isLotTracked ? (
                  <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Số ngày sử dụng dự kiến
                    </p>
                    <p className="mt-1 text-sm">{product.shelfLifeDays ?? 'Không cấu hình'}</p>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Mô tả
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{product.description ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Tồn thực tế
                  </p>
                  <p className="mt-1 text-sm font-medium tabular-nums">{product.quantityOnHand}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Đang giữ / Khả dụng
                  </p>
                  <p className="mt-1 text-sm tabular-nums">
                    {product.reservedQuantity} / {product.availableQuantity}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stock" className="mt-4">
            <ProductWarehousePoliciesPanel
              policies={policiesQuery.data ?? []}
              isLoading={policiesQuery.isLoading}
              isError={policiesQuery.isError}
              canManage={canConfigureStockPolicy}
              onRetry={() => void policiesQuery.refetch()}
              onConfigure={openStockPolicyEditor}
              isChangingStatus={policyStatusMutation.isPending}
              onChangeStatus={(policy) => void handlePolicyStatus(policy.id, policy.status)}
            />
          </TabsContent>

          <TabsContent value="conversions" className="mt-4">
            <ProductUnitConversionsPanel
              baseUnitName={product.unitName}
              conversions={conversionsQuery.data ?? []}
              units={(unitsQuery.data ?? []).filter(
                (unit) =>
                  unit.id !== product.unitId &&
                  !conversionsQuery.data?.some(
                    (conversion) =>
                      conversion.unitId === unit.id && conversion.id !== editingConversion?.id
                  )
              )}
              editingConversion={editingConversion}
              form={conversionForm}
              isDialogOpen={isConversionOpen}
              isLoading={conversionsQuery.isLoading}
              isError={conversionsQuery.isError}
              isPending={
                createConversionMutation.isPending ||
                updateConversionMutation.isPending ||
                conversionStatusMutation.isPending
              }
              canManage={canManageConversions}
              onRetry={() => void conversionsQuery.refetch()}
              onCreate={openCreateConversion}
              onEdit={openEditConversion}
              onDialogOpenChange={setIsConversionOpen}
              onSubmit={(values) => void saveConversion(values)}
              onChangeStatus={(conversion) => void changeConversionStatus(conversion)}
            />
          </TabsContent>

          <TabsContent value="barcode" className="mt-4">
            <div className="bg-card rounded-lg border">
              <ProductBarcodePanel
                sku={product.sku}
                barcodeValue={product.barcodeValue}
                canGenerate={canGenerateBarcode}
                isGenerating={barcodeMutation.isPending}
                onGenerate={() => void handleGenerateBarcode()}
              />
            </div>
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4">
            <ProductSuppliersPanel
              canManage={canUpdate}
              links={productSuppliersQuery.data ?? []}
              suppliers={suppliersQuery.data?.items ?? []}
              isLoading={productSuppliersQuery.isLoading}
              isError={productSuppliersQuery.isError}
              isSuppliersLoading={suppliersQuery.isLoading}
              isSuppliersError={suppliersQuery.isError}
              isSaving={addSupplierMutation.isPending || updateSupplierMutation.isPending}
              isDeleting={deleteSupplierMutation.isPending}
              onRetry={() => void productSuppliersQuery.refetch()}
              onRetrySuppliers={() => void suppliersQuery.refetch()}
              onAdd={addProductSupplier}
              onUpdate={updateProductSupplier}
              onDelete={deleteProductSupplier}
            />
          </TabsContent>

          {product.isLotTracked ? (
            <TabsContent value="lots" className="mt-4">
              <ProductLotsPanel
                lots={lotsQuery.data ?? []}
                warehouses={(warehousesQuery.data?.items ?? []).filter(
                  (warehouse) => warehouse.status === 'Active'
                )}
                warehouseId={lotWarehouseId}
                status={lotStatus}
                onlyAvailable={onlyAvailableLots}
                expiresOnOrBefore={expiresOnOrBefore}
                isLoading={lotsQuery.isLoading}
                isError={lotsQuery.isError}
                impact={impactQuery.data ?? null}
                isImpactLoading={impactQuery.isLoading}
                isUpdating={blockLotMutation.isPending || unlockLotMutation.isPending}
                canBlock={canBlockLot}
                canUnlock={canUnlockLot}
                onWarehouseChange={setLotWarehouseId}
                onStatusChange={setLotStatus}
                onOnlyAvailableChange={setOnlyAvailableLots}
                onExpiryChange={setExpiresOnOrBefore}
                onRetry={() => void lotsQuery.refetch()}
                onInspectImpact={(lot) => setImpactLotId(lot.id)}
                onBlock={(lot, reason) => void handleBlockLot(lot, reason)}
                onUnlock={(lot, reason) => void handleUnlockLot(lot, reason)}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      {canUpdate && isEditOpen && (
        <UpdateProductDialog
          form={updateProductForm}
          units={unitsQuery.data ?? []}
          categories={categoriesQuery.data ?? []}
          areOptionsLoading={unitsQuery.isLoading || categoriesQuery.isLoading}
          areOptionsError={unitsQuery.isError || categoriesQuery.isError}
          onRetryOptions={() => {
            void unitsQuery.refetch()
            void categoriesQuery.refetch()
          }}
          canManageUnits={canManageConversions}
          canManageCategories={canManageCategories}
          open={isEditOpen}
          product={product}
          conversions={conversionsQuery.data ?? []}
          isPending={updateMutation.isPending || uploadImageMutation.isPending}
          onOpenChange={changeProductEditorOpen}
          onImageDirtyChange={setIsEditImageDirty}
          onManageConversions={() => {
            closeProductEditor()
            handleTabChange('conversions')
          }}
          onSubmit={handleUpdate}
        />
      )}
      <UnsavedChangesDialog
        open={discardTarget !== null}
        onOpenChange={(open) => !open && setDiscardTarget(null)}
        onDiscard={() => {
          if (discardTarget === 'product') closeProductEditor()
          if (discardTarget === 'policy') setIsStockPolicyOpen(false)
          setDiscardTarget(null)
        }}
      />

      {canConfigureStockPolicy && isStockPolicyOpen && (
        <ProductStockPolicyDialog
          form={stockPolicyForm}
          open={isStockPolicyOpen}
          warehouses={(warehousesQuery.data?.items ?? []).filter(
            (warehouse) => warehouse.status === 'Active'
          )}
          policies={policiesQuery.data ?? []}
          locations={policyLocationsQuery.data?.items ?? []}
          areLocationsLoading={policyLocationsQuery.isFetching}
          isPending={stockPolicyMutation.isPending}
          onWarehouseChange={setPolicyWarehouseId}
          onOpenChange={changeStockPolicyOpen}
          onSubmit={(values) => void handleStockPolicy(values)}
        />
      )}
      <StatusChangeDialog
        open={isProductStatusOpen}
        subject={`sản phẩm “${product.productName}”`}
        nextStatus={product.status === 'Active' ? 'Inactive' : 'Active'}
        isPending={productStatusMutation.isPending}
        onOpenChange={setIsProductStatusOpen}
        onConfirm={() => {
          setIsProductStatusOpen(false)
          void handleProductStatus()
        }}
      />
    </div>
  )
}
