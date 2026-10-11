'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { tenantStateSchema, type TenantStateFormValues } from '../../schemas/tenant-state.schema'

interface TenantStateDialogProps {
  readonly open: boolean
  readonly tenantName: string
  readonly action: 'suspend' | 'reactivate'
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: TenantStateFormValues) => Promise<void>
}

export function TenantStateDialog({
  open,
  tenantName,
  action,
  isPending,
  onOpenChange,
  onSubmit,
}: TenantStateDialogProps) {
  const form = useForm<TenantStateFormValues>({
    resolver: zodResolver(tenantStateSchema),
    defaultValues: { reason: '' },
  })
  const isSuspend = action === 'suspend'

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isPending) return
    if (!nextOpen) form.reset()
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="duration-250"
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {isSuspend ? 'Tạm ngưng' : 'Kích hoạt lại'} {tenantName}?
          </DialogTitle>
          <DialogDescription>
            {isSuspend
              ? 'Mọi người dùng của doanh nghiệp sẽ bị chặn đăng nhập, refresh token và truy cập API ngay sau khi xác nhận.'
              : 'Người dùng của doanh nghiệp có thể đăng nhập và truy cập lại hệ thống sau khi xác nhận.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Field data-invalid={Boolean(form.formState.errors.reason)}>
            <FieldLabel htmlFor="tenant-state-reason">Lý do</FieldLabel>
            <Textarea
              id="tenant-state-reason"
              rows={4}
              maxLength={500}
              autoComplete="off"
              aria-invalid={Boolean(form.formState.errors.reason)}
              placeholder="Nhập lý do để lưu trong nhật ký hoạt động…"
              {...form.register('reason')}
            />
            <FieldError errors={[form.formState.errors.reason]} />
          </Field>
          <DialogFooter className="mt-5">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Hủy
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant={isSuspend ? 'destructive' : 'default'}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Đang xử lý
                </>
              ) : isSuspend ? (
                'Xác nhận tạm ngưng'
              ) : (
                'Xác nhận kích hoạt'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
