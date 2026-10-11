export interface InventoryListQuery {
  pageNumber: number
  pageSize: number
  warehouseId?: string
  zoneId?: string
  rackId?: string
  slotId?: string
  productId?: string
  searchTerm?: string
  categoryId?: string
}

export type QualityStatus = 'Good' | 'Damaged' | 'Quarantine'
export type InventoryEligibilityStatus =
  | 'Available'
  | 'InspectionHold'
  | 'DamageHold'
  | 'Quarantine'

export interface InventoryStock {
  id: string
  productId: string
  sku: string
  productName: string
  warehouseId: string
  warehouseName: string
  slotId: string
  slotCode: string
  lotId: string | null
  lotNumber: string | null
  manufacturedDate: string | null
  expiryDate: string | null
  lotStatus: string | null
  unitName?: string | null
  qualityStatus: QualityStatus
  eligibilityStatus: InventoryEligibilityStatus
  quantityOnHand: number
  reservedQuantity: number
  holdQuantity: number
  availableQuantity: number
  version: string | null
  updatedAt: string | null
  canManageWarehouse: boolean
  rackId?: string | null
  rackCode?: string | null
  zoneCode?: string | null
  isSystemDefaultSlot?: boolean
}

export interface InventoryStockListResponse {
  items: InventoryStock[]
  totalCount: number
  pageNumber: number
  pageSize: number
  snapshotAt: string
}

export interface InventoryFilterOption {
  value: string
  label: string
}

export interface InventoryWarehouseOption {
  id: string
  warehouseCode: string
  warehouseName: string
  canManageWarehouse: boolean
}

export interface InventorySlotOption {
  id: string
  slotCode: string
  zoneCode?: string | null
  rackCode?: string | null
  isSystemDefaultSlot?: boolean
}

export const STOCK_MOVEMENT_TYPES = {
  inbound: 'Inbound',
  putAway: 'PutAway',
  pick: 'Pick',
  issue: 'Issue',
  transferOut: 'TransferOut',
  transferIn: 'TransferIn',
  adjustment: 'Adjustment',
  returnIn: 'ReturnIn',
  scrap: 'Scrap',
  opening: 'Opening',
  reclassification: 'Reclassification',
  correction: 'Correction',
} as const

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[keyof typeof STOCK_MOVEMENT_TYPES]

export interface StockMovementListQuery {
  pageNumber: number
  pageSize: number
  productId?: string
  warehouseId?: string
  slotId?: string
  searchTerm?: string
  movementType?: StockMovementType
  dateFrom?: string
  dateTo?: string
}

export interface StockMovement {
  id: string
  productId: string
  sku: string
  productName: string
  slotId: string
  slotCode: string
  lotId: string | null
  lotNumber: string | null
  qualityStatus: QualityStatus
  eligibilityStatus: InventoryEligibilityStatus
  quantityChange: number
  balanceAfter: number
  movementType: StockMovementType
  referenceType: string
  referenceId: string
  correctsMovementId: string | null
  correctionReason: string | null
  performedByUserId: string
  performedByName: string
  occurredAt: string
  createdAt: string
  warehouseName?: string | null
  zoneCode?: string | null
  rackCode?: string | null
  isSystemDefaultSlot?: boolean
  unitName?: string | null
  referenceCode?: string | null
}

