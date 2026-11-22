# Dashboard & Kerangka Navigasi Redesign (Varian 1A — Solid Cobalt Anchor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merombak kerangka sidebar (`LearnerShell`), halaman utama dashboard (`LearnerDashboard`), dan token visual ke gaya putih dominan + biru solid tegas (**Varian 1A — Solid Cobalt Anchor**), serta memindahkan daftar riwayat lengkap ke halaman khusus `/riwayat`.

**Architecture:** Logika perhitungan statistik progres, pemilihan fokus hero lintas paket (`computeNextAction`), prioritas & batas 4 paket per kartu perusahaan, monogram perusahaan, serta pemformatan badge riwayat diekstrak ke satu modul murni yang teruji (`src/lib/dashboard-helpers.ts`). Token visual diperkuat di `src/app/globals.css`, `getCompanies()` diperkaya 1 sub-query `subtest_count` untuk progres bar sidebar di seluruh rute, lalu UI dibangun di `LearnerShell`, `LearnerDashboard`, dan rute baru `src/app/riwayat/page.tsx` + `HistoryProgressView`.

**Tech Stack:** Next.js 16.4.6 (App Router, `force-dynamic`), React 19.3, TypeScript 5, Tailwind CSS 4.3, `node:test` via `tsx`, PostgreSQL (`pg` — read-only query tambahan tanpa migrasi skema).

**Spec:** `docs/superpowers/specs/2026-11-22-dashboard-redesign-design.md`

## Global Constraints

- Tanpa perubahan skema database PostgreSQL dan tanpa perubahan endpoint API.
- Tanpa akun/login peserta; progres tetap dibaca dari `useLocalProgress()` (`src/lib/local-progress.ts`, maks. 24 `recentAttempts`).
- Tanpa menambah dependency atau library ikon/font eksternal; tetap memakai `Inter`, `JetBrains Mono`, dan ikon SVG vektor di `src/components/ui/Icons.tsx` (nol ikon emoji).
- Mendukung semua 4 `SubtestKind` (`QUIZ`, `PERSONALITY`, `PAULI`, `DRAWING`); subtes non-`QUIZ` tidak boleh masuk hitungan total soal kuis maupun rata-rata persentase skor kuis.
- Mendukung Light Mode & Dark Mode dengan kontras teks normal ≥ 4.5:1, navigasi keyboard + `:focus-visible`, drawer mobile tertutup via `Escape`, `prefers-reduced-motion`, dan layout responsif `375px`–`1440px+`.
- Semua perintah shell berjalan di Windows PowerShell (gunakan `;` sebagai pemisah perintah, bukan `&&`).

## Review Focus

1. **Riwayat lokal basi (`stale localStorage`)**: `recentAttempts[0]` menunjuk ke perusahaan/paket/subtes yang sudah dihapus admin dari `catalog` → `computeNextAction` harus tetap jatuh ke subtes/paket aktif berikutnya yang belum selesai tanpa link rusak, dan `formatAttemptBadge` tetap merender aman dengan fallback `QUIZ`.
2. **Kebocoran subtes non-`QUIZ` ke skor rata-rata/jumlah soal**: Subtes `PERSONALITY`, `PAULI`, atau `DRAWING` yang sudah dikerjakan (termasuk `totalQuestions === 0` atau skor mentah tinggi) tidak boleh masuk `totalQuestions` maupun `avgAccuracy` pada `computeDashboardStats` (tidak menghasilkan `NaN%` atau menggeser akurasi kuis).
3. **Nama perusahaan tak biasa pada monogram**: Prefiks badan usaha campuran huruf besar/kecil/titik (`"PT. Astra International Tbk"`, `"CV  Maju"`, `"ParagonCorp"`, `"A"`, `"---"`) harus menghasilkan monogram 1–2 huruf kapital deterministik tanpa menghasilkan `"PT"` atau string kosong.
4. **Subtes 0 soal & paket kosong**: Subtes dengan `questionCount === 0` tidak boleh dipilih oleh `computeNextAction`, dan paket dengan `subtests.length === 0` tidak boleh diurutkan sebagai selesai (`Lengkap`) atau membuat rasio `NaN`.
5. **Pencarian menembus batas 4 paket per kartu**: Saat perusahaan punya > 4 paket dan pengguna mencari kata kunci yang cocok pada paket ke-5..8, batas 4 paket harus di-bypass (`hiddenCount === 0`) dan seluruh paket yang cocok tampil.

---

## File Map

