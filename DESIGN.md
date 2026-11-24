---
name: e-assessment
description: Modern EdTech psychometric practice dashboard and lightweight JSON CMS
colors:
  primary-cobalt: "#2563eb"
  primary-cobalt-hover: "#1d4ed8"
  primary-sky-dark: "#60a5fa"
  primary-tint-light: "#eff6ff"
  canvas-light: "#f8fafc"
  surface-light: "#ffffff"
  subtle-light: "#f1f5f9"
  border-light: "#e2e8f0"
  border-strong-light: "#cbd5e1"
  ink-light: "#0f172a"
  ink-secondary-light: "#475569"
  ink-muted-light: "#526075"
  canvas-dark: "#090e1a"
  surface-dark: "#111827"
  subtle-dark: "#1e293b"
  border-dark: "#1f2937"
  border-strong-dark: "#334155"
  ink-dark: "#f8fafc"
  ink-secondary-dark: "#cbd5e1"
  ink-muted-dark: "#94a3b8"
  success-emerald: "#059669"
  warning-amber: "#d97706"
  danger-crimson: "#dc2626"
typography:
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
  numeric-code:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary-cobalt}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-cobalt-hover}"
    textColor: "{colors.surface-light}"
  button-secondary:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  nav-item-active:
    backgroundColor: "{colors.subtle-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  panel-surface:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input-field:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: e-assessment

## Overview

**Creative North Star: "The Calm Assessment Desk"**

`e-assessment` adopts the Modern EdTech category standard calibrated to the clarity and craft level of Dicoding, Coursera, and Linear. Every surface is built for sustained cognitive focus: candidates preparing for multi-company recruitment exams need immediate orientation across companies, packages, English vocabulary decks, and local progress, followed by a distraction-free workspace during timed subtests and an effortless mistake-review flow afterward.

The system deliberately rejects gamified noise, saturated decoration, nested card stacks, and uppercase eyebrow kickers. Visual authority comes from disciplined hairline borders, crisp `Plus Jakarta Sans` typography, `16px` (`rounded-2xl`) elevated panels, restrained cobalt blue reserved for a single primary action per view, and strict dual-theme parity between cool daytime slate and deep nighttime slate-navy.

**Key Characteristics:**
- Persistent `256px` (`w-64`) left sidebar on learner views, paired with a 3-column Dashboard (`xl+` with a sticky `320px` right rail), fluid 2-column detail/materi pages (`w-full`), and a sidebar-free Focus Exam Mode during active timed subtests.
- Lightweight topbar CMS layout for admin pack management without heavy navigation chrome.
- High-contrast light and dark modes with dedicated accessible text accents (`#1D4ED8` light / `#60A5FA` dark) separated from solid button fills (`#2563EB`).
- Strict numeric discipline: `tabular-nums` across all counts and `JetBrains Mono` reserved strictly for timers, score ratios, slugs, and JSON payloads.
- Uniform `1.75px` stroke inline SVG icon library replacing Unicode symbols and emojis.

## Colors

A restrained neutral-slate palette anchored by a single cobalt primary accent and high-contrast semantic status tones, engineered for ≥4.5:1 WCAG AA readability in both light and dark themes.

### Primary
- **Primary Cobalt** (`#2563eb`): Solid fill for the single primary action per screen (CTA button, active question indicator, progress bar fill). Retains 5.17:1 contrast with white text in both light and dark modes.
- **Primary Cobalt Hover / Light Text Accent** (`#1d4ed8`): Hover state for primary buttons and accessible blue text/links on light backgrounds (`#FFFFFF`, `#EFF6FF`).
- **Primary Sky Dark** (`#60a5fa`): Accessible blue text and link color on dark backgrounds (`#111827`, `rgba(59, 130, 246, 0.16)`), achieving ≥5.7:1 contrast.
- **Primary Tint Light** (`#eff6ff`): Soft active background for selected filter chips and selected exam/quiz options in light mode (paired with `rgba(59, 130, 246, 0.16)` in dark mode).

