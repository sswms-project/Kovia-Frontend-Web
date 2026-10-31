# Coding Guidelines

This document defines how SSWMS Frontend code should be structured, split, reused, and kept maintainable.

Folder map, ownership table, hooks/forms lifecycle and refactor triggers: [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md).

## Core Principles

- Prefer simple, readable code over clever abstractions.
- Build real product behavior, not static UI that only looks correct.
- Reuse existing code before creating new files, components, hooks, or helpers.
- Keep related behavior close to its feature, and promote code to shared folders only when it is truly reused.
- Do not duplicate business logic, validation rules, API calls, UI primitives, or formatting helpers.
- Create abstractions only when they remove meaningful duplication or make behavior easier to understand.

## Feature Structure

Feature code should live under `src/features/<feature>/`.

Use these folders when a feature grows:

```text
src/features/<feature>/
  pages/       # <Name>Page.tsx (default export), rendered by src/app/**/page.tsx
  components/  # Feature-specific UI composition (components/<PageName>/ + index.ts barrel)
  hooks/       # Feature-specific React hooks and React Query hooks
  services/    # API wrappers and service functions
  schemas/     # Zod schemas
  types/       # Feature-specific TypeScript types
  utils/       # Pure feature-only helper functions and mappers
```

Shared app-level code belongs outside feature folders:

```text
src/app/            # Next.js routes only: (private)/, (public)/, layouts, thin page.tsx
src/components/ui/  # Shared UI primitives
src/components/     # Shared app components (layout/, operations/, forms/, barcode/, ErrorState…)
src/config/         # permissionCodes.ts, roles.ts, route-permissions.ts
src/routes/         # APP_ROUTES (app-routes.ts), API_ENDPOINTS (api-endpoints.ts)
src/hooks/          # Shared hooks used by multiple features
src/lib/            # axios, logger, query-keys, api-error and other shared utilities
src/providers/      # App-wide React providers
src/types/          # Shared API and domain types
src/stores/         # Shared Zustand stores
```

A route `page.tsx` only forwards params/redirects and renders the feature page; it holds no hooks or business logic.

Do not create a shared folder just because code might be reused later. Start inside the feature, then promote after a second real use case appears.

## Components

- Keep components focused on one responsibility.
- Split large components when they contain multiple independent sections, repeated UI blocks, or complex conditional states.
- Prefer small named components over long inline JSX blocks.
- Put screen-specific components in `src/features/<feature>/components/`.
- Put reusable visual primitives in `src/components/ui/` only when they are generic enough for multiple features.
- Do not duplicate existing primitives such as buttons, inputs, cards, dialogs, tables, badges, dropdowns, tooltips, or form fields.
- Components should receive data and callbacks through props. They should not fetch data unless they are the feature container responsible for that behavior.
- Visual-only components should not contain API calls, mutation logic, or business rules.

Good split:

```text
RegisterPage
  RegisterForm
  RegisterSuccessState
  RegisterField
```

Avoid:

```text
One 500-line component that handles layout, API calls, validation, field rendering, and every success/error state inline.
```

## UI Primitive Rules

- Use existing shadcn/ui primitives from `src/components/ui` before creating custom UI.
- If a required shadcn/ui primitive is missing from `src/components/ui`, add it with the shadcn CLI before hand-coding a replacement:

```bash
pnpm dlx shadcn@latest add <component-name>
```

- Do not recreate Button, Input, Textarea, Checkbox, Select, Combobox, Card, Alert, Dialog, Sheet, Drawer, Popover, Tooltip, Tabs, Badge, Table, DataTable, Pagination, Calendar, or Form primitives with raw HTML.
- Do not create custom component primitives just because a screen design looks slightly different. Extend the existing primitive with props, variants, composition, or feature-level wrappers first.
- Avoid div-only interactions. Use semantic HTML or accessible shadcn/ui components.
- Use `<button>` for actions, `Link` or `<a>` for navigation, real form controls for inputs, and table elements or `DataTable` for tabular data.
- Use `div` for layout and grouping only. Do not use `div` as a fake button, fake input, fake select, fake tab, fake checkbox, fake link, or clickable table row.
- If an existing shadcn/ui primitive cannot support the required behavior, document the gap in the feature code and keep the new component narrowly scoped.

## Hooks

