<!-- impeccable:design-schema 1 -->

---
name: AgentPatch Studio
description: Observability + replay + eval-from-failure for production LLM-agent workflows.
colors:
  background: "#fafaf9"
  foreground: "#1c1917"
  muted: "#78716c"
  muted-soft: "#a8a29e"
  accent: "#0d9488"
  accent-hover: "#0f766e"
  accent-subtle: "#ccfbf1"
  halo: "#f0fdfa"
  canvas: "#f5f5f4"
  ink: "#0c0a09"
  surface: "#ffffff"
  surface-soft: "#f5f5f4"
  border: "#e7e5e4"
  border-strong: "#d6d3d1"
  success: "#15803d"
  warning: "#b45309"
  error: "#b91c1c"
  info: "#1d4ed8"
typography:
  display:
    fontFamily: "var(--font-geist-sans)"
    fontWeight: 600
    fontSize: "clamp(2.5rem, 5vw, 3.75rem)"
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "var(--font-geist-sans)"
    fontWeight: 600
    fontSize: "1.5rem"
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "var(--font-geist-sans)"
    fontWeight: 600
    fontSize: "1.125rem"
    lineHeight: 1.4
  body:
    fontFamily: "var(--font-geist-sans)"
    fontWeight: 400
    fontSize: "0.875rem"
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-geist-sans)"
    fontWeight: 500
    fontSize: "0.75rem"
    lineHeight: 1.4
    letterSpacing: "0.18em"
    textTransform: "uppercase"
  mono:
    fontFamily: "var(--font-geist-mono)"
    fontWeight: 500
    fontSize: "0.75rem"
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "6px"
  lg: "16px"
  sparkline: "2px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "20px"
  card-hero:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "28px"
  input-default:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  badge-status:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "4px 8px"
  nav-sidebar-item:
    backgroundColor: "{colors.background}"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: AgentPatch Studio

## Overview

**Creative North Star: "The Surgical Lightbox."**

Each run is staged on a calm stone surface the way a specimen is staged on a lit panel — and the surgical detail is the diff between the broken run and the working run. Around that core, the broader product borrows the typographic discipline of an engineering broadsheet (hairline rules, kinetic type, generous whitespace) and the data-clarity of an avionics panel (flush borders, monospaced diagnostic readouts, high-contrast state pills). The result reads as **deep neutral staging punctuated by luminous teal halos** — calm by default, luminous where the engineer needs to look.

This is a workbench for an on-call engineer at 2am and a storyboard for a recruiter on Monday morning. Both audiences need the surface to be trustworthy, honest, and quietly impressive. The system has to be honest about failure (failure pills never get dressed up) and confident about the fix (the teal action button is unmistakable). It rewards the engineer's intent with immediate tactile feedback: hover lifts, focus rings glow, the marquee keeps moving so the page never feels dead.

**Key Characteristics:**

- **One accent, used surgically.** Teal is reserved for primary actions, current selection, focus rings, and the lightbox halo around critical surfaces. It appears on roughly ≤8% of any given screen; the rarity is the point.
- **Calm by default.** Every primary surface is a flat `surface` or `surface-soft`. Shadows appear only as a response to interactivity.
- **Tactile machinery.** Buttons and cards physically lift 1px on hover. Inputs are strict 6px. Cards are generous 16px. Pills are fully rounded. The shape vocabulary is closed.
- **Pull-quote, not padding.** Where prose is used, one memorable line carries the room. Walls of explanation are reserved for the deep-code surfaces (run inspector, replay button confirm).
- **Photo + halo on hero surfaces.** Real photography from `picsum.photos/seed/...` is the editorial "evidence." A translucent teal halo behind the photo gives the page its luminance without making the photo feel washed.

## Colors

A single teal accent on a stone-paper canvas, with a four-color semantic palette that sits one stop darker than the equivalent Tailwind shade so it never fights the accent for attention.

### Primary

