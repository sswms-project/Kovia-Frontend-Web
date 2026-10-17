# Opening stock — live application QA, 2026-10-16

Status: PARTIAL ACCEPTANCE; one confirmed import defect remains. This is implementer-run QA, not independent approval. No production source fix, commit or push in this iteration.

## Environment and safety

- Backend source: `feat/huytv`, `92ea05e4ccc608d967820cbc51429f576552635a` (merged dev). Frontend: `screen/huytv`, `2e1c803` plus existing uncommitted opening-stock implementation/fixes. Results do not certify a clean committed FE revision.
- Local frontend `http://localhost:3000`; API `http://localhost:7070`. Browser: Codex IAB Chromium, not Edge. Tenant Owner test account; credentials omitted.
- Printed effective ApplicationDbContext provider `Microsoft.EntityFrameworkCore.SqlServer`, server `db71143.public.databaseasp.net`, database `db71143`; connected identity `DB_NAME=db71143`, server `S16`. User approved normal application-flow QA against this target. Startup migration/seed explicitly disabled; 107 migrations applied, none pending at QA startup.
- API uses a tiny temporary QA host in the already-existing `D:/Kovia-QA/OpeningStock-20261015/Backend/tmp/OpeningStockQaHost`, with real API controllers, application/infrastructure services, JWT, authorization and subscription middleware. Hosted services (including Quartz jobs) are removed to avoid unrelated scheduled writes; PayOS webhook registration disabled. This does NOT certify normal Program startup, background jobs or production deployment. Production Program.cs unchanged.
- All feature writes were through UI/application commands. SQL audit used SELECT only. No SQL write, seed, reset/drop/truncate/delete, cleanup, migration, race or destructive rollback test. No new repository copy created; reused existing QA copy.

## Test data retained (do not delete automatically)

- Warehouse: `120da76e-81f8-4fa8-a6b9-5cb2c6685cfa`, `QA-LI-20261011070247`.
- Existing product: `PA-SUA1L`, `2a5e7534-c410-4aaa-80ee-bb0f14c8933a`; base unit Thùng.
- Chosen slot: `01a12a28-e755-7879-a87f-c4cbe9d562fc`, `CQA-Z / CQA-R / 0001`.
- One record: `OPEN-20261016130014-14E808`, ID `5fd3fc82-50f0-40bf-92b7-2cb0493c1e93`; one line `3ceb30c8-5532-48ff-9391-2ed29a742778`, source `CSV:2`.
- New lot: `QAOS-261016-1956`, ID `f4e8c045-28e3-47ba-ab7e-af8e2cf645fb`; UI NSX 2026-10-01 / HSD 2027-10-01. Initial draft quantity 2, edited to 3 Thùng, then Posted. No extra valid row imported.
- Exact final footprint from SELECT at 2026-10-16T13:06:56Z: 1 matching lot, 1 movement, inventory total 3.00, 1 posted-scope row. Retained deliberately; no cleanup authorized.

## Passed — real browser/API/storage evidence

1. Login, opening-stock list/detail and manual lookups work with applied schema. Product/base unit/slot selection stays pinned across lookup updates.
2. Unsaved current row guard blocks creating a manual draft when a second entered row has not been added; both entered and existing rows remain. Cancel leaves no new opening-stock line.
3. Full API template download succeeds. XLSX inspect/mapping detects all 11 fields and preserves source identifier `0001` (see defect below for dates).
4. Mixed CSV gives 2 valid / 4 invalid rows. Rejects negative quantity, unknown SKU, >2 meaningful fractional digits without rounding, and impossible date. Invalid checkboxes disabled.
5. Case variants of one pending lot normalize to one new-lot confirmation item. No lot/stock/movement exists after preview.
6. With both valid rows selected, missing capacity conversion at S1 blocks draft creation. Deselecting that row requires revalidation; revalidation clears the capacity error. Only row 2 remains selected.
7. Pending-lot acknowledgement genuinely gates draft creation: unchecked disables, checked enables, unchecking disables again.
8. Navigation guard offers continue-editing/discard. Continuing retains mapping; discarding returns to file selection with warehouse/date intact. No DB creation from those previews.
9. Double-click draft confirmation produces exactly one draft/line. Result explicitly says draft; 1 saved and 5 not included. Before approval SELECT confirms LotId null and matching lot/movement/inventory counts zero.
10. Result CSV report contains all 6 source rows, including unselected/errors. Downloaded attached source evidence SHA256 equals original CSV. Manual review of report/imported line preserves `CSV:2`.
11. Draft edit 2→3 Thùng retains line ID/source row. Missing lot acknowledgement blocks save; acknowledged double-click save succeeds. Still no lot, stock or movement before approval.
12. Submit transitions to PendingApproval. Self-approval checkbox is mandatory; confirmation disabled before tick. Double-click approval posts once.
13. Posted detail shows 3 Thùng, lot/dates/source and create/submit/post timeline. Reload retains Posted; edit/submit/approve controls no longer shown. Status filter Draft returns zero; Posted shows the record.
14. SELECT verifies movement `e514276c-58f4-469d-828d-97e9e3049d21`: type Opening, ReferenceType OpeningStockRecord, ReferenceId matches record, QuantityChange 3.00, BalanceAfter 3.00, correct slot, Good/Available. OccurredAt `2026-10-15T17:00:00Z` = 2026-10-16 00:00 Asia/Saigon; CreatedAt `2026-10-16T13:03:46.3427850Z`. Effective date is not replaced by approval time. Historical backdating not tested.
15. Real CSV preview at 360x800 and 768x1024 uses cards with document width equal to viewport (no document horizontal overflow). 1280x800 desktop view and mobile self-approval checked. Preview is naturally scrollable, not a certified sticky footer. Current Web Interface Guidelines consulted for labels, focus and layout checks; not a full accessibility certification.

