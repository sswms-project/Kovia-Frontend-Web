// Mirrors the BE create commands that an AI draft carries as its payload (camelCase JSON, enums as strings).

export interface AiInboundRequestPayload {
  readonly warehouseId?: string | null
  readonly supplierId?: string | null
  readonly lines: readonly {
    readonly productId: string
    readonly quantity: number
    readonly unitId?: string | null
  }[]
  readonly expectedDate?: string | null
  readonly sourceType?: string | null
  readonly sourceName?: string | null
  readonly sourceReference?: string | null
  readonly receivingAssignedTo?: string | null
  readonly inboundRequestCode?: string | null
}

export interface AiTransferPayload {
  readonly sourceWarehouseId: string
  readonly destinationWarehouseId: string
  readonly items: readonly {
    readonly productId: string
    readonly sourceSlotId?: string | null
    readonly destinationSlotId?: string | null
    readonly quantity: number
    readonly lotId?: string | null
  }[]
}

export interface AiStockIssueRequestPayload {
  readonly stockRecipientId: string
  readonly warehouseId: string
  readonly items: readonly {
    readonly productId: string
    readonly quantity: number
    readonly note?: string | null
    readonly unitId?: string | null
  }[]
  readonly purpose?: string | null
  readonly referenceCode?: string | null
  /** yyyy-MM-dd */
  readonly issueDate?: string | null
  /** HH:mm:ss */
  readonly issueTime?: string | null
  readonly note?: string | null
  readonly stockIssueRequestCode?: string | null
}

export interface AiSupplierReturnPayload {
  readonly warehouseId: string
  readonly supplierId: string
  readonly lines: readonly { readonly inventoryStockId: string; readonly quantity: number }[]
  readonly reason: string
  readonly negotiationNote?: string | null
  readonly damageCaseId?: string | null
  readonly sourceGoodsReceiptId?: string | null
}