export interface StockMovementListResponse {
  items: StockMovement[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface InventoryReservationQuery {
  pageNumber: number
  pageSize: number
  warehouseId?: string
  productId?: string
  status?: InventoryReservationStatus
}

export type InventoryReservationStatus = 'Active' | 'Released' | 'Consumed'

export interface InventoryReservation {
  id: string
  inventoryStockId: string
  productId: string
  productSku: string
  productName: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  slotId: string
  slotCode: string
  lotId: string | null
  lotNumber: string | null
  qualityStatus: QualityStatus
  eligibilityStatus: InventoryEligibilityStatus
  referenceType: 'StockIssueRequestLine' | 'StockIssuePick' | 'StockTransfer'
  referenceId: string
  referenceCode: string
  reservedQuantity: number
  status: InventoryReservationStatus
  createdByUserId: string
  createdByName: string
  releasedAt: string | null
  createdAt: string
}

export interface ReportDamagedStockRequest {
  productId: string
  warehouseId: string
  slotId: string
  lotId?: string
  quantity?: number
  reason: string
  commandId: string
  expectedStockVersion?: string
  evidenceIds: string[]
  relatedTaskType?: string
  relatedTaskId?: string
}

export type DamageCaseStatus = 'Open' | 'Resolved'
export type DamageDisposition =
  | 'ReturnToAvailable'
  | 'ContinueHold'
  | 'SupplierReturn'
  | 'InventoryAdjustment'
  | 'RequestEvidence'

export interface InventoryLifecycleEvent {
  action: string
  fromState: string | null
  toState: string | null
  actorId: string
  actorName: string
  reason: string | null
  createdAt: string
}

export interface MyWarehouseTask {
  id: string
  taskType: string
  referenceCode: string
  title: string
  warehouseId: string
  warehouseName: string
  status: string
  executionStatus: string
  priority: string
}

export interface MyWarehouseTaskListResponse {
  items: MyWarehouseTask[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface DamageCaseQuery {
  pageNumber: number
  pageSize: number
  warehouseId?: string
  slotId?: string
  searchTerm?: string
  productId?: string
  status?: DamageCaseStatus
  dateFrom?: string
  dateTo?: string
}

export interface DamageCase {
  id: string
  productId: string
  sku: string
  productName: string
  warehouseId: string
  warehouseName: string
  slotId: string
  slotCode: string
  lotId: string | null
  lotNumber: string | null
  quantity: number
  reason: string
  evidence: InventoryEvidence[]
  status: DamageCaseStatus
  disposition: DamageDisposition | null
  dispositionNote: string | null
  reportedByUserId: string
  reportedByName: string
  createdAt: string
  dispositionByUserId: string | null
  dispositionByName: string | null
  dispositionAt: string | null
  linkedStockIssueRequestId: string | null
  linkedStockAdjustmentId: string | null
  version: string | null
  isQuantityConfirmed: boolean
  resolvedQuantity: number
  remainingQuantity: number
  heldQuantity: number
  availableQuantity: number
  availableStockVersion: string | null
  relatedTaskType: string | null
  relatedTaskId: string | null
  evidenceRequestedAt: string | null
  history: InventoryLifecycleEvent[]
}

export interface DamageCaseListResponse {
  items: DamageCase[]
  totalCount: number
  pageNumber: number
  pageSize: number
  snapshotAt: string
}

export interface DecideDamageCaseDispositionRequest {
  damageCaseId: string
  disposition: DamageDisposition
  commandId: string
  expectedCaseVersion: string
  quantity?: number
  note?: string
  stockRecipientId?: string
}

export interface AddDamageCaseEvidenceRequest {
  damageCaseId: string
  evidenceIds: string[]
  expectedCaseVersion: string
  confirmedQuantity?: number
  expectedStockVersion?: string
}

export type OpeningStockStatus =
  | 'Draft'
  | 'PendingApproval'
  | 'Returned'
  | 'Rejected'
  | 'Posted'
  | 'Cancelled'

export interface OpeningStockLine {
  id: string
  productId: string
  sku: string
  productName: string
  slotId: string
  slotCode: string
  lotId: string | null
  lotNumber: string | null
  qualityStatus: QualityStatus
  eligibilityStatus: InventoryEligibilityStatus
  quantity: number
  enteredUnitId: string
  enteredUnitName: string
  enteredQuantity: number
  conversionFactorSnapshot: number
  baseQuantity: number
}

export interface InventoryEvidence {
  id: string
  warehouseId: string
  fileName: string
  contentType: string
  fileSize: number
  uploadedByUserId: string
  createdAt: string
  referenceType: string | null
  referenceId: string | null
}

export interface OpeningStockRecord {
  id: string
  code: string
  warehouseId: string
  warehouseName: string
  evidence: InventoryEvidence[]
  status: OpeningStockStatus
  revision: number
  createdByUserId: string
  createdByName: string
  submittedByUserId: string | null
  submittedAt: string | null
  approvedByUserId: string | null
  approvedAt: string | null
  decisionReason: string | null
  createdAt: string
  version: string | null
  lines: OpeningStockLine[]
}

export interface OpeningStockQuery {
  pageNumber: number
  pageSize: number
  warehouseId?: string
  status?: OpeningStockStatus
  dateFrom?: string
  dateTo?: string
}

export interface OpeningStockListResponse {
  items: OpeningStockRecord[]
  totalCount: number
  pageNumber: number
  pageSize: number
  snapshotAt: string
}

export interface CreateOpeningStockRequest {
  warehouseId: string
  evidenceIds: string[]
  commandId: string
  lines: Array<{
    productId: string
    slotId: string
    quantity: number
    enteredUnitId: string
    conversionFactor: number
    lotId?: string
    qualityStatus: QualityStatus
    eligibilityStatus: InventoryEligibilityStatus
  }>
}

export interface UpdateOpeningStockRequest {
  id: string
  expectedVersion: string
  lines: CreateOpeningStockRequest['lines']
}

export interface InventoryReservationListResponse {
  items: InventoryReservation[]
  totalCount: number
  pageNumber: number
  pageSize: number
  snapshotAt: string
}

export type StockDiscrepancyStatus =
  | 'PendingReview'
  | 'EvidenceRequested'
  | 'Rejected'
  | 'FollowUpPending'
  | 'Resolved'
  | 'Duplicate'
export type StockDiscrepancyType = 'Shortage' | 'Excess' | 'WrongLocation'
export type StockDiscrepancyReviewAction =
  | 'RequestEvidence'
  | 'Reject'
  | 'LinkDuplicate'
  | 'InitiateCycleCount'
  | 'ProposeAdjustment'

export interface StockDiscrepancyQuery {
  pageNumber: number
  pageSize: number
  warehouseId?: string
  productId?: string
  status?: StockDiscrepancyStatus
  dateFrom?: string
  dateTo?: string
}

export interface StockDiscrepancy {
  id: string
  code: string
  warehouseId: string
  warehouseName: string
  productId: string
  sku: string
  productName: string
  slotId: string
  slotCode: string
  lotId: string | null
  lotNumber: string | null
  type: StockDiscrepancyType
  observedDifference: number
  description: string
  status: StockDiscrepancyStatus
  reportedByUserId: string
  reportedByName: string
  createdAt: string
  reviewedByUserId: string | null
  reviewedAt: string | null
  reviewReason: string | null
  duplicateOfReportId: string | null
  linkedCycleCountId: string | null
  linkedStockAdjustmentId: string | null
  version: string | null
  evidence: InventoryEvidence[]
  correctSlotId: string | null
  correctSlotCode: string | null
  relatedTaskType: string | null
  relatedTaskId: string | null
  responsibleUserId: string | null
  responsibleUserName: string | null
  history: InventoryLifecycleEvent[]
}

export interface StockDiscrepancyListResponse {
  items: StockDiscrepancy[]
  totalCount: number
  pageNumber: number
  pageSize: number
  snapshotAt: string
}

export interface CreateStockDiscrepancyRequest {
  warehouseId: string
  productId: string
  slotId: string
  lotId?: string
  correctSlotId?: string
  type: StockDiscrepancyType
  observedDifference: number
  description: string
  evidenceIds: string[]
  commandId: string
  relatedTaskType?: string
  relatedTaskId?: string
}

export interface ReviewStockDiscrepancyRequest {
  reportId: string
  action: StockDiscrepancyReviewAction
  reason: string
  commandId: string
  expectedVersion: string
  duplicateReportId?: string
  responsibleUserId?: string
}

export interface AddStockDiscrepancyEvidenceRequest {
  reportId: string
  evidenceIds: string[]
  expectedVersion: string
}

export interface InventoryAbcQuery {
  warehouseId: string
}

export interface RunInventoryAbcRequest {
  warehouseId: string
  historicalPeriodDays: number
  metric: 'Quantity' | 'Activity'
  aThreshold: number
  bThreshold: number
}

export interface InventoryAbcItem {
  warehouseId: string
  productId: string
  sku: string
  productName: string
  totalQuantity: number
  metricValue: number
  cumulativePercentage: number
  class: string
  calculationBasis: string
  analysisFrom: string
  analysisTo: string
  analysisId: string | null
  datasetFingerprint: string | null
  metric: 'Quantity' | 'Activity' | null
  aThreshold: number | null
  bThreshold: number | null
  appliedCycleCountId: string | null
  version: string | null
}

export interface ApplyInventoryAbcRequest {
  analysisId: string
  assignedTo: string
  scheduledDate: string
  expectedVersion: string
  classes: string[]
}

export interface InventoryForecastQuery {
  productId: string
  warehouseId?: string
  horizonDays?: number
}

export interface ForecastPoint {
  date: string
  predictedQuantity: number
}

export interface InventoryForecastResponse {
  productId: string
  warehouseId: string | null
  modelName: string
  forecast: ForecastPoint[]
}

export type ForecastRunStatus = 'Pending' | 'Running' | 'Completed' | 'Failed'
export type ForecastSuggestionStatus = 'New' | 'Accepted' | 'Rejected' | 'Expired'

export interface CreateForecastRunRequest {
  warehouseId: string
  historicalPeriodDays: number
  horizonDays: number
}

export interface ForecastRunResult {
  id: string
  productId: string
  sku: string
  productName: string
  forecastDate: string
  forecastQuantity: number
  actualQuantity: number | null
  accuracyPercent: number | null
}

export interface ReplenishmentSuggestion {
  id: string
  productId: string
  sku: string
  productName: string
  warehouseId: string
  suggestedQuantity: number
  adjustedQuantity: number | null
  status: ForecastSuggestionStatus
  inboundRequestId: string | null
  acceptedByUserId: string | null
  acceptedAt: string | null
  explanation: ReplenishmentExplanation | null
  adjustmentReason: string | null
  version: string | null
  inboundRequestVersion: string | null
  supplierId: string | null
  inboundRequestStatus: string | null
  expectedSnapshot: string | null
  reviewNotice: string | null
  draftQuantity: number | null
  currentRequiredQuantity: number | null
}

export interface ReplenishmentExplanation {
  basis: 'Forecast' | 'PolicyFallback'
  unitName: string
  quantityPrecision: number
  availableQuantity: number
  incomingQuantity: number
  awaitingPutawayQuantity: number
  plannedQuantity: number
  targetQuantity: number
  forecastDemand: number
  coverageDays: number
  leadTimeDays: number | null
  snapshotAt: string
  warning: string | null
}

export interface DemandForecastDiagnostics {
  productId: string
  sku: string
  productName: string
  unitName: string
  basis: 'Forecast' | 'PolicyFallback' | 'Unavailable'
  method: string
  historyFrom: string
  historyTo: string
  observationDays: number
  stockoutDays: number
  warning: string | null
  holdoutMae: number | null
  baselineMae: number | null
  holdoutWape: number | null
  history: StockHistoryPoint[]
}

export interface ForecastRunSummary {
  id: string
  status: ForecastRunStatus
  createdAt: string
  forecastStartDate: string
  forecastEndDate: string
}

export interface RebalancingSuggestion {
  id: string
  productId: string
  sku: string
  productName: string
  sourceWarehouseId: string
  sourceWarehouseName: string
  destinationWarehouseId: string
  destinationWarehouseName: string
  suggestedQuantity: number
  status: ForecastSuggestionStatus
  stockTransferId: string | null
  acceptedByUserId: string | null
  acceptedAt: string | null
}

export interface ForecastRun {
  id: string
  warehouseId: string
  warehouseName: string
  createdByUserId: string
  createdByName: string
  method: string
  historicalPeriodDays: number
  forecastStartDate: string
  forecastEndDate: string
  status: ForecastRunStatus
  failureReason: string | null
  completedAt: string | null
  createdAt: string
  results: ForecastRunResult[]
  replenishmentSuggestions: ReplenishmentSuggestion[]
  rebalancingSuggestions: RebalancingSuggestion[]
  details: {
    products: DemandForecastDiagnostics[]
    draftCreationNotice: string | null
  } | null
}

export interface AcceptReplenishmentSuggestionRequest {
  supplierId: string
  adjustedQuantity: number | null
  adjustmentReason?: string | null
  expectedVersion?: string | null
  expectedInboundRequestVersion?: string | null
  expectedSnapshot?: string | null
}

export interface RejectForecastSuggestionRequest {
  suggestionType: ForecastSuggestionType
  expectedVersion?: string | null
  expectedInboundRequestVersion?: string | null
}

export interface AcceptRebalancingSuggestionRequest {
  destinationSlotId: string
  adjustedQuantity: number | null
}

export type ForecastSuggestionType = 'Replenishment' | 'Rebalancing'

export interface InventoryStockHistoryQuery {
  productId: string
  warehouseId?: string
  dateFrom?: string
  dateTo?: string
}

export interface StockHistoryPoint {
  date: string
  quantity: number
}

export interface InventoryStockHistoryResponse {
  productId: string
  warehouseId: string | null
  history: StockHistoryPoint[]
}
