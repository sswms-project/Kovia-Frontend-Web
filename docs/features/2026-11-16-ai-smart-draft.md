# Kovia AI — Smart Draft Creation and Universal Inline Editing

Status: design from the 2026-11-16 read-only audit; implementation by wave. Builds on `2026-11-15-ai-inline-editable-draft.md` (stock issue editor, revision guard). No second drafting system: everything reuses the existing propose tools, `AiActionDraft`, `UpdateAiActionDraft` and the editable card.

## Root cause: why a complete prompt opens a form (verified by static read)

1. `AI/app/assistant/orchestrator.py` calls `form_flows.match_flow_start` **before** summary folding and intent classification. When the "tạo phiếu xuất" regex matches and the user has `stock-issue-requests:create`, it returns a template reply with a `collect_input` card (0 LLM calls, 0 BE calls). The model never sees the sentence, so no `propose_*` tool is called.
2. `match_flow_start` extracts only two free-text hints, and only from literal phrases ("từ kho X", "cho khách/khách hàng/người nhận"). `từ DN-01`, `cho KH000001`, SKU, quantity, unit and purpose are never parsed.
3. The contract cannot carry more: `CollectInputPrefill` has only warehouse and recipient, the BE rebuilds the card with `lines=[]`, and the FE schema forces `values.lines` to empty. The FE also ignores the parsed `missing` list: step 1 always shows both pickers.
4. Not the cause for the audited prompts: intent misclassification (the flow gate runs first) and fast-answer capture. Fast answers can still swallow explicit "tạo phiếu nhập bổ sung…" sentences (latent).
5. Edits ("Đổi số lượng thành 80") have no deterministic cue, fall to the light router (fallback DATA_QUERY = read-only), and the model has no draft id, revision or patch tool.

## Decision engine (split by competence)

- LLM: extracts slots from natural language (the propose schemas already fit). BE: resolves codes/names inside tenant + warehouse scope, validates, re-checks permission, rebuilds every card. The model is never the source of truth for a payload.
- Gate: `match_flow_start` only for a BARE intent ("tạo phiếu xuất" with no payload). A cheap deterministic `has_payload()` (SKU token, quantity+unit, code-like warehouse such as DN-01, recipient code such as KH\d+, conditional clause) makes the gate return None so the sentence goes to classification (the cue "tạo phiếu" already gives ACTION with no router LLM call) and the ACTION tool loop.
- Prompts: pass codes and names exactly as written, do not pre-search warehouse/recipient/supplier, "phiếu nhập" = inbound request (yêu cầu nhập kho), ask only for missing fields.
- Paths: FAST*DRAFT (all slots resolved -> `propose*\*`-> Pending draft -> editable card), GUIDED_DRAFT (missing required -> collect_input with every resolved value incl. lines, only missing fields flagged), DISAMBIGUATION (coded`AMBIGUOUS_ENTITY` with candidates -> pick list from real data), UNAUTHORIZED, UNSUPPORTED (compound/conditional requests get a clear message), INVALID_INPUT (field errors).
- Candidates and missing fields come from coded errors on propose (`AiDraftErrorFilter` body `{code, field, candidates[]}`), not a new resolve endpoint (cheaper; one error per round trip). A read-only resolve endpoint is deferred until GUIDED/DISAMBIGUATION proves it is needed.

## Structured patch contract (independent of the LLM's wording)

`POST api/ai/actions/{id}/patch` (user) and `POST api/internal/ai/actions/{id}/patch` (AI runtime, runs as the user via the delegation token; the AI variant also accepts code/name text that the BE resolves). One MediatR handler shared with `UpdateAiActionDraft` (the PUT becomes a thin wrapper), so the stock-issue editor keeps working.

```jsonc
{
  "expectedRevision": "base64 rowversion (required)",
  "documentType": "stock_issue|inbound|transfer|supplier_return|stock_adjustment|discrepancy",
  "operations": [
    { "op": "set_field", "field": "purpose|issueDate|expectedDate|reason|...", "value": "..." },
    {
      "op": "replace_entity",
      "field": "warehouse|recipient|supplier|sourceWarehouse|destinationWarehouse|slot|lot",
      "id": "GUID",
    },
    {
      "op": "add_line",
      "line": { "sku|productId": "", "quantity": 0, "unit|unitId": "", "lot": "?" },
    },
    { "op": "update_line", "lineKey": "sku|productId", "set": { "quantity": 0, "unit": "" } },
    { "op": "remove_line", "lineKey": "sku|productId" },
  ],
}
```

