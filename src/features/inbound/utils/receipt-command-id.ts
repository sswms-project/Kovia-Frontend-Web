export interface ReceiptCommandSnapshot {
  payload: string
  commandId: string
}

export function receiptCommandId(
  previous: ReceiptCommandSnapshot | null,
  body: unknown,
  createId: () => string = () => crypto.randomUUID()
): ReceiptCommandSnapshot {
  const payload = JSON.stringify(body)
  return previous?.payload === payload ? previous : { payload, commandId: createId() }
}
