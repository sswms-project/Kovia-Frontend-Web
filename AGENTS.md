<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Before coding, read `.rules` for baseline React rules and `docs/CODING_GUIDELINES.md` for project-specific structure, reuse, shadcn/ui, and clean code rules.

Before adding or moving files, read `docs/FOLDER_STRUCTURE.md` for the real `src/` layout, ownership, data flow, hooks/forms lifecycle and refactor triggers.

Before implementing UI, read `docs/DESIGN_SYSTEM.md` and follow its visual system.

Before implementing or changing a list/table screen, read `docs/LIST_TABLE_DESIGN_GUIDELINES.md`. Use the shared `OperationalListPanel` and `OperationalPagination` patterns so the list fills the remaining viewport height, only its body scrolls, and pagination stays pinned at the bottom. Do not duplicate fixed `calc(100vh - ...)` height formulas in feature code.

Before styling UI, read `src/app/index.css` and use Tailwind design tokens instead of hard-coded color values.

Before implementing or refactoring code, read `docs/CODING_GUIDELINES.md` and follow its structure, reuse, clean code, and abstraction rules.

When building UI, use existing shadcn/ui primitives from `src/components/ui` first. Do not invent custom primitives or div-only controls when an accessible component already exists.

If a required shadcn/ui primitive is missing from `src/components/ui`, install it with the shadcn CLI before implementing a custom replacement.

When using Stitch HTML from `docs/stitch-designs/`, treat it as a visual reference and implement the screen as a functional Next.js feature with API integration, state handling, validation, navigation, and working interactions.

When implementing Stitch designs, always reuse existing components from `src/components/ui` before creating new UI primitives.

Before creating branches, commits, merges, or pushes, read `docs/GIT_WORKFLOW.md` and follow the repository Git workflow.

Start working branches from freshly fetched `origin/dev` and target PRs to `dev`. Only the leader promotes `dev` to `main`. Prefer squash merge for feature PRs when merge is authorized.

Use pnpm as pinned in package.json for all package operations. Codex implements when asked to fix/implement; review-only requests do not authorize source edits. Existing task authorization persists across continuations. Read `../AGENTS.md` and `../docs/BUSINESS_RULES.md` in the Kovia workspace for shared workflow and confirmed organization invariants.

Before using frontend design skills or implementing screens from Stitch, read `docs/AI_WORKFLOW.md` and follow its skill selection rules.

## Frontend Agent Skills

Use the applicable skill before implementing or reviewing frontend work:

- `shadcn`: check existing components and official shadcn documentation before adding or composing UI primitives.
- `vercel-react-best-practices`: apply when writing, refactoring, or reviewing React and Next.js code.
- `vercel-composition-patterns`: apply when designing reusable component APIs or refactoring components with proliferating boolean props.
- `web-design-guidelines`: apply before completing UI work to review UX, accessibility, and responsive behavior.

These skills supplement, but never replace, `.rules`, `docs/CODING_GUIDELINES.md`, `docs/DESIGN_SYSTEM.md`, the feature-first architecture, Tailwind design tokens, and the `pnpm` package-manager rule.

## Role and permission changes

- Backend is the source of truth for permission definitions and security enforcement. Frontend permission checks only control navigation and user experience.
- Declare frontend permission codes only in `src/config/permissionCodes.ts`; do not duplicate permission strings in pages, hooks, or components.
- Keep route and navigation access rules under `src/config`, including `route-permissions.ts` and the existing centralized navigation configuration.
- Pages may derive capability flags such as `canView`, `canCreate`, `canUpdate`, or `canManage` from effective permissions and pass those flags to presentational components.
- Components must not compare hard-coded role names or permission strings. They should render from the capability props supplied by their page.
- Do not treat a hidden button or route as authorization. Every protected operation must still be enforced by the corresponding Backend permission.
- When adding or changing a permission, align the Backend permission constant and enforcement first, then update `permissionCodes.ts`, route/navigation configuration, and relevant visibility tests.

<!-- END:nextjs-agent-rules -->

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **WMS-Frontend** (9345 symbols, 21002 relationships, 231 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource                                      | Use for                                  |
| --------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/WMS-Frontend/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/WMS-Frontend/clusters`       | All functional areas                     |
| `gitnexus://repo/WMS-Frontend/processes`      | All execution flows                      |
| `gitnexus://repo/WMS-Frontend/process/{name}` | Step-by-step execution trace             |

## CLI

| Task                                         | Read this skill file                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->
