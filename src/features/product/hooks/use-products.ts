import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse } from '@/types/api'
import { productService } from '../services/product.service'
import type {
  CategoryResponse,
  ConfigureStockPolicyRequest,
  CreateProductUnitConversionRequest,
  CreateProductWithConversionsRequest,
  ImportProductsRequest,
  ProductListQuery,
  ProductListResponse,
  ProductLot,
  ProductLotImpact,
  ProductLotQuery,
  ProductResponse,
  ProductSupplier,
  ProductUnitConversion,
  ProductWarehousePolicy,
  SaveCategoryRequest,
  SaveProductSupplierRequest,
  SaveUnitRequest,
  UnitResponse,
  UpdateProductSupplierRequest,
  UpdateProductUnitConversionRequest,
  UpdateProductRequest,
} from '../types/product.types'

export function useUnitsQuery(enabled = true, status?: 'Active' | 'Inactive') {
  return useQuery<UnitResponse[], ApiErrorResponse>({
    queryKey: queryKeys.units.list(status),
    queryFn: () => productService.getUnits(status).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useCategoriesQuery(enabled = true, status?: 'Active' | 'Inactive') {
  return useQuery<CategoryResponse[], ApiErrorResponse>({
    queryKey: queryKeys.categories.list(status),
    queryFn: () => productService.getCategories(status).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useCreateUnitMutation() {
  const queryClient = useQueryClient()
  return useMutation<string, ApiErrorResponse, SaveUnitRequest>({
    mutationFn: (request) => productService.createUnit(request).then((response) => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.units.all }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useUpdateUnitMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, { id: string; request: SaveUnitRequest }>({
    mutationFn: ({ id, request }) => productService.updateUnit(id, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.units.all }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useChangeUnitStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, { id: string; status: 'Active' | 'Inactive' }>({
    mutationFn: ({ id, status }) => productService.changeUnitStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.units.all }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation<string, ApiErrorResponse, SaveCategoryRequest>({
    mutationFn: (request) =>
      productService.createCategory(request).then((response) => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, { id: string; request: SaveCategoryRequest }>({
    mutationFn: ({ id, request }) => productService.updateCategory(id, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useChangeCategoryStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, { id: string; status: 'Active' | 'Inactive' }>({
    mutationFn: ({ id, status }) => productService.changeCategoryStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useProductListQuery(params?: ProductListQuery) {
  return useQuery<ProductListResponse, ApiErrorResponse>({
    queryKey: queryKeys.products.list(params),
    queryFn: () => productService.getProducts(params).then((r) => r.data),
    placeholderData: (prev) => prev,
  })
}

export function useProductDetailQuery(id: string | null) {
  return useQuery<ProductResponse, ApiErrorResponse>({
    queryKey: queryKeys.products.detail(id ?? ''),
    queryFn: () => productService.getProductById(id ?? '').then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation<string, ApiErrorResponse, CreateProductWithConversionsRequest>({
    mutationFn: (request) => productService.createProduct(request).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useUploadProductImageMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, { id: string; file: File }>({
    mutationFn: ({ id, file }) =>
      productService.uploadProductImage(id, file).then((response) => response.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) })
    },
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useUpdateProductMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, UpdateProductRequest>({
    mutationFn: (request) => productService.updateProduct(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) })
    },
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useChangeProductStatusMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, 'Active' | 'Inactive'>({
    mutationFn: (status) => productService.changeProductStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) })
    },
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useConfigureStockPolicyMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, ConfigureStockPolicyRequest>({
    mutationFn: (request) => productService.configureStockPolicy(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.stockPolicies(id) })
    },
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useProductStockPoliciesQuery(id: string) {
  return useQuery<ProductWarehousePolicy[], ApiErrorResponse>({
    queryKey: queryKeys.products.stockPolicies(id),
    queryFn: () => productService.getStockPolicies(id).then((response) => response.data),
    enabled: Boolean(id),
  })
}

export function useChangeStockPolicyStatusMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<
    unknown,
    ApiErrorResponse,
    { policyId: string; status: 'Active' | 'Inactive' }
  >({
    mutationFn: ({ policyId, status }) =>
      productService.changeStockPolicyStatus(id, policyId, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.products.stockPolicies(id) }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useProductUnitConversionsQuery(id: string) {
  return useQuery<ProductUnitConversion[], ApiErrorResponse>({
    queryKey: queryKeys.products.unitConversions(id),
    queryFn: () => productService.getUnitConversions(id).then((response) => response.data),
    enabled: Boolean(id),
  })
}

export function useCreateProductUnitConversionMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<string, ApiErrorResponse, CreateProductUnitConversionRequest>({
    mutationFn: (request) =>
      productService.createUnitConversion(id, request).then((response) => response.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.products.unitConversions(id) }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useUpdateProductUnitConversionMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<
    unknown,
    ApiErrorResponse,
    { conversionId: string; request: UpdateProductUnitConversionRequest }
  >({
    mutationFn: ({ conversionId, request }) =>
      productService.updateUnitConversion(id, conversionId, request),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.products.unitConversions(id) }),
    onError: (error) => {
      if (error.statusCode === 409 || error.statusCode === 400) logger.warn(formatApiError(error))
      else logger.error(formatApiError(error))
    },
  })
}

export function useChangeProductUnitConversionStatusMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<
    unknown,
    ApiErrorResponse,
    { conversionId: string; status: 'Active' | 'Inactive' }
  >({
    mutationFn: ({ conversionId, status }) =>
      productService.changeUnitConversionStatus(id, conversionId, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.products.unitConversions(id) }),
    onError: (error) => {
      if (error.statusCode === 409 || error.statusCode === 400) logger.warn(formatApiError(error))
      else logger.error(formatApiError(error))
    },
  })
}

export function useProductLotsQuery(id: string, params: ProductLotQuery, enabled = true) {
  return useQuery<ProductLot[], ApiErrorResponse>({
    queryKey: queryKeys.products.lots(id, params),
    queryFn: () => productService.getProductLots(id, params).then((response) => response.data),
    enabled: Boolean(id) && enabled,
  })
}

export function useProductLotImpactQuery(id: string, lotId: string | null) {
  return useQuery<ProductLotImpact, ApiErrorResponse>({
    queryKey: [...queryKeys.products.detail(id), 'lots', lotId, 'impact'],
    queryFn: () =>
      productService.getProductLotImpact(id, lotId ?? '').then((response) => response.data),
    enabled: Boolean(id && lotId),
  })
}

export function useBlockProductLotMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, { lotId: string; reason: string }>({
    mutationFn: ({ lotId, reason }) => productService.blockProductLot(id, lotId, reason),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.products.detail(id), 'lots'],
      }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useUnlockProductLotMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, { lotId: string; reason: string }>({
    mutationFn: ({ lotId, reason }) => productService.unlockProductLot(id, lotId, reason),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.products.detail(id), 'lots'],
      }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useGenerateBarcodeMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, void>({
    mutationFn: () => productService.generateBarcode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) })
    },
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useImportProductsMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, ImportProductsRequest>({
    retry: false,
    gcTime: 0,
    mutationFn: (request) => productService.importProducts(request),
    onSuccess: (_result, request) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      if (request.newCatalogs?.some((draft) => draft.categories))
        void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      if (request.newCatalogs?.some((draft) => !draft.categories))
        void queryClient.invalidateQueries({ queryKey: queryKeys.units.all })
    },
    onError: (error) => logger.warn(formatApiError(error)),
  })
}

export function useProductSuppliersQuery(id: string) {
  return useQuery<ProductSupplier[], ApiErrorResponse>({
    queryKey: queryKeys.products.suppliers(id),
    queryFn: () => productService.getProductSuppliers(id).then((response) => response.data),
    enabled: Boolean(id),
  })
}

export function useAddProductSupplierMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<string, ApiErrorResponse, SaveProductSupplierRequest>({
    mutationFn: (request) =>
      productService.addProductSupplier(id, request).then((response) => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.products.suppliers(id) }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useUpdateProductSupplierMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<
    unknown,
    ApiErrorResponse,
    { linkId: string; request: UpdateProductSupplierRequest }
  >({
    mutationFn: ({ linkId, request }) => productService.updateProductSupplier(id, linkId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.products.suppliers(id) }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}

export function useDeleteProductSupplierMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiErrorResponse, string>({
    mutationFn: (linkId) => productService.deleteProductSupplier(id, linkId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.products.suppliers(id) }),
    onError: (error) => logger.error(formatApiError(error)),
  })
}