- Use hooks to reuse stateful behavior, browser behavior, or feature workflows.
- React Query hooks should wrap server reads and mutations.
- Client-only UI state can use local React state or Zustand when shared across distant components.
- Do not store server data in Zustand. Use TanStack React Query.
- Name hooks with `use...`, for example `useVerifyEmailQuery` or `useRegisterMutation`.
- Keep hooks independent from visual layout. A hook should return data, state, and actions, not JSX.
- One hook = one cohesive behavior, resource, or workflow. Return a small API; never a whole-page `controller` with dozens of setters.
- Pure calculations (formatting, option building, payload mapping) are plain functions in `utils/`, not `use...` hooks.
- A hook shares logic, not instance state: call a form/workflow hook once at its owner and pass what children need.
- Call hooks at the top level; lazy data uses `enabled: isOpen && Boolean(warehouseId)`, never a conditional hook call.
- Use `useMemo`/`useCallback` only with a concrete reason.

Create a hook when:

- The same stateful logic is needed in more than one component.
- A component becomes hard to read because of non-visual logic.
- A workflow combines API state, derived state, and actions.

Do not create a hook when:

- Logic is only a simple local variable.
- The hook would hide behavior without reducing complexity.

## Services And API

- Keep API calls in service functions or feature API files, not inside JSX event handlers.
- Use the shared Axios client `axiosClient` from `src/lib/axios.ts`; do not create another instance or attach tokens in feature code.
- Take endpoint paths from `API_ENDPOINTS` (`src/routes/api-endpoints.ts`) and app URLs from `APP_ROUTES` (`src/routes/app-routes.ts`).
- Return unwrapped response data from API helpers: `response.data.data` for `ApiResponse<T>`, `response.data` for Blob downloads.
- Pages and components never call `*Service.*` directly (including downloads); go through a feature hook.
- Services do not catch errors or own toast, dialogs, navigation, or React state.
- Build query keys from `queryKeys` in `src/lib/query-keys.ts`, including every parameter the query depends on.
- Let React Query handle loading, error, success, retry, and cache state.
- Use typed request and response DTOs.
- Reuse existing query keys and API hooks before creating new ones.
- Keep endpoint paths and payload names aligned with backend contracts.

API write flow:

```text
Zod schema -> form values -> typed DTO -> service function -> React Query mutation -> UI state
```

API read flow:

```text
typed query params -> service function -> React Query query -> loading/error/empty/success UI
```

## Utilities And Helpers

- Put pure reusable helpers in `src/lib/` when they are shared across features.
- Put feature-only helpers in `src/features/<feature>/utils/`.
- Keep helpers pure when possible: same input should return the same output.
- Avoid helpers that depend on component state, DOM, or API clients unless that is their explicit purpose.
- Name helpers by behavior, not by implementation detail.

Good examples:

```text
formatCurrency
formatDateTime
buildWarehouseQueryParams
getApiErrorMessage
normalizeEmail
```

Avoid:

```text
handleData
processStuff
commonFunction
utils
```

## Forms And Validation

- Use React Hook Form for form state.
- Use Zod schemas as the source of truth for validation.
- Infer form types from Zod with `z.infer`.
- Keep validation messages near the fields that caused them.
- Do not duplicate the same validation rules in multiple places.
- Extract repeated field composition when a form has multiple fields with the same label, input, and error pattern.
- Disable submit actions while a mutation is pending to prevent duplicate submissions.

## Tailwind And Design Tokens

