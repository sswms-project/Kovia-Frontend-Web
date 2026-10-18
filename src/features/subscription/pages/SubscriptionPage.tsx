'use client'

import { useState } from 'react'
import { CreditCard, Landmark } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { USER_ROLES } from '@/config/roles'
import { P } from '@/config/permissionCodes'
import { useMeQuery } from '@/features/auth/hooks/use-auth'
import { useAuthStore } from '@/stores/auth.store'
import { BillingCycleToggle } from '../components/BillingCycleToggle'
import {
  CurrentPlanCard,
  PlanCard,
  SubscriptionActionDialog,
  SubscriptionEmptyState,
  SubscriptionErrorState,
  SubscriptionPageSkeleton,
  TenantOwnerOnlyState,
  SubscriptionWorkspaceHeader,
} from '../components/SubscriptionPage'
import {
  useChangeSubscriptionPlanMutation,
  useCurrentSubscriptionQuery,
  useInitialSubscriptionSelectionMutation,
  usePreviewSubscriptionPlanChangeMutation,
  useRenewSubscriptionMutation,
  usePublicSubscriptionPlansQuery,
} from '../hooks/use-subscription'
import type {
  BillingCycle,
  SubscriptionApplicationTiming,
  SubscriptionPlanChangeResponse,
  SubscriptionPlanResponse,
  SubscriptionStatusResponse,
} from '../types/subscription.types'
import {
  findCurrentPlan,
  formatBillingCycle,
  formatCurrency,
  formatDate,
  getBillingPeriodLabel,
  getPlanPrice,
  isActivePlan,
  normalizeBillingCycle,
  shouldShowRenewAction,
} from '../utils/format-subscription'
import {
  canApplyPlanChangeImmediately,
  getPlanActionState,
} from '../utils/subscription-eligibility'

type DialogState =
  | {
      readonly type: 'select'
      readonly plan: SubscriptionPlanResponse
      readonly billingCycle: BillingCycle
    }
  | {
      readonly type: 'change'
      readonly plan: SubscriptionPlanResponse
      readonly billingCycle: BillingCycle
      readonly applicationTiming: SubscriptionApplicationTiming
    }
  | { readonly type: 'renew' }

