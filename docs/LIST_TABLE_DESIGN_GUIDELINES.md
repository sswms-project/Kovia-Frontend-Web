# List and Table Screen Design Guidelines

This document is the required layout contract for every list or table screen in Kovia.

## Goals

- Use the full width and the full remaining height of the application content area.
- Keep the page heading and list toolbar visible above the data region.
- Keep pagination anchored to the bottom of the list container.
- Scroll only the table/list body when rows exceed the available height.
- Keep the layout stable across common viewport sizes and browser zoom levels.
- Preserve a full-height data surface even when there are only a few rows.

## Required structure

```tsx
<div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4">
  <header className="shrink-0">...</header>

  <OperationalListPanel aria-label="Danh sách ...">
    <div className="shrink-0 border-b">...</div> {/* title and filters */}
    <Table>...</Table>                            {/* flexible scrolling body */}
    <OperationalPagination ... />                 {/* pinned footer */}
  </OperationalListPanel>
</div>
```

Use `OperationalListPanel` from `src/components/operations/OperationalListPanel.tsx`. Do not copy its height or overflow classes into feature screens.

## Width and workspace rules

1. The private application shell keeps the sidebar at its configured width and gives the main area `flex-1 min-w-0`.
2. Every wrapper from the main area to the page root uses `w-full min-w-0`.
3. Operational list/table pages must not use `container`, `mx-auto`, `max-w-*`, fixed pixel widths, or `justify-center` on their workspace wrappers.
4. Responsive horizontal padding belongs to the shared private content shell; feature pages must not add a second centered container.
5. Width limits remain valid for focused forms, dialogs, print views, authentication, public landing pages, and readable detail content when they are not the primary operational list workspace.
6. Expanding the workspace must not scale typography, buttons, inputs, or other controls.

## Height and scrolling rules

1. Every ancestor between the application content shell and the list panel must allow flex children to shrink with `min-h-0`.
2. The page root uses `h-full min-h-0 flex-1 flex-col`.
3. The list panel uses `flex-1 min-h-0 overflow-hidden` so it always occupies the remaining height.
4. The direct table container or an element marked `data-slot="operational-list-body"` owns vertical scrolling.
5. Do not use hard-coded `calc(100vh - ...)` values. They break under browser zoom, different headers, and responsive wrapping.
6. Do not let `body` or the whole page become the table scroll container.
7. Pagination must be a direct, non-scrolling child of the list panel.
8. Below the `md` breakpoint `OperationalListPanel` grows to its content height (`max-md:min-h-fit`) and the workspace scrolls naturally, so the list is never squeezed under stacked toolbars on phones. Do not override this in feature code.

## Header, toolbar, and filters

- Keep the list title, search, and common filters in the non-scrolling top region. Display the result total in the shared pagination footer only; do not repeat a count below the list title. Business-status statistics and selection counts remain separate.
- When there are only one or two simple filters, show their `Select`/`NativeSelect` controls directly in the toolbar.
- Use a filter sheet only when the filter set is too large for the toolbar or contains advanced dependent fields.
- Changing search, filters, or page size resets the current page to `1`.
- Toolbar controls must wrap on narrow screens without causing horizontal page overflow.
- A search field that grows with `flex-1` inside a wrapping toolbar must also take a full row on phones (`basis-full sm:basis-auto`); `min-w-0 flex-1` alone lets it collapse to a few pixels instead of wrapping.

## Table behavior

- The shared `Table` uses a native 6px gray rounded scrollbar in Chromium/WebKit and a thin native scrollbar fallback elsewhere. Do not add synchronized duplicate scrollbars.
- `OperationalListPanel` gives direct tables and one-level responsive table wrappers the full remaining body height. The horizontal scrollbar stays above pagination even with few rows; wrappers must not contain toolbars or pagination.
- Keep the header and rows in the same scroll container. The first checkbox column stays pinned on operational lists; search, filters and pagination remain outside the scrolling body.

- Use the shared shadcn `Table` components.
- Table header cells use `sticky top-0 z-10 bg-card`.
- Long text is truncated only when the full value remains available through a detail link or tooltip.
- Mobile layouts may switch to an item list, but the item-list wrapper must use `data-slot="operational-list-body"` so it receives the same flexible scrolling behavior.
- Empty, loading, and error states must occupy the flexible body area rather than collapsing the panel.

## Pagination

- Use `OperationalPagination` for list screens.
- Its optional `centerContent` slot can show compact read-only metadata between the total and page controls, without adding another footer row. Omitting the slot preserves the existing two-region footer; content must wrap on narrow screens rather than overlap controls.
- The default choices are `10`, `20`, `30`, and `50` rows per page.
- `page` and `pageSize` belong to the page/container component and must be sent to paginated APIs.
- “Select all” applies only to the currently visible page unless the UI explicitly confirms selecting all filtered results.

## Accessibility

- Every list panel needs `aria-label` or `aria-labelledby`.
- Search and filter controls need visible labels or `aria-label`.
- Icon-only actions need an accessible name and tooltip where helpful.
- Sticky headers, keyboard focus, status text, and row actions must remain usable at 200% browser zoom.

## Master/detail tables

Use `OperationalMasterDetail` from `src/components/operations/OperationalMasterDetail.tsx` for a vertically resizable list and goods-detail workspace. Pass the main list as `children`, a composed `OperationalListPanel` as `detail`, its `detailId`, and controlled `expanded`/`onExpandedChange` props. The page retains its queries, selected document and persistence key; the layout component never fetches or stores document data.

- The lower panel shrinks continuously to zero, with only a 1px minimum to avoid the library's early percentage-based collapse snap.
- The centered chevron is outside the resize hit region and follows committed geometry, not a separately animated position.
- Button reopening restores the previous usable height (at least 25%; initial height 35%). This minimum applies only to reopening, not dragging.
- Row selection must not expand a closed panel. Hide collapsed detail content from accessibility as well as visually.
- Inbound uses a thin `InboundMasterDetail` wrapper for its goods heading/reference. Outbound and transfers can compose their own detail tables with the same shared component; do not copy inbound API or quantity mappings.

## Review checklist

- [ ] Page root fills available height and includes `min-h-0`.
- [ ] Page root and all workspace ancestors use `w-full min-w-0` without a centered `max-w-*` wrapper.
- [ ] List panel uses `OperationalListPanel`.
- [ ] Header and toolbar do not scroll with rows.
- [ ] Only the list/table body scrolls vertically.
- [ ] Pagination stays at the bottom with few and many rows.
- [ ] No fixed viewport-height calculation is duplicated in the feature.
- [ ] Simple filters are directly accessible in the toolbar.
- [ ] Layout works at narrow desktop widths and common zoom levels.