- **Diagnostic Teal** (`{colors.accent}`, `#0d9488`): the primary action color. Used for primary buttons, focus rings, the current selection, the active sidebar nav, the marquee arrow. ≤8% of any given screen.
- **Active Solder** (`{colors.accent-hover}`, `#0f766e`): the **pressed / hover state of Diagnostic Teal**, NOT a peer accent. The metaphor is internal continuity, not a second brand color. Same teal ramp, one stop deeper. Also used for the accent line on the welcome-hero divider.
- **Trace Wash** (`{colors.accent-subtle}`, `#ccfbf1`): the subtle backdrop. Used as the background of the active sidebar item, the "grounded" selection ring on the run timeline, and the soft photo overlay on the welcome hero. Pairs with `Halo` (`{colors.halo}`, `#f0fdfa`, teal-50) for the lightest teal wash on hero canopies.

### Color → CSS Variable → Hex → Tailwind Utility (load-bearing map)

| Named       | CSS variable       | Hex        | Tailwind utility                                  |
| ----------- | ------------------ | ---------- | ------------------------------------------------- |
| Diagnostic Teal | `--accent`      | `#0d9488`  | `bg-accent`, `text-accent`, `ring-accent`, `border-accent` |
| Active Solder   | `--accent-hover`| `#0f766e`  | `bg-accent-hover`, `hover:bg-accent-hover`        |
| Trace Wash      | `--accent-subtle` | `#ccfbf1` | `bg-accent-subtle`, `text-accent-subtle`          |
| Halo            | `--halo`        | `#f0fdfa`  | `bg-halo`                                         |
| Lab Stone       | `--background`  | `#fafaf9`  | `bg-background`                                   |
| Carbon Ink      | `--foreground`  | `#1c1917`  | `text-foreground`                                 |
| Hairline        | `--border`      | `#e7e5e4`  | `border-border`                                   |
| Border-Strong   | `--border-strong` | `#d6d3d1` | `border-border-strong`                            |
| Surface         | `--surface`     | `#ffffff`  | `bg-surface`                                      |
| Surface-soft    | `--surface-soft`| `#f5f5f4`  | `bg-surface-soft`                                 |
| Canvas          | `--canvas`      | `#f5f5f4`  | `bg-canvas`                                       |
| Muted           | `--muted`       | `#78716c`  | `text-muted`                                      |
| Muted-soft      | `--muted-soft`  | `#a8a29e`  | `text-muted-soft` (placeholder)                   |
| Ink (dark only) | `--ink`         | `#0c0a09`  | `bg-ink` (dark page bg)                           |
| Success         | `--success`     | `#15803d`  | `text-success`, `bg-success`                      |
| Warning         | `--warning`     | `#b45309`  | `text-warning`, `bg-warning`                      |
| Error           | `--error`       | `#b91c1c`  | `text-error`, `bg-error`                          |
| Info            | `--info`        | `#1d4ed8`  | `text-info`, `bg-info`                            |

**Source of truth.** The named names are metaphor; the hex values are the CSS variables in `apps/web/app/globals.css`; the Tailwind utilities are wired through `@theme inline`. Designers should reason from the table, not from the names — the names exist so the engineering brief can be talked about in metaphor without losing the underlying tokens.

**Token duplicates.** `--border` and `--hairline` are intentionally duplicate tokens (`#e7e5e4`) — `--border` is the general-purpose hairline for cards/tables/inputs; `--hairline` is reserved for hero-canopy and photo-overlay borders (`border-y border-hairline` on the marquee strip host). Same hex, named separately so a future designer can diverge them without breaking either surface.

### Secondary

*Omitted — the system uses a single accent by design. The "One Accent Rule" below is binding.*

### Tertiary

*Omitted.*

### Neutral

