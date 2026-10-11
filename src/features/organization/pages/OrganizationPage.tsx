'use client'

import { useState } from 'react'
import { Building2, RefreshCw, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ApiErrorResponse } from '@/types/api'
import {
  OrganizationProfileForm,
  OrganizationProfileView,
  type OrganizationFormSubmitContext,
} from '../components/OrganizationPage'
import { useOrganizationQuery, useUpdateOrganizationMutation } from '../hooks/use-organization'
import {
  updateOrganizationRequestSchema,
  type OrganizationFormValues,
  type UpdateOrganizationRequest,
} from '../schemas/organization.schema'

const serverFieldMap = {
  TenantName: 'tenantName',
  Phone: 'phone',
  Address: 'address',
  TaxCode: 'taxCode',
  Website: 'website',
  Industry: 'industry',
} as const

function isServerField(field: string): field is keyof typeof serverFieldMap {
  return Object.hasOwn(serverFieldMap, field)
}

function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    'message' in error &&
    typeof error.message === 'string'
  )
}

function applyServerErrors(
  error: ApiErrorResponse,
  setError: OrganizationFormSubmitContext['setError']
) {
  if (!error.errors) return false

  let applied = false
  for (const [field, messages] of Object.entries(error.errors)) {
    if (!isServerField(field) || !messages[0]) continue
    setError(serverFieldMap[field], { type: 'server', message: messages[0] })
    applied = true
  }
  return applied
}

function buildUpdateRequest(
  values: OrganizationFormValues,
  dirtyFields: OrganizationFormSubmitContext['dirtyFields']
): UpdateOrganizationRequest {
  return updateOrganizationRequestSchema.parse({
    ...(dirtyFields.tenantName ? { tenantName: values.tenantName } : {}),
    ...(dirtyFields.phone ? { phone: values.phone } : {}),
    ...(dirtyFields.address ? { address: values.address } : {}),
    ...(dirtyFields.taxCode ? { taxCode: values.taxCode } : {}),
    ...(dirtyFields.website ? { website: values.website } : {}),
    ...(dirtyFields.industry ? { industry: values.industry } : {}),
  })
}

export function OrganizationPage() {
  const [isEditing, setIsEditing] = useState(false)
  const organizationQuery = useOrganizationQuery()
  const updateMutation = useUpdateOrganizationMutation()

  async function handleSubmit(
    values: OrganizationFormValues,
    context: OrganizationFormSubmitContext
  ) {
    const request = buildUpdateRequest(values, context.dirtyFields)
    if (Object.keys(request).length === 0) return true

    try {
      await updateMutation.mutateAsync(request)
      toast.success('Đã cập nhật hồ sơ doanh nghiệp.')
      setIsEditing(false)
      return true
    } catch (error) {
      logger.error(error)
      if (!isApiErrorResponse(error)) {
        toast.error('Không thể cập nhật doanh nghiệp. Vui lòng thử lại.')
        return false
      }

      if (applyServerErrors(error, context.setError)) {
        toast.error('Vui lòng kiểm tra lại thông tin doanh nghiệp.')
      } else {
        toast.error(error.message || 'Không thể cập nhật doanh nghiệp. Vui lòng thử lại.')
      }
      return false
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <header className="flex items-start gap-3 border-b pb-4">
        <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center">
          <Building2 className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-primary text-xs font-medium">Không gian doanh nghiệp</p>
          <h1 className="mt-0.5 text-xl font-semibold">Hồ sơ doanh nghiệp</h1>
        </div>
      </header>

      {organizationQuery.isLoading && (
        <div className="bg-card space-y-4 border p-4" aria-label="Đang tải hồ sơ doanh nghiệp">
          <Skeleton className="h-10 w-72 max-w-full" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-20" />
        </div>
      )}

      {organizationQuery.isError && (
        <div className="bg-card flex min-h-64 flex-col items-center justify-center gap-3 border px-4 text-center">
          <TriangleAlert className="text-destructive size-9" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">Không thể tải hồ sơ doanh nghiệp</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Vui lòng kiểm tra kết nối rồi thử lại.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={organizationQuery.isFetching}
            onClick={() => void organizationQuery.refetch()}
          >
            <RefreshCw
              className={organizationQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
              aria-hidden="true"
            />
            Thử lại
          </Button>
        </div>
      )}

      {organizationQuery.data &&
        (isEditing ? (
          <OrganizationProfileForm
            key={`${organizationQuery.data.id}-edit`}
            organization={organizationQuery.data}
            isPending={updateMutation.isPending}
            onCancel={() => {
              updateMutation.reset()
              setIsEditing(false)
            }}
            onSubmit={handleSubmit}
          />
        ) : (
          <OrganizationProfileView
            organization={organizationQuery.data}
            onEdit={() => setIsEditing(true)}
          />
        ))}
    </div>
  )
}
