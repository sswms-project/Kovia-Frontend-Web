export interface ApiResponse<T> {
  isSuccess: boolean
  statusCode: number
  message: string
  data: T
}

export interface ApiErrorResponse {
  statusCode: number
  message: string
  errors?: Record<string, string[]>
  /** Stable machine-readable code when the backend sends one (for example AI form flow errors). */
  code?: string
  /** Per-field messages when the backend sends them. */
  fieldErrors?: readonly { key: string; message: string }[]
}

export interface QueryInfo {
  top?: number
  skip?: number
  searchText?: string
  isActive?: boolean
  orderBy?: string
  orderType?: OrderType
  needTotalCount?: boolean
}

export interface QueryResult<T> {
  items: T[]
  totalCount: number
}

export enum OrderType {
  Ascending = 0,
  Descending = 1,
}