export function SubscriptionPage() {
  const user = useAuthStore((state) => state.user)
  const meQuery = useMeQuery()
  const permissions = new Set(meQuery.data?.permissions ?? [])
  const isTenantOwner = user?.role === USER_ROLES.TenantOwner
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const [changeResult, setChangeResult] = useState<SubscriptionPlanChangeResponse | null>(null)
  const [changePreview, setChangePreview] = useState<SubscriptionPlanChangeResponse | null>(null)
  const [billingCycleOverride, setBillingCycleOverride] = useState<BillingCycle>()

  const subscriptionQuery = useCurrentSubscriptionQuery(isTenantOwner)
  const plansQuery = usePublicSubscriptionPlansQuery(isTenantOwner)
  const renewMutation = useRenewSubscriptionMutation()
  const initialSelectionMutation = useInitialSubscriptionSelectionMutation()
  const changePlanMutation = useChangeSubscriptionPlanMutation()
  const previewPlanChangeMutation = usePreviewSubscriptionPlanChangeMutation()

  if (!isTenantOwner) return <TenantOwnerOnlyState />
  const header = (
    <SubscriptionWorkspaceHeader
      currentView="plan"
      canViewPlan={permissions.has(P.SUBSCRIPTIONS_VIEW)}
      canViewPayments={permissions.has(P.PAYMENTS_VIEW)}
    />
  )
  if (subscriptionQuery.isLoading || plansQuery.isLoading)
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {header}
        <SubscriptionPageSkeleton />
      </div>
    )
  if (subscriptionQuery.isError || plansQuery.isError) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {header}
        <SubscriptionErrorState
          onRetry={() => {
            subscriptionQuery.refetch()
            plansQuery.refetch()
          }}
        />
      </div>
    )
  }

  const subscription = subscriptionQuery.data
  const isOnboarding = !subscription || subscription.status === 'Pending'
  const hasPendingInitialPayment = isOnboarding && Boolean(subscription?.pendingPaymentId)
  const plans = plansQuery.data ?? []
  const activePlans = plans.filter(isActivePlan).toSorted((firstPlan, secondPlan) => {
    if (firstPlan.displayOrder !== secondPlan.displayOrder) {
      return firstPlan.displayOrder - secondPlan.displayOrder
    }
    return firstPlan.monthlyPrice - secondPlan.monthlyPrice
  })
  const currentPlan = isOnboarding ? undefined : findCurrentPlan(subscription, plans)
  const selectedBillingCycle =
    billingCycleOverride ?? normalizeBillingCycle(subscription?.billingCycle)
  const maximumYearlySaving = activePlans.reduce(
    (maximum, plan) => Math.max(maximum, plan.yearlyDiscountPercent),
    0
  )
  const isActionPending =
    renewMutation.isPending ||
    initialSelectionMutation.isPending ||
    previewPlanChangeMutation.isPending ||
    changePlanMutation.isPending

  const closeDialog = () => {
    if (isActionPending) return
    setDialogState(null)
    setChangePreview(null)
    setChangeResult(null)
  }

  const handleConfirmDialog = async () => {
    if (!dialogState) return
    if (changeResult?.payment?.checkoutUrl) {
      window.location.href = changeResult.payment.checkoutUrl
      return
    }

    try {
      if (dialogState.type === 'select') {
        await initialSelectionMutation.mutateAsync({
          planId: dialogState.plan.id,
          billingCycle: dialogState.billingCycle,
        })
        setDialogState(null)
        return
      }

      if (dialogState.type === 'change') {
        if (!changePreview) {
          const preview = await previewPlanChangeMutation.mutateAsync({
            planId: dialogState.plan.id,
            billingCycle: dialogState.billingCycle,
            applicationTiming: dialogState.applicationTiming,
          })
          setChangePreview(preview)
          return
        }
        if (changePreview.exceedsTargetLimits) return
        const result = await changePlanMutation.mutateAsync({
          planId: dialogState.plan.id,
          billingCycle: dialogState.billingCycle,
          applicationTiming: dialogState.applicationTiming,
        })
        if (result.requiresPayment) {
          setChangePreview(result)
          setChangeResult(result)
        } else setDialogState(null)
        return
      }

      await renewMutation.mutateAsync()
      setDialogState(null)
    } catch {
      // Mutation hooks already log and show a toast.
    }
  }

  const openPlanDialog = (plan: SubscriptionPlanResponse) => {
    setChangePreview(null)
    setChangeResult(null)
    if (isOnboarding) {
      setDialogState({ type: 'select', plan, billingCycle: selectedBillingCycle })
      return
    }

    setDialogState({
      type: 'change',
      plan,
      billingCycle: selectedBillingCycle,
      applicationTiming: canApplyPlanChangeImmediately(plan, subscription, selectedBillingCycle)
        ? 'ApplyImmediately'
        : 'ApplyNextCycle',
    })
  }

  const dialogCopy = getDialogCopy(dialogState, subscription, changePreview, changeResult)

  return (
    <div className="flex w-full min-w-0 flex-none flex-col gap-4 pb-4 lg:gap-5 lg:pb-5">
      {header}

      {isOnboarding ? (
        <SubscriptionEmptyState
          title={
            subscription ? 'Hoàn tất kích hoạt gói dịch vụ' : 'Chọn gói để bắt đầu sử dụng KOVIA'
          }
          description={
            subscription
              ? hasPendingInitialPayment
                ? `Thanh toán cho gói ${subscription.planName} đang chờ xác nhận. Hãy tiếp tục checkout hiện tại hoặc chờ giao dịch kết thúc trước khi chọn gói khác.`
                : `Gói ${subscription.planName} đang chờ kích hoạt. Tiếp tục với gói đã chọn hoặc chọn một gói khác.`
              : 'Dữ liệu doanh nghiệp đã được giữ nguyên. Hãy chọn rõ gói Free hoặc gói trả phí phù hợp để kích hoạt quyền vận hành kho.'
          }
        />
      ) : (
        <CurrentPlanCard
          subscription={subscription}
          showRenewAction={shouldShowRenewAction(subscription)}
          isRenewPending={renewMutation.isPending}
          onRenew={() => {
            setChangePreview(null)
            setChangeResult(null)
            setDialogState({ type: 'renew' })
          }}
          onContinuePayment={() => {
            if (subscription.pendingCheckoutUrl) {
              window.location.href = subscription.pendingCheckoutUrl
            }
          }}
        />
      )}

      <section className="flex min-w-0 flex-col gap-3" aria-labelledby="available-plans-title">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 id="available-plans-title" className="text-foreground text-base font-semibold">
              {isOnboarding ? 'Chọn gói ban đầu' : 'Các gói có thể chọn'}
            </h2>
            <p className="text-muted-foreground text-sm">
              Chỉ các gói đang được mở đăng ký mới được hiển thị.
            </p>
          </div>
          <BillingCycleToggle
            value={selectedBillingCycle}
            yearlySavingPercent={maximumYearlySaving}
            onValueChange={setBillingCycleOverride}
          />
        </div>

        {activePlans.length === 0 ? (
          <Empty className="border-border bg-card min-h-64 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CreditCard aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Chưa có gói đang mở đăng ký</EmptyTitle>
              <EmptyDescription>
                Vui lòng quay lại sau hoặc liên hệ quản trị hệ thống.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid w-full min-w-0 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {activePlans.map((plan) => {
              const defaultActionState = getPlanActionState(
                plan,
                currentPlan,
                isOnboarding ? null : subscription,
                selectedBillingCycle,
                isActionPending || Boolean(!isOnboarding && subscription?.pendingPlanName)
              )
              const isPendingSelectedPlan = Boolean(
                subscription?.status === 'Pending' &&
                subscription.planName === plan.planName &&
                normalizeBillingCycle(subscription.billingCycle) === selectedBillingCycle
              )
              const actionState =
                hasPendingInitialPayment && !isPendingSelectedPlan
                  ? {
                      disabled: true,
                      label: 'Đang có thanh toán chờ',
                      tooltip:
                        'Hoàn tất hoặc chờ checkout hiện tại kết thúc trước khi chọn gói khác.',
                    }
                  : isPendingSelectedPlan
                    ? {
                        disabled: isActionPending,
                        label: isActionPending ? 'Đang xử lý…' : 'Tiếp tục kích hoạt',
                      }
                    : defaultActionState
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  billingCycle={selectedBillingCycle}
                  actionState={actionState}
                  onUpgrade={() => {
                    if (!actionState.disabled) openPlanDialog(plan)
                  }}
                />
              )
            })}
          </div>
        )}
      </section>

      <SubscriptionActionDialog
        open={dialogState !== null}
        title={dialogCopy.title}
        description={dialogCopy.description}
        confirmLabel={dialogCopy.confirmLabel}
        isPending={isActionPending}
        confirmDisabled={Boolean(changePreview?.exceedsTargetLimits)}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        onConfirm={handleConfirmDialog}
      >
        {dialogState?.type === 'change' && subscription && !changePreview && !changeResult ? (
          <PlanChangeTimingOptions
            dialogState={dialogState}
            subscription={subscription}
            onValueChange={(applicationTiming) =>
              setDialogState({ ...dialogState, applicationTiming })
            }
          />
        ) : null}
        {changePreview ? <PlanChangeImpact result={changePreview} /> : null}
        {changeResult?.payment ? <PlanChangePaymentDetails result={changeResult} /> : null}
      </SubscriptionActionDialog>
    </div>
  )
}