| File | Aksi | Tanggung Jawab |
|---|---|---|
| `src/lib/dashboard-helpers.ts` | Create | Fungsi murni: statistik progres, `computeNextAction` 3-state lintas paket, monogram perusahaan, pengurutan & pembatasan 4 paket per kartu, chip jenis subtes, pemformatan badge & tanggal riwayat. |
| `src/lib/dashboard-helpers.test.ts` | Create | Unit test (`node:test`) yang mengunci semua perilaku fungsi murni + 5 kasus Review Focus. |
| `src/app/globals.css` | Modify | Token warna Varian 1A Light & Dark (`#1d4ed8`, `#1e3a8a`, `#b8c4d4`, `#0b1220`, `--color-brand-deep`). |
| `src/lib/types.ts` | Modify | Tambah `subtestCount: number` pada interface `Company`. |
| `src/lib/queries.ts` | Modify | Tambah sub-query `subtest_count` pada `getCompanies()`. |
| `src/components/ui/Icons.tsx` | Modify | Tambah `IconHistory` (stroke `1.75`). |
| `src/components/layout/LearnerShell.tsx` | Modify | Sidebar `248px`, `max-w-6xl`, menu `Riwayat & Progres` (`/riwayat`) + badge, state aktif biru solid, progress bar lokal footer, mobile topbar/drawer. |
| `src/components/dashboard/LearnerDashboard.tsx` | Modify | Top header + pencarian inline, Solid Cobalt Focus Hero Banner, grid 2 kolom kartu perusahaan bermonogram dengan cap 4 paket + overflow link + empty states. |
| `src/app/riwayat/page.tsx` | Create | Server route `/riwayat` (`force-dynamic`, metadata title `"Riwayat & Progres"`). |
| `src/components/dashboard/HistoryProgressView.tsx` | Create | Halaman klien `/riwayat`: 3 kartu ringkasan progres, daftar lengkap sesi lokal dengan lookup `subtestKind`, reset 2 langkah, empty state. |
| `src/components/dashboard/CompanyPackagesView.tsx` | Modify | Penyelarasan ketebalan border (`border-line-strong`) dan heading bold agar selaras dengan Varian 1A. |
| `src/components/dashboard/PackageSubtestsView.tsx` | Modify | Penyelarasan ketebalan border (`border-line-strong`) dan heading bold agar selaras dengan Varian 1A. |
| `.gitignore` | Modify | Tambah `.superpowers/` agar file brainstorming visual sementara tidak ikut ter-commit. |

---

### Task 1: Pure Dashboard Helpers & Unit Tests

**Files:**
- Create: `src/lib/dashboard-helpers.ts`
- Create: `src/lib/dashboard-helpers.test.ts`

**Interfaces:**
- Consumes: `DashboardCompany`, `DashboardPackage`, `DashboardSubtest`, `SUBTEST_UNIT`, `SubtestKind` from `@/lib/types`; `LocalAttemptRecord`, `LocalProgressStore` from `@/lib/local-progress`
- Produces:
  - `export interface DashboardStats { totalCompanies: number; totalPackages: number; totalSubtests: number; totalQuestions: number; completedSubtests: number; avgAccuracy: number | null; }`
  - `export type NextActionMode = "resume" | "completed" | "start";`
  - `export interface NextAction { mode: NextActionMode; href: string; tag: string; title: string; meta: string; ctaLabel: string; }`
  - `export interface VisiblePackagesResult { visible: DashboardPackage[]; hiddenCount: number; }`
  - `export interface AttemptBadge { label: string; tone: "emerald" | "amber" | "red" | "blue"; }`
  - `export function computeDashboardStats(catalog: DashboardCompany[], progress: LocalProgressStore): DashboardStats`
  - `export function computeNextAction(catalog: DashboardCompany[], progress: LocalProgressStore): NextAction | null`
  - `export function getCompanyMonogram(name: string): string`
  - `export function selectCompanyPackages(packages: DashboardPackage[], progress: LocalProgressStore, bypassCap: boolean, maxVisible?: number): VisiblePackagesResult`
  - `export function getPackageKindChips(subtests: DashboardSubtest[]): string[]`
  - `export function formatAttemptBadge(attempt: LocalAttemptRecord, kind: SubtestKind): AttemptBadge`
  - `export function formatShortDate(iso: string): string`

- [ ] **Step 1: Write failing unit tests in `src/lib/dashboard-helpers.test.ts`**

Tulis test `node:test` yang menguji semua kontrak & seluruh 5 kasus **Review Focus**:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  computeDashboardStats,
  computeNextAction,
  formatAttemptBadge,
  getCompanyMonogram,
  getPackageKindChips,
  selectCompanyPackages,
} from "./dashboard-helpers";
import type { LocalProgressStore } from "./local-progress";
import type { DashboardCompany, DashboardPackage } from "./types";

const EMPTY_PROGRESS: LocalProgressStore = { bySubtestId: {}, recentAttempts: [] };

function makeCatalog(): DashboardCompany[] {
  return [
    {
      id: 1,
      slug: "astra",
      name: "PT Astra International",
      description: null,
      packages: [
        {
          id: 10,
          slug: "paket-1",
          name: "Paket 1",
          description: null,
          subtests: [
            { id: 101, slug: "verbal", name: "Verbal", durationSeconds: 600, questionCount: 15, questionTypes: ["TEXT"], kind: "QUIZ", config: null },
            { id: 102, slug: "kepribadian", name: "Kepribadian", durationSeconds: 900, questionCount: 45, questionTypes: [], kind: "PERSONALITY", config: null },
            { id: 103, slug: "kosong", name: "Kosong", durationSeconds: 300, questionCount: 0, questionTypes: [], kind: "QUIZ", config: null },
          ],
        },
        {
          id: 11,
          slug: "paket-2",
          name: "Paket 2",
          description: null,
          subtests: [
            { id: 104, slug: "numerik", name: "Numerik", durationSeconds: 720, questionCount: 20, questionTypes: ["TEXT"], kind: "QUIZ", config: null },
          ],
        },
      ],
    },
    {
      id: 2,
      slug: "paragon",
      name: "ParagonCorp",
      description: null,
      packages: [
        {
          id: 20,
          slug: "paket-1",
          name: "Paket 1",
          description: null,
          subtests: [
            { id: 201, slug: "pauli", name: "Pauli", durationSeconds: 300, questionCount: 10, questionTypes: [], kind: "PAULI", config: null },
            { id: 202, slug: "gambar", name: "Menggambar", durationSeconds: 600, questionCount: 2, questionTypes: [], kind: "DRAWING", config: null },
          ],
        },
      ],
    },
  ];
}

