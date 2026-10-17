'use client'

import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { ApiErrorResponse } from '@/types/api'
import { useMeQuery, useUpdateProfileMutation } from '@/features/auth/hooks/use-auth'
import { SectionIconBadge } from '@/features/settings/components/SecurityPage'
import {
  ProfileForm,
  ProfileOverviewCard,
  ProfileView,
  ProfileViewSkeleton,
  type ProfileFormSubmitContext,
} from '../components'
import {
  updateProfileRequestSchema,
  profileFormSchema,
  type ProfileFormValues,
  type UpdateProfileFormRequest,
} from '../schemas/profile.schema'

const serverFieldMap = {
  FullName: 'fullName',
  Phone: 'phone',
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
  setError: ProfileFormSubmitContext['setError']
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
  values: ProfileFormValues,
  dirtyFields: ProfileFormSubmitContext['dirtyFields']
): UpdateProfileFormRequest {
  return updateProfileRequestSchema.parse({
    ...(dirtyFields.fullName ? { fullName: values.fullName } : {}),
    ...(dirtyFields.phone ? { phone: values.phone } : {}),
  })
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const meQuery = useMeQuery()
  const updateMutation = useUpdateProfileMutation()
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { fullName: '', phone: '' },
  })

  useEffect(() => {
    if (!meQuery.data) return
    form.reset({ fullName: meQuery.data.fullName, phone: meQuery.data.phone ?? '' })
  }, [form, meQuery.data])

  async function handleSubmit(values: ProfileFormValues, context: ProfileFormSubmitContext) {
    const request = buildUpdateRequest(values, context.dirtyFields)
    if (Object.keys(request).length === 0) return true

    try {
      await updateMutation.mutateAsync(request)
      toast.success('Đã cập nhật hồ sơ cá nhân.')
      setIsEditing(false)
      return true
    } catch (error) {
      logger.error(error)
      if (!isApiErrorResponse(error)) {
        toast.error('Không thể cập nhật hồ sơ. Vui lòng thử lại.')
        return false
      }
      if (applyServerErrors(error, context.setError)) {
        toast.error('Vui lòng kiểm tra lại thông tin.')
      } else {
        toast.error(error.message || 'Không thể cập nhật hồ sơ. Vui lòng thử lại.')
      }
      return false
    }
  }

  return (
    <div className="@container w-full min-w-0 space-y-6">
      <header className="animate-in fade-in slide-in-from-top-3 flex items-start gap-4 duration-400">
        <SectionIconBadge icon={UserRound} tone="primary" size="lg" />
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">Hồ sơ cá nhân</h1>
        </div>
      </header>

      <div className="grid w-full min-w-0 grid-cols-1 items-start gap-6 @min-[56rem]:grid-cols-[320px_minmax(0,1fr)]">
        <ProfileOverviewCard profile={meQuery.data} isLoading={meQuery.isLoading} />

        <div className="min-w-0">
          {meQuery.isLoading && <ProfileViewSkeleton />}

          {meQuery.isError && (
            <Alert
              variant="destructive"
              className="min-h-48 content-center justify-items-center text-center"
            >
              <AlertTitle>Không thể tải thông tin hồ sơ</AlertTitle>
              <AlertDescription>Vui lòng kiểm tra kết nối rồi thử lại.</AlertDescription>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void meQuery.refetch()}
              >
                Thử lại
              </Button>
            </Alert>
          )}

          {meQuery.data &&
            (isEditing ? (
              <ProfileForm
                profile={meQuery.data}
                form={form}
                isPending={updateMutation.isPending}
                onCancel={() => {
                  updateMutation.reset()
                  setIsEditing(false)
                }}
                onSubmit={handleSubmit}
              />
            ) : (
              <ProfileView profile={meQuery.data} onEdit={() => setIsEditing(true)} />
            ))}
        </div>
      </div>
    </div>
  )
}
