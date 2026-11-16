'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { BellOff, Check, ChevronDown, ExternalLink, ShieldOff } from 'lucide-react'
import {
  OperationalErrorState,
  OperationalLoadingState,
} from '@/components/operations/OperationalState'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getErrorKind } from '@/lib/api-error'
import { getReferenceRoute } from '@/features/platform-services/utils/platform-services-format'
import {
  useAcknowledgeAlertMutation,
  useAlertDetailQuery,
  useAlertFeedbackMutation,
  useSnoozeAlertMutation,
} from '../../hooks/use-ai-alerts'
import {
  ALERT_FEEDBACK_KINDS,
  type AlertFeedbackKind,
  type AlertResolutionReason,
  type OperationalAlert,
} from '../../types/ai-alerts.types'
import {
  FEEDBACK_LABELS,
  SNOOZE_OPTIONS,
  formatAlertTime,
  toAlertFacts,
} from '../../utils/ai-alerts-format'
import { AlertStatusBadge, SeverityIndicator } from './AlertBadges'

const FEEDBACK_NOTE_MAX_LENGTH = 500

interface AlertDetailSheetProps {
  readonly alertId: string | null
  readonly warehouseName: (warehouseId: string | null) => string
  readonly typeLabel: (alertType: string) => string
  readonly onClose: () => void
}