test("computeDashboardStats mengecualikan non-QUIZ dari totalQuestions dan avgAccuracy", () => {
  const catalog = makeCatalog();
  const progress: LocalProgressStore = {
    bySubtestId: {
      "101": { bestScore: 12, lastScore: 12, totalQuestions: 15, lastAttemptId: 1, attemptsCount: 1, lastCompletedAt: "2026-11-22T10:00:00Z" },
      "102": { bestScore: 45, lastScore: 45, totalQuestions: 45, lastAttemptId: 2, attemptsCount: 1, lastCompletedAt: "2026-11-22T10:10:00Z" },
      "201": { bestScore: 0, lastScore: 0, totalQuestions: 0, lastAttemptId: 3, attemptsCount: 1, lastCompletedAt: "2026-11-22T10:20:00Z" },
    },
    recentAttempts: [],
  };
  const stats = computeDashboardStats(catalog, progress);
  assert.equal(stats.totalCompanies, 2);
  assert.equal(stats.totalPackages, 3);
  assert.equal(stats.totalSubtests, 6);
  assert.equal(stats.totalQuestions, 35);
  assert.equal(stats.completedSubtests, 3);
  assert.equal(stats.avgAccuracy, 80);
});

test("computeNextAction: pengguna baru mengarah ke paket pertama (mode start) dan melewatkan subtes 0 soal", () => {
  const catalog = makeCatalog();
  const action = computeNextAction(catalog, EMPTY_PROGRESS);
  assert.ok(action);
  assert.equal(action.mode, "start");
  assert.equal(action.href, "/c/astra/paket-1");
  assert.equal(action.tag, "MULAI LATIHAN");
  assert.equal(action.ctaLabel, "Mulai");
});

test("computeNextAction: maju lintas paket di perusahaan sama, lalu perusahaan lain, lalu completed jika 100% tuntas", () => {
  const catalog = makeCatalog();
  const latestBase = {
    attemptId: 9,
    subtestId: 102,
    subtestName: "Kepribadian",
    companySlug: "astra",
    companyName: "PT Astra International",
    packageSlug: "paket-1",
    packageName: "Paket 1",
    score: 45,
    totalQuestions: 45,
    completedAt: "2026-11-22T10:00:00Z",
  };

  // Paket 1 selesai semua subtes ber-soal (101 & 102; 103 punya 0 soal) -> lanjut ke Paket 2 (104)
  const sameCompany = computeNextAction(catalog, {
    bySubtestId: {
      "101": { bestScore: 12, lastScore: 12, totalQuestions: 15, lastAttemptId: 8, attemptsCount: 1, lastCompletedAt: "2026-11-22T09:00:00Z" },
      "102": { bestScore: 45, lastScore: 45, totalQuestions: 45, lastAttemptId: 9, attemptsCount: 1, lastCompletedAt: "2026-11-22T10:00:00Z" },
    },
    recentAttempts: [latestBase],
  });
  assert.equal(sameCompany?.mode, "resume");
  assert.equal(sameCompany?.href, "/test/104");

  // Semua paket Astra selesai -> lanjut ke Paragon (201)
  const crossCompany = computeNextAction(catalog, {
    bySubtestId: {
      "101": { bestScore: 12, lastScore: 12, totalQuestions: 15, lastAttemptId: 8, attemptsCount: 1, lastCompletedAt: "2026-11-22T09:00:00Z" },
      "102": { bestScore: 45, lastScore: 45, totalQuestions: 45, lastAttemptId: 9, attemptsCount: 1, lastCompletedAt: "2026-11-22T10:00:00Z" },
      "104": { bestScore: 18, lastScore: 18, totalQuestions: 20, lastAttemptId: 10, attemptsCount: 1, lastCompletedAt: "2026-11-22T11:00:00Z" },
    },
    recentAttempts: [{ ...latestBase, attemptId: 10, subtestId: 104, packageSlug: "paket-2", packageName: "Paket 2" }],
  });
  assert.equal(crossCompany?.mode, "resume");
  assert.equal(crossCompany?.href, "/test/201");

  // 100% playable subtests selesai -> mode completed ke paket terakhir
  const allDone = computeNextAction(catalog, {
    bySubtestId: {
      "101": { bestScore: 12, lastScore: 12, totalQuestions: 15, lastAttemptId: 8, attemptsCount: 1, lastCompletedAt: "2026-11-22T09:00:00Z" },
      "102": { bestScore: 45, lastScore: 45, totalQuestions: 45, lastAttemptId: 9, attemptsCount: 1, lastCompletedAt: "2026-11-22T10:00:00Z" },
      "104": { bestScore: 18, lastScore: 18, totalQuestions: 20, lastAttemptId: 10, attemptsCount: 1, lastCompletedAt: "2026-11-22T11:00:00Z" },
      "201": { bestScore: 100, lastScore: 100, totalQuestions: 120, lastAttemptId: 11, attemptsCount: 1, lastCompletedAt: "2026-11-22T12:00:00Z" },
      "202": { bestScore: 2, lastScore: 2, totalQuestions: 2, lastAttemptId: 12, attemptsCount: 1, lastCompletedAt: "2026-11-22T13:00:00Z" },
    },
    recentAttempts: [{ ...latestBase, attemptId: 12, subtestId: 202, companySlug: "paragon", companyName: "ParagonCorp", packageSlug: "paket-1", packageName: "Paket 1" }],
  });
  assert.equal(allDone?.mode, "completed");
  assert.equal(allDone?.tag, "SEMUA LATIHAN SELESAI");
  assert.equal(allDone?.href, "/c/paragon/paket-1");
});

