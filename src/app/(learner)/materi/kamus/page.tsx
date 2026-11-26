import type { Metadata } from "next";
import Link from "next/link";
import {
  IconArrowLeft,
  IconArrowRight,
  IconSearch,
} from "@/components/ui/Icons";
import { LevelBadge } from "@/components/ui/QuestionTypeBadge";
import { CEFR_LEVELS } from "@/lib/english/constants";
import { buildKamusUrl, normalizeKamusParams } from "@/lib/english/logic";
import { queryEnglishDictionary } from "@/lib/english/queries";

export const metadata: Metadata = {
  title: "Kamus 1.000 Kata · Materi Bahasa Inggris",
};

interface KamusPageProps {
  searchParams: Promise<{
    cefr?: string;
    pos?: string;
    q?: string;
    page?: string;
  }>;
}

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text";
const PANEL_SHADOW =
  "shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none";
const CELL_BASE = "block md:table-cell md:px-5 md:py-3.5 md:align-top";

export default async function KamusPage({ searchParams }: KamusPageProps) {
  const sp = await searchParams;
  const {
    cefr: activeCefr,
    pos: activePos,
    q: activeQ,
    page: requestedPage,
  } = normalizeKamusParams(sp);

  const dict = await queryEnglishDictionary({
    cefr: activeCefr || undefined,
    pos: activePos || undefined,
    q: activeQ || undefined,
    page: requestedPage,
    pageSize: 50,
  });

  const totalPages = Math.max(1, Math.ceil(dict.total / dict.pageSize));
  const chipClass = (selected: boolean) =>
    `inline-flex min-h-[40px] items-center rounded-xl border px-3 py-2 text-xs font-bold transition ${FOCUS_RING} ${
      selected
        ? "border-brand/40 bg-brand-soft text-brand-text"
        : "border-line-strong bg-canvas text-ink-secondary hover:bg-subtle hover:text-ink"
    }`;

  return (
    <div className="space-y-5">
      {/* Header & Tombol Aksi */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/materi"
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg text-xs font-semibold text-ink-secondary transition hover:text-ink ${FOCUS_RING}`}
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Daftar Materi</span>
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
            Kamus 1.000 Kata Bahasa Inggris
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Terurut berdasarkan abjad (A–Z) · Menampilkan 50 kata per halaman.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={activeCefr ? `/materi/kamus/kuis?cefr=${activeCefr}` : "/materi/kamus/kuis"}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-brand-hover ${FOCUS_RING}`}
          >
            <span>Kuis Pilihan Ganda{activeCefr ? ` (${activeCefr})` : ""}</span>
          </Link>
        </div>
      </div>

      {/* Panel Filter: Chip CEFR, Jenis Kata (POS), dan Kotak Cari */}
      <section
        aria-labelledby="kamus-filter-heading"
        className={`space-y-4 rounded-2xl border border-line bg-surface p-4 ${PANEL_SHADOW}`}
      >
        <h2 id="kamus-filter-heading" className="sr-only">
          Filter Kosakata
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold text-ink-muted">Level CEFR:</span>
          <Link
            href={buildKamusUrl({ pos: activePos, q: activeQ })}
            aria-current={activeCefr === "" ? "true" : undefined}
            className={chipClass(activeCefr === "")}
          >
            Semua
          </Link>
          {CEFR_LEVELS.map((lvl) => (
            <Link
              key={lvl}
              href={buildKamusUrl({ cefr: lvl, pos: activePos, q: activeQ })}
              aria-current={activeCefr === lvl ? "true" : undefined}
              className={chipClass(activeCefr === lvl)}
            >
              {lvl}
            </Link>
          ))}
        </div>

        <form method="GET" action="/materi/kamus" className="grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_200px_auto]">
          {activeCefr ? <input type="hidden" name="cefr" value={activeCefr} /> : null}
          <div className="relative">
            <label htmlFor="kamus-search" className="sr-only">
              Cari kata bahasa Inggris atau arti Indonesia
            </label>
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              id="kamus-search"
              type="search"
              name="q"
              defaultValue={activeQ}
              placeholder="Cari kata bahasa Inggris atau arti Indonesia..."
              className={`min-h-[40px] w-full rounded-full border border-line-strong bg-canvas py-2 pl-9 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-brand ${FOCUS_RING}`}
            />
          </div>

          <div>
            <label htmlFor="kamus-pos" className="sr-only">
              Filter jenis kata
            </label>
            <select
              id="kamus-pos"
              name="pos"
              defaultValue={activePos}
              className={`min-h-[40px] w-full rounded-xl border border-line-strong bg-canvas px-3 py-2 text-sm text-ink focus:border-brand ${FOCUS_RING}`}
            >
              <option value="">Semua jenis kata</option>
              {dict.posList.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className={`inline-flex min-h-[40px] items-center rounded-xl border border-line-strong bg-subtle px-4 py-2 text-sm font-semibold text-ink transition hover:bg-line/60 ${FOCUS_RING}`}
            >
              Terapkan
            </button>
            {activeCefr || activePos || activeQ ? (
              <Link
                href="/materi/kamus"
                className={`inline-flex min-h-[40px] items-center rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:bg-subtle hover:text-ink ${FOCUS_RING}`}
              >
                Reset
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {/* Info Jumlah & Daftar Kata */}
      <section aria-labelledby="kamus-list-heading" className="space-y-3">
        <h2 id="kamus-list-heading" className="sr-only">
          Daftar Kosakata
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-secondary tabular-nums">
          <span>
            Menampilkan <strong className="text-ink">{dict.items.length}</strong> dari{" "}
            <strong className="text-ink">{dict.total}</strong> kata (Halaman {dict.page} dari{" "}
            {totalPages})
          </span>
        </div>

        {dict.items.length === 0 ? (
          <div className={`rounded-2xl border border-line bg-surface p-8 text-center ${PANEL_SHADOW}`}>
            <p className="text-sm font-semibold text-ink">
              {dict.posList.length === 0
                ? "Database kamus masih kosong."
                : "Tidak ada kata yang cocok dengan filter ini."}
            </p>
            {dict.posList.length === 0 ? (
              <p className="mt-1 text-xs text-ink-muted">
                Jalankan <code className="rounded bg-subtle px-1.5 py-0.5 font-mono">npm run db:seed-english</code> atau unggah file JSON kamus melalui halaman Admin.
              </p>
            ) : null}
          </div>
        ) : (
          <div className={`overflow-hidden rounded-2xl border border-line bg-surface ${PANEL_SHADOW}`}>
            <table role="table" className="block w-full table-fixed border-collapse text-left md:table">
              <caption className="sr-only">
                Daftar kosakata kamus bahasa Inggris
              </caption>
              <thead role="rowgroup" className="sr-only md:not-sr-only md:table-header-group">
                <tr role="row" className="border-b border-line bg-canvas text-xs font-semibold text-ink-secondary">
                  <th role="columnheader" scope="col" className="w-[28%] px-5 py-3.5">
                    Kata
                  </th>
                  <th role="columnheader" scope="col" className="w-[27%] px-5 py-3.5">
                    Arti Indonesia
                  </th>
                  <th role="columnheader" scope="col" className="w-[45%] px-5 py-3.5">
                    Contoh Kalimat
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup" className="block divide-y divide-line md:table-row-group">
                {dict.items.map((item) => (
                  <tr
                    key={item.id}
                    role="row"
                    className="block space-y-1 px-4 py-3.5 transition hover:bg-canvas/70 md:table-row md:space-y-0 md:p-0"
                  >
                    <td role="cell" className={`min-w-0 ${CELL_BASE}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-words text-sm font-bold tracking-tight text-ink">
                          {item.word}
                        </span>
                        <span className="rounded bg-subtle px-1.5 py-0.5 text-xs font-medium text-ink-secondary">
                          {item.pos}
                        </span>
                        <LevelBadge level={item.cefr} />
                      </div>
                    </td>
                    <td role="cell" className={`text-sm font-semibold text-brand-text ${CELL_BASE}`}>
                      {item.meaning_id}
                    </td>
                    <td role="cell" className={`text-xs leading-relaxed ${CELL_BASE}`}>
                      <p className="font-medium text-ink">
                        &ldquo;{item.example_en}&rdquo;
                      </p>
                      <p className="mt-0.5 text-ink-secondary">
                        {item.example_id}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Navigasi Paginasi (50 per halaman) */}
      {totalPages > 1 ? (
        <nav
          aria-label="Paginasi kamus"
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 ${PANEL_SHADOW}`}
        >
          <div>
            {dict.page > 1 ? (
              <Link
                href={buildKamusUrl({
                  cefr: activeCefr,
                  pos: activePos,
                  q: activeQ,
                  page: dict.page - 1,
                })}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line-strong bg-canvas px-3 py-2 text-xs font-bold text-ink transition hover:bg-subtle ${FOCUS_RING}`}
              >
                <IconArrowLeft className="h-3.5 w-3.5" />
                <span>Sebelumnya</span>
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line bg-subtle/50 px-3 py-2 text-xs font-semibold text-ink-muted opacity-50"
              >
                <IconArrowLeft className="h-3.5 w-3.5" />
                <span>Sebelumnya</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - dict.page) <= 2)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev !== undefined && p - prev > 1;
                return (
                  <span key={p} className="inline-flex items-center gap-1.5">
                    {showEllipsis ? (
                      <span aria-hidden="true" className="px-1 text-xs text-ink-muted">
                        …
                      </span>
                    ) : null}
                    <Link
                      href={buildKamusUrl({
                        cefr: activeCefr,
                        pos: activePos,
                        q: activeQ,
                        page: p,
                      })}
                      aria-label={`Halaman ${p}`}
                      aria-current={p === dict.page ? "page" : undefined}
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-xs font-bold tabular-nums transition ${FOCUS_RING} ${
                        p === dict.page
                          ? "bg-brand text-white"
                          : "border border-line-strong bg-canvas text-ink-secondary hover:bg-subtle hover:text-ink"
                      }`}
                    >
                      {p}
                    </Link>
                  </span>
                );
              })}
          </div>

          <div>
            {dict.page < totalPages ? (
              <Link
                href={buildKamusUrl({
                  cefr: activeCefr,
                  pos: activePos,
                  q: activeQ,
                  page: dict.page + 1,
                })}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line-strong bg-canvas px-3 py-2 text-xs font-bold text-ink transition hover:bg-subtle ${FOCUS_RING}`}
              >
                <span>Berikutnya</span>
                <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line bg-subtle/50 px-3 py-2 text-xs font-semibold text-ink-muted opacity-50"
              >
                <span>Berikutnya</span>
                <IconArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
