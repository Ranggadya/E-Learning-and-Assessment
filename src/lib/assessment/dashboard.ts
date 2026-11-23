import type {
  AttemptBadge,
  DashboardCompany,
  DashboardPackage,
  DashboardStats,
  DashboardSubtest,
  LocalAttemptRecord,
  LocalProgressStore,
  NextAction,
  SubtestKind,
  VisiblePackagesResult,
} from "@/types/assessment";
import { SUBTEST_UNIT } from "./constants";

const LEGAL_ENTITY_WORDS = new Set(["PT", "CV", "UD", "TBK", "PERSERO"]);

const PACKAGE_KIND_CHIP_LABELS: Record<SubtestKind, string> = {
  QUIZ: "Kognitif",
  PERSONALITY: "Kepribadian",
  PAULI: "Pauli",
  DRAWING: "Menggambar",
};

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function estimatePackageMinutes(pkg: DashboardPackage): number {
  const totalSeconds = pkg.subtests.reduce((acc, s) => acc + Math.max(0, s.durationSeconds), 0);
  return Math.max(1, Math.round(totalSeconds / 60));
}

function findFirstUnfinishedPlayable(
  pkg: DashboardPackage,
  progress: LocalProgressStore,
): DashboardSubtest | undefined {
  return pkg.subtests.find((s) => s.questionCount > 0 && !progress.bySubtestId[String(s.id)]);
}

function makeResumeAction(
  company: DashboardCompany,
  pkg: DashboardPackage,
  subtest: DashboardSubtest,
): NextAction {
  const mins = Math.max(1, Math.round(subtest.durationSeconds / 60));
  return {
    mode: "resume",
    href: `/test/${subtest.id}`,
    tag: "LANJUTKAN LATIHAN",
    title: `${company.name} · ${pkg.name} — ${subtest.name}`,
    meta: `${subtest.questionCount} ${SUBTEST_UNIT[subtest.kind]} · ${mins} menit · Timer otomatis`,
    ctaLabel: "Lanjutkan",
  };
}

/**
 * Menghitung ringkasan statistik katalog & progres lokal.
 * Subtes non-QUIZ dikecualikan dari `totalQuestions` dan `avgAccuracy`.
 */
export function computeDashboardStats(
  catalog: DashboardCompany[],
  progress: LocalProgressStore,
): DashboardStats {
  let totalPackages = 0;
  let totalSubtests = 0;
  let totalQuestions = 0;
  let completedSubtests = 0;
  let scoreRatioSum = 0;
  let scoreRatioCount = 0;

  for (const company of catalog) {
    totalPackages += company.packages.length;
    for (const pkg of company.packages) {
      totalSubtests += pkg.subtests.length;
      for (const subtest of pkg.subtests) {
        if (subtest.kind === "QUIZ") {
          totalQuestions += subtest.questionCount;
        }
        const record = progress.bySubtestId[String(subtest.id)];
        if (record) {
          completedSubtests += 1;
          if (subtest.kind === "QUIZ" && record.totalQuestions > 0) {
            scoreRatioSum += record.lastScore / record.totalQuestions;
            scoreRatioCount += 1;
          }
        }
      }
    }
  }

  const avgAccuracy =
    scoreRatioCount > 0 ? Math.round((scoreRatioSum / scoreRatioCount) * 100) : null;

  return {
    totalCompanies: catalog.length,
    totalPackages,
    totalSubtests,
    totalQuestions,
    completedSubtests,
    avgAccuracy,
  };
}

/**
 * Menghitung jumlah subtes aktif unik yang sudah selesai di progres lokal.
 * ID basi di localStorage yang tidak termasuk daftar aktif tidak ikut dihitung.
 */
export function countCompletedActiveSubtests(
  activeSubtestIds: number[],
  progress: LocalProgressStore,
): number {
  const seen = new Set<number>();
  let completed = 0;

  for (const id of activeSubtestIds) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    if (Boolean(progress.bySubtestId[String(id)])) {
      completed += 1;
    }
  }

  return completed;
}

/**
 * Menentukan aksi utama berikutnya (mulai baru, lanjutkan subtes belum selesai, atau selesai semua).
 */