Rules: atomic (any failing op rejects the whole patch, previous revision untouched); operations and fields come from a static per-type allowlist (`PATCH_OP_NOT_ALLOWED` otherwise); lines are addressed by canonical product id/SKU, never by index; the model never supplies endpoints, arbitrary paths or SQL; guard chain, revision check, sliding expiry, audit (`EditByAi` vs `EditByUser`) and warnings reuse the stock-issue editor. Errors: 409 `DRAFT_REVISION_MISMATCH|DRAFT_NOT_PENDING|DRAFT_EXPIRED`, 400 `DRAFT_TYPE_NOT_EDITABLE|DRAFT_TYPE_MISMATCH|PATCH_OP_NOT_ALLOWED`, 422 `PATCH_LINE_NOT_FOUND|PATCH_AMBIGUOUS_LINE` (candidates = current lines, so the AI asks "dòng nào?" and never edits the first line). The AI learns the pending draft through a BE-built "pending drafts" context block (data, quoted, never instructions) and calls an `edit_draft` tool; the user, not the model, confirms.

## Type registry (what is supportable)

| Type                                              | Required                                | Editable now / next                                       | Notes                                                               |
| ------------------------------------------------- | --------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| Stock issue                                       | warehouse, recipient, lines (1-50)      | now: warehouse, recipient, lines, purpose; add issue date | form requires purpose, propose does not                             |
| Inbound request (phiếu nhập; no separate PO type) | warehouse, supplier, lines              | Wave 2b: warehouse, supplier, lines, expected date        | supplier has no code column (name/GUID only)                        |
| Replenishment                                     | warehouse (BE computes lines)           | Wave 3 via inbound adapter                                | LLM never computes quantities                                       |
| Transfer                                          | source, destination, lines (1-20)       | Wave 3                                                    | payload holds allocated slots/lots; edits must re-run the allocator |
| Supplier return                                   | warehouse, supplier, lines, reason      | Wave 3                                                    | allocation rows read-only; re-allocation on edit                    |
| Stock adjustment                                  | cycle-count line id, reason             | reason only                                               | never from free text                                                |
| Discrepancy report                                | warehouse, sku, difference, description | form hand-off                                             | evidence needs the report form                                      |

`AiDraftEditability` becomes per-type; a type is flagged editable only when its adapter ships (the card's `editable` flag and Confirm's `expectedRevision` both key off it).

## FE changes

- Single-version cards: for each draftId only the LAST card in the thread is live; earlier cards render a collapsed "Đã cập nhật ở bên dưới" stub with no actions; a patch by chat patches the same cache entries (cancelQueries first) so a draft never shows two versions.
- `collect_input` honours `missing`/`requiredFieldKeys`: opens at the first step with a missing field, satisfied fields shown as chips; `values.lines` becomes real data; the flow type is a registry, not a literal.
- If the editor is open and the cached revision changes (AI patch), the editor closes or goes to CONFLICT.
- Disambiguation reuses `AiEntitySelect`; supplier picker for GUIDED inbound reuses the same component.

## Waves and ownership

1. Fast draft engine. AI (Kovia-AI): gate + `has_payload`, prompts, `CollectInputPrefill` gains lines/purpose, pass structured error bodies through, fast-answer create-verb guard. BE (Kovia-FE): coded `AMBIGUOUS_ENTITY`/`MISSING_FIELD` errors on propose, `AiFormCardBuilder` prefill with lines/purpose, `missing` honoured. FE (Kovia-FE): collect_input with only missing fields and lines, single-version cards.
2. Universal inline editing. 2a stock issue patch endpoint (+ AI `edit_draft` tool + pending-drafts block), 2b inbound adapter.
3. Multi-document adapters (transfer, supplier return, replenishment, adjustment).
4. Polish and security (prompt-injection hardening of draft text, per-turn edit cap, rate limit on patch, Manage re-check after replace_entity, evals, accessibility).

## Decisions taken (defaults, change if wrong)

New resolve endpoint: deferred. First edit scope: stock issue then inbound. "Phiếu nhập" always means inbound request. Compound/conditional requests: UNSUPPORTED message. Supplier-by-code: deferred. Transfer propose Manage check: Wave 3. Bare "tạo phiếu nhập bổ sung hàng cho kho X" keeps drafting replenishment through the fast layer (explicit create verb), but a read question never drafts. Supersession policy unchanged. No test may call Confirm against the shared database.

## Implementation status (2026-11-16)

| Wave | Scope                                                                                                                                                    | State                                                                                                                                                                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Fast draft engine: `has_payload` gate, prompts, coded propose errors, prefill lines/purpose, single-version cards, `collect_input` only-missing          | Done, verified in browser                                                                                                                                                                                                                                 |
| 2a   | Structured patch for stock issue (user + internal), `pending_drafts`, AI `edit_draft`                                                                    | Done, verified in browser (quantity, add/remove line, purpose, errors)                                                                                                                                                                                    |
| 2b   | Inbound request editor, patch, `expected_date`/supplier; conversation-scoped AI patch; mixed-unit summary; unit-change warning                           | Done, verified in browser (chat + inline editor)                                                                                                                                                                                                          |
| 3    | Transfer and supplier return (allocation re-run on every edit; lines stored in base unit; allocation failures come back as the propose messages, atomic) | Done. Transfer verified in browser (chat quantity edit, editor save, capacity failure relayed); supplier return covered by unit tests and eval only (needs a returnable lot to demo). Stock adjustment and discrepancy report stay non-editable by design |
| 4    | Security hardening, evals, runbook, perf                                                                                                                 | Partly done (see below)                                                                                                                                                                                                                                   |

