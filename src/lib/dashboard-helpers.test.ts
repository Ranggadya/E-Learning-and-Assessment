import assert from "node:assert/strict";
import test from "node:test";
import {
  computeDashboardStats,
  computeNextAction,
  countCompletedActiveSubtests,
  formatAttemptBadge,
  formatShortDate,
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

  const emptyStats = computeDashboardStats(catalog, EMPTY_PROGRESS);
  assert.equal(emptyStats.avgAccuracy, null);
  assert.equal(emptyStats.completedSubtests, 0);
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

  const sameCompany = computeNextAction(catalog, {
    bySubtestId: {
      "101": { bestScore: 12, lastScore: 12, totalQuestions: 15, lastAttemptId: 8, attemptsCount: 1, lastCompletedAt: "2026-11-22T09:00:00Z" },
      "102": { bestScore: 45, lastScore: 45, totalQuestions: 45, lastAttemptId: 9, attemptsCount: 1, lastCompletedAt: "2026-11-22T10:00:00Z" },
    },
    recentAttempts: [latestBase],
  });
  assert.equal(sameCompany?.mode, "resume");
  assert.equal(sameCompany?.href, "/test/104");

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
  assert.equal(computeNextAction([], EMPTY_PROGRESS), null);
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
    mkPkg(6, []),        // empty
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
  assert.deepEqual(formatAttemptBadge({ ...base, score: 0, totalQuestions: 0 }, "QUIZ"), { label: "Selesai", tone: "blue" });
  assert.deepEqual(formatAttemptBadge(base, "PERSONALITY"), { label: "Profil Tersimpan", tone: "blue" });
  assert.deepEqual(formatAttemptBadge({ ...base, score: 85, totalQuestions: 100 }, "PAULI"), { label: "85/100 benar", tone: "blue" });
  assert.deepEqual(formatAttemptBadge({ ...base, score: 0, totalQuestions: 0 }, "PAULI"), { label: "Selesai", tone: "blue" });
  assert.deepEqual(formatAttemptBadge(base, "DRAWING"), { label: "Gambar Tersimpan", tone: "blue" });
});

test("formatShortDate memformat ISO valid dan mengembalikan string kosong untuk tanggal tidak valid", () => {
  const formatted = formatShortDate("2026-11-22T10:30:00Z");
  assert.ok(formatted.length > 0);
  assert.ok(/\d{2}/.test(formatted));
  assert.equal(formatShortDate("invalid-date"), "");
  assert.equal(formatShortDate(""), "");
});

test("countCompletedActiveSubtests mengabaikan ID basi di localStorage dan tidak melebihi jumlah subtes aktif", () => {
  const entry = {
    bestScore: 10,
    lastScore: 10,
    totalQuestions: 10,
    lastAttemptId: 1,
    attemptsCount: 1,
    lastCompletedAt: "2026-11-22T10:00:00Z",
  };
  const progressWithStaleIds: LocalProgressStore = {
    bySubtestId: {
      "101": entry,
      "102": entry,
      "998": entry,
      "999": entry,
    },
    recentAttempts: [],
  };

  assert.equal(countCompletedActiveSubtests([101, 102], progressWithStaleIds), 2);
  assert.equal(countCompletedActiveSubtests([101, 101, 103], progressWithStaleIds), 1);
  assert.equal(countCompletedActiveSubtests([500, 501], progressWithStaleIds), 0);
  assert.equal(countCompletedActiveSubtests([], progressWithStaleIds), 0);
  assert.equal(countCompletedActiveSubtests([101, 102], EMPTY_PROGRESS), 0);
});