export function computeNextAction(
  catalog: DashboardCompany[],
  progress: LocalProgressStore,
): NextAction | null {
  let firstPlayable: { company: DashboardCompany; pkg: DashboardPackage } | null = null;
  for (const company of catalog) {
    for (const pkg of company.packages) {
      if (pkg.subtests.some((s) => s.questionCount > 0)) {
        firstPlayable = { company, pkg };
        break;
      }
    }
    if (firstPlayable) {
      break;
    }
  }

  if (!firstPlayable) {
    return null;
  }

  if (progress.recentAttempts.length === 0) {
    const { company, pkg } = firstPlayable;
    return {
      mode: "start",
      href: `/c/${company.slug}/${pkg.slug}`,
      tag: "MULAI LATIHAN",
      title: `${company.name} · ${pkg.name}`,
      meta: `${pkg.subtests.length} subtes · estimasi ~${estimatePackageMinutes(pkg)} menit · Timer otomatis`,
      ctaLabel: "Mulai",
    };
  }

  const latestAttempt = progress.recentAttempts[0];
  const latestCompany = catalog.find((c) => c.slug === latestAttempt.companySlug);
  const latestPkg = latestCompany?.packages.find((p) => p.slug === latestAttempt.packageSlug);

  // Prioritas (a): subtes berikutnya di paket terakhir.
  if (latestCompany && latestPkg) {
    const nextInPkg = findFirstUnfinishedPlayable(latestPkg, progress);
    if (nextInPkg) {
      return makeResumeAction(latestCompany, latestPkg, nextInPkg);
    }
  }

  // Prioritas (b): paket lain di perusahaan terakhir.
  if (latestCompany) {
    for (const pkg of latestCompany.packages) {
      if (pkg.id === latestPkg?.id) {
        continue;
      }
      const nextInCompany = findFirstUnfinishedPlayable(pkg, progress);
      if (nextInCompany) {
        return makeResumeAction(latestCompany, pkg, nextInCompany);
      }
    }
  }

  // Prioritas (c): perusahaan lain di katalog (sekaligus fallback jika riwayat lokal basi).
  for (const company of catalog) {
    if (company.id === latestCompany?.id) {
      continue;
    }
    for (const pkg of company.packages) {
      const nextElsewhere = findFirstUnfinishedPlayable(pkg, progress);
      if (nextElsewhere) {
        return makeResumeAction(company, pkg, nextElsewhere);
      }
    }
  }

  const fallback =
    latestCompany && latestPkg && latestPkg.subtests.some((s) => s.questionCount > 0)
      ? { company: latestCompany, pkg: latestPkg }
      : firstPlayable;

  return {
    mode: "completed",
    href: `/c/${fallback.company.slug}/${fallback.pkg.slug}`,
    tag: "SEMUA LATIHAN SELESAI",
    title: `${fallback.company.name} · ${fallback.pkg.name}`,
    meta: `${fallback.pkg.subtests.length} subtes · estimasi ~${estimatePackageMinutes(fallback.pkg)} menit · Tinjau atau ulangi latihan`,
    ctaLabel: "Buka Paket",
  };
}

/**
 * Menghasilkan monogram 1-2 huruf dari nama perusahaan tanpa awalan/akhiran badan usaha.
 */
export function getCompanyMonogram(name: string): string {
  const words = name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0 && !LEGAL_ENTITY_WORDS.has(word.toUpperCase()));

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return "EA";
}

/**
 * Mengurutkan paket: sedang dikerjakan -> belum dimulai -> selesai, lalu membatasi jumlah tampil.
 */
export function selectCompanyPackages(
  packages: DashboardPackage[],
  progress: LocalProgressStore,
  bypassCap: boolean,
  maxVisible = 4,
): VisiblePackagesResult {
  const inProgress: DashboardPackage[] = [];
  const unstarted: DashboardPackage[] = [];
  const completed: DashboardPackage[] = [];

  for (const pkg of packages) {
    const total = pkg.subtests.length;
    const done = pkg.subtests.filter((s) => Boolean(progress.bySubtestId[String(s.id)])).length;

    if (total === 0 || done === 0) {
      unstarted.push(pkg);
    } else if (done < total) {
      inProgress.push(pkg);
    } else {
      completed.push(pkg);
    }
  }

  const ordered = [...inProgress, ...unstarted, ...completed];
  if (bypassCap) {
    return { visible: ordered, hiddenCount: 0 };
  }

  const cap = Math.max(0, maxVisible);
  return {
    visible: ordered.slice(0, cap),
    hiddenCount: Math.max(0, ordered.length - cap),
  };
}

/**
 * Mengambil label unik jenis subtes (maksimal 3) sesuai urutan kemunculan dalam paket.
 */
export function getPackageKindChips(subtests: DashboardSubtest[]): string[] {
  const chips: string[] = [];
  const seen = new Set<string>();

  for (const subtest of subtests) {
    const label = PACKAGE_KIND_CHIP_LABELS[subtest.kind];
    if (!label || seen.has(label)) {
      continue;
    }
    seen.add(label);
    chips.push(label);
    if (chips.length >= 3) {
      break;
    }
  }

  return chips;
}

/**
 * Memformat lencana hasil percobaan sesuai jenis subtes.
 */
export function formatAttemptBadge(
  attempt: LocalAttemptRecord,
  kind: SubtestKind,
): AttemptBadge {
  switch (kind) {
    case "QUIZ": {
      if (attempt.totalQuestions <= 0) {
        return { label: "Selesai", tone: "blue" };
      }
      const pct = Math.round((attempt.score / attempt.totalQuestions) * 100);
      const tone: AttemptBadge["tone"] = pct >= 75 ? "emerald" : pct >= 50 ? "amber" : "red";
      return {
        label: `${attempt.score}/${attempt.totalQuestions} (${pct}%)`,
        tone,
      };
    }
    case "PERSONALITY":
      return { label: "Profil Tersimpan", tone: "blue" };
    case "PAULI":
      return attempt.totalQuestions > 0
        ? { label: `${attempt.score}/${attempt.totalQuestions} benar`, tone: "blue" }
        : { label: "Selesai", tone: "blue" };
    case "DRAWING":
      return { label: "Gambar Tersimpan", tone: "blue" };
  }
}

/**
 * Memformat stempel waktu ISO menjadi format ringkas lokal Indonesia.
 */
export function formatShortDate(iso: string): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  try {
    return SHORT_DATE_FORMATTER.format(date);
  } catch {
    return "";
  }
}