- Before styling UI, read `src/app/index.css` to understand the available CSS variables and Tailwind theme tokens.
- Use Tailwind CSS utility classes for layout, spacing, typography, color, border, radius, focus, and responsive behavior.
- Prefer semantic Tailwind token classes such as `bg-background`, `text-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `text-muted-foreground`, `ring-ring`, and `text-destructive` when those tokens exist.
- Do not hard-code hex, RGB, HSL, OKLCH, or named color values inside component class names when the color belongs to the design system.
- If a design-system color is needed but no Tailwind token exists yet, add a semantic token in `src/app/index.css` first, then use that token from the component.
- Do not scatter one-off arbitrary color classes such as `bg-[#2e5a2a]`, `text-[#18232f]`, or `border-[#b5d8ab]` across feature code.
- Raw color values are allowed only for truly one-off visuals, and the reason must be obvious from the context.

Avoid:

```tsx
className = 'bg-[#2e5a2a] text-[#18232f] border-[#b5d8ab]'
```

Prefer:

```tsx
className = 'bg-primary text-primary-foreground border-border'
```

## Reuse Rules

Before creating new code, check in this order:

1. Existing feature component, hook, schema, service, or type.
2. Existing shared component in `src/components/ui`.
3. Existing shared utility in `src/lib`.
4. Existing app-level hook in `src/hooks`.
5. Existing API type in `src/types`.

Reuse does not mean forcing unrelated code together. If two pieces of code look similar but have different business meaning, keep them separate until a real shared abstraction is obvious.

## Clean Code Rules

- Use descriptive names. Avoid abbreviations.
- Keep functions small enough that their purpose is obvious.
- Use early returns for loading, error, empty, and invalid states.
- Prefer derived values during render over unnecessary `useEffect`.
- Do not swallow errors silently.
- Log unexpected errors and show useful user-facing messages.
- Avoid deeply nested conditionals. Extract named helpers or state components.
- Avoid magic strings and numbers. Use constants when values have business meaning.
- Avoid dead buttons, fake filters, placeholder-only forms, and UI controls without handlers.
- Keep comments rare. Explain why something exists, not what the code already says.

## Abstraction Guidelines

Create an abstraction when:

- The same logic is duplicated in at least two real places.
- It reduces component size or improves readability.
- It protects a backend contract, formatting rule, validation rule, or shared UI behavior.
- It matches an existing project pattern.

Do not create an abstraction when:

- It is only used once and does not clarify the code.
- It hides simple logic behind a vague name.
- It forces unrelated features to share the same implementation.
- It makes future changes harder to reason about.

## Reusable business-code inputs

Use `BusinessCodeField` (`src/components/forms`) for business-code labels, inputs, helper text and linked errors. Pass RHF `register(...)` through `inputProps` so ref, blur and change handling remain intact. Keep feature-specific schemas, normalization, length limits, API queries and duplicate-code handling in their existing features.

Use `useCodeSuggestion` (`src/hooks`) only in the create-form orchestrator. Pass the existing feature query's data, `isFetching` and `isError`; apply a suggestion through `form.setValue` without marking the field dirty. On user changes, call `markEdited`, including when the user clears the input. Do not use RHF `isDirty` as the interaction guard.

```tsx
const instanceId = useId()
const [session, setSession] = useState(0)
const sessionKey = `${instanceId}:${session}`
const query = useNextSupplierCodeQuery(isCreateOpen, sessionKey)
const suggestion = useCodeSuggestion({
  active: isCreateOpen,
  sessionKey,
  suggestedCode: query.data?.data,
  isFetching: query.isFetching,
  isError: query.isError,
  getCurrentCode: () => form.getValues('supplierCode'),
  applyCode: (code) =>
    form.setValue('supplierCode', code, {
      shouldValidate: form.formState.isSubmitted,
    }),
})
// Field inputProps: { ...form.register('supplierCode', { onChange: suggestion.markEdited }), ... }
```

Every reopen, save-and-add or change of receiving document starts a new session: reset the form, call `suggestion.resetSession()` and increment `session` in the same event. Include `sessionKey` in the feature query key; never reuse the old result or await a refetch before resetting the next draft. This isolates late responses from the previous form. Edit forms keep their saved code and do not autofill. The shared hook does not fetch, reserve or generate codes; the Backend remains responsible for tenant-scoped uniqueness at save time.

Create helper: `Mã được gợi ý, có thể chỉnh sửa.` Loading uses a placeholder without disabling manual entry; suggestion errors permit manual entry. Do not add a shared regex or uppercase-on-keystroke behavior.

## Review Checklist

Before finishing a feature, verify:

- Existing components, hooks, services, schemas, and utils were reused where appropriate.
- Existing shadcn/ui primitives from `src/components/ui` were used before creating custom UI.
- No div-only controls or fake interactive elements were introduced.
- No duplicated API calls, form validation, or UI primitives were introduced.
- Styling uses Tailwind tokens from `src/app/index.css` instead of hard-coded design-system colors.
- Loading, error, empty, success, and disabled states are handled.
- Components are split by responsibility.
- Business logic is not buried inside visual-only components.
- Types come from source of truth when possible.
- Backend payload names and response shapes match the backend contract.
- Route `page.tsx` is thin; views do not call React Query hooks or services; pages reach HTTP only through hooks.
- Each form has one owner and one `useForm`; query data is not mirrored into local state or a store.
- Multi-step saves block duplicate submission, never report success after a failed step, and keep dirty input for retry.
- Review signals were checked (page/orchestrator >~250 lines, hook/view >~150, >~10 inputs/outputs); see the gate in `FOLDER_STRUCTURE.md` §9.
- The code is understandable without excessive comments.