### Contract as shipped

- `POST api/ai/actions/{id}/patch` and `POST api/internal/ai/actions/{id}/patch`: body `{expectedRevision, operations[]}` (max 20 ops, flat op shape, unknown fields rejected). Same 200 envelope as `PUT`: `{draft, warnings}`; the AI runtime unwraps `draft`.
- Per-type seam: `IAiDraftEditor` (read + rewrite) and `IAiDraftPatchAdapter` (ops to full desired state), both registered with `[RegisterService]`; `AiDraftEditability.EditableTypes` is the allowlist. A type without an editor returns `DRAFT_TYPE_NOT_EDITABLE`.
- Internal patch: delegation token must carry the conversation claim and the draft must belong to that conversation (else 403/404). Permission is the draft type's create permission, re-checked from the draft.
- Warnings: `INSUFFICIENT_STOCK`, `EXPECTED_DATE_RESET`, `SUPPLIER_UNAVAILABLE`, `UNIT_CHANGED_QUANTITY_KEPT`.
- AI: `edit_draft` is the last tool; revision is filled from `pending_drafts` (the model never supplies it); at most 2 edits per turn; unknown draft id, wrong type for the caller, or a field the draft type does not take never reaches the BE.

### Tested error cases (live, shared DB, no Confirm)

Stale/malformed revision 409; unknown draft 404; line not found 422 with current lines; zero/negative/fractional/huge quantity 400; `set_field warehouse` and unknown op `PATCH_OP_NOT_ALLOWED`; extra op field, 21 ops, empty ops 400; duplicate SKU, unknown SKU, remove last line 400; unknown recipient/warehouse/unit 400; no token 401; atomic patch (valid op + invalid op) leaves revision and quantity unchanged; expired draft `DRAFT_EXPIRED`; executed/cancelled `DRAFT_NOT_PENDING`. Chat: unknown line, unknown SKU, ambiguous edit with two lines (asks which), instruction-like purpose text (refused), edit with no pending draft (asks), editor open while chat edits (editor closes, one live card).

### Performance (single user, local BE, remote shared DB)

| Path                                     | Before                                  | After                                                                                            |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Complete one-sentence stock issue prompt | 2-step wizard, 0 LLM calls, ~6 clicks   | direct editable card, 1 tool round + 1 summary call, 9-27 s wall clock (model latency dominated) |
| Edit by chat                             | not possible (re-propose and supersede) | 12-15 s (tool round + summary), 3-5 s p50 in the offline eval                                    |
| Edit by form                             | n/a                                     | one `PUT`, ~0.3 s server time                                                                    |
| Bare "tao phieu xuat"                    | form, 0 LLM calls                       | unchanged                                                                                        |

### Demo runbook (shared DB, never press Xac nhan)

1. Open the assistant, new conversation. Send: "Tao phieu xuat 50 cai SKU000002 tu DN-01 cho KH000001, muc dich ban hang." Expect an editable card, no wizard.
2. "Doi so luong thanh 80", "Them 5 thung SKU000005", "Bo dong SKU000002", "Muc dich la xuat mau": expect one live card, older cards collapse to a one-line stub.
3. With two lines: "Doi so luong thanh 10": expect the assistant to ask which line.
4. Missing data: "Tao phieu xuat 10 cai SKU000002 tu DN-01." Expect a short question for the recipient only.
5. Bare "Tao phieu xuat tu kho Da Nang, muc dich ban hang": expect the form with the warehouse as a chip and only the recipient to pick.
6. Inbound: "Tao phieu nhap 20 thung SKU000005 tu nha cung cap <active supplier> vao kho Da Nang", then change quantity, expected date, supplier by chat, then open Chinh sua and save.
7. Do not press Xac nhan on shared data; drafts expire after 15 minutes of inactivity (max 60).

### Known limits

Transfer card shows the system default slot as 'vị trí mặc định' (was the raw `__SYSTEM_DEFAULT__`; BE change needs a restart); supplier return editor not exercised live; lots chosen at propose are kept but not editable.
Phantom SignalR notification window if the outer confirm save fails after the inner create; markdown re-parse and page `inert` not done; `PendingDraft` has no expected date (the AI cannot read the current value); per-draft rate limit not implemented (IP rate limit exists on the user route); replenishment drafts lose the "can bo sung" wording after an edit; the internal patch route has no rate limit because the AI runtime IP is shared.
