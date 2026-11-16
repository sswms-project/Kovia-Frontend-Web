import { inboundService } from '@/features/inbound/services/inbound.service'
import { INBOUND_STATUS_LABELS } from '@/features/inbound/utils/inbound-format'
import { inboundRequestService } from '@/features/inbound-request/services/inbound-request.service'
import { INBOUND_REQUEST_STATUS_LABELS } from '@/features/inbound-request/utils/inbound-request-format'
import { stockIssueService } from '@/features/stock-issue/services/stock-issue.service'
import {
  RETURN_STATUS_LABELS,
  STOCK_ISSUE_REQUEST_STATUS_LABELS,
} from '@/features/stock-issue/utils/stock-issue-format'
import { supplierReturnService } from '@/features/supplier-return/services/supplier-return.service'
import { SUPPLIER_RETURN_STATUS_LABELS } from '@/features/supplier-return/utils/supplier-return-format'
import { transferService } from '@/features/transfer/services/transfer.service'
import { TRANSFER_STATUS_LABELS } from '@/features/transfer/utils/transfer-format'
import type {
  AiDocumentType,
  AiEntityPage,
  AiEntityPageRequest,
} from '../types/ai-entity-selector.types'
import { documentOption, toAiEntityPage } from '../utils/ai-entity-option-mappers'
import { AI_ENTITY_PAGE_SIZE, pageNumberParams } from '../utils/ai-entity-paging'

type DocumentFetcher = (request: AiEntityPageRequest) => Promise<AiEntityPage>

// One entry per document type: each existing list endpoint, searched and paged on the server.
const DOCUMENT_FETCHERS: Record<AiDocumentType, DocumentFetcher> = {
  inbound_request: ({ page, searchTerm }) =>
    inboundRequestService
      .getInboundRequests(pageNumberParams(page, searchTerm))
      .then((response) =>
        toAiEntityPage(response.data, (item) =>
          documentOption(
            item.id,
            item.inboundRequestCode,
            INBOUND_REQUEST_STATUS_LABELS[item.status]
          )
        )
      ),
  stock_issue_request: ({ page, searchTerm }) =>
    stockIssueService
      .getStockIssueRequests(pageNumberParams(page, searchTerm))
      .then((response) =>
        toAiEntityPage(response.data, (item) =>
          documentOption(
            item.id,
            item.stockIssueRequestCode,
            STOCK_ISSUE_REQUEST_STATUS_LABELS[item.status]
          )
        )
      ),
  transfer: ({ page, searchTerm }) =>
    transferService
      .getTransfers(pageNumberParams(page, searchTerm))
      .then((response) =>
        toAiEntityPage(response.data, (item) =>
          documentOption(item.id, item.transferCode, TRANSFER_STATUS_LABELS[item.status])
        )
      ),
  goods_receipt: ({ page, searchTerm }) =>
    inboundService
      .getReceipts(pageNumberParams(page, searchTerm))
      .then((response) =>
        toAiEntityPage(response.data, (item) =>
          documentOption(item.id, item.receiptCode, INBOUND_STATUS_LABELS[item.status])
        )
      ),
  goods_return: ({ page, searchTerm }) =>
    stockIssueService
      .getGoodsReturnRequests(pageNumberParams(page, searchTerm))
      .then((response) =>
        toAiEntityPage(response.data, (item) =>
          documentOption(item.id, item.goodsReturnRequestCode, RETURN_STATUS_LABELS[item.status])
        )
      ),
  // This endpoint names its params `page` / `search` instead of `pageNumber` / `searchTerm`.
  supplier_return: ({ page, searchTerm }) =>
    supplierReturnService
      .getSupplierReturns({
        page: page + 1,
        pageSize: AI_ENTITY_PAGE_SIZE,
        ...(searchTerm ? { search: searchTerm } : {}),
      })
      .then((response) =>
        toAiEntityPage(response.data, (item) =>
          documentOption(item.id, item.code, SUPPLIER_RETURN_STATUS_LABELS[item.status])
        )
      ),
}

export function fetchAiDocumentPage(request: AiEntityPageRequest): Promise<AiEntityPage> {
  const { documentType } = request.scope
  if (!documentType) throw new Error('A document selector needs a documentType.')
  return DOCUMENT_FETCHERS[documentType](request)
}
