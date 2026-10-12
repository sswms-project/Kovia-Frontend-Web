export interface TransferLocation {
  readonly slotCode: string
  readonly rackCode?: string | null
  readonly isSystemDefaultSlot?: boolean
  readonly rackId?: string | null
  readonly zoneCode?: string | null
}

/**
 * Vị trí đầy đủ để nhân viên biết đi đâu: "Khu K01 / Kệ A07", thêm mã ô khi không phải ô mặc định của kệ.
 * Ô mặc định dùng chung mã nội bộ nên chỉ hiển thị theo kệ.
 */
export function formatTransferLocation(location: TransferLocation): string {
  const parts: string[] = []
  if (location.zoneCode) parts.push(`Khu ${location.zoneCode}`)
  if (location.rackCode) parts.push(`Kệ ${location.rackCode}`)
  if (!location.isSystemDefaultSlot || !location.rackCode) parts.push(location.slotCode)
  return parts.join(' / ')
}

/** Giá trị mã vạch trên nhãn in từ trang mã vạch vị trí (khớp BE: KOVIA:LOC:{loại}:{id}). */
const locationLabel = (type: 'SLOT' | 'RACK', id: string) => `KOVIA:LOC:${type}:${id}`

/**
 * Mã người dùng có thể quét để xác nhận vị trí: mã vị trí, mã barcode, giá trị trên nhãn đã in và
 * (với vị trí mặc định) mã kệ hoặc nhãn kệ.
 */
export function transferLocationScanCodes(
  location: TransferLocation & {
    readonly slotBarcode?: string | null
    readonly slotId?: string | null
  }
): string[] {
  const codes = [
    location.slotCode,
    location.slotBarcode,
    location.slotId ? locationLabel('SLOT', location.slotId) : null,
  ]
  if (location.isSystemDefaultSlot) {
    codes.push(location.rackCode, location.rackId ? locationLabel('RACK', location.rackId) : null)
    // Nhãn kệ ghép khu: "K01-A07".
    if (location.zoneCode && location.rackCode)
      codes.push(`${location.zoneCode}-${location.rackCode}`)
  } else if (location.zoneCode && location.rackCode) {
    // Nhãn ô ghép khu và kệ, duy nhất trong kho: "K01-A07-S01".
    codes.push(`${location.zoneCode}-${location.rackCode}-${location.slotCode}`)
  }
  return codes.filter((code): code is string => Boolean(code))
}
