'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { getApiErrorMessage } from '@/lib/api-error'
import { SupplierResponsePanel } from '../components/SupplierResponsePage'
import {
  useRespondAsSupplierMutation,
  useSupplierResponsePreviewQuery,
} from '../hooks/use-inbound-requests'
import {
  supplierResponseSchema,
  type SupplierResponseFormValues,
} from '../schemas/supplier-response.schema'
import { SUPPLIER_RESPONSE_DECISION } from '../types/inbound-request.types'
import { toOperationalDateApiValue } from '../utils/inbound-request-format'

export default function SupplierResponsePage({ token }: { readonly token?: string }) {
  const previewQuery = useSupplierResponsePreviewQuery(token ?? '')
  const respondMutation = useRespondAsSupplierMutation()
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string>()
  const form = useForm<SupplierResponseFormValues>({
    resolver: zodResolver(supplierResponseSchema),
    defaultValues: { decision: SUPPLIER_RESPONSE_DECISION.Confirmed, note: '', proposedDate: '' },
  })

  async function respond(values: SupplierResponseFormValues) {
    if (!token || respondMutation.isPending) return

    setSubmitErrorMessage(undefined)
    try {
      await respondMutation.mutateAsync({
        token,
        request: {
          decision: values.decision,
          note: values.note || null,
          proposedDate:
            values.decision === SUPPLIER_RESPONSE_DECISION.ProposedNewDate
              ? toOperationalDateApiValue(values.proposedDate)
              : null,
        },
      })
    } catch (error) {
      setSubmitErrorMessage(
        getApiErrorMessage(error, 'Không thể gửi phản hồi. Vui lòng thử lại sau ít phút.')
      )
    }
  }

  return (
    <SupplierResponsePanel
      token={token}
      preview={previewQuery.data}
      isLoading={previewQuery.isLoading}
      loadErrorMessage={
        previewQuery.error
          ? getApiErrorMessage(previewQuery.error, 'Liên kết không hợp lệ hoặc đã bị gỡ.')
          : undefined
      }
      form={form}
      isPending={respondMutation.isPending}
      submitErrorMessage={submitErrorMessage}
      onSubmit={respond}
    />
  )
}
