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
  canvas-dark: "#0b1120"
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
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
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
  md: "8px"
  lg: "12px"
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
    backgroundColor: "{colors.primary-tint-light}"
    textColor: "{colors.primary-cobalt-hover}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  panel-surface:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input-field:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: e-assessment

## Overview

**Creative North Star: "The Calm Assessment Desk"**

`e-assessment` adopts the Modern EdTech category standard calibrated to the clarity and craft level of Dicoding, Coursera, and Linear. Every surface is built for sustained cognitive focus: candidates preparing for multi-company recruitment exams need immediate orientation across companies, packages, and local progress, followed by a distraction-free workspace during timed subtests and an effortless mistake-review flow afterward.

The system deliberately rejects gamified noise, saturated decoration, nested card stacks, and uppercase eyebrow kickers. Visual authority comes from disciplined hairline borders, crisp Inter typography, restrained cobalt blue reserved for a single primary action per view, and strict dual-theme parity between cool daytime slate and deep nighttime slate-navy.

**Key Characteristics:**
- Persistent 260px left sidebar on learner views paired with a distraction-free, sidebar-free Focus Exam Mode during active timed subtests.
- Lightweight topbar CMS layout for admin pack management without heavy navigation chrome.
- High-contrast light and dark modes with dedicated accessible text accents (`#1D4ED8` light / `#60A5FA` dark) separated from solid button fills (`#2563EB`).
- Strict numeric discipline: `tabular-nums` across all counts and `JetBrains Mono` reserved strictly for timers, score ratios, slugs, and JSON payloads.
- Uniform 1.75px stroke inline SVG icon library replacing Unicode symbols and emojis.

## Colors

A restrained neutral-slate palette anchored by a single cobalt primary accent and high-contrast semantic status tones, engineered for ≥4.5:1 WCAG AA readability in both light and dark themes.

### Primary
- **Primary Cobalt** (`#2563eb`): Solid fill for the single primary action per screen (CTA button, active question indicator, progress bar fill). Retains 5.17:1 contrast with white text in both light and dark modes.
- **Primary Cobalt Hover / Light Text Accent** (`#1d4ed8`): Hover state for primary buttons and accessible blue text/links on light backgrounds (`#FFFFFF`, `#EFF6FF`).
- **Primary Sky Dark** (`#60a5fa`): Accessible blue text, active sidebar label, and link color on dark backgrounds (`#111827`, `rgba(59, 130, 246, 0.16)`), achieving ≥5.7:1 contrast.
- **Primary Tint Light** (`#eff6ff`): Soft active background for selected navigation items and selected exam options in light mode (paired with `rgba(59, 130, 246, 0.16)` in dark mode).

### Neutral
- **Canvas Light / Dark** (`#f8fafc` / `#0b1120`): Outer application workspace ground that separates structural panels without heavy shadows.
- **Surface Light / Dark** (`#ffffff` / `#111827`): Elevated content panels, sidebar, sticky headers, and dialog surfaces.
- **Subtle Light / Dark** (`#f1f5f9` / `#1e293b`): Secondary wells, hover fills, keyboard shortcut keycaps, progress tracks, and inactive badge grounds.
- **Hairline Border Light / Dark** (`#e2e8f0` / `#1f2937`): Primary structural dividers, table rows, and container outlines (1px).
- **Strong Border Light / Dark** (`#cbd5e1` / `#334155`): Interactive outlines for secondary buttons, form inputs, and custom scrollbar thumbs.
- **Ink Primary / Secondary / Muted Light** (`#0f172a` / `#475569` / `#526075`) and **Dark** (`#f8fafc` / `#cbd5e1` / `#94a3b8`): Three-step readable text hierarchy keeping muted captions above 4.5:1 even on subtle surfaces.

### Semantic Status
- **Success Emerald** (`#059669`): Completed packages, answered question indicators, and correct review items.
- **Warning Amber** (`#d97706`): Final 60-second timer alert, 5-second `MEMORY` question countdown bar, and unanswered-question or replaced-attempt warnings.
- **Danger Crimson** (`#dc2626`): Final 30-second critical timer state, wrong review answers, validation errors, and destructive delete confirmations.

