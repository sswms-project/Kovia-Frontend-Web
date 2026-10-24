---
name: SSWMS Fresh Logistics Interface
colors:
  surface: '#f1fbec'
  surface-dim: '#d2e8c8'
  surface-bright: '#f6fef2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eaf7e2'
  surface-container: '#e0f2d6'
  surface-container-high: '#d5ecc8'
  surface-container-highest: '#c9e4ba'
  on-surface: '#18232f'
  on-surface-variant: '#3f5442'
  inverse-surface: '#1c2b20'
  inverse-on-surface: '#eaf8e2'
  outline: '#5f7a62'
  outline-variant: '#b5d8ab'
  surface-tint: '#2e5a2a'
  primary: '#2e5a2a'
  on-primary: '#f9fff6'
  primary-container: '#60f040'
  on-primary-container: '#123312'
  inverse-primary: '#8df06c'
  secondary: '#436441'
  on-secondary: '#ffffff'
  secondary-container: '#c0f0c0'
  on-secondary-container: '#234626'
  tertiary: '#794d8f'
  on-tertiary: '#ffffff'
  tertiary-container: '#c190d8'
  on-tertiary-container: '#502666'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b0f0b0'
  primary-fixed-dim: '#8fe580'
  on-primary-fixed: '#0c2408'
  on-primary-fixed-variant: '#1f4a1c'
  secondary-fixed: '#c0f0c0'
  secondary-fixed-dim: '#a5d8a3'
  on-secondary-fixed: '#0f2611'
  on-secondary-fixed-variant: '#2c4a2e'
  tertiary-fixed: '#f6d9ff'
  tertiary-fixed-dim: '#e7b4fe'
  on-tertiary-fixed: '#300347'
  on-tertiary-fixed-variant: '#5f3575'
  background: '#f1fbec'
  foreground: '#18232f'
  surface-variant: '#d5ecc8'
  chart-1: '#166534'
  chart-2: '#65a30d'
home-theme:
  background: '#e6f6df'
  surface: '#e6f6df'
  surface-bright: '#eefbe8'
  surface-container-lowest: '#fbfefa'
  surface-container-low: '#f1faec'
  surface-container: '#e0f0d8'
  surface-container-high: '#d5e9cb'
  surface-container-highest: '#cbe2c0'
  on-surface-variant: '#3c5a48'
  outline: '#5f7a66'
  outline-variant: '#b4d4b0'
  primary: '#0e3d28'
  on-primary: '#d8f96b'
  primary-container: '#c0f24d'
  on-primary-container: '#17330f'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: 0
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1440px
  landing-max: 75rem
  sidebar-width: 240px
  sidebar-collapsed: 64px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
  stack-compact: 4px
  stack-default: 12px
---

# SSWMS Fresh Logistics Interface

## Brand & Style

The brand personality is rooted in **Fresh Logistics**: reliable warehouse operations with a clear, living green identity. The interface should feel precise, calm, and modern, while the green palette signals flow, growth, freshness, and supply-chain health.

The visual style remains **Corporate / Modern Functional Minimalism**. Product screens use darker, quieter green tokens for long working sessions. Public and marketing pages may use the `.theme-home` scope to brighten the palette with mint and lime accents.

## Colors

The palette is engineered for a B2B SaaS warehouse product with a green brand system.

- **Primary Deep Green** (`#2e5a2a`) is used for core actions, active navigation, focus states, and key operational progress.
- **Lime Container** (`#60f040`) is a high-energy accent for progress highlights, key metric emphasis, and positive movement. Use it sparingly on product screens.
- **Mint Containers** (`#eaf7e2`, `#e0f2d6`, `#c0f0c0`) provide calm surfaces, cards, empty states, and soft emphasis.
- **Ink Foreground** (`#18232f`) keeps text crisp and enterprise-grade against the light green surfaces.
- **Tertiary Purple** remains reserved for smart or AI-assisted features so those actions have a distinct mental model.
- **Error Red** remains semantic and should be accessed through `destructive`/`error` tokens, not arbitrary red classes.

## Token Usage

The color palette above must be implemented through Tailwind design tokens defined in `src/app/index.css`.

