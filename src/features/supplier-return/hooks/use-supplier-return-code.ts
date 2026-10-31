import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { UseFormReturn } from 'react-hook-form'
import { useCodeSuggestion } from '@/hooks/use-code-suggestion'
import { queryKeys } from '@/lib/query-keys'
import { supplierReturnService } from '../services/supplier-return.service'
import type { CreateSupplierReturnFormValues } from '../schemas/supplier-return.schema'

export function useSupplierReturnCode(
  form: UseFormReturn<CreateSupplierReturnFormValues>,
  active: boolean
) {
  const [session, setSession] = useState(0)
  const query = useQuery({
    queryKey: [...queryKeys.supplierReturns.all, 'next-code', session],
    queryFn: () => supplierReturnService.getNextCode().then((response) => response.data),
    enabled: active,
    staleTime: 0,
  })
  const suggestion = useCodeSuggestion({
    active,
    sessionKey: String(session),
    suggestedCode: query.data,
    isFetching: query.isFetching,
    isError: query.isError,
    getCurrentCode: () => form.getValues('supplierReturnCode') ?? '',
    applyCode: (code) => form.setValue('supplierReturnCode', code),
  })
  return {
    status: query.isFetching
      ? ('loading' as const)
      : query.isError
        ? ('error' as const)
        : ('ready' as const),
    onChange: () => {
      suggestion.markEdited()
      form.clearErrors('supplierReturnCode')
    },
    reset: () => setSession((value) => value + 1),
  }
}
