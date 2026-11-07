'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { APP_ROUTES } from '@/routes/app-routes'
import { useLegalMutation, useLegalRegistration } from '../hooks/use-legal-documents'
import { legalDocumentsService } from '../services/legal-documents.service'

export function LegalRegistrationActivation() {
  const query = useLegalRegistration()
  const activation = useLegalMutation(
    legalDocumentsService.activateRegistration,
    'Đã bật xác nhận điều khoản khi đăng ký.'
  )
  const [selection, setSelection] = useState<{
    termsVersionId: string
    privacyVersionId: string
  } | null>(null)
  if (query.isError)
    return (
      <Alert>
        <AlertTitle>Không tải được trạng thái đăng ký</AlertTitle>
        <AlertDescription>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    )
  if (!query.data) return null
  const { terms, privacy, requireVersion } = query.data
  return (
    <Alert>
      <AlertTitle>
        {requireVersion
          ? 'Đăng ký đang yêu cầu xác nhận điều khoản'
          : 'Chưa bật xác nhận phiên bản khi đăng ký'}
      </AlertTitle>
      {!requireVersion && (
        <AlertDescription>
          {terms && privacy ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={APP_ROUTES.legalDocument(terms.id)}
                className="text-primary underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kiểm tra Điều khoản v{terms.version}
              </Link>
              <Link
                href={APP_ROUTES.legalDocument(privacy.id)}
                className="text-primary underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kiểm tra Chính sách v{privacy.version}
              </Link>
              <Button
                variant="outline"
                size="sm"
                disabled={activation.isPending || query.isFetching}
                onClick={() =>
                  setSelection({ termsVersionId: terms.id, privacyVersionId: privacy.id })
                }
              >
                Bật xác nhận khi đăng ký
              </Button>
            </div>
          ) : (
            <p>Công bố cả Điều khoản sử dụng và Chính sách bảo vệ dữ liệu cá nhân trước khi bật.</p>
          )}
        </AlertDescription>
      )}
      <AlertDialog
        open={selection !== null}
        onOpenChange={(open) => {
          if (!open && !activation.isPending) setSelection(null)
        }}
      >
        <AlertDialogContent size="lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Bật xác nhận điều khoản cho đăng ký mới?</AlertDialogTitle>
            <AlertDialogDescription>
              Sau khi bật, mọi đăng ký mới phải xác nhận phiên bản đang hiệu lực. Thiết lập được lưu
              cho toàn nền tảng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activation.isPending}>Hủy</AlertDialogCancel>
            <Button
              disabled={activation.isPending || !selection}
              onClick={() => {
                if (!selection) return
                activation.mutate(selection, {
                  onSuccess: () => setSelection(null),
                  onError: () => {
                    setSelection(null)
                    void query.refetch()
                  },
                })
              }}
            >
              {activation.isPending ? 'Đang kích hoạt…' : 'Xác nhận kích hoạt'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Alert>
  )
}