- Treat `src/app/index.css` as the source of truth for runtime color values.
- Use semantic Tailwind classes such as `bg-background`, `text-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-primary-container`, `text-on-primary-container`, `text-muted-foreground`, and `text-destructive` when available.
- Do not hard-code design-system colors directly in React components, pages, or feature code.
- If a design-system color is needed but no Tailwind token exists yet, add a semantic token in `src/app/index.css` first, then use that token from the component.
- Keep token names semantic and role-based, not page-specific. Prefer `primary`, `secondary`, `muted`, `border`, `destructive`, or `chart-1` over names such as `registerGreen`.
- Public landing pages may wrap their root in `.theme-home` to use the brighter home palette without changing product-screen tokens.

## Typography

Inter is the primary interface font, chosen for legibility in dense warehouse operations. JetBrains Mono is used for SKUs, serial numbers, counts, and machine-readable identifiers.

- **Data Tables:** Use compact body sizes for rows and clear label styles for headers.
- **SKUs and Serial Numbers:** Use the monospaced font token so numbers align and scanning is reliable.
- **Hierarchy:** Keep dashboard and admin surfaces compact. Avoid oversized marketing type inside operational panels.

## Layout & Spacing

The layout follows a **Hybrid Grid** model optimized for wide-screen warehouse and office usage.

- **Sidebar:** Persistent on desktop, icon/collapsed patterns on tablet, mobile navigation only when necessary.
- **Top Bar:** Prioritizes account, search, breadcrumbs, and operational context.
- **Density:** Product screens should stay compact and scannable. Marketing pages can breathe more but must still reveal the next section in the first viewport.
- **Desktop (1280px+):** 12-column grid with strong horizontal scanning.
- **Tablet (768px - 1279px):** 8-column grid.
- **Mobile (Below 768px):** Single column with natural vertical scroll.

## Elevation & Depth

This design system uses tonal surfaces and borders over heavy shadows.

- **Borders over Shadows:** Use `border-border`, `border-outline`, or `border-outline-variant` for structure.
- **Level 0 (Background):** `bg-background`.
- **Level 1 (Cards/Tables):** `bg-card` or `bg-surface-container-lowest`.
- **Level 2 (Active/Hover):** `bg-muted`, `bg-accent`, or a low-opacity `bg-primary-container`.
- **Focus:** Use `ring-ring` and keep focus states visible against green surfaces.

## Shapes

The shape language is soft but utilitarian. A 4px base radius is used for most controls, with larger radii reserved for badges, larger marketing surfaces, or media containers.

Two shared surfaces use the `xl` radius (12px) so every screen gets it without feature code repeating it:

- **List panels:** `OperationalListPanel` is rounded and clips its table, toolbar and pagination. Do not add radius classes to list panels in feature code.
- **Dropdown popups:** `DropdownMenuContent`, `SelectContent` and the popup of `NativeSelect` share one template — 12px radius, 4px inner padding, items with a 6px radius, a 200ms fade/zoom on open. The `NativeSelect` popup uses Chromium's customizable select (`src/app/index.css`); other browsers keep their system popup.

## Components

- **Scrollbars:** Native scroll regions use the shared slim style by default: 6px rails in Chromium/WebKit, transparent tracks and rounded thumbs from `--table-scrollbar-thumb`, with `thin` fallback in Firefox. Pages do not need to add `data-scrollbar="slim"`; existing markers remain compatible. Keep native scroll ownership, keyboard/touch scrolling and deliberate hidden/custom scrollbar exceptions. Do not add a JavaScript scrollbar library just for appearance.

- **Buttons:** Primary buttons use `bg-primary text-primary-foreground`. Secondary buttons use outline/ghost styles with `border-border`, `text-foreground`, and `hover:bg-muted`.
- **Status Badges:** Prefer semantic tokens. Success/healthy inventory may use green system tokens only when the meaning is truly status-specific; core brand color should still come from `primary`.
- **Data Tables:** Rows use subtle `hover:bg-muted`. Numeric columns should be right-aligned. Action buttons should be icon-first or icon-only in dense tables.
- **Cards:** Dashboard widgets use `bg-card`, `text-card-foreground`, and `border-border`.
- **Inputs:** Form fields use `border-input`; focus states use `ring-ring` or `focus-visible:ring-ring`.
- **Charts:** Use `chart-1` and `chart-2` for green/lime data series. Add new chart tokens in `src/app/index.css` before using more series.
- **Smart/AI Actions:** Use tertiary tokens, not primary green, so AI features remain visually distinct.