- **Lab Stone** (`{colors.background}`, `#fafaf9`): the page background. Reads as cool paper.
- **Carbon Ink** (`{colors.foreground}`, `#1c1917`): body text and the strongest surface boundary.
- **Hairline** (`{colors.border}`, `#e7e5e4`): the default 1px border. Pairs with cards, tables, and form controls. `Border-Strong` (`{colors.border-strong}`, `#d6d3d1`, stone-300) is reserved for emphasized separators (top-of-page brand chrome, audit-log list rows).
- **Surface** (`{colors.surface}`, `#ffffff`): card and panel surface. Never the page background.
- **Surface-soft** (`{colors.surface-soft}`, `#f5f5f4`): hero-canvas surfaces and one half-step down from Lab Stone. The welcome-hero card, the marquee strip, the sidebar dropdowns, and the audit-log empty card all sit on this surface.
- **Ink** (`{colors.ink}`, `#0c0a09`, stone-950): only on the dark-theme page background; not used for body text in light.
- **Muted** (`{colors.muted}`, `#78716c`, stone-500): secondary metadata. Muted-Soft (`{colors.muted-soft}`, `#a8a29e`, stone-400) is reserved for placeholder text.

### Semantic

- **Success** (`{colors.success}`, `#15803d`): pass pills, eval-result success state.
- **Warning** (`{colors.warning}`, `#b45309`): warning state pills, "needs review" indicators.
- **Error** (`{colors.error}`, `#b91c1c`): failure state pills, divergence markers in the compare view, audit-log timeouts.
- **Info** (`{colors.info}`, `#1d4ed8`): informational pills and informational banner backgrounds.

### Named Rules

**The One Accent Rule.** Teal is the only chromatic accent in the system. It appears on ≤8% of any given screen. State colors are desaturated one stop darker than the equivalent Tailwind shade so they sit calmly next to teal.

**The Halo Rule.** When a real photograph appears on a hero surface, it is overlaid with a teal halo at low opacity (typically `accent-subtle` or `halo` with `opacity-30` to `opacity-85` on a backdrop-blurred overlay). The photo provides evidence; the halo provides luminescence. The halo is never used without a photograph.

**The No-Gradient-Text Rule.** Emphasis comes from weight or size, never from a gradient over text characters.

## Typography

**Display Font:** Geist (sans), with `system-ui` fallback.
**Body Font:** Geist (sans).
**Label/Mono Font:** Geist_Mono (mono), reserved for code, IDs, durations, token counts, and labels that need to read as measurements rather than prose.

**Character:** Geist carries all UI labels, body, and headlines in a single confident sans; Geist_Mono steps in only when the eye needs to trust a number or token literal. Pull-quotes use Geist at display weight with `tracking-tighter` so they read as architecture, not decoration.

### Hierarchy

- **Display** (Geist 600, `clamp(2.5rem, 5vw, 3.75rem)`, 1.05, `tracking-tighter`): the welcome-hero headline, the demo-page hero, the 404 hero. One per surface, max.
- **Headline** (Geist 600, 1.5rem, 1.25, `tracking-tighter`): section openers and modal titles.
- **Title** (Geist 600, 1.125rem, 1.4): card titles and run-overview headers.
- **Body** (Geist 400, 0.875rem, 1.5): everything that is not a label, headline, or measurement. Max measure is set per surface by container width; do not exceed ~75ch on free-running prose.
- **Label** (Geist 500, 0.75rem, `0.18em` tracking, uppercase): nav items, table column headers, and the single "named kicker" that introduces a section. **The Eyebrow Cap** (per `globals.css`): no more than one uppercase `tracking-wide` micro-label per three sections — every other section opens with plain-case h2/h3.
- **Mono** (Geist_Mono 500, 0.75rem, 1.5): run IDs (truncated to 8 chars), token counts, durations, model names, file paths. Treat it as "this is a number, trust it." All tabular numerals are set with `tabular-nums`.

### Named Rules

**The Pull-Quote Rule.** When the page needs a memorable line, give it display weight and `tracking-tighter`. A wall of explanation follows the line; the line never follows the explanation. Lift the README pull-quotes verbatim rather than paraphrasing them.

