import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse } from '@/types/api'
import { subscriptionService } from '../services/subscription.service'
import type {
  ChangeSubscriptionPlanRequestDto,
  InitialSubscriptionSelectionRequestDto,
  InitialSubscriptionSelectionResponse,
  InvoiceDataResponse,
  PaymentHistoryQuery,
  PaymentLinkResponse,
  SubscriptionPlanChangeResponse,
} from '../types/subscription.types'

export function useCurrentSubscriptionQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.subscription.me,
    // BE omits `data` when the tenant has no subscription; React Query rejects undefined.
    queryFn: () =>
      subscriptionService.getCurrentSubscription().then((response) => response.data ?? null),
    enabled,
  })
}

export function usePublicSubscriptionPlansQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.subscription.publicPlans,
    queryFn: () =>
      subscriptionService.getPublicSubscriptionPlans().then((response) => response.data),
    enabled,
  })
}

export function usePaymentHistoryQuery(params: PaymentHistoryQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payments.list(params),
    queryFn: () => subscriptionService.getPaymentHistory(params).then((response) => response.data),
    enabled,
  })
}

export function useInvoiceDataQuery(paymentId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payments.invoiceData(paymentId),
    queryFn: () => subscriptionService.getInvoiceData(paymentId).then((response) => response.data),
    enabled,
  })
}

export function useInitialSubscriptionSelectionMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    InitialSubscriptionSelectionResponse,
    ApiErrorResponse,
    InitialSubscriptionSelectionRequestDto
  >({
    mutationFn: (body) =>
      subscriptionService.selectInitialPlan(body).then((response) => response.data),
    onSuccess: (data) => {
      if (data.payment?.checkoutUrl) {
        window.location.href = data.payment.checkoutUrl
        return
      }
      toast.success('Gói dịch vụ đã được kích hoạt.')
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.me })
    },
    onError: (error: ApiErrorResponse) => {
      logger.error(error)
      toast.error(error.message ?? 'Không thể chọn gói dịch vụ. Vui lòng thử lại.')
    },
  })
}

export function useSubscriptionEntitlementQuery(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.subscription.all, 'entitlement'],
    queryFn: () => subscriptionService.getEntitlement().then((response) => response.data),
    enabled,
  })
}

export function useChangeSubscriptionPlanMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    SubscriptionPlanChangeResponse,
    ApiErrorResponse,
    ChangeSubscriptionPlanRequestDto
  >({
    mutationFn: (body) => subscriptionService.changePlan(body).then((response) => response.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.me })
      if (!data.requiresPayment) toast.success('Thay đổi gói đã được lên lịch.')
    },
    onError: (error) => {
      logger.error(error)
      toast.error(error.message ?? 'Không thể thay đổi gói dịch vụ. Vui lòng thử lại.')
    },
  })
}

export function usePreviewSubscriptionPlanChangeMutation() {
  return useMutation<
    SubscriptionPlanChangeResponse,
    ApiErrorResponse,
    ChangeSubscriptionPlanRequestDto
  >({
    mutationFn: (body) =>
      subscriptionService.previewPlanChange(body).then((response) => response.data),
    onError: (error) => {
      logger.error(error)
      toast.error(error.message ?? 'Không thể tính trước thay đổi gói. Vui lòng thử lại.')
    },
  })
}

export function useRenewSubscriptionMutation() {
  return useMutation<PaymentLinkResponse, ApiErrorResponse>({
    mutationFn: () => subscriptionService.renewSubscription().then((response) => response.data),
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl
    },
    onError: (error: ApiErrorResponse) => {
      logger.error(error)
      toast.error(error.message ?? 'Không thể gia hạn gói dịch vụ. Vui lòng thử lại.')
    },
  })
}

export function useInvoiceDataMutation() {
  return useMutation<InvoiceDataResponse, ApiErrorResponse, string>({
    mutationFn: (paymentId) =>
      subscriptionService.getInvoiceData(paymentId).then((response) => response.data),
    onError: (error: ApiErrorResponse) => {
      logger.error(error)
      toast.error(error.message ?? 'Không thể tải hóa đơn. Vui lòng thử lại.')
    },
  })
}

export function useSyncPaymentStatusQuery(orderCode: string | null) {
  return useQuery({
    queryKey: ['payment-status', orderCode],
    queryFn: () =>
      subscriptionService.syncPaymentStatus(orderCode!).then((response) => response.data),
    enabled: Boolean(orderCode),
    retry: 3,
    refetchInterval: (query) => {
      const status = query.state.data
      if (
        status === 'Completed' ||
        status === 'Failed' ||
        status === 'Cancelled' ||
        status === 'Expired'
      ) {
        return false
      }
      return 3000
    },
  })
}

export function useInvoiceDownloadMutation() {
  return useMutation<Blob, ApiErrorResponse, string>({
    mutationFn: subscriptionService.downloadInvoice,
    onError: (error: ApiErrorResponse) => {
      logger.error(error)
      toast.error(error.message ?? 'Không thể tải hóa đơn. Vui lòng thử lại.')
    },
  })
}
