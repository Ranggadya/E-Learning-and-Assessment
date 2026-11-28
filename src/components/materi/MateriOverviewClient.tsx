"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconFileText,
  IconLayers,
} from "@/components/ui/Icons";
import { LevelBadge } from "@/components/ui/QuestionTypeBadge";
import { useAnonUserId } from "@/lib/client/anon-user";
import type { EnglishProgressOverview } from "@/types/english";

interface MateriOverviewClientProps {
  initialOverview: EnglishProgressOverview;
  initialUserId?: string | null;
}

const UPCOMING_TOPICS = [
  {
    slug: "verb-123",
    title: "Verb 1 - 2 - 3 (Regular & Irregular)",
    description: "Daftar kata kerja bentuk dasar, past simple, dan past participle lengkap dengan pola perubahan.",
  },
  {
    slug: "grammar",
    title: "Grammar Inti & Tenses",
    description: "Ringkasan praktis 12 tenses, subject-verb agreement, conditional, dan passive voice untuk tes.",
  },
  {
    slug: "merangkai-kata",
    title: "Merangkai Kata & Kalimat",
    description: "Latihan menyusun kalimat bahasa Inggris yang tepat dari kumpulan kata acak sesuai struktur.",
  },
];

export function MateriOverviewClient({
  initialOverview,
  initialUserId = null,
}: MateriOverviewClientProps) {
  const userId = useAnonUserId();
  const [overview, setOverview] = useState<EnglishProgressOverview>(initialOverview);

  useEffect(() => {
    if (!userId || userId === initialUserId) return;
    const controller = new AbortController();
    fetch(`/api/materi/progress?userId=${encodeURIComponent(userId)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { overview?: EnglishProgressOverview } | null) => {
        if (!controller.signal.aborted && data?.overview) {
          setOverview(data.overview);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Gunakan initialOverview jika jaringan gagal.
      });
    return () => {
      controller.abort();
    };
  }, [userId, initialUserId]);

  const learnedPercent =
    overview.totalWords > 0
      ? Math.round((overview.learnedWords / overview.totalWords) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
            Pusat Belajar Bahasa Inggris
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Kuasai kosakata CEFR A1–C1 melalui kamus interaktif dan kuis pilihan ganda adaptif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/materi/kamus/kuis"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-brand-hover"
          >
            <span>Mulai Kuis 10 Soal</span>
          </Link>
          <Link
            href="/materi/kamus"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-subtle"
          >
            <span>Buka Kamus</span>
          </Link>
        </div>
      </div>

      {/* Ringkasan Progres Level CEFR */}
      <section
        aria-label="Ringkasan progres belajar"
        className="rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
          <div>
            <h2 className="text-base font-bold text-ink">Progres Kosakata Kamu</h2>
            <p className="text-xs text-ink-muted">
              Disimpan otomatis di perangkat ini · {overview.learnedWords} dari {overview.totalWords} kata sudah dipelajari ({learnedPercent}%)
            </p>
          </div>
        </div>

        {/* Persentase Tiap Level CEFR */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-ink-secondary">
            Persentase Penguasaan per Level CEFR
          </p>
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
            {overview.byLevel.map((lvl) => (
              <Link
                key={lvl.cefr}
                href={`/materi/kamus?cefr=${lvl.cefr}`}
                className="group rounded-xl bg-canvas p-3 transition hover:bg-subtle"
              >
                <div className="flex items-center justify-between">
                  <LevelBadge level={lvl.cefr} />
                  <span className="font-mono text-xs font-bold tabular-nums text-ink">
                    {lvl.percent}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line-strong/60">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${lvl.percent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs tabular-nums text-ink-muted">
                  {lvl.learned} / {lvl.total} kata
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Daftar Topik Materi */}
      <section aria-label="Daftar topik materi" className="space-y-3">
        <h2 className="text-base font-bold text-ink">Topik Pembelajaran</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Kartu Aktif: Kamus 1.000 Kata */}
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none lg:col-span-2">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-text">
                  <IconFileText className="h-3.5 w-3.5" />
                  <span>Tersedia · {overview.totalWords || 1000} Kata</span>
                </span>
                <span className="text-xs font-semibold text-ink-muted">Level A1 – C1</span>
              </div>
              <h3 className="mt-3 text-lg font-extrabold text-ink">
                Kamus 1.000 Kata Inti (Oxford CEFR)
              </h3>
              <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-ink-secondary">
                Daftar 1.000 kosakata bahasa Inggris paling sering dipakai dari tingkat dasar (A1) hingga mahir (C1), lengkap dengan jenis kata, arti Indonesia, dan contoh kalimat.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Link
                href="/materi/kamus"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-brand/40 bg-brand-soft px-3.5 py-2 text-xs font-bold text-brand-text transition hover:bg-brand/15"
              >
                <span>Buka Kamus</span>
                <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/materi/kamus/kuis"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-subtle"
              >
                <span>Kuis Pilihan Ganda</span>
              </Link>
            </div>
          </div>

          {/* Panel Ringkas: Modul Berikutnya */}
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-subtle px-2.5 py-0.5 text-xs font-semibold text-ink-secondary">
                  <IconLayers className="h-3.5 w-3.5" />
                  <span>Modul Berikutnya</span>
                </span>
              </div>
              <ul className="mt-3 divide-y divide-line">
                {UPCOMING_TOPICS.map((topic) => (
                  <li key={topic.slug} className="py-2.5 first:pt-0 last:pb-0">
                    <h3 className="text-sm font-semibold text-ink">{topic.title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                      {topic.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