**Pull-quote treatment (concrete).** A pull-quote renders as Display (`text-2xl`–`text-4xl`) at `tracking-tighter`, set in the body sans (Geist 600), preceded by a 1px `Hairline` divider (`border-border`) at full width or 4-col span, and followed by a Mono caption underneath (Geist_Mono 0.75rem, `text-muted`) — model name, file path, or date. Treat as section anchor, not decoration. The "thousand token-decisions" line on the welcome hero and the "Hello from AgentPatch Studio" h1 on the demo page are the canonical examples.

**The Mono-Measured Rule.** `font-mono` is reserved for code, data, and measurement. It is never a costume for "technical-looking" labels; if a label is not a number or code, it stays in Geist.

## Layout

The studio is structured as a fixed 256px sidebar (`w-64`) plus a flexible `main` that scrolls vertically. The dashboard, runs, compare, evals, review, and settings pages all share this skeleton, so the engineer can switch tabs without losing spatial orientation.

- **Sidebar.** `bg-surface`, `border-r border-border`, 256px fixed width. Holds the `AgentPatchWordmark` at the top, an active-project selector (rendered only when more than one project exists), the nav (`Dashboard / Runs / Compare / Eval Lab / Review / Settings`), then `UserMenu` + `ThemeToggle` at the bottom.
- **Page padding.** `px-8 md:px-12` horizontally, `py-8 md:py-10` vertically, with `pb-12` reserved for the bottom of long pages. The dashboard composes six sections in this rhythm (header → marquee → KPI bento → recent runs + top workflows → chart bento → analytics row).
- **Grid system.** The `Bento` component (`apps/web/components/ui/bento.tsx`) is enum-strict on cell count — exactly N cells, never empty placeholders. Variant per count: 2 cells = `lg:grid-cols-2`; 3 cells = hero + stacked aside (`2fr_1fr` with the hero `row-span-2`); 4 cells = 2-up; 5 cells = hero + 4 (the hero spans row 2 column 1); 6 cells = two trios.
- **Spacing scale.** Tailwind defaults (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px). Bento gaps are `gap-4` (`16px`) on desktop, `gap-3` on smaller viewports.
- **Responsive.** The demo and login pages hide the editorial photo column below `lg`. The dashboard collapses to a single-column flow below `md`. The run detail collapses the inspector to the bottom of the page on tablet.
- **Density.** Operate-mode density. Tables are tight; KPI cards carry four metrics per surface; the run detail timeline packs parent/child span rows with a fixed 12px-wide latency bar per span.

## Elevation & Depth

The system is **flat by default and tactilely lifted on interaction**. There is exactly one ambient shadow — `--shadow-soft` — defined as `0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.04)` (heavier in dark mode). It is applied to KPI cards, the welcome-hero card, the marquee strip host, and the bento cells. Buttons add `shadow-sm` and intensify to `shadow` on hover.

Depth is otherwise carried by tone: `bg-surface` → `bg-surface-soft` → `bg-canvas` → `bg-background`. Tonal steps are explicit in `globals.css` so the engineer reading the design can tell which surface they are looking at without opening devtools.

### Shadow Vocabulary

- **`shadow-soft`** (`0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.04)`): default ambient for cards, bento cells, and the welcome-hero card. Heavier variant in `:root.dark`.
- **`shadow-sm` → `shadow`** (Tailwind defaults): button at rest → hover. The hover lift is `-translate-y-px`, paired with the shadow intensification.

### Named Rules

**The Grounded Until Touched Rule.** Surfaces are flat at rest. The first time a card or button receives an interactive signal (hover, focus, active), it earns a soft shadow and a 1px physical lift. The result reads as machinery that responds to the engineer's hand, never a card that floats on its own.

**The Tonal-Pair Rule.** Where you might be tempted to add a shadow to distinguish two stacked surfaces, use a tone step (`bg-surface` vs `bg-surface-soft`) instead. Shadows are reserved for interactivity.

## Shapes

The shape vocabulary is closed and enforced at the token level. The numbers below are non-negotiable.