## Confirmed defect — OS-QA-01 (Medium)

Valid XLSX ISO date cells with fractional seconds are rejected.

- Fixture: `D:/Kovia-QA/OpeningStock-20261015/fixtures/qa-opening-errors.xlsx`; valid rows 2 and 3 use true XLSX date cells (`t="d"`) containing `2026-10-01T00:00:00.000Z` / `2027-10-01T00:00:00.000Z`. Inspect exposes the same raw values.
- Expected: date-only midnight values accepted; intended result 2 valid / 4 invalid, as for equivalent CSV.
- Actual: all 6 rows invalid; otherwise-valid rows fail with “Ngày phải có định dạng dd/MM/yyyy hoặc yyyy-MM-dd.”
- Cause: `Application/Features/Inventory/OpeningStockImport/OpeningStockImportSchema.cs`, `Date`: ISO TryParseExact patterns cover seconds/no fractional component only. The supported reader preserves ISO date raw text. This is not evidence that numeric serial dates from ordinary Excel are broken.
- Evidence screenshot: `D:/Kovia-QA/OpeningStock-20261015/evidence/real-xlsx-iso-date-rejected.png`. No fix applied in this QA-only request. A regression test should preserve rejection of non-midnight times and invalid dates while accepting equivalent supported ISO midnight encodings.

## Evidence files

All under `D:/Kovia-QA/OpeningStock-20261015/evidence/`:

- `real-unsaved-row-guard.png`
- `real-xlsx-iso-date-rejected.png`
- `real-csv-validation-capacity.png`
- `real-preview-360.png`, `real-preview-768.png`
- `real-confirm-draft.png`, `real-draft-result.png`
- `real-self-approval-360.png`, `real-posted-detail.png`

Fixtures: `fixtures/qa-opening-valid.{xlsx,csv}` (2 rows), `fixtures/qa-opening-errors.{xlsx,csv}` (6 rows), generated with bundled spreadsheet artifact tool. `0001` exported as a string; do not infer identifier loss from renderer preview. Downloaded API template, report and evidence are small files in user Downloads. Evidence storage is under the existing QA root. No bulk DB data seeded.

## Still unverified / release gates

- OS-QA-01 unresolved; ordinary numeric-date XLSX acceptance still needs real-browser coverage.
- Empty/oversize/201+ row boundaries, CSV delimiters/encodings, 1904 dates, expired lot policy, rack-level writes, damaged/held/quarantine states and historical backdate conflicts not exercised live this run.
- Return/reject/withdraw/cancel lifecycle, separate approver, insufficient permissions/other-tenant scope, permission revocation, parallel posting/lot creation, stale version, storage failure and uncertain network outcomes not exercised live. Do not infer them from happy-path results.
- No full inventory-history UI drill-down; ledger/result above verified via scoped read-only SQL and posted-detail UI.
- Edge, 200% zoom, complete keyboard session, real screen reader and reduced-motion not certified. No slow-network fault injection.
- SQL Server race/rollback belongs on a separate isolated database; user deferred local setup. Never use shared db71143 for destructive race/rollback fixtures.
- No new full-suite/build run this QA iteration (no production code changed). Prior isolated code-check results remain historical evidence, not new live QA results. Existing package advisories/full-suite failures remain in earlier reports.

Gate A/C remain open; do not promote to main based on this partial QA report.

## Follow-up fix — OS-QA-01, 2026-10-16

User authorized fixing the confirmed finding. BE parser now accepts exact ISO midnight dates with optional fractional seconds (including .000Z) and still rejects any nonzero time/fraction, invalid date and unsupported offset. No FE, reader, dependency or schema change. Historical live reproduction above is preserved, not replaced with a passing claim.

Regression evidence: 3 formerly failing acceptance cases reproduced before fix; 61/61 OpeningStockImportTests pass after fix, expanded OpeningStock/SpreadsheetImport filter 65/65. Added XLSX t=d .000Z and numeric-serial reader→preview cases assert correct NSX/HSD, no lot/document created. Tests use isolated InMemory fixtures, not db71143. Release solution build succeeds with 0 errors / 6 existing Pkcs advisory warnings. TRX: D:/Kovia-QA/OpeningStock-20261015/results/opening-stock-iso-date-fix.trx.

Owned QA API on 7070 restarted with fixed code and startup migration/seed/background jobs disabled; effective target and no-pending state verified read-only. No new live UI preview/posting, DB write, cleanup, commit or push. OS-QA-01 is fixed in code and automated regression; live UI recheck remains pending. Other unverified scenarios and Gate A/C remain open.