test("computeNextAction menangani riwayat lokal basi (perusahaan/paket terhapus) tanpa rusak", () => {
  const catalog = makeCatalog();
  const action = computeNextAction(catalog, {
    bySubtestId: {},
    recentAttempts: [
      {
        attemptId: 99,
        subtestId: 999,
        subtestName: "Terhapus",
        companySlug: "deleted-co",
        companyName: "Deleted",
        packageSlug: "deleted-pkg",
        packageName: "Deleted",
        score: 5,
        totalQuestions: 10,
        completedAt: "2026-11-22T08:00:00Z",
      },
    ],
  });
  assert.equal(action?.mode, "resume");
  assert.equal(action?.href, "/test/101");
});

test("getCompanyMonogram melewati prefiks badan usaha dan menangani edge case nama", () => {
  assert.equal(getCompanyMonogram("PT Astra International"), "AI");
  assert.equal(getCompanyMonogram("PT. Astra International Tbk"), "AI");
  assert.equal(getCompanyMonogram("ParagonCorp"), "PA");
  assert.equal(getCompanyMonogram("CV  Maju"), "MA");
  assert.equal(getCompanyMonogram("A"), "A");
  assert.equal(getCompanyMonogram("---"), "EA");
});

test("selectCompanyPackages memprioritaskan in-progress -> unstarted -> completed, cap 4, dan bypass saat pencarian", () => {
  const mkPkg = (id: number, subIds: number[]): DashboardPackage => ({
    id,
    slug: `p-${id}`,
    name: `Paket ${id}`,
    description: null,
    subtests: subIds.map((sid) => ({
      id: sid,
      slug: `s-${sid}`,
      name: `S${sid}`,
      durationSeconds: 300,
      questionCount: 10,
      questionTypes: ["TEXT"],
      kind: "QUIZ",
      config: null,
    })),
  });

  const pkgs: DashboardPackage[] = [
    mkPkg(1, [1]),       // completed
    mkPkg(2, [2, 3]),    // unstarted
    mkPkg(3, [4, 5]),    // in-progress
    mkPkg(4, [6]),       // unstarted
    mkPkg(5, [7]),       // unstarted
    mkPkg(6, []),        // empty (must NOT be treated as completed!)
  ];
  const progress: LocalProgressStore = {
    bySubtestId: {
      "1": { bestScore: 8, lastScore: 8, totalQuestions: 10, lastAttemptId: 1, attemptsCount: 1, lastCompletedAt: "2026-11-22T09:00:00Z" },
      "4": { bestScore: 7, lastScore: 7, totalQuestions: 10, lastAttemptId: 2, attemptsCount: 1, lastCompletedAt: "2026-11-22T09:05:00Z" },
    },
    recentAttempts: [],
  };

  const capped = selectCompanyPackages(pkgs, progress, false, 4);
  assert.deepEqual(capped.visible.map((p) => p.id), [3, 2, 4, 5]);
  assert.equal(capped.hiddenCount, 2);

  const bypassed = selectCompanyPackages(pkgs, progress, true, 4);
  assert.equal(bypassed.visible.length, 6);
  assert.equal(bypassed.hiddenCount, 0);
  // Paket kosong (6) masuk kelompok unstarted sebelum completed (1)
  assert.equal(bypassed.visible[5].id, 1);
});