function PlanChangeTimingOptions({
  dialogState,
  subscription,
  onValueChange,
}: {
  readonly dialogState: Extract<DialogState, { type: 'change' }>
  readonly subscription: SubscriptionStatusResponse
  readonly onValueChange: (value: SubscriptionApplicationTiming) => void
}) {
  const immediateEligible = canApplyPlanChangeImmediately(
    dialogState.plan,
    subscription,
    dialogState.billingCycle
  )

  return (
    <RadioGroup
      value={dialogState.applicationTiming}
      onValueChange={(value) => onValueChange(value as SubscriptionApplicationTiming)}
      className="gap-3"
    >
      <div className="border-border flex items-start gap-3 rounded-md border p-3">
        <RadioGroupItem
          id="apply-immediately"
          value="ApplyImmediately"
          disabled={!immediateEligible}
        />
        <Label htmlFor="apply-immediately" className="min-w-0 flex-1 cursor-pointer">
          <span className="block text-sm font-medium">Áp dụng ngay</span>
          <span className="text-muted-foreground mt-1 block text-xs font-normal">
            {immediateEligible
              ? `Giá gói mới được trừ phần giá trị chưa sử dụng của gói hiện tại. Sau thanh toán, một chu kỳ ${dialogState.billingCycle === 'Monthly' ? 'tháng' : 'năm'} đầy đủ mới sẽ bắt đầu ngay.`
              : 'Chỉ dành cho nâng cấp lên gói cao hơn và giữ nguyên chu kỳ thanh toán.'}
          </span>
        </Label>
      </div>
      <div className="border-border flex items-start gap-3 rounded-md border p-3">
        <RadioGroupItem
          id="apply-next-cycle"
          value="ApplyNextCycle"
          disabled={!subscription.endDate}
        />
        <Label htmlFor="apply-next-cycle" className="min-w-0 flex-1 cursor-pointer">
          <span className="block text-sm font-medium">Áp dụng từ kỳ tiếp theo</span>
          <span className="text-muted-foreground mt-1 block text-xs font-normal">
            {subscription.endDate
              ? `Gói hiện tại được giữ đến ${formatDate(subscription.endDate)}; gói mới bắt đầu sau thời điểm này.`
              : 'Gói không kỳ hạn không có kỳ tiếp theo.'}
          </span>
        </Label>
      </div>
    </RadioGroup>
  )
}