- **Cards / surfaces:** rounded-2xl (16px). Always. The hero bento canopy, KPI cards, audit-log card, and run-detail panels share this single radius.
- **Buttons / inputs / press targets:** rounded-md (6px). Always. Strict, never softer.
- **Pills / badges / status pills:** rounded-full (9999px). Always.
- **Sparklines / data bars:** rx={2} (2px). Always.
- **Hairlines:** `border-border` at 1px. Never use 2px borders on card chrome; never pair a 1px border with a wide soft shadow on the same surface (the ghost card).
- **The AgentPatch mark** (`apps/web/components/brand/agentpatch-mark.tsx`): an 8-sided polygon (octagon) outline with a rotated inner notch — the only signature geometric mark in the system. Painted with `currentColor` so it inherits the accent.

### Named Rules

**The Shape Consistency Lock.** Cards = 16px. Buttons / inputs = 6px. Pills = full. Sparklines = 2px. The shapes never blend — a button never inherits a card radius, a pill never inherits an input radius, a card never inherits a pill radius.

## Components

The component vocabulary is small and canonical: button, card, input, chip / pill, nav, plus a marquee (kinetic typography strip) and a code block (editorial install surface). Each component is described below with shape, color assignment, states, and behavior.

### Buttons

- **Shape:** rounded-md (6px). Padding `8px 16px`.
- **Primary:** `bg-accent` / `text-white`. Hover lifts 1px (`-translate-y-px`) and darkens to `accent-hover`. Focus-visible ring is `focus:ring-2 focus:ring-accent/50`.
- **Secondary:** `bg-foreground` (Carbon Ink) / `text-white`. Same hover lift + focus treatment. Used sparingly — secondary buttons are reserved for "destructive-adjacent" actions where the engineer needs to read the action as serious.
- **Outline:** `bg-surface` / `text-foreground` / `border border-border`. Hover lifts and goes to `bg-stone-50`. The default for `cancel` and most non-accent actions.
- **Ghost:** no border, no background. Hover goes to `bg-stone-100`. Used for icon-only nav items and inline actions.
- **Disabled:** `opacity-50 cursor-not-allowed`. Press lift (`active:translate-y-px`) is suppressed via `disabled:active:translate-y-0`.
- **Motion:** `transition-[transform,background-color,border-color] duration-150 ease-out`. Fast, never choreographed.

### Inputs

- **Shape:** rounded-md (6px). Padding `8px 12px`.
- **Style:** `border border-border bg-background`. Typeface Geist at body weight (14px).
- **Focus:** `focus:ring-2 focus:ring-accent/40 focus:border-accent`. The teal halo is the only chromatic focus indicator.
- **Disabled:** `opacity-50`.

### Cards / Containers

- **Corner:** rounded-2xl (16px). Always.
- **Background:** `bg-surface` (default) or `bg-canvas` for hero / bento canopies.
- **Shadow:** `shadow-sm` (Tailwind default) plus the optional `--shadow-soft` for bento canopies. `transition-transform duration-150 ease-out hover:-translate-y-px`. Hover lifts 1px.
- **Border:** none by default; surfaces are distinguished by tone. Hairline borders are added only when a card sits inside another card (e.g. KPI cards inside the bento grid).
- **Padding:** `p-5` (20px) is the default; `p-7` (28px) is reserved for hero / bento hero cells.

### Chips / Pills / Status Badges

- **Shape:** rounded-full (9999px).
- **Style:** `ring-1` ring tint matched to the semantic palette (success → green-700/15, failure → red-700/15, running → blue-700/15). Background is the matching 50-shade (green-50, red-50, blue-50).
- **State mapping:** success / failure / running / cancelled / warning / ok / error — every status renders through the same pill primitive.

### Navigation (Sidebar)

- **Shape:** no rounded chrome — nav items are flat, separated by `space-y-1`.
- **Default state:** `text-muted`. Hover lifts to `hover:bg-stone-100 hover:text-foreground`.
- **Active state:** `bg-accent-subtle text-accent`. The teal halo behind the active label is the only color the sidebar carries.
- **Icon:** `lucide-react` 4px-wide icon, `text-accent` on the active item.

