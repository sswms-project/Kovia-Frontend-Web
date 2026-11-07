'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useImportNavigation } from '@/components/operations/use-import-navigation'
import { UnsavedChangesDialog } from '@/components/operations/UnsavedChangesDialog'
import { APP_ROUTES } from '@/routes/app-routes'
import { useLegalMutation } from '../hooks/use-legal-documents'
import { legalDocumentsService as service } from '../services/legal-documents.service'
import { legalDraftSchema, type LegalDraftValues } from '../schemas/legal-draft.schema'
import type { LegalDetail, LegalSummary } from '../types/legal-documents.types'
import { LegalDocumentContent } from './LegalDocumentContent'

interface Props {
  readonly detail: LegalDetail
  readonly canEdit: boolean
  readonly canPublish: boolean
  readonly loadCurrent: () => Promise<LegalSummary | null>
  readonly reload: () => Promise<LegalDetail | undefined>
}

const toValues = (detail: LegalDetail): LegalDraftValues => ({
  title: detail.document.title,
  content: detail.content,
  summary: detail.document.summary,
})

export function AdminLegalDraftEditor({ detail, canEdit, canPublish, loadCurrent, reload }: Props) {
  const router = useRouter()
  const [saved, setSaved] = useState(detail)
  const [preview, setPreview] = useState<{
    detail: LegalDetail
    current: LegalSummary | null
  } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const [confirm, setConfirm] = useState<'delete' | 'publish' | null>(null)
  const [requiresConfirmation, setRequiresConfirmation] = useState(false)
  const form = useForm<LegalDraftValues>({
    resolver: zodResolver(legalDraftSchema),
    defaultValues: toValues(detail),
  })
  const { isDirty, errors } = form.formState
  const { kind, id, revision } = saved.document
  const save = useLegalMutation(
    (values: LegalDraftValues) => service.update(kind, id, revision, values),
    'Đã lưu bản nháp.'
  )
  const remove = useLegalMutation(() => service.delete(kind, id, revision), 'Đã xóa bản nháp.')
  const publish = useLegalMutation(
    (input: { revision: string; currentId: string | null; requiresConfirmation: boolean }) =>
      service.publish(kind, id, input.revision, input.currentId, input.requiresConfirmation),
    'Đã công bố văn bản.'
  )
  const busy =
    save.isPending ||
    remove.isPending ||
    publish.isPending ||
    previewing ||
    reloading ||
    form.formState.isSubmitting
  const stale = detail.document.revision !== revision
  const navigation = useImportNavigation(isDirty || busy, busy, 'Vui lòng đợi bản nháp lưu xong.')

  async function loadDraft() {
    setReloading(true)
    try {
      const result = await reload()
      if (!result || result.document.status !== 'Draft') return
      setSaved(result)
      form.reset(toValues(result))
    } finally {
      setReloading(false)
    }
  }

  async function openPreview() {
    setPreviewing(true)
    setPreviewError(false)
    try {
      const current = await loadCurrent()
      setPreview({ detail: saved, current })
    } catch {
      setPreviewError(true)
    } finally {
      setPreviewing(false)
    }
  }

  function closeConfirmation() {
    setConfirm(null)
    setPreview(null)
  }

  return (
    <>
      <form
        className="bg-card flex flex-col gap-4 border p-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await save.mutateAsync(values)
            await loadDraft()
          } catch {
            // Mutation owns the error message and the editor keeps the current input.
          }
        })}
      >
        <Field>
          <FieldLabel htmlFor="legal-title">Tiêu đề</FieldLabel>
          <Input
            id="legal-title"
            maxLength={200}
            readOnly={!canEdit || busy}
            aria-invalid={Boolean(errors.title)}
            {...form.register('title')}
          />
          <FieldError>{errors.title?.message}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="legal-content">Nội dung</FieldLabel>
          <Textarea
            id="legal-content"
            rows={16}
            maxLength={60000}
            readOnly={!canEdit || busy}
            aria-invalid={Boolean(errors.content)}
            {...form.register('content')}
          />
          <p className="text-muted-foreground text-xs">
            Có thể dùng Markdown cho đề mục, danh sách và liên kết.
          </p>
          <FieldError>{errors.content?.message}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="legal-summary">Tóm tắt thay đổi</FieldLabel>
          <Textarea
            id="legal-summary"
            rows={3}
            maxLength={1000}
            readOnly={!canEdit || busy}
            aria-invalid={Boolean(errors.summary)}
            {...form.register('summary')}
          />
          <FieldError>{errors.summary?.message}</FieldError>
        </Field>
        {previewError && (
          <p role="alert" className="text-destructive text-sm">
            Không tải được phiên bản hiện hành. Vui lòng thử xem trước lại.
          </p>
        )}
        {(stale || save.isError || publish.isError) && (
          <div role="status" className="flex flex-wrap items-center gap-2">
            <p className="text-sm">
              Bạn có thể sao chép nội dung đang nhập trước khi tải lại bản mới.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (!isDirty || window.confirm('Tải lại bản mới và bỏ thay đổi chưa lưu?'))
                  void loadDraft()
              }}
            >
              Tải lại bản nháp
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button type="submit" disabled={busy || !isDirty || stale}>
              Lưu bản nháp
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={busy || isDirty || stale}
            onClick={() => void openPreview()}
          >
            Xem trước
          </Button>
          {canEdit && (
            <Button
              type="button"
              variant="destructive"
              disabled={busy || stale}
              onClick={() => setConfirm('delete')}
            >
              Xóa bản nháp
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              navigation.requestDiscard(() => router.push(APP_ROUTES.admin.legalDocuments))
            }
          >
            Quay lại danh sách
          </Button>
        </div>
        {isDirty && (
          <p className="text-muted-foreground text-xs">
            Lưu thay đổi trước khi xem trước và công bố.
          </p>
        )}
      </form>

      <Dialog
        open={preview !== null && confirm === null}
        onOpenChange={(open) => {
          if (!open && confirm === null) setPreview(null)
        }}
      >
        <DialogContent className="flex h-dvh max-w-full flex-col sm:h-auto sm:max-h-[85dvh] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.detail.document.title}</DialogTitle>
            <DialogDescription>Bản nháp đã lưu · Xem trước văn bản</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto">
            <LegalDocumentContent content={preview?.detail.content ?? ''} />
          </div>
          {canPublish && preview && (
            <Button
              type="button"
              disabled={!preview.detail.content.trim() || !preview.detail.document.summary.trim()}
              onClick={() => {
                setRequiresConfirmation(false)
                setConfirm('publish')
              }}
            >
              Xác nhận công bố
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !busy) closeConfirmation()
        }}
      >
        <AlertDialogContent size="lg" className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'delete' ? 'Xóa bản nháp?' : 'Công bố văn bản trên toàn nền tảng?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'delete'
                ? 'Bản nháp sẽ bị xóa khỏi danh sách.'
                : `Bản ${(preview?.current?.version ?? 0) + 1} có hiệu lực ngay.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain text-sm break-words whitespace-pre-wrap"
            tabIndex={0}
            role="region"
            aria-label={confirm === 'delete' ? 'Tên bản nháp' : 'Tóm tắt thay đổi'}
          >
            {confirm === 'delete' ? saved.document.title : preview?.detail.document.summary}
          </div>
          {confirm === 'publish' && kind === 'Terms' && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={requiresConfirmation}
                onCheckedChange={(checked) => setRequiresConfirmation(checked === true)}
              />
              Nhắc Chủ doanh nghiệp xác nhận lại
            </label>
          )}
          <AlertDialogFooter className="shrink-0">
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            {confirm === 'delete' ? (
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  remove.mutate(undefined, {
                    onSuccess: () => router.push(APP_ROUTES.admin.legalDocuments),
                  })
                }
              >
                Xóa bản nháp
              </Button>
            ) : (
              <Button
                disabled={busy || !preview}
                onClick={() => {
                  if (!preview) return
                  publish.mutate(
                    {
                      revision: preview.detail.document.revision,
                      currentId: preview.current?.id ?? null,
                      requiresConfirmation,
                    },
                    {
                      onSuccess: closeConfirmation,
                      onError: closeConfirmation,
                    }
                  )
                }}
              >
                Công bố ngay
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <UnsavedChangesDialog
        open={navigation.discardOpen}
        onOpenChange={(open) => {
          if (!open) navigation.cancelDiscard()
        }}
        onDiscard={navigation.confirmDiscard}
      />
    </>
  )
}
