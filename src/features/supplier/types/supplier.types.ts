export type SupplierStatus = 'Active' | 'Inactive'

export interface SupplierListQuery {
  readonly pageNumber: number
  readonly pageSize: number
  readonly searchTerm?: string
  readonly status?: SupplierStatus
}

export interface Supplier {
  readonly id: string
  readonly supplierCode: string
  readonly supplierName: string
  readonly taxCode: string | null
  readonly phone: string
  readonly email: string | null
  readonly address: string | null
  readonly contactSalutation: string | null
  readonly contactName: string | null
  readonly contactEmail: string | null
  readonly contactMobile: string | null
  readonly contactChannel: string | null
  readonly contactChannelName: string | null
  readonly status: SupplierStatus
  readonly createdAt: string
  readonly updatedAt: string | null
}

export interface SupplierListResponse {
  readonly items: Supplier[]
  readonly totalCount: number
  readonly pageNumber: number
  readonly pageSize: number
}

export interface SaveSupplierRequest {
  readonly supplierCode: string
  readonly supplierName: string
  readonly taxCode: string | null
  readonly phone: string
  readonly email: string | null
  readonly address: string | null
  readonly contactSalutation: string | null
  readonly contactName: string | null
  readonly contactEmail: string | null
  readonly contactMobile: string | null
  readonly contactChannel: string | null
  readonly contactChannelName: string | null
}

export interface UpdateSupplierVariables {
  readonly supplierId: string
  readonly request: SaveSupplierRequest
}

export interface ImportSupplierItem {
  readonly rowNumber?: number
  readonly supplierCode: string | null
  readonly supplierName: string
  readonly taxCode: string | null
  readonly phone: string | null
  readonly email: string | null
  readonly address: string | null
  readonly contactSalutation: string | null
  readonly contactName: string | null
  readonly contactEmail: string | null
  readonly contactMobile: string | null
  readonly contactChannel: string | null
  readonly contactChannelName: string | null
}

export interface SupplierImportPreviewRow extends ImportSupplierItem {
  readonly rowNumber: number
  readonly errors: readonly string[]
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>
}

export interface SupplierImportPreview {
  readonly rows: readonly SupplierImportPreviewRow[]
}

export interface ImportSuppliersRequest {
  readonly items: readonly ImportSupplierItem[]
}