### Named Rules
**The Single Primary Action Rule.** Reserve solid Primary Cobalt (`#2563eb`) for at most one primary call-to-action in any viewport region. Secondary actions, non-next subtest rows, and pre-completion submit triggers remain crisp outlined surfaces.

**The Split Accent Contrast Rule.** Never reuse a mid-blue fill color directly as small text on dark translucent surfaces. Always pair solid fills (`--accent: #2563eb`) with dedicated text accents (`--accent-text: #1d4ed8` light / `#60a5fa` dark).

## Typography

**Display & Body Font:** Inter (self-hosted via `next/font/google`, fallback `ui-sans-serif, system-ui, sans-serif`)
**Data & Code Font:** JetBrains Mono (self-hosted via `next/font/google`, fallback `ui-monospace, SFMono-Regular, monospace`)

**Character:** Calm, neutral neo-grotesque clarity designed for long reading comprehension passages and rapid dashboard scanning, paired with a crisp technical monospace used only where fixed-width measurement or code meaning exists.

### Hierarchy
- **Headline** (Bold 700, 1.5rem–1.75rem, line-height 1.25, tracking `-0.02em`): Primary page titles (`Dashboard Latihan`, company/package headings, result titles).
- **Title** (Semibold 600, 1rem–1.125rem, line-height 1.35): Section titles, company headers, subtest titles, and modal headings.
- **Body** (Regular 400–Medium 500, 0.875rem–1.0625rem, line-height 1.6, max measure `65–70ch`): Exam question prompts, answer options, and explanations.
- **Label** (Medium 500–Semibold 600, 0.75rem, line-height 1.4): KPI labels, breadcrumbs, metadata strips, and status badges.
- **Numeric / Code** (JetBrains Mono Semibold 600–Bold 700, `tabular-nums`): Countdown clocks (`11:00`), score ratios (`13/15`, `87%`), slugs (`paket-1`), keyboard keycaps (`A–E`), and raw JSON import text.

### Named Rules
**The Earned Monospace Rule.** Use `JetBrains Mono` strictly for timers, score ratios/percentages, slugs, `<kbd>` shortcut chips, and JSON code. General prose counts (`2 perusahaan`, `Soal 1 dari 10`, `0 subtes`) stay in Inter with `tabular-nums`.

## Layout

- **Learner Dashboard Shell:** Fixed `260px` left sidebar at `lg` (`≥1024px`) with a `max-w-5xl` centered main canvas (`px-4 sm:px-6 lg:px-8`). Below `lg`, the sidebar collapses into a sticky 56px topbar and an Escape-dismissible slide-over drawer.
- **Dashboard Split:** Unified hairline-divided 4-column summary strip (`grid-cols-2 sm:grid-cols-4`) above a two-column workspace (`lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]`) placing company/package catalogs on the left and local attempt history on the right.
- **Focus Exam Shell:** Full-bleed sticky header (`max-w-6xl`) with a 4px bottom answered-progress bar over a two-column workspace (`lg:grid-cols-[minmax(0,1fr)_280px]`): reading-measure question surface on the left and sticky 5-column question navigator on the right (collapsible drawer panel on mobile).
- **Admin CMS Shell:** Single-row sticky topbar (`h-14`, `max-w-5xl`) with direct `Paket Soal` and `Impor JSON` navigation links and centered flat list panels.

## Elevation & Depth

Surfaces rely primarily on tonal layering (Surface over Canvas) and crisp 1px hairline borders rather than heavy shadows. Drop shadows remain whisper-quiet on resting panels and step up only for true floating overlays (mobile drawer and confirmation dialogs).

### Shadow Vocabulary
- **Panel Ambient** (`box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04)`): Subtle grounding on primary content surfaces in light mode.
- **Overlay Elevation** (`box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)`): Reserved exclusively for confirmation dialogs and mobile navigation drawer panels.

### Named Rules
**The Flat-By-Default Rule.** Never stack bordered cards inside bordered cards. Group related items inside a single `12px`-radius panel separated by 1px horizontal dividers (`divide-y`).

