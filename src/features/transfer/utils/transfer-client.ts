import { newCommandId } from './transfer-command-id'

let clientId: string | undefined

/** In-memory per tab; do not share via localStorage/sessionStorage or across SSR requests. */
export function getTransferClientId() {
  if (typeof window === 'undefined') return undefined
  return (clientId ??= newCommandId())
}

export function transferWriteConfig() {
  const id = getTransferClientId()
  return id ? { headers: { 'X-Transfer-Client-Id': id } } : undefined
}