test("getPackageKindChips dan formatAttemptBadge menangani 4 SubtestKind dengan benar", () => {
  const catalog = makeCatalog();
  assert.deepEqual(getPackageKindChips(catalog[0].packages[0].subtests), ["Kognitif", "Kepribadian"]);
  assert.deepEqual(getPackageKindChips(catalog[1].packages[0].subtests), ["Pauli", "Menggambar"]);

  const base = {
    attemptId: 1, subtestId: 1, subtestName: "X", companySlug: "c", companyName: "C",
    packageSlug: "p", packageName: "P", score: 12, totalQuestions: 15, completedAt: "2026-11-22T10:00:00Z",
  };
  assert.deepEqual(formatAttemptBadge(base, "QUIZ"), { label: "12/15 (80%)", tone: "emerald" });
  assert.deepEqual(formatAttemptBadge({ ...base, score: 9 }, "QUIZ"), { label: "9/15 (60%)", tone: "amber" });
  assert.deepEqual(formatAttemptBadge({ ...base, score: 4 }, "QUIZ"), { label: "4/15 (27%)", tone: "red" });
  assert.deepEqual(formatAttemptBadge(base, "PERSONALITY"), { label: "Profil Tersimpan", tone: "blue" });
  assert.deepEqual(formatAttemptBadge({ ...base, score: 85, totalQuestions: 100 }, "PAULI"), { label: "85/100 benar", tone: "blue" });
  assert.deepEqual(formatAttemptBadge({ ...base, score: 0, totalQuestions: 0 }, "PAULI"), { label: "Selesai", tone: "blue" });
  assert.deepEqual(formatAttemptBadge(base, "DRAWING"), { label: "Gambar Tersimpan", tone: "blue" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/dashboard-helpers.test.ts`
Expected: FAIL (`Cannot find module './dashboard-helpers'`)

- [ ] **Step 3: Implement `src/lib/dashboard-helpers.ts`**

Implementasikan semua fungsi sesuai antarmuka di atas:
- `computeDashboardStats`: iterasi `catalog`; `totalQuestions` dan `avgAccuracy` hanya menghitung `subtest.kind === "QUIZ"` (dan `record.totalQuestions > 0` untuk rasio skor).
- `computeNextAction`:
  - Helper internal `findFirstUnfinished(subtests, progress)` mensyaratkan `s.questionCount > 0 && !progress.bySubtestId[String(s.id)]`.
  - Jika `progress.recentAttempts.length === 0`: cari paket pertama yang punya minimal 1 subtes dengan `questionCount > 0`; kembalikan mode `"start"`, `href: /c/${company.slug}/${pkg.slug}`, `tag: "MULAI LATIHAN"`, `ctaLabel: "Mulai"`, `title: "${company.name} · ${pkg.name}"`, `meta` berisi jumlah subtes & estimasi menit.
  - Jika ada riwayat: cari di paket terakhir → paket lain di perusahaan sama → seluruh katalog; bila ketemu kembalikan mode `"resume"`, `href: /test/${subtest.id}`, `tag: "LANJUTKAN LATIHAN"`, `ctaLabel: "Lanjutkan"`, `title: "${company.name} · ${pkg.name} — ${subtest.name}"`, `meta: "${subtest.questionCount} ${SUBTEST_UNIT[subtest.kind]} · ${Math.max(1, Math.round(subtest.durationSeconds / 60))} menit · Timer otomatis"`.
  - Jika 100% playable subtests selesai: kembalikan mode `"completed"`, `tag: "SEMUA LATIHAN SELESAI"`, `ctaLabel: "Buka Paket"`, mengarah ke paket terakhir (atau paket playable pertama jika paket terakhir sudah dihapus).
- `getCompanyMonogram`: hapus tanda baca non-alfanumerik, pisah kata, filter prefiks badan usaha (`PT`, `CV`, `UD`, `TBK`, `PERSERO`) case-insensitive; jika tersisa ≥ 2 kata ambil huruf awal 2 kata pertama; jika 1 kata ambil 2 huruf awal; fallback `"EA"`.
- `selectCompanyPackages`: kelompokkan ke `inProgress` (`done > 0 && done < total`), `unstarted` (`done === 0 || total === 0`), `completed` (`total > 0 && done === total`); gabung berurutan; jika `bypassCap` kembalikan semua dengan `hiddenCount: 0`, else potong `maxVisible` (default `4`).
- `getPackageKindChips`: peta unik maks 3 chip (`QUIZ` → `"Kognitif"`, `PERSONALITY` → `"Kepribadian"`, `PAULI` → `"Pauli"`, `DRAWING` → `"Menggambar"`).
- `formatAttemptBadge` dan `formatShortDate` (`Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })`).

- [ ] **Step 4: Run unit tests to verify they pass**

Run: `npx tsx --test src/lib/dashboard-helpers.test.ts`
Expected: PASS (6/6 tests pass, 0 failures)

- [ ] **Step 5: Commit Task 1**

```powershell
git add src/lib/dashboard-helpers.ts src/lib/dashboard-helpers.test.ts ; git commit -m "feat: add pure dashboard helpers and unit tests"
```

---

### Task 2: Visual Tokens (Varian 1A), `Company.subtestCount`, & `IconHistory`

**Files:**
- Modify: `src/app/globals.css:5-53`
- Modify: `src/lib/types.ts:203-209`
- Modify: `src/lib/queries.ts:45-68`
- Modify: `src/components/ui/Icons.tsx:310-324`

**Interfaces:**
- Consumes: existing Tailwind v4 `@theme inline` block in `src/app/globals.css` and `baseProps` in `src/components/ui/Icons.tsx`
- Produces:
  - CSS utility token `bg-brand-deep` / `text-brand-deep` (`--color-brand-deep: var(--accent-deep)`) + tightened `--border-default`, `--border-strong`, `--text-primary`, `--accent`, `--accent-hover` in Light & Dark modes
  - `Company.subtestCount: number` returned by `getCompanies()`
  - `export function IconHistory(props: IconProps)` in `src/components/ui/Icons.tsx`

- [ ] **Step 1: Update design tokens in `src/app/globals.css`**

Perbarui `:root`, `.dark`, dan `@theme inline` sesuai tabel token Spec §5.1:
- Light: `--bg-canvas: #f8fafc`, `--bg-surface: #ffffff`, `--bg-subtle: #f1f5f9`, `--border-default: #d5dde8`, `--border-strong: #b8c4d4`, `--text-primary: #0b1220`, `--text-secondary: #334155`, `--text-muted: #526075`, `--accent: #1d4ed8`, `--accent-hover: #1e40af`, `--accent-deep: #1e3a8a`, `--accent-text: #1d4ed8`, `--accent-soft: #eff6ff`.
- Dark: `--bg-canvas: #090e1a`, `--bg-surface: #111827`, `--bg-subtle: #1e293b`, `--border-default: #243044`, `--border-strong: #36465f`, `--text-primary: #f8fafc`, `--text-secondary: #cbd5e1`, `--text-muted: #94a3b8`, `--accent: #2563eb`, `--accent-hover: #1d4ed8`, `--accent-deep: #1d4ed8`, `--accent-text: #60a5fa`, `--accent-soft: rgba(59, 130, 246, 0.18)`.
- Tambah `--color-brand-deep: var(--accent-deep);` di `@theme inline`.

- [ ] **Step 2: Add `subtestCount: number` to `Company` in `src/lib/types.ts` and populate it in `src/lib/queries.ts`**

Di `src/lib/queries.ts` (`CompanyRow` & `getCompanies()`), tambahkan sub-query berkorelasi:
`(SELECT COUNT(*) FROM subtests s JOIN test_packages p ON p.id = s.test_package_id WHERE p.company_id = c.id) AS subtest_count`
dan petakan `subtestCount: Number(row.subtest_count)`.

- [ ] **Step 3: Add `IconHistory` to `src/components/ui/Icons.tsx`**

Tambahkan `export function IconHistory(props: IconProps)` memakai `baseProps(props)` dengan SVG jam berpanah balik konsisten (`<path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" />`).

- [ ] **Step 4: Run typecheck & lint**

Run: `npx tsc --noEmit ; npm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit Task 2**

```powershell
git add src/app/globals.css src/lib/types.ts src/lib/queries.ts src/components/ui/Icons.tsx ; git commit -m "feat: apply solid cobalt tokens, company subtest count, and history icon"
```

---

### Task 3: Redesigned Sidebar Shell (`LearnerShell.tsx`)

**Files:**
- Modify: `src/components/layout/LearnerShell.tsx:1-218`

**Interfaces:**
- Consumes: `Company` (termasuk `subtestCount`) from `@/lib/types`; `useLocalProgress` from `@/lib/local-progress`; `IconBuilding`, `IconClose`, `IconDashboard`, `IconHistory`, `IconMenu`, `IconShield` from `@/components/ui/Icons`; `ThemeToggle` from `@/components/ThemeToggle`
- Produces: `LearnerShell({ companies, children }: LearnerShellProps)` tetap mempertahankan signature props agar semua 5 rute (`/`, `/riwayat`, `/c/[companySlug]`, `/c/[companySlug]/[packageSlug]`, `/result/[attemptId]`) kompatibel penuh.

- [ ] **Step 1: Redesign `src/components/layout/LearnerShell.tsx` sesuai Spec §5.2**

Terapkan perubahan persis sesuai Spec §5.2:
- Sidebar desktop lebar `w-[248px]` dengan `border-r border-line-strong bg-surface`, konten utama `lg:pl-[248px]` dan container `max-w-6xl`.
- Brand header berbingkai `border-b border-line pb-4` dengan kotak monogram `eA` (`h-7 w-7 rounded-md bg-brand text-xs font-extrabold text-white`).
- Grup `MENU UTAMA` (`text-[11px] font-bold uppercase tracking-wider text-ink-muted`):
  - `Dashboard` (`/`) dengan `IconDashboard`.
  - `Riwayat & Progres` (`/riwayat`, aktif saat `pathname === "/riwayat"`) dengan `IconHistory` + badge jumlah `progress.recentAttempts.length` (hanya tampil bila `> 0`).
  - State aktif memakai **blok biru solid** (`bg-brand font-bold text-white shadow-xs`, badge `bg-white/20 text-white`).
- Grup `PERUSAHAAN` dengan daftar `companies`, badge `company.packageCount`, dan state aktif biru solid yang sama.
- Footer sidebar:
  - Kartu progres lokal berbingkai `rounded-lg border border-line-strong bg-subtle px-3 py-2.5` menampilkan `Progres lokal`, rasio mono `{completedSubtestCount}/{totalSubtests}` (fallback `{completedSubtestCount} subtes` bila `totalSubtests === 0`), dan progress bar biru `h-1.5 rounded-[3px]` dengan lebar ter-clamp `0..100%`.
  - `ThemeToggle` + baris bawah `CMS Admin` (`/admin`) dan `Latihan mandiri`.
- Mobile topbar `border-b border-line-strong` + drawer `animate-drawer` menutup via backdrop dan tombol `Escape`.

- [ ] **Step 2: Run typecheck & lint**

Run: `npx tsc --noEmit ; npm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit Task 3**

```powershell
git add src/components/layout/LearnerShell.tsx ; git commit -m "feat: redesign LearnerShell sidebar with solid cobalt active states and history nav"
```

---

### Task 4: Redesigned Dashboard Home (`LearnerDashboard.tsx`)

**Files:**
- Modify: `src/components/dashboard/LearnerDashboard.tsx:1-462`

**Interfaces:**
- Consumes: `computeDashboardStats`, `computeNextAction`, `getCompanyMonogram`, `getPackageKindChips`, `selectCompanyPackages` from `@/lib/dashboard-helpers`; `useLocalProgress` from `@/lib/local-progress`; `DashboardCompany` from `@/lib/types`
- Produces: `LearnerDashboard({ catalog }: LearnerDashboardProps)` (signature tetap sama untuk `src/app/page.tsx`)

- [ ] **Step 1: Redesign `src/components/dashboard/LearnerDashboard.tsx` sesuai Spec §5.3**

Bangun ulang tampilan beranda menjadi 3 blok tajam:
1. **Top Header + Pencarian Inline:** `<h1>` `Dashboard Latihan` (`text-2xl font-extrabold tracking-tight text-ink sm:text-[26px]`), subjudul 1 baris singkat, dan kotak pencarian `Cari perusahaan, paket, atau subtes...` (`border-line-strong bg-surface focus:border-brand focus:ring-2 focus:ring-brand/15`) hanya saat `catalog.length > 0`.
2. **Solid Cobalt Focus Hero Banner** *(jika `nextAction !== null`)*:
   - Kontainer `rounded-[10px] bg-brand p-5 text-white shadow-[0_6px_18px_rgba(29,78,216,0.22)] dark:shadow-none sm:p-6`.
   - Kiri: pill uppercase `bg-white/18` (`nextAction.tag`), judul `text-lg font-extrabold tracking-tight sm:text-xl` (`nextAction.title`), baris info `text-sm text-blue-100` (`nextAction.meta`).
   - Kanan: blok `PROGRES LOKAL` (`border-t border-white/20 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right`) menampilkan `{stats.completedSubtests}/{stats.totalSubtests}` + `· {stats.avgAccuracy}%` (bila ada) dan tautan `Buka Riwayat →` (`/riwayat`), berdampingan dengan tombol CTA putih kontras tinggi (`rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-brand-deep transition hover:bg-blue-50`) bertuliskan `{nextAction.ctaLabel}` + `IconArrowRight`.
3. **Katalog Perusahaan — Grid 2 Kolom Penuh** (`grid gap-4 md:grid-cols-2 md:items-start`):
   - Hapus strip 4 KPI lama dan kolom riwayat kanan (sudah pindah ke `/riwayat`).
   - Setiap kartu perusahaan (`rounded-[10px] border border-line-strong bg-surface shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-none overflow-hidden`):
     - Header (`bg-subtle/75 border-b border-line px-4 py-3.5`): monogram `h-9 w-9 rounded-lg bg-brand-deep text-xs font-extrabold text-white` (`getCompanyMonogram(company.name)`), nama perusahaan (link ke `/c/{slug}`), metadata `{company.packages.length} paket · {companyCompleted}/{companyTotalSubtests} subtes selesai`, link kanan `Semua` + `IconChevronRight`.
     - Daftar paket dari `selectCompanyPackages(company.packages, progress, isSearching, 4)`: baris clickable ke `/c/{company.slug}/{pkg.slug}`, nama paket `font-bold`, badge `Lengkap` saat `doneSub === totalSub && totalSub > 0`, chip dari `getPackageKindChips(pkg.subtests)` + jumlah soal kuis (bila `> 0`) + `~{totalMinutes} mnt`, dan di kanan rasio mono `{doneSub}/{totalSub}` + bar `h-1.5 rounded-[3px] bg-brand`.
     - Jika `hiddenCount > 0`, tampilkan baris footer `Lihat {hiddenCount} paket lainnya` → `/c/{company.slug}`.
   - Empty states: katalog kosong (`Buka CMS Admin`) dan pencarian tidak cocok (dengan tombol `Reset pencarian` yang memanggil `setQuery("")`).

- [ ] **Step 2: Run typecheck, unit tests, & lint**

Run: `npx tsx --test src/lib/dashboard-helpers.test.ts ; npx tsc --noEmit ; npm run lint`
Expected: Semua test PASS, 0 TypeScript errors, 0 ESLint errors/warnings.

- [ ] **Step 3: Commit Task 4**

```powershell
git add src/components/dashboard/LearnerDashboard.tsx ; git commit -m "feat: redesign LearnerDashboard with solid cobalt hero and 2-column company grid"
```

---

### Task 5: Halaman Baru `/riwayat`, Penyelarasan Halaman Sekunder, & Verifikasi Penuh

**Files:**
- Create: `src/app/riwayat/page.tsx`
- Create: `src/components/dashboard/HistoryProgressView.tsx`
- Modify: `src/components/dashboard/CompanyPackagesView.tsx:45-70`
- Modify: `src/components/dashboard/PackageSubtestsView.tsx:47-98`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `getCompanies`, `getDashboardCatalog` from `@/lib/queries`; `LearnerShell` from `@/components/layout/LearnerShell`; `clearLocalProgress`, `useLocalProgress` from `@/lib/local-progress`; `computeDashboardStats`, `formatAttemptBadge`, `formatShortDate` from `@/lib/dashboard-helpers`; `SUBTEST_KIND_LABEL`, `type DashboardCompany`, `type DashboardSubtest` from `@/lib/types`
- Produces: Rute Next.js `/riwayat` dan komponen `HistoryProgressView({ catalog }: { catalog: DashboardCompany[] })`

- [ ] **Step 1: Create `src/app/riwayat/page.tsx`**

Buat Server Component mengikuti pola `src/app/page.tsx`:
- `export const dynamic = "force-dynamic";`
- `export const metadata: Metadata = { title: "Riwayat & Progres" };`
- Fetch `Promise.all([getCompanies(), getDashboardCatalog()])`, render `<LearnerShell companies={companies}><HistoryProgressView catalog={catalog} /></LearnerShell>`.

- [ ] **Step 2: Create `src/components/dashboard/HistoryProgressView.tsx`**

Implementasikan sesuai Spec §5.4:
- Header: `<h1>` `Riwayat & Progres Latihan` (`text-2xl font-extrabold tracking-tight text-ink sm:text-[26px]`), subjudul tersimpan lokal tanpa akun, dan tombol `Reset Riwayat Lokal` (konfirmasi inline 2 langkah `Hapus` / `Batal` yang memanggil `clearLocalProgress()`, hanya muncul saat `progress.recentAttempts.length > 0`).
- 3 kartu ringkasan (`grid gap-3.5 sm:grid-cols-3`):
  1. `Subtes Selesai` (`{stats.completedSubtests} / {stats.totalSubtests}` + progress bar `h-1.5 rounded-[3px] bg-brand`).
  2. `Rata-rata Skor Kuis` (`{stats.avgAccuracy}%` atau `"—"`, subteks `"Khusus subtes pilihan ganda"`).
  3. `Sesi Tersimpan` (`{progress.recentAttempts.length} sesi`, subteks `"Hingga 24 sesi terakhir di browser ini"`).
- Daftar riwayat lengkap:
  - Bangun `subtestMap = new Map<number, DashboardSubtest>()` lewat `useMemo` dari `catalog`.
  - Render seluruh `progress.recentAttempts` dalam kartu `rounded-[10px] border border-line-strong bg-surface divide-y divide-line`.
  - Tiap baris link ke `/result/${item.attemptId}`: nama subtes, chip `SUBTEST_KIND_LABEL[kind]` bila `kind !== "QUIZ"`, metadata `{item.companyName} · {item.packageName} · {formatShortDate(item.completedAt)}`, dan badge dari `formatAttemptBadge(item, kind)` dengan kelas kontras tinggi Light & Dark untuk 4 tone (`emerald`, `amber`, `red`, `blue`).
- Empty state bila `recentAttempts.length === 0`: kartu berborder putus-putus dengan `IconHistory`, pesan ringkas, dan tombol biru solid `Mulai Latihan` menuju `/`.

- [ ] **Step 3: Align outer borders & headings in `CompanyPackagesView.tsx` and `PackageSubtestsView.tsx`, and ignore `.superpowers/`**

- Pada `CompanyPackagesView.tsx` dan `PackageSubtestsView.tsx`, perkuat border kontainer kartu utama dari `border-line` menjadi `border-line-strong`, radius ke `rounded-[10px]`, dan bobot `<h1>` ke `font-extrabold` tanpa mengubah logika maupun susunan fungsionalnya.
- Tambahkan `.superpowers/` ke `.gitignore`.

- [ ] **Step 4: Run full verification suite (tests, lint, production build)**

Run:
```powershell
npx tsx --test src/lib/dashboard-helpers.test.ts ; npx tsx --test src/lib/scoring.test.ts ; npx tsx --test src/lib/personality-score.test.ts ; npm run lint ; npm run build
```
Expected:
- Semua unit test (`dashboard-helpers.test.ts`, `scoring.test.ts`, `personality-score.test.ts`) PASS.
- `eslint` 0 errors, 0 warnings.
- `next build` sukses memproduksi seluruh rute termasuk `ƒ /riwayat`.

- [ ] **Step 5: Commit Task 5**

```powershell
git add src/app/riwayat/page.tsx src/components/dashboard/HistoryProgressView.tsx src/components/dashboard/CompanyPackagesView.tsx src/components/dashboard/PackageSubtestsView.tsx .gitignore ; git commit -m "feat: add /riwayat progress page and align secondary dashboard views"
```
