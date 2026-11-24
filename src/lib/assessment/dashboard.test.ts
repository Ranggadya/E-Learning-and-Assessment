import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardCompany, DashboardPackage, LocalProgressStore } from "@/types/assessment";
import {
  buildWeekCalendarDays,
  buildWeeklyActivitySeries,
  catalogToCompanies,
  computeDashboardStats,
  computeInProgressPackageCount,
  computeNextAction,
  countCompletedActiveSubtests,
  formatAttemptBadge,
  formatShortDate,
  getCompanyMonogram,
  getPackageKindChips,
  getUpcomingSubtests,
  selectCompanyPackages,
} from "./dashboard";
import { DEFAULT_LOCAL_PROFILE, sanitizeLocalProfile } from "@/lib/client/local-profile";

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
  assert.equal(action.packageHref, "/c/astra/paket-1");
  assert.equal(action.estimatedMinutes, 30);
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
  assert.equal(sameCompany?.packageHref, "/c/astra/paket-2");
  assert.equal(sameCompany?.estimatedMinutes, 12);

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
  assert.equal(crossCompany?.packageHref, "/c/paragon/paket-1");
  assert.equal(crossCompany?.estimatedMinutes, 5);

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
  assert.equal(allDone?.packageHref, "/c/paragon/paket-1");
  assert.equal(allDone?.estimatedMinutes, 15);
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

test("catalogToCompanies memetakan DashboardCompany ke Company untuk LearnerShell tanpa query ulang", () => {
  const companies = catalogToCompanies(makeCatalog());
  assert.deepEqual(companies, [
    {
      id: 1,
      slug: "astra",
      name: "PT Astra International",
      description: null,
      packageCount: 2,
      subtestCount: 4,
      subtestIds: [101, 102, 103, 104],
    },
    {
      id: 2,
      slug: "paragon",
      name: "ParagonCorp",
      description: null,
      packageCount: 1,
      subtestCount: 2,
      subtestIds: [201, 202],
    },
  ]);
});

test("computeInProgressPackageCount hanya menghitung paket dengan 0 < done < total", () => {
  const catalog = makeCatalog();
  assert.equal(computeInProgressPackageCount(catalog, EMPTY_PROGRESS), 0);

  const entry = {
    bestScore: 10,
    lastScore: 10,
    totalQuestions: 10,
    lastAttemptId: 1,
    attemptsCount: 1,
    lastCompletedAt: "2026-11-24T10:00:00Z",
  };
  const progress: LocalProgressStore = {
    bySubtestId: {
      // paket-1 astra: 1 dari 3 -> in progress
      "101": entry,
      // paket-2 astra: 1 dari 1 -> completed (tidak dihitung)
      "104": entry,
      // paket-1 paragon: 1 dari 2 -> in progress
      "201": entry,
    },
    recentAttempts: [],
  };
  assert.equal(computeInProgressPackageCount(catalog, progress), 2);
});

test("buildWeeklyActivitySeries membangun 7 hari UTC, fallback 10 menit, dan tie-break peakIndex ke hari terbaru", () => {
  const catalog = makeCatalog();
  const refDate = new Date("2026-11-24T15:30:00Z"); // Selasa

  const empty = buildWeeklyActivitySeries(catalog, EMPTY_PROGRESS, refDate);
  assert.equal(empty.days.length, 7);
  assert.equal(empty.days[0].dateKey, "2026-11-18");
  assert.equal(empty.days[0].dayLabel, "Rab");
  assert.equal(empty.days[0].isToday, false);
  assert.equal(empty.days[6].dateKey, "2026-11-24");
  assert.equal(empty.days[6].dayLabel, "Sel");
  assert.equal(empty.days[6].isToday, true);
  assert.equal(empty.totalAttempts, 0);
  assert.equal(empty.totalMinutes, 0);
  assert.equal(empty.peakIndex, 6);

  const attemptBase = {
    companySlug: "astra",
    companyName: "PT Astra International",
    packageSlug: "paket-1",
    packageName: "Paket 1",
    score: 10,
    totalQuestions: 15,
  };
  const progress: LocalProgressStore = {
    bySubtestId: {},
    recentAttempts: [
      // Hari ke-2 (2026-11-20): subtes 101 (600s = 10 menit)
      { ...attemptBase, attemptId: 1, subtestId: 101, subtestName: "Verbal", completedAt: "2026-11-20T08:00:00Z" },
      // Hari ke-5 (2026-11-23): subtes tidak ada di katalog -> fallback 10 menit (seri dengan 2026-11-20 -> tie-break ke 2026-11-23)
      { ...attemptBase, attemptId: 2, subtestId: 999, subtestName: "Lama", completedAt: "2026-11-23T22:00:00Z" },
      // Hari ke-6 (2026-11-24): subtes 201 (300s = 5 menit)
      { ...attemptBase, attemptId: 3, subtestId: 201, subtestName: "Pauli", completedAt: "2026-11-24T01:00:00Z" },
      // Di luar rentang 7 hari (2026-11-17): harus diabaikan
      { ...attemptBase, attemptId: 4, subtestId: 102, subtestName: "Kepribadian", completedAt: "2026-11-17T23:59:59Z" },
    ],
  };

  const series = buildWeeklyActivitySeries(catalog, progress, refDate);
  assert.equal(series.totalAttempts, 3);
  assert.equal(series.totalMinutes, 25);
  assert.equal(series.days[2].dateKey, "2026-11-20");
  assert.equal(series.days[2].attempts, 1);
  assert.equal(series.days[2].estimatedMinutes, 10);
  assert.equal(series.days[5].dateKey, "2026-11-23");
  assert.equal(series.days[5].attempts, 1);
  assert.equal(series.days[5].estimatedMinutes, 10);
  assert.equal(series.days[6].dateKey, "2026-11-24");
  assert.equal(series.days[6].attempts, 1);
  assert.equal(series.days[6].estimatedMinutes, 5);
  // Tie-break antara index 2 (10 mnt) dan index 5 (10 mnt) -> index 5 (hari terbaru)
  assert.equal(series.peakIndex, 5);
  assert.ok(series.days[6].fullDateLabel.includes("24"));
});

