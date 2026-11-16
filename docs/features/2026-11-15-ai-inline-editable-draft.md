# Kovia AI — Inline Editable Draft Card

Status: design from the 2026-11-15 audit; implementation in progress. First type: `CreateStockIssueRequest`.

## Audit result (what the backend supports today)

- A draft cannot be updated in place. Its `Summary`/`DetailsJson`/`PayloadJson`/`ExpiresAt` are written only by `AiDraftFactory` at creation.
- A SQL `rowversion` already exists on the draft row (`AiActionDraft.RowVersion`) and concurrency clashes already map to 409, but the version is never sent to clients.
- Replacement through supersession exists only for `CreateStockIssueRequest` and has three defects (save-before-claim orphan, raw concurrency exception, superseded drafts show as plain Cancelled).
- Expiry is fixed at creation and lazy (no job).
- Stock availability is **not** checked at propose or create; it is first enforced at Release. Shortage is therefore a warning here, never a block.
- Real precision/conversion rules (`StockIssueUnitRules`) run only at confirm, so a form-submitted draft can be unconfirmable.

## Decision: in-place update guarded by `revision`

`revision` = base64 of the existing `rowversion` (no migration). Every persisted revision is validated by construction (validate and persist happen in one step), so there is no separate "validated" flag. Confirm carries `expectedRevision`; any mismatch is a 409.

## Routes (all tenant + user scoped, permission re-read from the draft)

1. `GET api/ai/actions/{id}/editor` -> `AiDraftEditorResponse`
   `{ draftId, action, status, revision, expiresAt, editable, editableFields: ["warehouse","recipient","lines","purpose"], warehouse{id,code,name}, recipient{id,code,name}, purpose, lines:[{productId, sku, productName, unitId, quantity, baseUnitId, baseUnitName, units:[{unitId,name,factor,quantityPrecision}], availableBaseQuantity}], warnings:[] }`
   Guards: pending and not expired. A non-editable action type returns `editable:false` without body fields.
2. `PUT api/ai/actions/{id}` body `{ revision, warehouseId, recipientId, purpose, lines:[{productId, unitId, quantity}] }`
   -> `{ draft:{ draftId, action, status:"Pending", summary, details[], expiresAt, revision, editable }, warnings:[{code, field, message, availableBaseQuantity?, requestedBaseQuantity?}] }`
3. `POST api/ai/actions/{id}/confirm` body `{ expectedRevision }` (required for editable types).

Errors reuse the existing coded error shape (same as AI form submit): `400 { code:"VALIDATION_FAILED", fieldErrors:[{key,message}] }` with keys `warehouse`, `recipient`, `purpose`, `lines`, `lines.{i}.product|unit|quantity`; `403` permission/warehouse scope; `404` not owner/tenant; `409` with `code` = `DRAFT_REVISION_MISMATCH | DRAFT_NOT_PENDING | DRAFT_EXPIRED`; `400 DRAFT_TYPE_NOT_EDITABLE`.

Handler order: load -> permission re-check -> pending/not-expired -> revision compare (and set RowVersion original value) -> shared resolver (warehouse in accessible scope + Active + Manage, recipient Active, products Active, unit belongs to product) -> propose validator/content builder -> `StockIssueUnitRules.BuildItemsAsync` (precision/conversion) -> compute warnings -> mutate Summary/DetailsJson/PayloadJson/WarehouseId/ExpiresAt -> audit (`EditByUser`, no payload dump) -> save with conflict handling. Any hard error leaves the previous revision untouched. Fields not in the allowlist (issue date, reference code, notes, per-line notes) are kept from the stored command; a stored past issue date is reset to today (VN) with a warning.

Expiry: a successful edit sets `ExpiresAt = now + DraftLifetimeMinutes` (sliding) capped at `CreatedAt + 4 x DraftLifetimeMinutes` (`AiAssistantOptions.MaxDraftAgeMinutes`, default 4 x lifetime). Failed edits never extend.

Read path: `AiDraftStatusInfo` and the draft response carry `revision` and `editable`; the stored `action_confirmation` card is overlaid with the live summary/details/expiry on replay, so an edited card never shows stale content.

## FE state model

Server status stays Pending/Executed/Cancelled/Expired. View state is derived by one pure function (`getAiDraftViewState`): `PREVIEW`, `EDITING` (local reducer), `VALIDATING` (update mutation pending), `READY_TO_CONFIRM` (pending, editor closed, a successful edit exists for the current revision), `CONFIRMING`, `CONFIRMED`, `CANCELLED`, `EXPIRED` (server Expired or `expiresAt` passed), `CONFLICT` (409 revision mismatch). Confirm is enabled only in PREVIEW and READY_TO_CONFIRM. Editing never creates a message. The editor reuses the Wave-1 parts (entity pickers, product lookup, line list/row, line validation) but not the wizard flow, and "Mở trong form" stays as the secondary action.

## Generalization (BE-driven allowlist `AiDraftEditability`)

Editable now: `CreateStockIssueRequest`. Next: `CreateInboundRequest` (same resolver pattern). Blocked until re-allocation logic is reusable: `CreateTransfer`, `CreateSupplierReturn`. Not editable: stock adjustment (cycle-count bound), discrepancy report (needs evidence in its own form).

## Known limits

- Editing in chat after an inline edit makes the AI re-propose from its remembered values and supersede the edited draft (the AI is stateless about drafts).
- Zero-stock products cannot be newly added inline (product options list available stock only); existing zero-stock lines stay editable.
- Unsaved editor values are not kept across a page reload.
- Propose/form-submit do not yet run the precision rules, so an untouched draft can still fail at confirm while an edited one cannot.
