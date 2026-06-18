# ObsidianData (黑曜数据) Design System

> Refined dark, single accent. Redesign v2 — supersedes the prior midnight/nebula multi-accent system.

## 1. Atmosphere & Identity

**A digital cave.** Immersive, extremely dark, scholarly — like working late in a private library with a precision developer tool. The UI is a quiet frame; content leads. The canvas is deep slate (#0F172A), and panels float as glassmorphic surfaces with `backdrop-filter: blur(16–20px)` and fine slate borders, creating spatial depth without decoration.

The signature is a single **electric purple** accent (#A855F7) — used sparingly for links, active states, buttons, selections, and graph connections. On hover the purple brightens (#C084FC) and gains a soft glow, like a node lighting up in a knowledge graph. Everything else is achromatic slate.

Motion is minimal and smooth (200–300ms ease-out) — sidebar expansion, link hovers, node interactions. No flashy animations, no decorative gradients, no neumorphism, no cartoon elements. High-end, restrained, precise.

Atmosphere keywords: Obsidian Minimal, Dark Mode, Glassmorphism, Scholarly Cyber Minimal, Knowledge Graph aesthetic.

## 2. Color

### Palette

All dark-mode values. The app is dark-only; no light theme.

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Canvas | `--canvas` | `#0F172A` (slate-950) | Deepest background — the digital cave |
| Surface 1 | `--surface-1` | `#1E2937` (slate-800) | Secondary background |
| Surface 2 | `--surface-2` | `#1F2937` (slate-800) | Panels, cards (with glass blur) |
| Surface 3 | `--surface-3` | `#334155` (slate-700) | Hover, elevated |
| Surface inset | `--surface-inset` | `#0B1120` | Recessed wells — darker than canvas |
| Text primary | `--text-primary` | `#E2E8F0` (slate-200) | Headlines, body |
| Text secondary | `--text-secondary` | `#94A3B8` (slate-400) | Descriptions, secondary content |
| Text tertiary | `--text-tertiary` | `#64748B` (slate-500) | Metadata, muted |
| Text quaternary | `--text-quaternary` | `#475569` (slate-600) | Timestamps, disabled |
| Border subtle | `--border-subtle` | `rgba(148,163,184,0.10)` | Soft separations |
| Border default | `--border-default` | `#334155` (slate-700) | Cards, panels, dividers |
| Border strong | `--border-strong` | `#475569` (slate-600) | Emphasized, focus ring |
| Accent | `--accent` | `#A855F7` (purple-500) | Links, active, CTA, selections |
| Accent hover | `--accent-hover` | `#C084FC` (purple-400) | Hover — brighten + glow |
| Accent pressed | `--accent-pressed` | `#7C3AED` (purple-600) | Active/pressed |
| Accent subtle | `--accent-subtle` | `rgba(168,85,247,0.10)` | Accent backgrounds |
| Accent glow | `--accent-glow` | `rgba(168,85,247,0.28)` | Hover glow, selection |
| Accent border | `--accent-border` | `rgba(168,85,247,0.35)` | Accent-tinted borders |
| Status success | `--status-success` | `#3FB984` | Confirmations, positive indicators |
| Status warning | `--status-warning` | `#D98841` | Cautions — distinct warm orange, not gold |
| Status error | `--status-error` | `#E55A5A` | Errors, destructive |
| Status info | `--status-info` | `#5B9BF5` | Informational — cool blue, distinct from accent |

### Rules

- **One accent.** Amber-gold (`#E0A84E`) is the only brand chromatic color. It appears ONLY on CTAs, active tab indicators, links, focus rings, and key interactive states. Never decorative, never in gradients, never animated.
- **No gradients on UI chrome.** Gradients are banned from buttons, borders, text, backgrounds, and cards. The only permitted gradient is a optional radial vignette on the hero, at very low opacity.
- **Status colors are semantic, not decorative.** Success/warning/error/info appear only on status indicators, badges, and inline messages. They never serve as accent alternatives.
- **Surfaces stack by luminance.** Depth is communicated through background luminance steps (`#0B0C0F` → `#111317` → `#16191E` → `#1C2026`), never through drop shadows on dark surfaces.
- **Borders are semi-transparent white.** `rgba(255,255,255,0.06–0.14)`. Never solid dark colors on dark backgrounds — they read as muddy.
- **Never introduce a color not in this table.** Extend the table first.

## 3. Typography

### Font Stack

- **Primary**: `"Inter", "Noto Sans SC", system-ui, -apple-system, sans-serif`
  - Inter handles Latin/numerals with geometric precision; Noto Sans SC handles CJK cleanly.
  - OpenType features `font-feature-settings: "cv01", "ss03"` enabled globally — gives Inter its distinctive geometric character.
- **Mono**: `"JetBrains Mono", ui-monospace, SF Mono, Menlo, monospace`
  - Used for data values, numeric columns, code, and technical labels. Tabular figures enabled (`font-variant-numeric: tabular-nums`).
- Max 2 families. No third.

### Scale

Data-appropriate — slightly smaller body than a marketing site, because density matters.

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 40px / 2.5rem | 600 | 1.1 | -0.025em | Hero title, page title |
| H1 | 28px / 1.75rem | 600 | 1.2 | -0.02em | Section headers |
| H2 | 22px / 1.375rem | 590 | 1.3 | -0.01em | Card titles, panel headers |
| H3 | 18px / 1.125rem | 590 | 1.4 | 0 | Subsection, dialog titles |
| Body | 14px / 0.875rem | 400 | 1.6 | 0 | Default text |
| Body sm | 13px / 0.8125rem | 400 | 1.5 | 0 | Secondary info, table cells |
| Caption | 12px / 0.75rem | 500 | 1.4 | 0.01em | Labels, metadata, badges |
| Overline | 11px / 0.6875rem | 600 | 1.3 | 0.08em | Section labels, uppercase |
| Mono data | 13px / 0.8125rem | 500 | 1.5 | 0 | Numeric data values, code |

### Rules

- Weights: 400 (read), 500 (emphasize/UI), 600 (announce/heading). No 700 bold — 600 is the maximum.
- Body text never below 13px. Captions/overlines at 11–12px only for non-essential metadata.
- Headlines use negative tracking; small caps/overlines use positive tracking.
- Numbers in data contexts use JetBrains Mono with `tabular-nums`. Never proportional digits in tables or stats.
- `text-wrap: balance` on headings to prevent orphaned words.

## 4. Spacing & Layout

### Base Unit

All spacing derives from **4px**.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Icon-to-label, tight inline |
| `--space-2` | 8px | List items, compact groups |
| `--space-3` | 12px | Form field padding, small gaps |
| `--space-4` | 16px | Standard card padding, input height |
| `--space-5` | 20px | Comfortable section inner |
| `--space-6` | 24px | Default card padding |
| `--space-8` | 32px | Between card groups |
| `--space-10` | 40px | Sections within a page |
| `--space-12` | 48px | Major section breaks |
| `--space-16` | 64px | Page-level vertical rhythm |

### Grid

- Max content width: **1280px** (dashboard), **640px** (upload/landing hero)
- Column system: 12-column, 24px gutter on desktop
- Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px, 2xl 1536px

### Rules

- No magic numbers. Every spacing value maps to a token.
- Asymmetric padding is intentional — document why.
- Full-height sections use `min-h-[100dvh]`, never `h-screen`.

## 5. Components

### Button — Primary (electric purple)
- **Structure**: `<button>` with inline-flex, gap, icon + label
- **Background**: `--accent` solid (`#A855F7`), text white
- **Padding**: 10px 20px, radius 8px
- **States**: default (purple + soft glow) → hover (`--accent-hover` `#C084FC` + brighter glow + `translateY(-1px)`) → active (`--accent-pressed` `#7C3AED` + `translateY(0)`) → disabled (opacity 0.4) → focus (`--accent-subtle` ring)
- **Never**: gradient fill, animated background — solid purple with glow is the Obsidian signature

### Button — Secondary (ghost)
- **Background**: `rgba(255,255,255,0.04)`, text `--text-secondary`
- **Border**: `1px solid --border-default`
- **Padding**: 8px 16px, radius 8px
- **Hover**: background `rgba(255,255,255,0.07)`, text `--text-primary`, border `--border-strong`

### Button — Tertiary (text)
- **Background**: transparent, text `--text-tertiary`
- **Hover**: text `--text-primary`, background `rgba(255,255,255,0.04)`
- **Use**: low-emphasis actions, "hide/show" toggles

### Card / Surface
- **Background**: `--surface-2` (`#16191E`), no transparency blur
- **Border**: `1px solid --border-subtle`
- **Radius**: 10px (containers), 8px (inner elements), 6px (controls)
- **Hover**: border → `--border-default`, background → `#181B21`
- **No box-shadow** at rest. Modals/popovers get layered shadow only (see Section 7).

### Badge / Tag
- **Background**: `rgba(255,255,255,0.05)`, text `--text-secondary`
- **Border**: `1px solid --border-subtle`
- **Radius**: 6px, padding 3px 8px
- **Status variants**: background = status color at 0.12 opacity, text = status color at full, border = status at 0.25

### Input / Select
- **Background**: `rgba(255,255,255,0.03)`
- **Border**: `1px solid --border-default`, radius 6px
- **Focus**: border `--accent-border`, ring `0 0 0 3px --accent-subtle`
- **Placeholder**: `--text-tertiary`

### Tab Navigation
- **Inactive**: text `--text-tertiary`, no indicator
- **Active**: text `--text-primary`, bottom indicator `2px solid --accent` (solid, not gradient)
- **Hover**: text `--text-secondary`

### Table (data preview)
- **Header**: `--surface-1` background, `--text-tertiary`, 12px caption, sticky
- **Rows**: `--text-secondary`, 13px body sm, hover `rgba(255,255,255,0.03)`
- **Numeric cells**: JetBrains Mono, `tabular-nums`, right-aligned
- **Borders**: only header bottom (`--border-subtle`) + row bottom (`rgba(255,255,255,0.03)`)

### Chart tooltip / ECharts theme
- **Background**: `--surface-3` with `--border-default`
- **Text**: `--text-primary` / `--text-secondary`
- **Accent series**: `--accent`. Secondary series: `--status-info`, `--status-success`, `--text-tertiary`.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 120ms | ease-out | Button press, toggle, hover |
| Standard | 220ms | cubic-bezier(0.4, 0, 0.2, 1) | Panel open, tab switch, modal |
| Entry | 400ms | cubic-bezier(0.16, 1, 0.3, 1) | Page mount, section reveal |

### Rules

- **Only animate `transform` and `opacity`.** Never `width`, `height`, `top`, `left`, `margin`, `padding`, `background-position`.
- **No animated gradients.** No `gradientX`, no `aurora`, no `shimmer` on UI chrome. The `shimmer` skeleton loader is the ONLY exception (loading state only).
- **Entry animations**: `fade-in` + `translateY(8px → 0)` at 400ms. Staggered with 60ms increments. Only on first mount, not on every state change.
- **Every interactive element has hover + active + focus states.** Focus ring is mandatory (keyboard accessibility).
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables all non-essential animation. Already in place — keep it.

## 7. Depth & Surface

### Strategy: **Glassmorphism — semi-transparent slate + backdrop blur**

Panels float as glass over the deep canvas. Depth comes from `backdrop-filter: blur(16–20px)`, semi-transparent slate backgrounds, fine slate borders, and subtle inset highlights. This is the Obsidian.md spatial model — UI as a quiet frame with depth, not a flat surface.

| Level | Treatment | Use |
|-------|-----------|-----|
| Canvas | `#0F172A` solid | Page background — the cave |
| Surface 1 | `#1E2937` solid | Secondary backgrounds, app bar |
| Surface 2 | `rgba(31,41,55,0.6)` + `blur(16px)` + subtle border | Cards, panels — the default glass |
| Surface 3 | `rgba(51,65,85,0.5)` + `blur(16px)` | Hover, elevated cards |
| Inset | `#0B1120` + inset shadow | Recessed wells — deeper than canvas |
| Elevated | `rgba(30,41,59,0.92)` + `blur(20px)` + drop shadow | Modals, dialogs |
| Overlay | `rgba(15,23,42,0.75)` backdrop | Modal backdrop |

### Rules

- **Glassmorphism is the depth system.** Cards use `backdrop-filter: blur(16px)` + semi-transparent slate bg + 1px slate border. Hover increases bg opacity slightly.
- **Borders are fine slate lines.** `#334155` default, subtle `rgba(148,163,184,0.10)` for soft separations. Never thick, never colored (except accent focus).
- **Inset highlights are subtle.** `inset 0 1px 0 rgba(255,255,255,0.03)` — just enough to suggest a glass edge, never a bright highlight.
- **Drop shadows only on elevated surfaces** (modals, popovers). Cards at rest use inset highlights + blur, not drop shadows.
- **No decorative grain, no noise texture, no ambient orbs.** The canvas is a clean deep slate. "极简高级" — minimal and high-end.
- **Radius: uniform 8–12px medium.** 8px for controls/buttons/inputs, 10px for cards, 12px for panels/modals. Modern and soft.
- **Forbidden**: neumorphism, bright highlights, cartoon elements, excessive gradients, Windows-classic styling, too much decoration.

---

## Migration Notes (from v1 midnight/nebula system)

The following v1 patterns are **removed** and must not survive the redesign:

| v1 pattern | Replacement |
|---|---|
| `nebula` / `violet` / `cyan` / `emerald` / `amber` / `ruby` accent colors | Single `--accent` (amber-gold) + semantic status colors |
| `text-gradient-prism` / `text-gradient-nebula` / gradient text | Solid `--text-primary` or `--accent` |
| `btn-primary` animated gradient background | Solid `--accent` background |
| `.glass` / `.glass-elevated` backdrop-filter | Solid `--surface-2` / `--surface-3` |
| `aurora-bg` / `body::after` aurora animation | Removed — clean `--canvas` background |
| `border-gradient` pseudo-element | Solid `--border-default` |
| `accent-*` / `dot-*` color variants (6 colors) | `--accent` + `--status-*` semantic only |
| `pulse-glow` / `float` / `aurora` / `gradient-x` animations | Removed. Only `fade-in` family + `shimmer` (loading) remain |
| `introGrid` / `introLogo` etc. intro animations | Simplified to `fade-in` + `scale-in` only |
| Noto Sans SC as sole font (incl. Latin) | Inter (Latin) + Noto Sans SC (CJK) stack |
