'use client'

import { useState } from 'react'
import { RefreshCw, TriangleAlert, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ApiErrorResponse } from '@/types/api'
import {
  useResetTaskAssignmentScoringMutation,
  useTaskAssignmentScoringQuery,
  useUpdateTaskAssignmentScoringMutation,
} from '../../../hooks/use-organization'
import type { TaskAssignmentScoringFormValues } from '../../../schemas/task-assignment-scoring.schema'
import { BASE_SCORE_FIELDS, VOLUME_FIELDS } from './scoring-fields'
import { TaskAssignmentScoringEditor } from './TaskAssignmentScoringEditor'
import type { ScoringFieldErrors, ScoringWeightKey } from './types'

const HTTP_CONFLICT = 409
const WEIGHT_KEYS = new Set<string>(
  [...BASE_SCORE_FIELDS, ...VOLUME_FIELDS].map((definition) => definition.key)
)

interface TaskAssignmentScoringSectionProps {
  readonly canUpdate: boolean
}

function isApiError(error: unknown): error is ApiErrorResponse {
  return typeof error === 'object' && error !== null && 'statusCode' in error
}

// Backend trả lỗi theo tên thuộc tính PascalCase của command (ReceivingBase → receivingBase).
function toFieldErrors(error: ApiErrorResponse): ScoringFieldErrors {
  const fieldErrors: ScoringFieldErrors = {}
  for (const [property, messages] of Object.entries(error.errors ?? {})) {
    const key = property.charAt(0).toLowerCase() + property.slice(1)
    if (WEIGHT_KEYS.has(key) && messages[0]) fieldErrors[key as ScoringWeightKey] = messages[0]
  }
  return fieldErrors
}

/** Tự quản lý dữ liệu hệ số chấm điểm, tách khỏi hồ sơ doanh nghiệp của trang. */
export function TaskAssignmentScoringSection({ canUpdate }: TaskAssignmentScoringSectionProps) {
  const [hasConflict, setHasConflict] = useState(false)
  const scoringQuery = useTaskAssignmentScoringQuery()
  const updateMutation = useUpdateTaskAssignmentScoringMutation()
  const resetMutation = useResetTaskAssignmentScoringMutation()
  const scoring = scoringQuery.data

  function handleFailure(error: unknown, fallbackMessage: string): ScoringFieldErrors {
    if (isApiError(error) && error.statusCode === HTTP_CONFLICT) {
      setHasConflict(true)
      toast.error('Hệ số vừa được thay đổi ở nơi khác. Hãy tải lại trước khi lưu.')
      return {}
    }
    const fieldErrors = isApiError(error) ? toFieldErrors(error) : {}
    toast.error(
      Object.keys(fieldErrors).length > 0
        ? 'Vui lòng kiểm tra lại các hệ số.'
        : (isApiError(error) && error.message) || fallbackMessage
    )
    return fieldErrors
  }

  async function handleSave(values: TaskAssignmentScoringFormValues) {
    if (!scoring) return {}
    try {
      await updateMutation.mutateAsync({ ...values, version: scoring.version })
      toast.success('Đã lưu hệ số chấm điểm giao việc.')
      return {}
    } catch (error) {
      return handleFailure(error, 'Không thể lưu hệ số. Vui lòng thử lại.')
    }
  }

  async function handleReset() {
    if (!scoring) return
    try {
      await resetMutation.mutateAsync(scoring.version)
      toast.success('Đã khôi phục hệ số mặc định.')
    } catch (error) {
      handleFailure(error, 'Không thể khôi phục hệ số mặc định. Vui lòng thử lại.')
    }
  }

  function reload() {
    setHasConflict(false)
    void scoringQuery.refetch()
  }

  return (
    <section className="bg-card space-y-4 border p-5" aria-labelledby="task-scoring-title">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <UsersRound className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h2 id="task-scoring-title" className="text-base font-semibold">
              Hệ số đề xuất nhân viên khi giao việc
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Điều chỉnh mức “nặng” của từng loại việc để hệ thống đề xuất người đang ít việc nhất
              khi giao nhận hàng, cất hàng, công việc kho và kiểm kê.
            </p>
          </div>
        </div>
        {scoring ? (
          <Badge variant={scoring.isCustomized ? 'default' : 'secondary'} className="shrink-0">
            {scoring.isCustomized ? 'Đang dùng hệ số riêng' : 'Đang dùng hệ số mặc định'}
          </Badge>
        ) : null}
      </header>

      {hasConflict ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Hệ số đã thay đổi ở nơi khác</AlertTitle>
          <AlertDescription>
            Thay đổi của bạn chưa được lưu. Tải lại để xem hệ số mới nhất rồi chỉnh tiếp.
          </AlertDescription>
          <AlertAction>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={scoringQuery.isFetching}
              onClick={reload}
            >
              <RefreshCw
                className={scoringQuery.isFetching ? 'animate-spin' : undefined}
                aria-hidden="true"
              />
              Tải lại
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {scoringQuery.isLoading ? (
        <div className="space-y-3" aria-label="Đang tải hệ số chấm điểm">
          <Skeleton className="h-24" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
        </div>
      ) : scoringQuery.isError || !scoring ? (
        <div className="flex flex-col items-start gap-2 border p-4 text-sm">
          <span>Không thể tải hệ số chấm điểm giao việc.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={scoringQuery.isFetching}
            onClick={() => void scoringQuery.refetch()}
          >
            <RefreshCw
              className={scoringQuery.isFetching ? 'animate-spin' : undefined}
              aria-hidden="true"
            />
            Thử lại
          </Button>
        </div>
      ) : (
        <TaskAssignmentScoringEditor
          key={`${scoring.version}:${scoring.isCustomized}`}
          scoring={scoring}
          canUpdate={canUpdate}
          isLocked={hasConflict}
          isSaving={updateMutation.isPending}
          isResetting={resetMutation.isPending}
          onSave={handleSave}
          onReset={() => void handleReset()}
        />
      )}
    </section>
  )
}