test("buildWeekCalendarDays menghasilkan Min..Sab, menandai isToday & hasActivity dari recentAttempts maupun bySubtestId, dan mendukung weekOffset", () => {
  const refDate = new Date("2026-11-24T12:00:00Z"); // Selasa -> minggu 2026-11-22 (Min) s/d 2026-11-28 (Sab)
  const progress: LocalProgressStore = {
    bySubtestId: {
      // Aktivitas hanya tercatat di bySubtestId pada minggu lalu (2026-11-18)
      "101": {
        bestScore: 12,
        lastScore: 12,
        totalQuestions: 15,
        lastAttemptId: 1,
        attemptsCount: 1,
        lastCompletedAt: "2026-11-18T09:00:00Z",
      },
    },
    recentAttempts: [
      {
        attemptId: 2,
        subtestId: 102,
        subtestName: "Kepribadian",
        companySlug: "astra",
        companyName: "PT Astra International",
        packageSlug: "paket-1",
        packageName: "Paket 1",
        score: 45,
        totalQuestions: 45,
        completedAt: "2026-11-24T10:00:00Z",
      },
    ],
  };

  const currentWeek = buildWeekCalendarDays(progress, refDate, 0);
  assert.equal(currentWeek.days.length, 7);
  assert.deepEqual(
    currentWeek.days.map((d) => d.weekdayShort),
    ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
  );
  assert.equal(currentWeek.days[0].dateKey, "2026-11-22");
  assert.equal(currentWeek.days[0].dayNumber, 22);
  assert.equal(currentWeek.days[2].dateKey, "2026-11-24");
  assert.equal(currentWeek.days[2].isToday, true);
  assert.equal(currentWeek.days[2].hasActivity, true);
  assert.equal(currentWeek.days[0].isToday, false);
  assert.equal(currentWeek.days[0].hasActivity, false);
  assert.ok(currentWeek.monthLabel.includes("2026"));

  const prevWeek = buildWeekCalendarDays(progress, refDate, -1);
  assert.equal(prevWeek.days[0].dateKey, "2026-11-15");
  assert.equal(prevWeek.days[3].dateKey, "2026-11-18");
  assert.equal(prevWeek.days[3].hasActivity, true);
  assert.equal(prevWeek.days.some((d) => d.isToday), false);

  const nextWeek = buildWeekCalendarDays(progress, refDate, 1);
  assert.equal(nextWeek.days[0].dateKey, "2026-11-29");
  assert.equal(nextWeek.days[6].dateKey, "2026-12-05");
  assert.equal(nextWeek.days.some((d) => d.isToday), false);
});

test("getUpcomingSubtests memprioritaskan paket sedang dikerjakan, melewati 0 soal, dan menghormati limit", () => {
  const catalog = makeCatalog();
  const progress: LocalProgressStore = {
    bySubtestId: {
      // Paragon paket-1 sedang dikerjakan (201 selesai, 202 belum) -> harus diprioritaskan di atas Astra yang belum dimulai
      "201": {
        bestScore: 10,
        lastScore: 10,
        totalQuestions: 10,
        lastAttemptId: 1,
        attemptsCount: 1,
        lastCompletedAt: "2026-11-24T09:00:00Z",
      },
    },
    recentAttempts: [],
  };

  const allUpcoming = getUpcomingSubtests(catalog, progress, 10);
  // Subtes 103 (questionCount === 0) dan 201 (sudah selesai) harus dilewati
  assert.deepEqual(
    allUpcoming.map((item) => item.subtestId),
    [202, 101, 102, 104],
  );
  assert.deepEqual(allUpcoming[0], {
    subtestId: 202,
    subtestName: "Menggambar",
    companySlug: "paragon",
    companyName: "ParagonCorp",
    packageSlug: "paket-1",
    packageName: "Paket 1",
    durationMinutes: 10,
    kind: "DRAWING",
    questionCount: 2,
  });

  const limited = getUpcomingSubtests(catalog, progress, 2);
  assert.deepEqual(
    limited.map((item) => item.subtestId),
    [202, 101],
  );
});

test("sanitizeLocalProfile memangkas spasi, membatasi 40/50 karakter, dan fallback ke default saat kosong", () => {
  assert.deepEqual(sanitizeLocalProfile(null), DEFAULT_LOCAL_PROFILE);
  assert.deepEqual(sanitizeLocalProfile(undefined), DEFAULT_LOCAL_PROFILE);
  assert.deepEqual(sanitizeLocalProfile({ displayName: "   ", roleTitle: "" }), DEFAULT_LOCAL_PROFILE);

  const trimmed = sanitizeLocalProfile({
    displayName: "  Karis Pratama  ",
    roleTitle: "  Kandidat Management Trainee  ",
  });
  assert.deepEqual(trimmed, {
    displayName: "Karis Pratama",
    roleTitle: "Kandidat Management Trainee",
  });

  const longInput = sanitizeLocalProfile({
    displayName: "A".repeat(60),
    roleTitle: "B".repeat(70),
  });
  assert.equal(longInput.displayName.length, 40);
  assert.equal(longInput.roleTitle.length, 50);
});
