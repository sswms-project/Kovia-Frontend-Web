import { useWatch, type UseFormReturn } from 'react-hook-form'
import { useAiDraftFormPrefill } from '@/features/ai-assistant/hooks/use-ai-draft-prefill'
import type { AiStockIssueRequestPayload } from '@/features/ai-assistant/types/ai-action-draft-payloads.types'
import { AI_ACTIONS } from '@/features/ai-assistant/types/ai-assistant.types'
import { useInboundRequestProductDetails } from '@/features/inbound-request/hooks/use-inbound-requests'
import type { LookupOption } from '@/features/inbound-request/types/inbound-request.types'
import { useStockRecipientQuery } from '@/features/stock-recipient/hooks/use-stock-recipients'
import { useWarehouseQuery } from '@/features/warehouse/hooks/use-warehouse'
import type { StockIssueRecipientSnapshot } from '../components/StockIssueRequestFormPage'
import type { CreateStockIssueRequestFormValues } from '../schemas/stock-issue.schema'
import type { StockIssueProductOption } from '../types/stock-issue.types'
import { stockIssueFormValuesFromAiDraft } from '../utils/stock-issue-ai-draft'
import { useStockIssueSavedProductOptions } from './use-stock-issue-requests'

function toFormValues(
  payload: AiStockIssueRequestPayload,
  current: CreateStockIssueRequestFormValues
) {
  return stockIssueFormValuesFromAiDraft(payload, {
    code: current.stockIssueRequestCode,
    issueDate: current.issueDate,
  })
}

interface UseStockIssueAiDraftOptions {
  readonly draftId: string | null
  readonly form: UseFormReturn<CreateStockIssueRequestFormValues>
}

/**
 * Prefills the stock issue form from an AI draft. The draft only carries ids, so this also resolves
 * the warehouse, recipient and products to labels/options that may sit outside the first lookup page.
 */
export function useStockIssueAiDraft({ draftId, form }: UseStockIssueAiDraftOptions) {
  const aiDraft = useAiDraftFormPrefill<
    AiStockIssueRequestPayload,
    CreateStockIssueRequestFormValues
  >({
    draftId,
    expectedAction: AI_ACTIONS.createStockIssueRequest,
    form,
    toFormValues,
  })
  const selectedWarehouseId = useWatch({ control: form.control, name: 'warehouseId' })
  const selectedRecipientId = useWatch({ control: form.control, name: 'stockRecipientId' })
  const productIds = (aiDraft.payload?.items ?? []).map((item) => item.productId)
  const productDetails = useInboundRequestProductDetails(productIds)
  const productQueries = useStockIssueSavedProductOptions(
    productDetails.flatMap((query) => (query.data ? [query.data.sku] : [])),
    selectedWarehouseId
  )
  const warehouseQuery = useWarehouseQuery(aiDraft.payload?.warehouseId ?? '')
  const recipientQuery = useStockRecipientQuery(aiDraft.payload?.stockRecipientId ?? '')

  const productsById: Record<string, StockIssueProductOption> = {}
  for (const query of productQueries) {
    for (const option of query.data ?? []) {
      if (productIds.includes(option.id)) productsById[option.id] = option
    }
  }
  const warehouse = warehouseQuery.data
  const recipient = recipientQuery.data
  const warehouseOption: LookupOption | undefined = warehouse
    ? { value: warehouse.id, label: `${warehouse.warehouseCode} · ${warehouse.warehouseName}` }
    : undefined
  const recipientOption: LookupOption | undefined = recipient
    ? { value: recipient.id, label: `${recipient.recipientCode} · ${recipient.recipientName}` }
    : undefined
  const recipientSnapshot: StockIssueRecipientSnapshot | undefined =
    recipient?.id === selectedRecipientId
      ? {
          recipientName: recipient.recipientName,
          phone: recipient.phone,
          address: recipient.address,
        }
      : undefined

  return { ...aiDraft, productsById, warehouseOption, recipientOption, recipientSnapshot }
}
