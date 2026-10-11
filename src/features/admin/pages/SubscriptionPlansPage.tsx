'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { CreditCard, PackageOpen, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { OperationalPagination } from '@/components/operations/OperationalPagination'
import { OperationalListPanel } from '@/components/operations/OperationalListPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ApiErrorResponse } from '@/types/api'
import {
  DeactivatePlanDialog,
  PlanCatalogSummary,
  SubscriptionPlanTable,
  SubscriptionPlanFormDialog,
  type SubscriptionPlanFormSubmitContext,
} from '../components/SubscriptionPlansPage'
import {
  useAdminSubscriptionPlansQuery,
  useActivateSubscriptionPlanMutation,
  useCreateSubscriptionPlanMutation,
  useDeactivateSubscriptionPlanMutation,
  useSubscriptionFeaturesQuery,
  useUpdateSubscriptionPlanMutation,
} from '../hooks/use-admin'
import {
  featureItemsToPayload,
  type SubscriptionPlanFormOutput,
  type UpdateSubscriptionPlanRequest,
} from '../schemas/subscription-plan.schema'
import type { SubscriptionPlanResponse } from '../types/admin.types'

const SERVER_FIELD_MAP = {
  PlanName: 'planName',
  MonthlyPrice: 'monthlyPrice',
  YearlyDiscountPercent: 'yearlyDiscountPercent',
  DisplayOrder: 'displayOrder',
} as const

const DUPLICATE_PLAN_NAME_PREFIX = "SubscriptionPlan with value '"
const DUPLICATE_PLAN_NAME_SUFFIX = "' already exists"
const PENDING_PLAN_REFERENCE_MESSAGE =
  'Cannot deactivate a plan referenced by pending subscription changes'

type ServerField = keyof typeof SERVER_FIELD_MAP
type MappedField = (typeof SERVER_FIELD_MAP)[ServerField]

function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  if (typeof error !== 'object' || error === null) return false
  if (!('statusCode' in error) || !('message' in error)) return false
  if (typeof error.statusCode !== 'number' || typeof error.message !== 'string') return false
  if (!('errors' in error) || error.errors === undefined) return true
  if (typeof error.errors !== 'object' || error.errors === null) return false

  return Object.values(error.errors).every(
    (messages) =>
      Array.isArray(messages) && messages.every((message) => typeof message === 'string')
  )
}

function isServerField(field: string): field is ServerField {
  return Object.hasOwn(SERVER_FIELD_MAP, field)
}

function isDuplicatePlanNameError(error: ApiErrorResponse): boolean {
  return (
    error.statusCode === 409 &&
    error.message.startsWith(DUPLICATE_PLAN_NAME_PREFIX) &&
    error.message.endsWith(DUPLICATE_PLAN_NAME_SUFFIX)
  )
}

function isPendingPlanReferenceError(error: ApiErrorResponse): boolean {
  return error.statusCode === 409 && error.message === PENDING_PLAN_REFERENCE_MESSAGE
}

function applyServerFieldErrors(
  error: ApiErrorResponse,
  setError: SubscriptionPlanFormSubmitContext['setError']
): boolean {
  if (!error.errors) return false

  let hasFieldError = false
  for (const [serverField, messages] of Object.entries(error.errors)) {
    if (!isServerField(serverField)) continue

    const field: MappedField = SERVER_FIELD_MAP[serverField]
    const message = messages[0]
    if (!message) continue

    setError(field, { type: 'server', message })
    hasFieldError = true
  }

  return hasFieldError
}