## Shapes

A tight, restrained corner radius scale keeps controls crisp and scannable without bubbly softness:
- **Micro chips & keycaps** (`6px` radius): Question type badges, status pills, slug tags, and `<kbd>` chips.
- **Interactive controls** (`8px` radius): Buttons, inputs, sidebar links, timer badge, and question-number grid buttons.
- **Panels & modals** (`12px` radius): Dashboard containers, exam question surface, answer option cards, SVG image frames, and confirmation dialogs.
- **Progress tracks** (`9999px` pill radius): Package completion bars and the 5-second `MEMORY` countdown bar.

## Components

Every interactive component defines clear default, hover, focus-visible (`2px solid var(--accent-text)` with `2px` offset), active, and disabled states, paired with restrained `180–220ms` exponential ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`) motion disabled under `prefers-reduced-motion`.

### Buttons
- **Shape:** Gently rounded (`8px` radius).
- **Primary:** Solid `#2563eb` fill, white semibold text, `8px 16px` padding, hover `#1d4ed8`. Used strictly for the primary task action.
- **Secondary:** Surface fill with 1px strong border (`#cbd5e1` / `#334155`), primary ink text, subtle hover fill.
- **Inline Destructive Confirmation:** Two-step inline toggle (`Hapus` → `Ya, hapus` / `Batal`) in Admin CMS replacing blocking browser `window.confirm` dialogs.

### Chips & Badges
- **Style:** `6px` radius, 1px tinted semantic border and soft tinted background with ≥4.5:1 text contrast in both light and dark themes (`Teks`, `Gambar`, `Memori 5 dtk`, `Kecepatan`, `Benar`, `Salah`, `Kosong`).

### Cards / Containers
- **Corner Style:** `12px` radius, `1px` hairline border (`#e2e8f0` / `#1f2937`), flat surface fill (`#ffffff` / `#111827`), internal padding `16px–28px`, internal sub-rows separated by `1px` dividers instead of nested boxes.

### Inputs / Fields
- **Style:** `8px` radius, `1px` hairline or strong border, surface/canvas fill, left-aligned 16px search icon where applicable, smooth border transition to `--accent` on focus.

### Navigation
- **Learner Sidebar:** Active route highlighted with `--accent-soft` fill and `--accent-text` semibold label; inactive items transition gently on hover.
- **Breadcrumbs:** Chevron-separated plain links (`Dashboard > Perusahaan > Paket`) directly above the page heading without decorative eyebrows.

### Focus Exam Workspace (Signature Component)
- Isolates the timed exam from global navigation, pairs a sticky tabular countdown clock and 4px progress bar with a 5-column question grid, provides a live 5-second visual decay bar for `MEMORY` SVGs, renders `<kbd>` desktop shortcut chips hidden on touch screens, protects active sessions with `beforeunload` and exit/submit confirmation dialogs, and keeps SVG diagrams crisp in both themes via `currentColor`.

## Do's and Don'ts

### Do:
- **Do** preserve a single clear primary `#2563eb` CTA per view (such as highlighting only the next unfinished subtest in a package).
- **Do** use `--accent-text` (`#1d4ed8` light / `#60a5fa` dark) for blue text, active nav states, and links to guarantee WCAG AA contrast in both themes.
- **Do** keep `currentColor` SVG question plates inside a softly contrasted neutral frame so diagrams stay sharp in both light and dark modes.
- **Do** provide skeleton loading states (`loading.tsx`), empty states that explain the next step, and inline confirmation before destructive CMS deletes.

### Don't:
- **Don't** place uppercase eyebrow/kicker labels above headings — let breadcrumbs and headings carry their own hierarchy.
- **Don't** nest bordered cards inside other bordered cards or apply colored `border-left`/`border-right` stripes wider than `1px`.
- **Don't** use `font-mono` for non-measurement UI prose or Unicode emojis in place of the 1.75px stroke SVG icon set.
- **Don't** expose answer keys or explanations in client payloads before `/api/attempts` scores a submission on the server.