### Marquee (Kinetic Typography Strip)

- **Shape:** `border-y border-hairline`. `bg-canvas`. No rounded chrome.
- **Type:** Geist_Mono, `text-xs uppercase tracking-[0.22em] text-muted`. Items separated by `px-6` padding.
- **Motion:** `motion` library. `animate={{ x: ['0%', '-50%'] }}`, `transition={{ repeat: Infinity, ease: 'linear', duration: 36 }}`. Items are duplicated so the loop is seamless.
- **Reduced motion:** `useReducedMotion()` returns true → animation stops, items remain visible at `x: 0`.

### Code Block (Editorial)

- **Shape:** rounded-2xl. `border border-border bg-background overflow-hidden`.
- **Header strip:** `bg-surface-soft`, Geist_Mono 10.5px, `text-muted`. Language label on the left, "copy" hint on the right.
- **Body:** Geist_Mono 11px, `leading-relaxed`. Each line carries a 6-wide `tabular-nums` line number on the left in `text-muted`.

### AgentPatch Mark (Signature)

- **Geometry:** an 8-sided polygon (octagon) with a rotated inner notch. SVG, `currentColor`-bound.
- **Size:** 24 / 26 / 28 / 32 px variants across sidebar, login, demo, and 404 surfaces.
- **Use:** pairs with the wordmark `AgentPatch` (Geist_Mono 0.75rem, `tracking-[0.18em]`, uppercase). Never appears without the wordmark.

## Do's and Don'ts

Visual guardrails grounded in the current implementation. Each line is concrete; the brief's own words can earn any of the refusals when it has a reason.

### Do

- **Do** lift interactive surfaces (`hover:-translate-y-px`) so the engineer feels their click register.
- **Do** keep exactly one uppercase `tracking-wide` micro-label per three sections; let the rest open with plain h2/h3.
- **Do** use the teal halo (`accent-subtle` or `halo`) behind any surface that needs to read as the one that matters now.
- **Do** apply `prefers-reduced-motion` to every motion component (welcome hero, marquee, animated entrances). The codebase honors it via motion's `useReducedMotion`.
- **Do** keep the run-detail timeline and the diff viewer at Operate-mode density. Tables can run wider than prose; KPI cards carry four metrics per surface.
- **Do** lift README pull-quotes verbatim into the studio when they fit a surface. The "thousand token-decisions" line is canonical.
- **Do** carry every photograph on a hero with a teal halo behind it (low-opacity `accent-subtle/40` or `halo`).
- **Do** close the shape vocabulary: cards 16px, buttons / inputs 6px, pills full, sparkline bars 2px.

### Don't

- **Don't** introduce a second accent. Teal is the only chromatic accent in the system.
- **Don't** gradient-text. Emphasis is weight or size, never a gradient over text characters.
- **Don't** use `border-l-2` or `border-r-2` on cards, list items, or callouts. If you need a side accent, place a 1px accent line outside the surface.
- **Don't** stack two shadows on one element (1px border + wide soft shadow). Pick one — the floor is the boundary, the soft shadow is the hover.
- **Don't** give buttons a card radius. Buttons stay at 6px; cards stay at 16px. They are not the same shape.
- **Don't** section-number your pages (`01 / 02 / 03`). Section numbers are reserved for sequences that carry information the reader needs.
- **Don't** modal a task that doesn't need protected focus. The eval-rerun form, the project switcher, and the API-key field all live inline; the modal pattern is reserved for the replay confirm (`AlertTriangle` + irreversible action).
- **Don't** use `font-mono` as a costume for "technical-looking" labels. Mono is reserved for code, data, and measurement.
- **Don't** introduce a textured background. Stripes, grids, and `feTurbulence` grain read as amateur; the only background variation allowed is the tonal-pair step.
- **Don't** show a wall of prose where a structured surface will do. The diff table, the eval-result row, and the span tree are preferred over paragraphs.