export default function SubscriptionPlansPage() {
  const prefersReducedMotion = useReducedMotion() === true
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanResponse | null>(null)
  const [deactivatingPlan, setDeactivatingPlan] = useState<SubscriptionPlanResponse | null>(null)
  const [deactivateErrorMessage, setDeactivateErrorMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'Active' | 'Inactive'>()
  const debouncedSearch = useDebouncedValue(search, 350).trim()

  const {
    data: result,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useAdminSubscriptionPlansQuery({
    pageNumber: page,
    pageSize,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status ? { status } : {}),
  })
  const plans = result?.items
  const { data: featureMeta = [] } = useSubscriptionFeaturesQuery()
  const createMutation = useCreateSubscriptionPlanMutation()
  const updateMutation = useUpdateSubscriptionPlanMutation()
  const deactivateMutation = useDeactivateSubscriptionPlanMutation()
  const activateMutation = useActivateSubscriptionPlanMutation()

  const isFormOpen = isCreateOpen || editingPlan !== null
  const isFormPending = createMutation.isPending || updateMutation.isPending
  const contentState = isLoading
    ? 'loading'
    : isError
      ? 'error'
      : plans && plans.length > 0
        ? 'content'
        : 'empty'

  function openCreateDialog() {
    setEditingPlan(null)
    setIsCreateOpen(true)
  }

  function handleFormApiError(
    error: unknown,
    setError: SubscriptionPlanFormSubmitContext['setError'],
    checkDuplicateName: boolean
  ) {
    if (!isApiErrorResponse(error)) {
      logger.error(error)
      toast.error('Không thể lưu gói đăng ký. Vui lòng thử lại.')
      return
    }

    if (checkDuplicateName && isDuplicatePlanNameError(error)) {
      setError('planName', { type: 'server', message: 'Tên gói đã tồn tại.' })
      toast.error('Tên gói đã tồn tại.')
      return
    }

    if (applyServerFieldErrors(error, setError)) {
      toast.error('Vui lòng kiểm tra lại thông tin gói đăng ký.')
      return
    }

    const message =
      error.statusCode >= 500
        ? 'Lỗi máy chủ. Vui lòng thử lại sau.'
        : error.message || 'Không thể lưu gói đăng ký. Vui lòng thử lại.'
    toast.error(message)
  }

  function buildUpdatePayload(
    values: SubscriptionPlanFormOutput,
    dirtyFields: SubscriptionPlanFormSubmitContext['dirtyFields']
  ): UpdateSubscriptionPlanRequest {
    return {
      ...(dirtyFields.planName ? { planName: values.planName } : {}),
      ...(dirtyFields.monthlyPrice ? { monthlyPrice: values.monthlyPrice } : {}),
      ...(dirtyFields.currency ? { currency: values.currency } : {}),
      ...(dirtyFields.yearlyDiscountPercent
        ? { yearlyDiscountPercent: values.yearlyDiscountPercent }
        : {}),
      ...(dirtyFields.displayOrder ? { displayOrder: values.displayOrder } : {}),
      ...(dirtyFields.featureItems ? { features: featureItemsToPayload(values.featureItems) } : {}),
    }
  }

  async function handlePlanSubmit(
    values: SubscriptionPlanFormOutput,
    { dirtyFields, setError }: SubscriptionPlanFormSubmitContext
  ): Promise<boolean> {
    if (!editingPlan) {
      try {
        await createMutation.mutateAsync({
          planName: values.planName,
          monthlyPrice: values.monthlyPrice,
          currency: values.currency,
          yearlyDiscountPercent: values.yearlyDiscountPercent,
          displayOrder: values.displayOrder,
          features: featureItemsToPayload(values.featureItems),
        })
        toast.success('Đã tạo gói ở trạng thái ngừng cung cấp. Kiểm tra cấu hình rồi kích hoạt.')
        return true
      } catch (error) {
        handleFormApiError(error, setError, true)
        return false
      }
    }

    const payload = buildUpdatePayload(values, dirtyFields)
    if (Object.keys(payload).length === 0) return true

    try {
      await updateMutation.mutateAsync({ id: editingPlan.id, body: payload })
      toast.success('Đã lưu thay đổi.')
      return true
    } catch (error) {
      handleFormApiError(error, setError, false)
      return false
    }
  }

  function handleFormOpenChange(nextOpen: boolean) {
    if (!nextOpen && isFormPending) return
    if (nextOpen) return

    setIsCreateOpen(false)
    setEditingPlan(null)
    createMutation.reset()
    updateMutation.reset()
  }

  function handleDeactivateOpenChange(nextOpen: boolean) {
    if (!nextOpen && deactivateMutation.isPending) return
    if (nextOpen) return

    setDeactivatingPlan(null)
    setDeactivateErrorMessage(null)
    deactivateMutation.reset()
  }

  async function handleDeactivateConfirm() {
    if (!deactivatingPlan) return

    setDeactivateErrorMessage(null)
    try {
      await deactivateMutation.mutateAsync(deactivatingPlan.id)
      toast.success('Đã vô hiệu hóa gói đăng ký.')
      handleDeactivateOpenChange(false)
    } catch (error) {
      logger.error(error)
      const message =
        isApiErrorResponse(error) && isPendingPlanReferenceError(error)
          ? 'Không thể vô hiệu hóa vì đang có doanh nghiệp chờ chuyển sang gói này.'
          : isApiErrorResponse(error)
            ? error.message
            : 'Không thể vô hiệu hóa gói. Vui lòng thử lại.'

      setDeactivateErrorMessage(message)
      toast.error(message)
    }
  }

  function renderPlans() {
    if (isLoading) {
      return (
        <div className="divide-y">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex h-16 items-center gap-6 px-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="hidden h-4 w-24 sm:block" />
              <Skeleton className="hidden h-4 w-28 md:block" />
            </div>
          ))}
        </div>
      )
    }

    if (isError) {
      return (
        <div className="text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
          <PackageOpen className="text-destructive size-10" aria-hidden="true" />
          <p className="text-sm">Không thể tải danh sách gói đăng ký.</p>
          <Button
            variant="outline"
            className="gap-1.5"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw
              className={isFetching ? 'size-4 animate-spin motion-reduce:animate-none' : 'size-4'}
              aria-hidden="true"
            />
            Thử lại
          </Button>
        </div>
      )
    }

    if (!plans || plans.length === 0) {
      return (
        <div className="text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
          <div className="border-border bg-muted/50 flex size-12 items-center justify-center border">
            <PackageOpen className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">Chưa có gói đăng ký</p>
            <p className="mt-1 text-xs">Tạo gói đầu tiên để mở danh mục cho tenant.</p>
          </div>
          <Button variant="outline" className="h-10 gap-1.5 sm:h-8" onClick={openCreateDialog}>
            <Plus className="size-4" aria-hidden="true" />
            Tạo gói đầu tiên
          </Button>
        </div>
      )
    }

    return (
      <SubscriptionPlanTable
        plans={plans}
        onEdit={(plan) => {
          setIsCreateOpen(false)
          setEditingPlan(plan)
        }}
        onDeactivate={(plan) => {
          setDeactivateErrorMessage(null)
          setDeactivatingPlan(plan)
        }}
        onActivate={async (plan) => {
          try {
            await activateMutation.mutateAsync(plan.id)
            toast.success(`Đã kích hoạt gói ${plan.planName}.`)
          } catch (error) {
            logger.error(error)
            toast.error(
              isApiErrorResponse(error)
                ? error.message
                : 'Không thể kích hoạt gói. Vui lòng kiểm tra cấu hình.'
            )
          }
        }}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-primary text-primary-foreground relative flex size-10 shrink-0 items-center justify-center">
            <CreditCard className="size-5" aria-hidden="true" />
            <span
              className="bg-primary-container absolute right-0.5 bottom-0.5 size-1.5"
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0">
            <p className="text-primary text-xs font-medium">Danh mục nền tảng</p>
            <h2 className="text-foreground mt-0.5 text-xl font-semibold">Gói đăng ký</h2>
          </div>
        </div>
        <Button className="h-10 w-full gap-1.5 sm:h-8 sm:w-auto" onClick={openCreateDialog}>
          <Plus className="size-4" aria-hidden="true" />
          Tạo gói mới
        </Button>
      </header>

      {!isError && <PlanCatalogSummary plans={plans} isLoading={isLoading} />}

      <OperationalListPanel aria-labelledby="subscription-plans-list-title">
        <div className="flex min-h-11 items-center justify-between gap-4 border-b px-3 sm:px-4">
          <div className="flex items-baseline gap-2">
            <h3
              id="subscription-plans-list-title"
              className="text-foreground text-sm font-semibold"
            >
              Danh sách gói
            </h3>
            {!isLoading && !isError && (
              <span className="text-muted-foreground text-xs">{result?.totalCount ?? 0} gói</span>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isFetching}
                aria-label="Làm mới danh sách gói"
                onClick={() => void refetch()}
              >
                <RefreshCw
                  className={
                    isFetching ? 'size-3.5 animate-spin motion-reduce:animate-none' : 'size-3.5'
                  }
                  aria-hidden="true"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={4}>Làm mới danh sách</TooltipContent>
          </Tooltip>
        </div>

        <div className="grid gap-2 border-b p-3 sm:grid-cols-[minmax(220px,1fr)_180px_auto]">
          <Input
            aria-label="Tìm gói đăng ký"
            name="planSearch"
            autoComplete="off"
            value={search}
            placeholder="Tìm theo tên gói…"
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <Select
            value={status ?? 'all'}
            onValueChange={(value) => {
              setStatus(value === 'all' ? undefined : value === 'Active' ? 'Active' : 'Inactive')
              setPage(1)
            }}
          >
            <SelectTrigger aria-label="Lọc trạng thái gói">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" sideOffset={4}>
              <SelectItem value="all">Mọi trạng thái</SelectItem>
              <SelectItem value="Active">Đang cung cấp</SelectItem>
              <SelectItem value="Inactive">Ngừng cung cấp</SelectItem>
            </SelectContent>
          </Select>
          {search || status ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                setStatus(undefined)
                setPage(1)
              }}
            >
              Xóa lọc
            </Button>
          ) : (
            <span />
          )}
        </div>

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={contentState}
            className="min-h-0 flex-1 overflow-auto"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: 'easeOut' }}
          >
            {renderPlans()}
          </motion.div>
        </AnimatePresence>
        <OperationalPagination
          page={page}
          pageSize={pageSize}
          totalCount={result?.totalCount ?? 0}
          isPending={isFetching}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value)
            setPage(1)
          }}
        />
      </OperationalListPanel>

      <SubscriptionPlanFormDialog
        key={editingPlan?.id ?? 'create'}
        open={isFormOpen}
        onOpenChange={handleFormOpenChange}
        onSubmit={handlePlanSubmit}
        isPending={isFormPending}
        featureMeta={featureMeta}
        plan={editingPlan ?? undefined}
      />

      {deactivatingPlan && (
        <DeactivatePlanDialog
          open
          onOpenChange={handleDeactivateOpenChange}
          onConfirm={handleDeactivateConfirm}
          isPending={deactivateMutation.isPending}
          errorMessage={deactivateErrorMessage}
          plan={deactivatingPlan}
        />
      )}
    </div>
  )
}
