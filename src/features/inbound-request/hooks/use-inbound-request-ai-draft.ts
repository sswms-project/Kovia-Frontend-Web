import type { UseFormReturn } from 'react-hook-form'
import { useAiDraftFormPrefill } from '@/features/ai-assistant/hooks/use-ai-draft-prefill'
import type { AiInboundRequestPayload } from '@/features/ai-assistant/types/ai-action-draft-payloads.types'
import { AI_ACTIONS } from '@/features/ai-assistant/types/ai-assistant.types'
import { useSupplierQuery } from '@/features/supplier/hooks/use-suppliers'
import { useWarehouseQuery } from '@/features/warehouse/hooks/use-warehouse'
import type { InboundRequestFormValues } from '../schemas/inbound-request.schema'
import type { LookupOption } from '../types/inbound-request.types'
import { inboundRequestFormValuesFromAiDraft } from '../utils/inbound-request-ai-draft'

function toFormValues(payload: AiInboundRequestPayload, current: InboundRequestFormValues) {
  return inboundRequestFormValuesFromAiDraft(payload, current.inboundRequestCode)
}

interface UseInboundRequestAiDraftOptions {
  readonly draftId: string | null
  readonly form: UseFormReturn<InboundRequestFormValues>
}

/** Prefills the inbound request form from an AI draft; the draft only carries ids, so this also labels them. */
export function useInboundRequestAiDraft({ draftId, form }: UseInboundRequestAiDraftOptions) {
  const aiDraft = useAiDraftFormPrefill<AiInboundRequestPayload, InboundRequestFormValues>({
    draftId,
    expectedAction: AI_ACTIONS.createInboundRequest,
    form,
    toFormValues,
  })
  const warehouseQuery = useWarehouseQuery(aiDraft.payload?.warehouseId ?? '')
  const supplierQuery = useSupplierQuery(aiDraft.payload?.supplierId ?? '')
  const warehouse = warehouseQuery.data
  const supplier = supplierQuery.data

  const warehouseOption: LookupOption | null = warehouse
    ? { value: warehouse.id, label: `${warehouse.warehouseCode} - ${warehouse.warehouseName}` }
    : null
  const supplierOption: LookupOption | null = supplier
    ? { value: supplier.id, label: `${supplier.supplierName} · ${supplier.phone}` }
    : null

  return { ...aiDraft, warehouseOption, supplierOption }
}
