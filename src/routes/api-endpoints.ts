export const API_ENDPOINTS = {
  listExports: '/list-exports',
  archivedDocument: (documentType: string, id: string) =>
    `/archived-documents/${encodeURIComponent(documentType)}/${encodeURIComponent(id)}`,
  dashboard: {
    stockThresholdAlerts: '/dashboard/stock-alerts/thresholds',
    stockExpiryAlerts: '/dashboard/stock-alerts/expiry',
    stockExpiryDistribution: '/dashboard/stock-alerts/expiry-distribution',
    overview: '/dashboard/overview',
    activity: '/dashboard/activity',
    warehouses: '/dashboard/warehouses',
  },
  reports: {
    catalog: '/reports/catalog',
    options: '/reports/filter-options',
    view: (type: string) => `/reports/${encodeURIComponent(type)}`,
    export: (type: string) => `/reports/${encodeURIComponent(type)}/export`,
  },
  // Public endpoints
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    verifyEmail: '/auth/verify-email',
    resendVerification: '/auth/resend-verification',
    captchaChallenge: '/auth/captcha/challenge',
    refreshToken: '/auth/refresh',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    me: '/auth/me',
    verify2fa: '/auth/verify-2fa',
    changePassword: '/auth/change-password',
  },
  // Authenticated endpoints
  settings: {
    setup2fa: '/settings/2fa/setup',
    confirm2fa: '/settings/2fa/confirm',
    disable2fa: '/settings/2fa',
  },
  notifications: {
    list: '/notifications',
    markRead: (notificationId: string) => `/notifications/${notificationId}/read`,
    markAllRead: '/notifications/read-all',
  },
  auditLogs: {
    list: '/audit-logs',
  },
  platformAdmin: {
    dashboard: '/admin/dashboard',
    tenants: '/admin/tenants',
    tenantDetail: (tenantId: string) => `/admin/tenants/${tenantId}`,
    suspendTenant: (tenantId: string) => `/admin/tenants/${tenantId}/suspend`,
    reactivateTenant: (tenantId: string) => `/admin/tenants/${tenantId}/reactivate`,
    approveTenantRegistration: (tenantId: string) =>
      `/admin/tenants/${tenantId}/approve-registration`,
    rejectTenantRegistration: (tenantId: string) =>
      `/admin/tenants/${tenantId}/reject-registration`,
    announcements: '/admin/announcements',
    payments: '/admin/payments',
    subscriptionPlans: '/subscription-plans/admin',
    activateSubscriptionPlan: (planId: string) => `/subscription-plans/${planId}/activate`,
  },
  tenantRolePermissions: {
    workspace: '/tenant-role-permissions',
    assign: (roleId: string) => `/tenant-role-permissions/${roleId}`,
  },
  tenantUserPermissions: {
    subjects: '/tenant-user-permissions/subjects',
    detail: (userId: string) => `/tenant-user-permissions/${userId}`,
    assign: (userId: string) => `/tenant-user-permissions/${userId}`,
    reset: (userId: string) => `/tenant-user-permissions/${userId}/reset`,
  },
  organization: {
    me: '/organization',
    taskAssignmentScoring: '/organization/task-assignment-scoring',
  },
  myWarehouseTasks: {
    current: '/my-warehouse-tasks',
    list: '/my-warehouse-tasks',
    history: '/my-warehouse-tasks/history',
    action: (taskType: string, taskId: string) =>
      `/my-warehouse-tasks/${taskType}/${taskId}/actions`,
    relocationDetail: (taskId: string) => `/my-warehouse-tasks/relocation/${taskId}`,
    relocationRecommendations: (taskId: string, lineId: string) =>
      `/my-warehouse-tasks/relocation/${taskId}/lines/${lineId}/recommendations`,
    executeRelocation: (taskId: string) => `/my-warehouse-tasks/relocation/${taskId}/execute`,
  },
  warehouseTasks: {
    list: '/warehouse-tasks',
    history: '/warehouse-tasks/history',
    detail: (taskId: string) => `/warehouse-tasks/${taskId}`,
    assignment: (taskId: string) => `/warehouse-tasks/${taskId}/assignment`,
    schedule: (taskType: string, taskId: string) =>
      `/warehouse-tasks/${taskType}/${taskId}/schedule`,
    recommendations: (taskId: string, lineId: string) =>
      `/warehouse-tasks/${taskId}/lines/${lineId}/recommendations`,
  },
  staff: {
    managers: '/managers',
    list: '/staff',
    detail: (userId: string) => `/staff/${userId}`,
    former: '/staff/former',
    employmentHistory: (userId: string) => `/staff/${userId}/employment-history`,
    employmentPeriod: (userId: string, periodId: string) =>
      `/staff/${userId}/employment-history/${periodId}`,
    terminate: (userId: string) => `/staff/${userId}/terminate`,
    activate: (userId: string) => `/staff/${userId}/activate`,
    deactivate: (userId: string) => `/staff/${userId}/deactivate`,
    assignManager: (warehouseId: string) => `/warehouses/${warehouseId}/manager`,
    warehouseAssignments: (userId: string) => `/staff/${userId}/warehouses`,
  },
  warehouses: {
    list: '/warehouses',
    create: '/warehouses',
    detail: (warehouseId: string) => `/warehouses/${warehouseId}`,
    update: (warehouseId: string) => `/warehouses/${warehouseId}`,
    layout: (warehouseId: string) => `/warehouses/${warehouseId}/layout`,
    layoutScene: (warehouseId: string) => `/warehouses/${warehouseId}/layout/scene`,
    locations: (warehouseId: string) => `/warehouses/${warehouseId}/locations`,
    createZone: (warehouseId: string) => `/warehouses/${warehouseId}/zones`,
    updateZone: (warehouseId: string, zoneId: string) =>
      `/warehouses/${warehouseId}/zones/${zoneId}`,
    deactivateZone: (warehouseId: string, zoneId: string) =>
      `/warehouses/${warehouseId}/zones/${zoneId}/deactivate`,
    reactivateZone: (warehouseId: string, zoneId: string) =>
      `/warehouses/${warehouseId}/zones/${zoneId}/reactivate`,
    createRack: (warehouseId: string, zoneId: string) =>
      `/warehouses/${warehouseId}/zones/${zoneId}/racks`,
    updateRack: (warehouseId: string, zoneId: string, rackId: string) =>
      `/warehouses/${warehouseId}/zones/${zoneId}/racks/${rackId}`,
    deactivateRack: (warehouseId: string, zoneId: string, rackId: string) =>
      `/warehouses/${warehouseId}/zones/${zoneId}/racks/${rackId}/deactivate`,
    reactivateRack: (warehouseId: string, zoneId: string, rackId: string) =>
      `/warehouses/${warehouseId}/zones/${zoneId}/racks/${rackId}/reactivate`,
    createSlot: (warehouseId: string, rackId: string) =>
      `/warehouses/${warehouseId}/racks/${rackId}/slots`,
    updateSlot: (warehouseId: string, rackId: string, slotId: string) =>
      `/warehouses/${warehouseId}/racks/${rackId}/slots/${slotId}`,
    deactivateSlot: (warehouseId: string, rackId: string, slotId: string) =>
      `/warehouses/${warehouseId}/racks/${rackId}/slots/${slotId}/deactivate`,
    reactivateSlot: (warehouseId: string, rackId: string, slotId: string) =>
      `/warehouses/${warehouseId}/racks/${rackId}/slots/${slotId}/reactivate`,
    locationBarcode: (warehouseId: string, locationType: string, locationId: string) =>
      `/warehouses/${warehouseId}/locations/${locationType.toLowerCase()}/${locationId}/barcode`,
    deactivate: (warehouseId: string) => `/warehouses/${warehouseId}/deactivate`,
    reactivate: (warehouseId: string) => `/warehouses/${warehouseId}/reactivate`,
  },
  inventoryAnomalies: {
    list: '/inventory-anomalies',
    summary: '/inventory-anomalies/summary',
    scans: '/inventory-anomalies/scans',
    detail: (id: string) => `/inventory-anomalies/${id}`,
    review: (id: string) => `/inventory-anomalies/${id}/review`,
  },
  inventory: {
    list: '/inventory',
    exportExcel: '/inventory/export',
    warehouseOptions: '/inventory/filter-options/warehouses',
    slotOptions: (warehouseId: string) =>
      `/inventory/filter-options/warehouses/${warehouseId}/slots`,
    evidence: '/inventory/evidence',
    evidenceFile: (id: string) => `/inventory/evidence/${id}`,
    movements: '/inventory/movements',
    reservations: '/inventory/reservations',
    damaged: '/inventory/damaged',
    damageCases: '/inventory/damage-cases',
    discrepancies: '/inventory/discrepancies',
    reviewDiscrepancy: (id: string) => `/inventory/discrepancies/${id}/review`,
    addDiscrepancyEvidence: (id: string) => `/inventory/discrepancies/${id}/evidence`,
    damageCaseDisposition: (id: string) => `/inventory/damage-cases/${id}/disposition`,
    addDamageCaseEvidence: (id: string) => `/inventory/damage-cases/${id}/evidence`,
    openingStocks: '/inventory/opening-stocks',
    openingStockImport: '/inventory/opening-stocks/import',
    openingStockFormOptions: '/inventory/opening-stocks/form-options',
    openingStockImportOperation: (commandId: string) =>
      `/inventory/opening-stocks/import/operations/${encodeURIComponent(commandId)}`,
    updateOpeningStock: (id: string) => `/inventory/opening-stocks/${id}`,
    submitOpeningStock: (id: string) => `/inventory/opening-stocks/${id}/submit`,
    withdrawOpeningStock: (id: string) => `/inventory/opening-stocks/${id}/withdraw`,
    approveOpeningStock: (id: string) => `/inventory/opening-stocks/${id}/approve`,
    reviewOpeningStock: (id: string) => `/inventory/opening-stocks/${id}/review`,
    cancelOpeningStock: (id: string) => `/inventory/opening-stocks/${id}/cancel`,
    abcClassification: '/inventory/abc-classification',
    runAbcClassification: '/inventory/abc-classification/run',
    applyAbcAnalysis: (id: string) => `/inventory/abc-classification/${id}/create-cycle-count`,
    forecast: '/inventory/forecast',
    forecastRuns: '/inventory/forecast-runs',
    forecastRun: (id: string) => `/inventory/forecast-runs/${id}`,
    executeForecastRun: (id: string) => `/inventory/forecast-runs/${id}/execute`,
    evaluateForecastRun: (id: string) => `/inventory/forecast-runs/${id}/evaluate-accuracy`,
    acceptReplenishmentSuggestion: (id: string) =>
      `/inventory/replenishment-suggestions/${id}/accept`,
    acceptRebalancingSuggestion: (id: string) => `/inventory/rebalancing-suggestions/${id}/accept`,
    rejectForecastSuggestion: (id: string) => `/inventory/forecast-suggestions/${id}/reject`,
    history: '/inventory/history',
  },
  cycleCounts: {
    nextCode: '/cycle-counts/next-code',
    list: '/cycle-counts',
    create: '/cycle-counts',
    detail: (cycleCountId: string) => `/cycle-counts/${cycleCountId}`,
    allowedActions: (cycleCountId: string) => `/cycle-counts/${cycleCountId}/allowed-actions`,
    recordItems: (cycleCountId: string) => `/cycle-counts/${cycleCountId}/items`,
    assignableStaff: '/cycle-counts/assignable-staff',
    evidence: '/cycle-counts/evidence',
    evidenceFile: (evidenceId: string) => `/cycle-counts/evidence/${evidenceId}`,
    start: (cycleCountId: string) => `/cycle-counts/${cycleCountId}/start`,
    submit: (cycleCountId: string) => `/cycle-counts/${cycleCountId}/submit`,
    recount: (cycleCountId: string) => `/cycle-counts/${cycleCountId}/recount`,
    confirmDamage: (cycleCountId: string) => `/cycle-counts/${cycleCountId}/damage/confirm`,
    finalize: (cycleCountId: string) => `/cycle-counts/${cycleCountId}/finalize`,
    cancel: (cycleCountId: string) => `/cycle-counts/${cycleCountId}/cancel`,
    export: (cycleCountId: string) => `/cycle-counts/${cycleCountId}/export`,
  },
  stockAdjustments: {
    list: '/stock-adjustments',
    create: '/stock-adjustments',
    detail: (adjustmentId: string) => `/stock-adjustments/${adjustmentId}`,
    allowedActions: (adjustmentId: string) => `/stock-adjustments/${adjustmentId}/allowed-actions`,
    approve: (adjustmentId: string) => `/stock-adjustments/${adjustmentId}/approve`,
    reject: (adjustmentId: string) => `/stock-adjustments/${adjustmentId}/reject`,
    vouchers: '/stock-adjustments/vouchers',
    voucherDetail: (voucherId: string) => `/stock-adjustments/vouchers/${voucherId}`,
    voucherAllowedActions: (voucherId: string) =>
      `/stock-adjustments/vouchers/${voucherId}/allowed-actions`,
    voucherApprove: (voucherId: string) => `/stock-adjustments/vouchers/${voucherId}/approve`,
    voucherReject: (voucherId: string) => `/stock-adjustments/vouchers/${voucherId}/reject`,
  },
  suppliers: {
    list: '/suppliers',
    create: '/suppliers',
    nextCode: '/suppliers/next-code',
    import: '/suppliers/import',
    importPreview: '/suppliers/import/preview',
    importInspect: '/suppliers/import/inspect',
    importTemplate: '/suppliers/import-template',
    detail: (supplierId: string) => `/suppliers/${supplierId}`,
    update: (supplierId: string) => `/suppliers/${supplierId}`,
    deactivate: (supplierId: string) => `/suppliers/${supplierId}/deactivate`,
    reactivate: (supplierId: string) => `/suppliers/${supplierId}/reactivate`,
  },
  inboundRequests: {
    productAvailability: '/inbound-requests/product-availability',
    nextCode: '/inbound-requests/next-code',
    updateCode: (id: string) => `/inbound-requests/${id}/code`,
    list: '/inbound-requests',
    create: '/inbound-requests',
    detail: (inboundRequestId: string) => `/inbound-requests/${inboundRequestId}`,
    duplicate: (inboundRequestId: string) => `/inbound-requests/${inboundRequestId}/duplicate`,
    update: (inboundRequestId: string) => `/inbound-requests/${inboundRequestId}`,
    delete: (inboundRequestId: string) => `/inbound-requests/${inboundRequestId}`,
    deleteMany: '/inbound-requests/batch',
    withdraw: (id: string) => `/inbound-requests/${id}/withdraw`,
    submit: (inboundRequestId: string) => `/inbound-requests/${inboundRequestId}/submit`,
    submitMany: '/inbound-requests/batch/submit',
    approve: (inboundRequestId: string) => `/inbound-requests/${inboundRequestId}/approve`,
    approveMany: '/inbound-requests/batch/approve',
    approveAndSend: (inboundRequestId: string) =>
      `/inbound-requests/${inboundRequestId}/approve-and-send`,
    sendToSupplier: (inboundRequestId: string) =>
      `/inbound-requests/${inboundRequestId}/send-to-supplier`,
    acceptSupplierProposedDate: (inboundRequestId: string) =>
      `/inbound-requests/${inboundRequestId}/accept-supplier-proposed-date`,
    reject: (inboundRequestId: string) => `/inbound-requests/${inboundRequestId}/reject`,
    cancel: (inboundRequestId: string) => `/inbound-requests/${inboundRequestId}/cancel`,
    closeRemaining: (inboundRequestId: string) =>
      `/inbound-requests/${inboundRequestId}/close-remaining`,
    allowedActions: (inboundRequestId: string) =>
      `/inbound-requests/${inboundRequestId}/allowed-actions`,
  },
  supplierResponses: {
    preview: (token: string) => `/public/supplier-responses/${encodeURIComponent(token)}`,
    respond: (token: string) => `/public/supplier-responses/${encodeURIComponent(token)}/respond`,
  },
  goodsReceipts: {
    createWithVersion: '/goods-receipts/with-version',
    receivingLocations: '/goods-receipts/receiving-locations',
    reconcileArrivalStock: (receiptId: string) =>
      `/goods-receipts/${receiptId}/reconcile-arrival-stock`,
    nextCode: '/goods-receipts/next-code',
    list: '/goods-receipts',
    create: '/goods-receipts',
    detail: (receiptId: string) => `/goods-receipts/${receiptId}`,
    update: (receiptId: string) => `/goods-receipts/${receiptId}`,
    receivingTasks: '/goods-receipts/receiving-tasks',
    putawayTasks: '/goods-receipts/putaway-tasks',
    assignableStaff: '/goods-receipts/assignable-staff',
    assignReceivingTask: (inboundRequestId: string) =>
      `/goods-receipts/receiving-tasks/${inboundRequestId}/assignment`,
    unassignReceivingTask: (inboundRequestId: string) =>
      `/goods-receipts/receiving-tasks/${inboundRequestId}/assignment/cancel`,
    assignPutawayTask: (receiptId: string) => `/goods-receipts/${receiptId}/putaway-assignment`,
    submit: (receiptId: string) => `/goods-receipts/${receiptId}/submit`,
    approve: (receiptId: string) => `/goods-receipts/${receiptId}/approve`,
    reject: (receiptId: string) => `/goods-receipts/${receiptId}/reject`,
    allowedActions: (receiptId: string) => `/goods-receipts/${receiptId}/allowed-actions`,
    putaway: (receiptId: string) => `/goods-receipts/${receiptId}/putaway`,
    putawayPlan: (receiptId: string) => `/goods-receipts/${receiptId}/putaway-plan`,
    putawaySuggestions: (receiptId: string) => `/goods-receipts/${receiptId}/putaway-suggestions`,
    putawayPlanSuggestions: (receiptId: string) =>
      `/goods-receipts/${receiptId}/putaway-plan/suggestions`,
    putawayEvidence: '/goods-receipts/putaway-evidence',
    putawayHeldSlots: (receiptId: string) => `/goods-receipts/${receiptId}/putaway-held-slots`,
    putawayDeviationReport: '/goods-receipts/putaway-deviations/report',
    cancelPutawayTask: (receiptId: string) => `/goods-receipts/${receiptId}/putaway-task/cancel`,
    reconcilePutawayCancellation: (receiptId: string) =>
      `/goods-receipts/${receiptId}/putaway-task/reconcile-cancellation`,
  },
  inboundDocumentImports: {
    create: '/inbound-document-imports',
    detail: (importId: string) => `/inbound-document-imports/${importId}`,
    review: (importId: string) => `/inbound-document-imports/${importId}/review`,
    createDraft: (importId: string) => `/inbound-document-imports/${importId}/draft-receipt`,
    document: (importId: string) => `/inbound-document-imports/${importId}/document`,
  },
  invitations: {
    send: '/invitations',
    preview: (token: string) => `/invitations/${token}/preview`,
    acceptNew: (token: string) => `/invitations/${token}/accept-new`,
    list: '/invitations',
    resend: (id: string) => `/invitations/${id}/resend`,
    revoke: (id: string) => `/invitations/${id}`,
  },
  personnelImports: {
    template: '/staff/import-template',
    preview: '/staff/imports/preview',
    detail: (importId: string) => `/staff/imports/${importId}`,
    commit: (importId: string) => `/staff/imports/${importId}/commit`,
  },
  subscription: {
    me: '/subscriptions/me',
    entitlement: '/subscriptions/entitlement',
    plans: '/subscription-plans',
    planById: (id: string) => `/subscription-plans/${id}`,
    initialSelection: '/subscriptions/initial-selection',
    previewPlanChange: '/subscriptions/change-plan/preview',
    changePlan: '/subscriptions/change-plan',
    renew: '/subscriptions/renew',
    paymentStatus: (orderCode: string) => `/subscriptions/payments/${orderCode}/sync`,
  },
  public: {
    subscriptionPlans: '/public/subscription-plans',
    subscriptionFeatures: '/public/subscription-features',
  },
  units: {
    list: '/units',
    create: '/units',
    update: (unitId: string) => `/units/${unitId}`,
    deactivate: (unitId: string) => `/units/${unitId}/deactivate`,
    reactivate: (unitId: string) => `/units/${unitId}/reactivate`,
  },
  categories: {
    list: '/categories',
    create: '/categories',
    update: (categoryId: string) => `/categories/${categoryId}`,
    deactivate: (categoryId: string) => `/categories/${categoryId}/deactivate`,
    reactivate: (categoryId: string) => `/categories/${categoryId}/reactivate`,
  },
  products: {
    list: '/products',
    create: '/products',
    detail: (id: string) => `/products/${id}`,
    update: (id: string) => `/products/${id}`,
    image: (id: string) => `/products/${id}/image`,
    deactivate: (id: string) => `/products/${id}/deactivate`,
    reactivate: (id: string) => `/products/${id}/reactivate`,
    stockPolicy: (id: string) => `/products/${id}/stock-policy`,
    stockPolicies: (id: string) => `/products/${id}/stock-policies`,
    deactivateStockPolicy: (productId: string, policyId: string) =>
      `/products/${productId}/stock-policies/${policyId}/deactivate`,
    reactivateStockPolicy: (productId: string, policyId: string) =>
      `/products/${productId}/stock-policies/${policyId}/reactivate`,
    unitConversions: (id: string) => `/products/${id}/unit-conversions`,
    unitConversion: (productId: string, conversionId: string) =>
      `/products/${productId}/unit-conversions/${conversionId}`,
    deactivateUnitConversion: (productId: string, conversionId: string) =>
      `/products/${productId}/unit-conversions/${conversionId}/deactivate`,
    reactivateUnitConversion: (productId: string, conversionId: string) =>
      `/products/${productId}/unit-conversions/${conversionId}/reactivate`,
    lots: (id: string) => `/products/${id}/lots`,
    lotStatus: (productId: string, lotId: string) => `/products/${productId}/lots/${lotId}/status`,
    lotImpact: (productId: string, lotId: string) => `/products/${productId}/lots/${lotId}/impact`,
    blockLot: (productId: string, lotId: string) => `/products/${productId}/lots/${lotId}/block`,
    unlockLot: (productId: string, lotId: string) => `/products/${productId}/lots/${lotId}/unlock`,
    barcode: (id: string) => `/products/${id}/barcode`,
    suppliers: (id: string) => `/products/${id}/suppliers`,
    supplier: (productId: string, linkId: string) => `/products/${productId}/suppliers/${linkId}`,
    import: '/products/import',
    importTemplate: '/products/import/template',
    importInspect: '/products/import/inspect',
    importPreview: '/products/import/preview',
  },
  payments: {
    history: '/payments',
    invoice: (paymentId: string) => `/payments/${paymentId}/invoice`,
    invoiceData: (paymentId: string) => `/payments/${paymentId}/invoice-data`,
  },
  transfers: {
    deleteDraft: (id: string) => `/transfers/drafts/${id}`,
    assignmentSnapshot: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/assignment-snapshot`,
    destinationAssignment: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/destination-assignment`,
    decision: (id: string) => `/transfers/${id}/decision`,
    withdraw: (id: string) => `/transfers/${id}/withdraw`,
    destinationLoad: '/transfers/destination-load',
    assignableStaff: '/transfers/assignable-staff',
    receiptSheet: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/receipt-sheet`,
    putAwaySheet: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/putaway-sheet`,
    startReceiving: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/start-receiving`,
    submitReceipt: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/submit-receipt`,
    resumePutAway: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/resume-putaway`,
    putAwayShipment: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/putaway`,
    list: '/transfers',
    create: '/transfers',
    sourceWarehouses: '/transfers/source-warehouses',
    sourceProducts: '/transfers/source-products',
    receivableSlot: '/transfers/receivable-slot',
    receivableSlots: '/transfers/receivable-slots',
    destinationSuggestions: '/transfers/destination-suggestions',
    putAwaySlots: '/transfers/putaway-slots',
    sourceLocations: '/transfers/source-locations',
    nextCode: '/transfers/next-code',
    requesterOptions: '/transfers/requester-options',
    availability: '/transfers/availability',
    drafts: '/transfers/drafts',
    draft: (transferId: string) => `/transfers/drafts/${transferId}`,
    submitDraft: (transferId: string) => `/transfers/drafts/${transferId}/submit`,
    detail: (transferId: string) => `/transfers/${transferId}`,
    update: (transferId: string) => `/transfers/${transferId}`,
    allocationOptions: (transferId: string, itemId: string) =>
      `/transfers/${transferId}/items/${itemId}/allocation-options`,
    adjustAllocation: (transferId: string) => `/transfers/${transferId}/allocation`,
    cancel: (transferId: string) => `/transfers/${transferId}/cancel`,
    stopRemaining: (transferId: string) => `/transfers/${transferId}/stop-remaining`,
    feedback: (transferId: string) => `/transfers/${transferId}/feedback`,
    replyFeedback: (transferId: string, feedbackId: string) =>
      `/transfers/${transferId}/feedback/${feedbackId}/reply`,
    shipments: (transferId: string) => `/transfers/${transferId}/shipments`,
    cancelShipment: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/cancel`,
    pickSheet: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/pick-sheet`,
    pickAlternatives: (transferId: string, shipmentId: string, lineId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/lines/${lineId}/alternatives`,
    picks: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/picks`,
    switchPick: (transferId: string, shipmentId: string, lineId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/lines/${lineId}/switch`,
    escalatePick: (transferId: string, shipmentId: string, lineId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/lines/${lineId}/escalate`,
    resolveEscalation: (
      transferId: string,
      shipmentId: string,
      lineId: string,
      exceptionId: string
    ) =>
      `/transfers/${transferId}/shipments/${shipmentId}/lines/${lineId}/escalations/${exceptionId}/resolve`,
    returnPick: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/returns`,
    completePicking: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/complete-picking`,
    setPutAwayPlan: (transferId: string) => `/transfers/${transferId}/putaway-plan`,
    putAwayPlanSuggestions: (transferId: string) =>
      `/transfers/${transferId}/putaway-plan-suggestions`,
    reopenPicking: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/reopen-picking`,
    dispatchShipment: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/dispatch`,
    receiveSheet: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/receive-sheet`,
    receipt: (transferId: string, shipmentId: string) =>
      `/transfers/${transferId}/shipments/${shipmentId}/receipt`,
    resolveDiscrepancy: (transferId: string, discrepancyId: string) =>
      `/transfers/${transferId}/discrepancies/${discrepancyId}/resolve`,
  },
  stockIssueRequests: {
    allowedActions: (id: string) => `/stock-issue-requests/${id}/allowed-actions`,
    withdraw: (id: string) => `/stock-issue-requests/${id}/withdraw`,
    nextCode: '/stock-issue-requests/next-code',
    importPreview: '/stock-issue-requests/import/preview',
    importInspect: '/stock-issue-requests/import/inspect',
    import: '/stock-issue-requests/import',
    productOptions: '/stock-issue-requests/product-options',
    importTemplate: '/stock-issue-requests/import-template',
    list: '/stock-issue-requests',
    create: '/stock-issue-requests',
    detail: (stockIssueRequestId: string) => `/stock-issue-requests/${stockIssueRequestId}`,
    releaseForPicking: (stockIssueRequestId: string) =>
      `/stock-issue-requests/${stockIssueRequestId}/release-for-picking`,
    cancel: (stockIssueRequestId: string) => `/stock-issue-requests/${stockIssueRequestId}/cancel`,
    attachments: (stockIssueRequestId: string) =>
      `/stock-issue-requests/${stockIssueRequestId}/attachments`,
    attachment: (stockIssueRequestId: string, attachmentId: string) =>
      `/stock-issue-requests/${stockIssueRequestId}/attachments/${attachmentId}`,
    assignPicker: (stockIssueRequestId: string) =>
      `/stock-issue-requests/${stockIssueRequestId}/assign-picker`,
    auditLogs: (stockIssueRequestId: string) =>
      `/stock-issue-requests/${stockIssueRequestId}/audit-logs`,
    picks: (stockIssueRequestId: string) => `/stock-issue-requests/${stockIssueRequestId}/picks`,
    dispatch: (stockIssueRequestId: string) =>
      `/stock-issue-requests/${stockIssueRequestId}/dispatch`,
    authorizeDispatch: (stockIssueRequestId: string) =>
      `/stock-issue-requests/${stockIssueRequestId}/authorize-dispatch`,
    reportPickIssue: (stockIssueRequestId: string) =>
      `/stock-issue-requests/${stockIssueRequestId}/report-pick-issue`,
    removePickDetail: (stockIssueRequestId: string, pickDetailId: string) =>
      `/stock-issue-requests/${stockIssueRequestId}/pick-details/${pickDetailId}`,
    goodsReturnRequests: (stockIssueRequestId: string) =>
      `/stock-issue-requests/${stockIssueRequestId}/goods-return-requests`,
    goodsReturnSuggestions: (stockIssueRequestId: string) =>
      `/stock-issue-requests/${stockIssueRequestId}/goods-return-requests/suggestions`,
  },
  goodsReturnRequests: {
    list: '/goods-return-requests',
    detail: (goodsReturnRequestId: string) => `/goods-return-requests/${goodsReturnRequestId}`,
    approve: (goodsReturnRequestId: string) =>
      `/goods-return-requests/${goodsReturnRequestId}/approve`,
    reject: (goodsReturnRequestId: string) =>
      `/goods-return-requests/${goodsReturnRequestId}/reject`,
    restock: (goodsReturnRequestId: string) =>
      `/goods-return-requests/${goodsReturnRequestId}/restock`,
  },
  returnDocumentAction: (
    kind: 'goodsReturnRequests' | 'supplierReturns',
    id: string,
    action: 'Withdraw' | 'Submit' | 'DeleteDraft' | 'Cancel'
  ) =>
    `/${kind === 'goodsReturnRequests' ? 'goods-return-requests' : 'supplier-returns'}/${id}/${action === 'DeleteDraft' ? 'draft' : action.toLowerCase()}`,
  supplierReturns: {
    list: '/supplier-returns',
    detail: (supplierReturnId: string) => `/supplier-returns/${supplierReturnId}`,
    approve: (supplierReturnId: string) => `/supplier-returns/${supplierReturnId}/approve`,
    reject: (supplierReturnId: string) => `/supplier-returns/${supplierReturnId}/reject`,
    cancel: (supplierReturnId: string) => `/supplier-returns/${supplierReturnId}/cancel`,
    deliver: (supplierReturnId: string) => `/supplier-returns/${supplierReturnId}/deliver`,
  },
  stockRecipients: {
    list: '/stock-recipients',
    create: '/stock-recipients',
    nextCode: '/stock-recipients/next-code',
    import: '/stock-recipients/import',
    importPreview: '/stock-recipients/import/preview',
    importInspect: '/stock-recipients/import/inspect',
    importTemplate: '/stock-recipients/import-template',
    detail: (stockRecipientId: string) => `/stock-recipients/${stockRecipientId}`,
    update: (stockRecipientId: string) => `/stock-recipients/${stockRecipientId}`,
    deactivate: (stockRecipientId: string) => `/stock-recipients/${stockRecipientId}/deactivate`,
    reactivate: (stockRecipientId: string) => `/stock-recipients/${stockRecipientId}/reactivate`,
    issueHistory: (stockRecipientId: string) =>
      `/stock-recipients/${stockRecipientId}/issue-history`,
  },
  aiAssistant: {
    chat: '/ai/chat',
    conversations: '/ai/conversations',
    messages: (conversationId: string) => `/ai/conversations/${conversationId}/messages`,
    confirmAction: (draftId: string) => `/ai/actions/${draftId}/confirm`,
    cancelAction: (draftId: string) => `/ai/actions/${draftId}/cancel`,
    updateActionQuantities: (draftId: string) => `/ai/actions/${draftId}/quantities`,
  },
} as const
