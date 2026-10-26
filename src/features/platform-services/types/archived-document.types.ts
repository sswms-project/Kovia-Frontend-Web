export const ARCHIVED_DOCUMENT_LABELS = {
  InboundRequest: 'Yêu cầu nhập kho',
  StockTransfer: 'Yêu cầu điều chuyển',
  GoodsReturnRequest: 'Khách trả hàng',
  SupplierReturnRequest: 'Trả hàng NCC',
} as const

export interface ArchivedDocument {
  documentType: keyof typeof ARCHIVED_DOCUMENT_LABELS
  id: string
  code: string
  warehouseId: string
  warehouseName: string
  createdAt: string
  deletedAt: string | null
  createdByName: string | null
  fields: { label: string; value: string | null }[]
  items: {
    productId: string
    sku: string
    productName: string
    quantity: number
    unitName: string
    enteredQuantity: number | null
    enteredUnitName: string | null
    location: string | null
    lotNumber: string | null
    quality: string | null
  }[]
  history: import('@/types/return-document').ReturnDocumentEvent[]
}