function PlanChangeImpact({ result }: { readonly result: SubscriptionPlanChangeResponse }) {
  return (
    <div className="border-border bg-muted/40 grid gap-2 rounded-md border p-3 text-sm">
      <p>
        <span className="text-muted-foreground">Số tiền:</span>{' '}
        <strong>{formatCurrency(result.amount, result.currency)}</strong>
      </p>
      <p>
        <span className="text-muted-foreground">Thời điểm áp dụng:</span>{' '}
        <strong>{formatDate(result.effectiveAt)}</strong>
      </p>
      <p>
        <span className="text-muted-foreground">Suất người dùng:</span>{' '}
        {result.currentUsers + result.pendingInvitations}/
        {result.targetUserLimit ?? 'Không giới hạn'} ·{' '}
        <span className="text-muted-foreground">Kho:</span> {result.currentWarehouses}/
        {result.targetWarehouseLimit ?? 'Không giới hạn'}
      </p>
      {result.exceedsTargetLimits ? (
        <p className="text-destructive text-xs font-medium">
          Mức sử dụng hiện tại vượt giới hạn gói mới. Dữ liệu không bị xóa, nhưng thao tác tạo mới
          sẽ bị giới hạn sau khi gói có hiệu lực.
        </p>
      ) : null}
      {result.pendingInvitations > 0 ? (
        <p className="text-muted-foreground text-xs">
          Bao gồm {result.pendingInvitations} lời mời người dùng đang chờ chấp nhận.
        </p>
      ) : null}
    </div>
  )
}

function PlanChangePaymentDetails({ result }: { readonly result: SubscriptionPlanChangeResponse }) {
  if (!result.payment) return null
  return (
    <div className="border-primary/25 bg-primary/5 flex gap-3 rounded-md border p-3 text-sm">
      <Landmark className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium">Thanh toán PayOS đang chờ</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Gói hiện tại chỉ thay đổi sau khi PayOS xác nhận giao dịch. Mã thanh toán:{' '}
          {result.payment.orderCode}.
        </p>
      </div>
    </div>
  )
}

function getDialogCopy(
  dialogState: DialogState | null,
  subscription: SubscriptionStatusResponse | null | undefined,
  preview: SubscriptionPlanChangeResponse | null,
  result: SubscriptionPlanChangeResponse | null
) {
  if (!dialogState) return { title: '', description: '', confirmLabel: '' }
  if (dialogState.type === 'select') {
    const price = getPlanPrice(dialogState.plan, dialogState.billingCycle)
    return {
      title: `Chọn gói ${dialogState.plan.planName}`,
      description:
        price === 0
          ? 'Gói Free sẽ được kích hoạt ngay và không yêu cầu thanh toán.'
          : `Hệ thống sẽ tạo thanh toán ${formatCurrency(price, dialogState.plan.currency)} ${getBillingPeriodLabel(dialogState.billingCycle)} qua PayOS.`,
      confirmLabel: price === 0 ? 'Kích hoạt gói Free' : 'Tiếp tục thanh toán',
    }
  }
  if (dialogState.type === 'change') {
    if (result?.requiresPayment) {
      return {
        title: `Thanh toán gói ${dialogState.plan.planName}`,
        description: 'Yêu cầu thanh toán đã được tạo. Mở PayOS để hoàn tất giao dịch.',
        confirmLabel: 'Đến trang thanh toán',
      }
    }
    if (preview) {
      return {
        title: `Xác nhận chuyển sang ${dialogState.plan.planName}`,
        description: preview.exceedsTargetLimits
          ? 'Mức sử dụng hiện tại vượt giới hạn gói đã chọn. Hãy giảm mức sử dụng trước khi đổi gói.'
          : 'Kiểm tra chi phí, thời điểm áp dụng và mức sử dụng trước khi xác nhận.',
        confirmLabel: preview.exceedsTargetLimits ? 'Chưa thể đổi gói' : 'Xác nhận thay đổi',
      }
    }
    return {
      title: `Chuyển sang ${dialogState.plan.planName}`,
      description: `${formatBillingCycle(dialogState.billingCycle)} · ${formatCurrency(getPlanPrice(dialogState.plan, dialogState.billingCycle), dialogState.plan.currency)} ${getBillingPeriodLabel(dialogState.billingCycle)}.`,
      confirmLabel: 'Xem chi phí và giới hạn',
    }
  }
  return {
    title: 'Gia hạn gói dịch vụ',
    description: `Thanh toán thủ công một kỳ mới cho ${subscription?.planName ?? 'gói hiện tại'}. Hệ thống không tự động trừ tiền ở kỳ sau.`,
    confirmLabel: 'Tiếp tục thanh toán',
  }
}
