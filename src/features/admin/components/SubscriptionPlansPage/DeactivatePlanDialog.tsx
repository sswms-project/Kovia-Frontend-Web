'use client'

import { CircleOff, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { SubscriptionPlanResponse } from '../../types/admin.types'

interface DeactivatePlanDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirm: () => Promise<void>
  readonly isPending: boolean
  readonly errorMessage: string | null
  readonly plan: SubscriptionPlanResponse
}

export function DeactivatePlanDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  errorMessage,
  plan,
}: DeactivatePlanDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="duration-200"
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <CircleOff className="size-5" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Vô hiệu hóa gói &ldquo;{plan.planName}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            Gói sẽ ngừng xuất hiện trong danh mục dành cho doanh nghiệp mới.{' '}
            {plan.currentSubscriberCount} doanh nghiệp hiện tại vẫn tiếp tục sử dụng; thao tác bị
            chặn nếu có thay đổi gói đang chờ áp dụng.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {errorMessage && (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive border px-3 py-2 text-xs"
          >
            {errorMessage}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              // Chặn hành vi đóng mặc định của Radix: chỉ đóng khi API thành công.
              event.preventDefault()
              void onConfirm()
            }}
          >
            {isPending ? (
              <>
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Đang xử lý
              </>
            ) : (
              'Xác nhận vô hiệu hóa'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