export function AlertDetailSheet({
  alertId,
  warehouseName,
  typeLabel,
  onClose,
}: AlertDetailSheetProps) {
  const detailQuery = useAlertDetailQuery(alertId)
  const isNotFound = detailQuery.isError && getErrorKind(detailQuery.error).kind === 'notFound'
  const detail = detailQuery.data
  return (
    <Sheet open={alertId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-full overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 border-b px-6 py-5 pr-12">
          <SheetTitle>{detail?.alert.title ?? 'Chi tiết cảnh báo'}</SheetTitle>
          <SheetDescription>
            {detail
              ? `${typeLabel(detail.alert.alertType)} · ${warehouseName(detail.alert.warehouseId)}`
              : 'Cảnh báo theo dõi'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-6">
          {detailQuery.isLoading ? <OperationalLoadingState rows={4} /> : null}
          {isNotFound ? (
            <Empty className="flex-1 border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldOff aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Bạn không còn quyền xem cảnh báo này</EmptyTitle>
                <EmptyDescription>
                  Quyền hoặc kho phụ trách của bạn đã thay đổi, nên nội dung cảnh báo được ẩn.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : detailQuery.isError ? (
            <OperationalErrorState
              title="Không thể tải cảnh báo"
              onRetry={() => void detailQuery.refetch()}
            />
          ) : null}
          {detail ? (
            <AlertDetailBody
              key={detail.alert.id}
              alert={detail.alert}
              facts={detail.facts}
              myFeedback={detail.myFeedback}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function AlertDetailBody({
  alert,
  facts,
  myFeedback,
}: {
  readonly alert: OperationalAlert
  readonly facts: unknown
  readonly myFeedback: string | null
}) {
  const acknowledgeMutation = useAcknowledgeAlertMutation()
  const snoozeMutation = useSnoozeAlertMutation()
  const factList = toAlertFacts(facts)
  const entityRoute = getReferenceRoute(alert.entityType, alert.entityId)
  const isResolved = alert.status === 'Resolved'
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SeverityIndicator severity={alert.severity} />
        <AlertStatusBadge status={alert.status} />
      </div>
      <StatusExplanation alert={alert} />
      <p className="text-sm wrap-anywhere whitespace-pre-line">{alert.summary}</p>

      {!isResolved ? (
        <div className="flex flex-wrap gap-2">
          {alert.status === 'Open' ? (
            <Button
              type="button"
              disabled={acknowledgeMutation.isPending}
              onClick={() => acknowledgeMutation.mutate(alert.id)}
            >
              <Check aria-hidden="true" />
              Ghi nhận
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" disabled={snoozeMutation.isPending}>
                <BellOff aria-hidden="true" />
                Tạm hoãn
                <ChevronDown aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {SNOOZE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.hours}
                  onSelect={() => snoozeMutation.mutate({ alertId: alert.id, hours: option.hours })}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {entityRoute ? <EntityLink route={entityRoute} /> : null}
        </div>
      ) : entityRoute ? (
        <EntityLink route={entityRoute} />
      ) : null}

      <section aria-labelledby="alert-times-title">
        <h3 id="alert-times-title" className="mb-2 text-sm font-semibold">
          Thời gian
        </h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Detail label="Phát hiện lần đầu" value={formatAlertTime(alert.firstDetectedAt)} />
          <Detail
            label="Phát hiện gần nhất (dữ liệu)"
            value={formatAlertTime(alert.lastDetectedAt)}
          />
          {alert.acknowledgedAt ? (
            <Detail label="Bạn ghi nhận lúc" value={formatAlertTime(alert.acknowledgedAt)} />
          ) : null}
          {alert.resolvedAt ? (
            <Detail label="Đóng lúc" value={formatAlertTime(alert.resolvedAt)} />
          ) : null}
        </dl>
      </section>

      {factList.length > 0 ? (
        <section aria-labelledby="alert-facts-title">
          <h3 id="alert-facts-title" className="mb-2 text-sm font-semibold">
            Dữ kiện
          </h3>
          <dl className="divide-y rounded-lg border">
            {factList.map((fact, index) => (
              <div
                key={`${fact.label}-${index}`}
                className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 py-2"
              >
                <dt className="text-muted-foreground text-xs">{fact.label}</dt>
                <dd className="text-sm font-medium wrap-anywhere">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <AlertFeedback alertId={alert.id} myFeedback={myFeedback} />
    </>
  )
}

// Reason codes come from the BE; an alert closed before reasons were recorded is never given a guessed cause.
const RESOLUTION_TEXT: Record<AlertResolutionReason | 'Unknown', string> = {
  ConditionCleared: 'Đã đóng: dữ liệu cho thấy điều kiện không còn.',
  RuleDeleted: 'Đã đóng vì quy tắc theo dõi đã bị xóa. Điều kiện có thể vẫn còn.',
  Superseded: 'Đã đóng: được thay bằng bản tóm tắt mới hơn.',
  Unknown: 'Đã đóng. Hệ thống chưa ghi nhận lý do đóng cho cảnh báo này.',
}

function StatusExplanation({ alert }: { readonly alert: OperationalAlert }) {
  const text =
    alert.status === 'Resolved'
      ? RESOLUTION_TEXT[alert.resolutionReason ?? 'Unknown']
      : alert.status === 'Snoozed'
        ? `Đang tạm hoãn đến ${formatAlertTime(alert.snoozedUntil)}. Vấn đề vẫn còn cho tới khi dữ liệu cho thấy điều kiện đã hết.`
        : alert.status === 'Acknowledged'
          ? 'Bạn đã ghi nhận. Ghi nhận không có nghĩa vấn đề đã hết: cảnh báo tự đóng khi dữ liệu cho thấy điều kiện không còn.'
          : 'Vấn đề đang diễn ra theo dữ liệu gần nhất.'
  return <p className="bg-muted rounded-lg px-3 py-2 text-xs">{text}</p>
}

function EntityLink({ route }: { readonly route: string }) {
  return (
    <Button asChild variant="outline">
      <Link href={route as Route}>
        <ExternalLink aria-hidden="true" />
        Mở đối tượng liên quan
      </Link>
    </Button>
  )
}

function Detail({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  )
}

function AlertFeedback({
  alertId,
  myFeedback,
}: {
  readonly alertId: string
  readonly myFeedback: string | null
}) {
  const feedbackMutation = useAlertFeedbackMutation()
  const [kind, setKind] = useState<AlertFeedbackKind | ''>(
    ALERT_FEEDBACK_KINDS.find((value) => value === myFeedback) ?? ''
  )
  const [note, setNote] = useState('')
  const isSaved = feedbackMutation.isSuccess || (myFeedback !== null && kind === myFeedback)
  return (
    <section aria-labelledby="alert-feedback-title" className="flex flex-col gap-2 border-t pt-4">
      <h3 id="alert-feedback-title" className="text-sm font-semibold">
        Cảnh báo này thế nào?
      </h3>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={kind}
        aria-label="Đánh giá cảnh báo"
        className="flex-wrap"
        onValueChange={(next) => {
          const selected = ALERT_FEEDBACK_KINDS.find((value) => value === next)
          if (selected) {
            setKind(selected)
            feedbackMutation.reset()
          }
        }}
      >
        {ALERT_FEEDBACK_KINDS.map((value) => (
          <ToggleGroupItem key={value} value={value}>
            {FEEDBACK_LABELS[value]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {kind ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            feedbackMutation.mutate({ alertId, kind, note: note.trim() })
          }}
        >
          <Textarea
            aria-label="Ghi chú phản hồi (không bắt buộc)"
            placeholder="Ghi chú thêm (không bắt buộc)"
            maxLength={FEEDBACK_NOTE_MAX_LENGTH}
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
              feedbackMutation.reset()
            }}
            rows={2}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" variant="outline" disabled={feedbackMutation.isPending}>
              Gửi phản hồi
            </Button>
            {isSaved ? (
              <p role="status" className="text-muted-foreground text-xs">
                Đã lưu phản hồi của bạn.
              </p>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  )
}