### Neutral
- **Canvas Light / Dark** (`#f8fafc` / `#090e1a`): Outer application workspace ground that separates structural panels without heavy shadows.
- **Surface Light / Dark** (`#ffffff` / `#111827`): Elevated content panels, sidebar, right learner rail, sticky headers, and dialog surfaces.
- **Subtle Light / Dark** (`#f1f5f9` / `#1e293b`): Active sidebar navigation pill, secondary wells, hover fills, keyboard shortcut keycaps, progress tracks, and inactive badge grounds.
- **Hairline Border Light / Dark** (`#e2e8f0` / `#1f2937`): Primary structural dividers, table rows, and `rounded-2xl` panel outlines (`1px`).
- **Strong Border Light / Dark** (`#cbd5e1` / `#334155`): Interactive outlines for secondary buttons, form inputs, and custom scrollbar thumbs.
- **Ink Primary / Secondary / Muted Light** (`#0f172a` / `#475569` / `#526075`) and **Dark** (`#f8fafc` / `#cbd5e1` / `#94a3b8`): Three-step readable text hierarchy keeping muted captions above 4.5:1 even on subtle surfaces.

### Semantic Status
- **Success Emerald** (`#059669`): Completed packages, answered question indicators, and correct review items.
- **Warning Amber** (`#d97706`): Final 60-second timer alert, 5-second `MEMORY` question countdown bar, and unanswered-question or replaced-attempt warnings.
- **Danger Crimson** (`#dc2626`): Final 30-second critical timer state, wrong review answers, validation errors, and destructive delete confirmations.

### Named Rules
**The Single Primary Action Rule.** Reserve solid Primary Cobalt (`#2563eb`) for at most one primary call-to-action in any viewport region. Secondary actions, active CEFR filter chips, non-next subtest rows, and pre-completion submit triggers remain crisp outlined or tonal surfaces.

**The Split Accent Contrast Rule.** Never reuse a mid-blue fill color directly as small text on dark translucent surfaces. Always pair solid fills (`--accent: #2563eb`) with dedicated text accents (`--accent-text: #1d4ed8` light / `#60a5fa` dark).

## Typography

**Display & Body Font:** Plus Jakarta Sans (self-hosted via `next/font/google`, `--font-plus-jakarta-sans`, fallback `ui-sans-serif, system-ui, sans-serif`)
**Data & Code Font:** JetBrains Mono (self-hosted via `next/font/google`, `--font-jetbrains-mono`, fallback `ui-monospace, SFMono-Regular, monospace`)

**Character:** Modern, friendly-geometric EdTech clarity calibrated for long reading comprehension passages and rapid dashboard scanning, paired with a crisp technical monospace used only where fixed-width measurement or code meaning exists.

### Hierarchy
- **Headline** (Bold 700–Extrabold 800, 1.5rem–1.75rem, line-height 1.25, tracking `-0.02em`): Primary page titles (`Dashboard Latihan`, company/package headings, result titles, `Pusat Belajar Bahasa Inggris`).
- **Title** (Semibold 600–Bold 700, 1rem–1.125rem, line-height 1.35): Section titles, company headers, subtest titles, and modal headings.
- **Body** (Regular 400–Medium 500, 0.875rem–1.0625rem, line-height 1.6, max measure `65–70ch`): Exam question prompts, answer options, dictionary entries, and explanations.
- **Label** (Medium 500–Semibold 600, 0.75rem, line-height 1.4): KPI labels, breadcrumbs, metadata strips, and status badges. Never drop below `12px` (`text-xs`).
- **Numeric / Code** (JetBrains Mono Semibold 600–Bold 700, `tabular-nums`): Countdown clocks (`11:00`), score ratios (`13/15`, `87%`), slugs (`paket-1`), keyboard keycaps (`A–E`), and raw JSON import text.

