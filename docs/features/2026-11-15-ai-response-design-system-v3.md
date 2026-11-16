# Kovia AI — Response Design System V3

Status: contract agreed with Kovia-AI (2026-11-15); BE verifier + FE renderer in progress. AI emission is owned by Kovia-AI.

## Principles

1. **Answer first** — `outcome.headline` is the first thing shown. The prose that follows only summarizes; it never repeats facts already in `findings` or `related`.
2. **Action next** — every unresolved finding carries actions that fix that finding (never generic filler).
3. **Details on demand** — formulas, parameters, sources, assumptions and long document lists sit in collapsed sections.

## Ownership

| Layer      | Owner    | Responsibility                                                                                                                       |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| AI service | Kovia-AI | pick tools, compose `outcome`, `headline`, order and link findings by key; never invent numbers, URLs, ids                           |
| BE         | Kovia-FE | verify and rebuild the card: numbers/entities from tool data, URLs rebuilt by `AiEntityLinkPolicy`, permission re-check, size limits |
| FE         | Kovia-FE | render only; expand/collapse, navigation, interaction; no business interpretation                                                    |

Existing cards (`simulation`, `decision`, `insight_list`, `result_list`, `quick_replies`, `action_confirmation`, `collect_input`, navigation) are unchanged. `outcome_report` is additive.

## Card: `outcome_report` (BE camelCase; AI sends snake_case, BE maps)

```jsonc
{
  "type": "outcome_report",
  "responseVersion": 1,
  "outcome": {
    "status": "completed|partial|action_required|no_action_needed|failed|insufficient_data",
    "headline": "string",
    "reason": "string?",
  },
  "metrics": [
    {
      "key": "",
      "label": "",
      "value": "string|number",
      "unit": "?",
      "tone": "neutral|ok|warning|danger",
    },
  ],
  "findings": [
    {
      "key": "",
      "kind": "stock|supply|document|generic",
      "businessStatus": "NEEDS_SUPPLIER|HAS_PENDING_REQUEST|COVERED_BY_CONFIRMED_INBOUND|READY_TO_PROPOSE|NO_REPLENISHMENT_NEEDED|INSUFFICIENT_DATA|string",
      "tone": "neutral|ok|warning|danger",
      "title": "",
      "summary": "?",
      "facts": [
        { "label": "", "value": "string|number", "unit": "?", "bar": { "current": 0, "limit": 0 } },
      ],
      "entity": {
        "type": "product|warehouse|supplier|...",
        "id": "guid",
        "label": "",
        "url": "rebuilt by BE",
      },
      "relatedGroupKeys": [""],
      "actionKeys": [""],
    },
  ],
  "related": [
    {
      "key": "",
      "title": "",
      "count": 0,
      "viewAllUrl": "?",
      "items": [
        {
          "entityType": "",
          "id": "",
          "label": "",
          "status": "",
          "quantity": "?",
          "unit": "?",
          "warehouse": "?",
          "date": "?",
          "url": "?",
        },
      ],
    },
  ],
  "evidence": [
    {
      "key": "",
      "title": "",
      "formula": "?",
      "parameters": [{ "label": "", "value": "" }],
      "sources": [""],
      "assumptions": [""],
      "limits": [""],
    },
  ],
  "recommendedActions": [
    {
      "key": "",
      "label": "",
      "kind": "navigate|select_entity|draft|retry|reply",
      "url": "?",
      "entityKind": "supplier?",
      "draftAction": "existing action name?",
      "prompt": "?",
      "requiresConfirmation": false,
      "findingKey": "?",
    },
  ],
  "dataTimestamp": "ISO",
  "partialData": false,
  "workflowContext": {
    "workflowId": "",
    "type": "",
    "step": "?",
    "subjectIds": { "productIds": [""], "warehouseId": "?" },
  },
}
```

The card is nested: BE -> FE `{ "type": "outcome_report", "outcomeReport": { ...fields above... } }`, AI -> BE `{ "type": "outcome_report", "outcome_report": { ...snake_case fields... } }`. The BE normalizes metric, fact and parameter `value` to strings (numbers keep their JSON spelling).

`dataTimestamp` lives only at the top level (not repeated in `outcome`).

## BE verification rules (additive; never change existing card fields)

- Enums are allowlisted; unknown values degrade to the neutral/generic value, never pass through.
- `entity.url`, `related.items[].url`, `viewAllUrl`, `navigate.url` are **rebuilt** with `AiEntityLinkPolicy` (type -> permission -> path). Entities the caller may not open lose the url, and ids outside the caller's tenant/warehouse scope are dropped, not echoed.
- `draftAction` must be an existing AI action name. `select_entity` is reserved for Wave 4 (supplier resolution needs a BE capability): the BE drops it and the FE does not render it until then, so there are no dead buttons. No action writes data by itself: confirmation stays in the existing draft flow.
- Limits: metrics <= 6, findings <= 20, related groups <= 6, items per group <= 50, evidence <= 10, actions <= 6, strings clipped. Anything over a limit is cut, not rejected.
- `workflowContext.subjectIds` are re-validated against tenant/warehouse scope before the card is stored. Stored cards are replayed from `CardsJson`: re-verify url permission on replay.
- A card whose required parts are missing (`outcome.headline`) is dropped and the message falls back to Markdown.

## FE components (reuse shadcn primitives and existing tokens; no chart library)

`OutcomeReportCard` composes: `OutcomeSummary` (status icon/tone + headline + reason), `MetricStrip` (wraps from N columns to 1-2 at narrow widths), `FindingCard` (title, facts, optional bar always paired with numbers, actions), `RelatedDocuments` (one-line summary, collapsible rows, "Xem tất cả"), `NextActions` (primary/secondary), `EvidenceDetails` (collapsible "Xem căn cứ và cách tính", collapsed by default).

Rules: color only where the tone carries meaning; "no action needed" is not red; long codes truncate/wrap without horizontal overflow at 320px; expand/collapse is local state that must not re-render other messages; entry motion only while streaming and respects `prefers-reduced-motion`; a completed message is never re-animated.

## Out of scope here

Replenishment formula and status classification live in `AiReplenishmentCalculator` (Kovia-AI rewrote it). Supplier assignment from chat needs a BE capability that is audited separately (Wave 4).
