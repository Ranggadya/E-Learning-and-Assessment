---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/c/[companySlug]/page.tsx","src/app/c/[companySlug]/[packageSlug]/page.tsx","src/app/test/[subtestId]/page.tsx","src/app/result/[attemptId]/page.tsx","src/app/admin/page.tsx","src/app/admin/import/page.tsx"]
---

# Surface Brief — e-assessment Dashboard & CMS Redesign

- **Scope:** Public learner dashboard (`/`, `/c/[companySlug]`, `/c/[companySlug]/[packageSlug]`, `/result/[attemptId]`), isolated focus exam runner (`/test/[subtestId]`), and simple Admin CMS (`/admin`, `/admin/import`).
- **Visitor Mode:** Operate
- **Audience & Job:** Indonesian job-seekers and students practicing multi-company timed psychometric tests without login, plus a single admin managing JSON test packs.
- **Constraints:** Preserve Next.js 16 App Router, PostgreSQL (`pg`), server-side grading without key leakage, `useCountdown` wall-clock timer, 4 question types (`TEXT`, `IMAGE`, `MEMORY`, `SPEED`), and JSON import/export/delete workflows. Track learner progress locally in `localStorage`. No empty placeholder menus for future e-learning modules.

## Direction contract

- **THESIS:** A calm, high-clarity Modern EdTech workspace (Dicoding, Coursera, and Linear craft bar) that gives learners an immediate dashboard view of companies, packages, and local progress while isolating active timed tests in a distraction-free exam shell — refusing cluttered gamification, nested card walls, and unstyled wireframe tables.
- **OWN-WORLD:** Crisp white sidebar (`#FFFFFF`) and cool slate canvas (`#F8FAFC`) in light mode, deep slate-navy canvas (`#0B1120`) and charcoal surface (`#111827`) in dark mode, `#2563EB` primary blue reserved strictly for primary actions and active state, semantic emerald/amber/red status tokens with ≥4.5:1 contrast, Inter UI typography with JetBrains Mono strictly for timers, scores, slugs, and JSON, and uniform 1.75px stroke SVG icons.
- **STORY:** Learners immediately see which company packages are available, where they left off, and their recent scores on this device; they start a timed subtest with confidence about duration and question types, complete it without accidental loss, and review mistakes effortlessly. Admins scan, import, export, and remove packs from a lightweight topbar CMS.
- **FIRST VIEWPORT:** Desktop 1440×900 opens with a 260px left navigation sidebar (`e-assessment` mark, Dashboard, dynamic company list with package counts, local progress summary, theme toggle, Admin link) beside a clean main canvas featuring the page heading (`Dashboard Latihan`), a primary `Lanjutkan Latihan` action, a 4-cell tabular KPI strip, and a two-column split showing company/package progress rows on the left and recent local attempt history on the right.
- **FORM:** Category standard (`canon`, Modern EdTech), chosen explicitly by the user on the direction decision page; `seed:3f16545f4302b7c3`.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