### Named Rules
**The Earned Monospace Rule.** Use `JetBrains Mono` strictly for timers, score ratios/percentages, slugs, `<kbd>` shortcut chips, and JSON code. General prose counts (`2 perusahaan`, `Soal 1 dari 10`, `0 subtes`) stay in `Plus Jakarta Sans` with `tabular-nums`.

## Layout

- **Learner Navigation Sidebar:** Fixed `256px` (`w-64`) left sidebar at `lg` (`≥1024px`). Below `lg`, the sidebar collapses into a sticky `56px` topbar and an Escape-dismissible slide-over drawer.
- **Dashboard 3-Column Workspace (`/`):** At `xl` (`≥1280px`), pairs the `256px` left sidebar with a fluid center canvas (`w-full flex-1`) and a sticky `320px` (`xl:w-80`) right learner rail showing local progress summary, readiness chart, and recent attempt activity. Below `xl`, the right rail stacks beneath the main content.
- **Fluid 2-Column Detail & Learning Pages (`/c/*`, `/riwayat`, `/materi/*`):** Pairs the `256px` left sidebar with a fluid full-width main workspace (`w-full`, `px-4 sm:px-6 lg:px-7`) so package listings, attempt history tables, and the 5-column English dictionary table (`md+`, switching to a compact `divide-y` list on mobile) breathe naturally across wide screens.
- **Focus Exam Shell (`/test/*`):** Full-bleed sticky header (`max-w-6xl`) with a 4px bottom answered-progress bar over a two-column workspace (`lg:grid-cols-[minmax(0,1fr)_280px]`): reading-measure question surface on the left and sticky 5-column question navigator on the right (collapsible drawer panel on mobile).
- **Admin CMS Shell (`/admin/*`):** Single-row sticky topbar (`h-14`, `max-w-5xl`) with direct `Paket Soal` and `Impor JSON` navigation links and centered flat list panels.

## Elevation & Depth

Surfaces rely primarily on tonal layering (Surface over Canvas) and crisp 1px hairline borders rather than heavy shadows. Drop shadows remain whisper-quiet on resting `rounded-2xl` panels in light mode (removed in dark mode via `dark:shadow-none`) and step up only for true floating overlays (mobile drawer and confirmation dialogs).

### Shadow Vocabulary
- **Panel Ambient** (`box-shadow: 0 2px 10px -4px rgba(15, 23, 42, 0.05)` in light mode, `none` in dark mode): Subtle grounding on primary `rounded-2xl` content surfaces.
- **Overlay Elevation** (`box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)`): Reserved exclusively for confirmation dialogs and mobile navigation drawer panels.

### Named Rules
**The Flat-By-Default Rule.** Never stack bordered cards inside bordered cards. Group related items inside a single `16px`-radius (`rounded-2xl`) panel separated by 1px horizontal dividers (`divide-y`) or borderless tonal `rounded-xl bg-canvas` inner tiles.

## Shapes

A clean, modern EdTech corner radius scale balances friendly approachability with assessment clarity:
- **Micro chips & keycaps** (`6px` / `rounded-md`): Question type badges, CEFR level badges, status tags, slug tags, and `<kbd>` chips.
- **Interactive controls & inner tonal tiles** (`12px` / `rounded-xl`): Buttons, selects, sidebar links, CEFR filter chips, answer options, question-number grid buttons, and borderless `bg-canvas` metric tiles.
- **Panels & modals** (`16px` / `rounded-2xl`): Dashboard containers, materi cards, dictionary filter/table/pagination panels, exam question surfaces, and confirmation dialogs.
- **Search pills & progress tracks** (`9999px` / `rounded-full`): Pill search bars (`rounded-full`), package/CEFR completion bars, and the 5-second `MEMORY` countdown bar.

## Components

Every interactive component defines clear default, hover, focus-visible (`2px solid var(--accent-text)` with `2px` offset — never strip focus rings with `focus:outline-none`), active, and disabled states, paired with restrained `180–220ms` exponential ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`) motion disabled under `prefers-reduced-motion`.

### Buttons
- **Shape:** Rounded (`12px` / `rounded-xl`), minimum `40px` touch target (`min-h-[40px]`, `min-h-[44px]` for primary study/option controls).
- **Primary:** Solid `#2563eb` fill, white bold text, `8px 16px` padding, hover `#1d4ed8`. Used strictly for the single primary task action per viewport region.
- **Secondary:** Surface or canvas fill with 1px strong border (`#cbd5e1` / `#334155`), primary ink text, subtle hover fill.
- **Tonal Active Chip:** `border-brand/40 bg-brand-soft text-brand-text` for active filter chips (such as CEFR level filters) so they do not compete with the primary CTA.
- **Inline Destructive Confirmation:** Two-step inline toggle (`Hapus` → `Ya, hapus` / `Batal`) in Admin CMS replacing blocking browser `window.confirm` dialogs.

### Chips & Badges
- **Style:** `6px` radius, 1px tinted semantic border and soft tinted background with ≥4.5:1 text contrast in both light and dark themes (`Teks`, `Gambar`, `Memori 5 dtk`, `Kecepatan`, `A1–C1`, `Benar`, `Salah`, `Kosong`).

### Cards / Containers
- **Corner Style:** `16px` (`rounded-2xl`) radius, `1px` hairline border (`border-line`: `#e2e8f0` / `#1f2937`), flat surface fill (`bg-surface`), subtle light-mode ambient shadow (`shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none`), internal padding `16px–24px`, internal sub-rows separated by `1px` dividers or borderless tonal tiles instead of nested bordered boxes.

### Inputs / Fields
- **Search Pill:** `rounded-full`, `1px` strong border, `bg-canvas` fill, left-aligned 16px search icon, visible `focus-visible:outline-2 focus-visible:outline-brand` ring.
- **Standard Selects & Inputs:** `12px` (`rounded-xl`) radius, `1px` strong border, `bg-canvas` fill, visible focus-visible outline.

### Navigation
- **Learner Sidebar:** Active route highlighted with `bg-subtle font-bold text-ink` (`rounded-xl`); inactive items use `text-ink-muted` and transition gently on hover.
- **Breadcrumbs:** Chevron-separated plain links (`Dashboard > Perusahaan > Paket`) directly above the page heading without decorative eyebrows.

### Focus Exam Workspace (Signature Component)
- Isolates the timed exam from global navigation, pairs a sticky tabular countdown clock and 4px progress bar with a 5-column question grid, provides a live 5-second visual decay bar for `MEMORY` SVGs, renders `<kbd>` desktop shortcut chips hidden on touch screens, protects active sessions with `beforeunload` and exit/submit confirmation dialogs, and keeps SVG diagrams crisp in both themes via `currentColor`.

## Do's and Don'ts

### Do:
- **Do** preserve a single clear primary `#2563eb` CTA per viewport region (such as highlighting only the next unfinished subtest in a package or `Belajar Kartu` in the dictionary header).
- **Do** use `--accent-text` (`#1d4ed8` light / `#60a5fa` dark) for blue text, active tonal filter labels, and links to guarantee WCAG AA contrast in both themes.
- **Do** keep `currentColor` SVG question plates inside a softly contrasted neutral frame so diagrams stay sharp in both light and dark modes.
- **Do** provide skeleton loading states (`loading.tsx`), empty states that explain the next step, and inline confirmation before destructive CMS deletes.

### Don't:
- **Don't** place uppercase eyebrow/kicker labels above headings — let breadcrumbs and headings carry their own hierarchy.
- **Don't** nest bordered cards inside other bordered cards or apply colored `border-left`/`border-right` stripes wider than `1px`.
- **Don't** use `font-mono` for non-measurement UI prose, `text-slate-400` for muted copy, font sizes below `12px` (`text-xs`), or Unicode emojis in place of the `1.75px` stroke SVG icon set.
- **Don't** remove keyboard focus outlines with `focus:outline-none` without an accessible `focus-visible:outline-2` replacement.
- **Don't** expose answer keys or explanations in client payloads before `/api/attempts` scores a submission on the server.
