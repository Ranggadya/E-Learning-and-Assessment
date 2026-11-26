import type { Metadata } from "next";
import Link from "next/link";
import {
  IconArrowLeft,
  IconArrowRight,
  IconSearch,
} from "@/components/ui/Icons";
import { LevelBadge } from "@/components/ui/QuestionTypeBadge";
import { CEFR_LEVELS } from "@/lib/english/constants";
import { isCefrLevel } from "@/lib/english/logic";
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

function buildKamusUrl(params: {
  cefr?: string;
  pos?: string;
  q?: string;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (params.cefr) sp.set("cefr", params.cefr);
  if (params.pos) sp.set("pos", params.pos);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return `/materi/kamus${qs ? `?${qs}` : ""}`;
}

export default async function KamusPage({ searchParams }: KamusPageProps) {
  const sp = await searchParams;
  const activeCefr = sp.cefr && isCefrLevel(sp.cefr) ? sp.cefr : "";
  const activePos = sp.pos?.trim() ?? "";
  const activeQ = sp.q?.trim() ?? "";
  const requestedPage = Math.max(1, Math.floor(Number(sp.page ?? 1)) || 1);

  const dict = await queryEnglishDictionary({
    cefr: activeCefr || undefined,
    pos: activePos || undefined,
    q: activeQ || undefined,
    page: requestedPage,
    pageSize: 50,
  });

  const totalPages = Math.max(1, Math.ceil(dict.total / dict.pageSize));

  return (
    <div className="space-y-5">
      {/* Header & Tombol Aksi */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/materi"
            className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-ink-secondary transition hover:text-ink"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Daftar Materi</span>
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
            Kamus 1.000 Kata Bahasa Inggris
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Terurut dari level dasar (A1) hingga mahir (C1) · Menampilkan 50 kata per halaman.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={activeCefr ? `/materi/kamus/kuis?cefr=${activeCefr}` : "/materi/kamus/kuis"}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-brand-hover"
          >
            <span>Kuis Pilihan Ganda{activeCefr ? ` (${activeCefr})` : ""}</span>
          </Link>
        </div>
      </div>

      {/* Panel Filter: Chip CEFR, Jenis Kata (POS), dan Kotak Cari */}
      <section
        aria-label="Filter kamus"
        className="space-y-4 rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold text-ink-muted">Level CEFR:</span>
          <Link
            href={buildKamusUrl({ pos: activePos, q: activeQ })}
            aria-current={activeCefr === "" ? "true" : undefined}
            className={`inline-flex min-h-[40px] items-center rounded-xl border px-3 py-2 text-xs font-bold transition ${
              activeCefr === ""
                ? "border-brand/40 bg-brand-soft text-brand-text"
                : "border-line-strong bg-canvas text-ink-secondary hover:bg-subtle hover:text-ink"
            }`}
          >
            Semua
          </Link>
          {CEFR_LEVELS.map((lvl) => {
            const isSelected = activeCefr === lvl;
            return (
              <Link
                key={lvl}
                href={buildKamusUrl({ cefr: lvl, pos: activePos, q: activeQ })}
                aria-current={isSelected ? "true" : undefined}
                className={`inline-flex min-h-[40px] items-center rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  isSelected
                    ? "border-brand/40 bg-brand-soft text-brand-text"
                    : "border-line-strong bg-canvas text-ink-secondary hover:bg-subtle hover:text-ink"
                }`}
              >
                {lvl}
              </Link>
            );
          })}
        </div>

        <form method="GET" action="/materi/kamus" className="grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_200px_auto]">
          {activeCefr ? <input type="hidden" name="cefr" value={activeCefr} /> : null}
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              name="q"
              defaultValue={activeQ}
              placeholder="Cari kata bahasa Inggris atau arti Indonesia..."
              aria-label="Cari kata atau arti"
              className="min-h-[40px] w-full rounded-full border border-line-strong bg-canvas py-2 pl-9 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus-visible:outline-2 focus-visible:outline-brand"
            />
          </div>

          <div>
            <select
              name="pos"
              defaultValue={activePos}
              aria-label="Filter jenis kata"
              className="min-h-[40px] w-full rounded-xl border border-line-strong bg-canvas px-3 py-2 text-sm text-ink focus:border-brand focus-visible:outline-2 focus-visible:outline-brand"
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
              className="inline-flex min-h-[40px] items-center rounded-xl border border-line-strong bg-subtle px-4 py-2 text-sm font-semibold text-ink transition hover:bg-line/60"
            >
              Terapkan
            </button>
            {activeCefr || activePos || activeQ ? (
              <Link
                href="/materi/kamus"
                className="inline-flex min-h-[40px] items-center rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:bg-subtle hover:text-ink"
              >
                Reset
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {/* Info Jumlah */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-secondary">
        <span>
          Menampilkan <strong className="text-ink">{dict.items.length}</strong> dari{" "}
          <strong className="text-ink">{dict.total}</strong> kata (Halaman {dict.page} dari {totalPages})
        </span>
      </div>

      {/* Daftar Kata — Satu DOM Tabel Responsif (50 baris, bukan 100) */}
      {dict.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
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
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="block w-full border-collapse text-left md:table">
              <caption className="sr-only">
                Daftar kosakata kamus bahasa Inggris
              </caption>
              <thead className="sr-only md:not-sr-only md:table-header-group">
                <tr className="border-b border-line bg-canvas text-xs font-semibold text-ink-secondary">
                  <th scope="col" className="w-[72px] whitespace-nowrap px-4 py-3">
                    #
                  </th>
                  <th scope="col" className="w-[22%] min-w-[160px] px-4 py-3">
                    Kata
                  </th>
                  <th scope="col" className="w-20 px-4 py-3">
                    Level
                  </th>
                  <th scope="col" className="w-[24%] min-w-[180px] px-4 py-3">
                    Arti Indonesia
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Contoh Kalimat
                  </th>
                </tr>
              </thead>
              <tbody className="block divide-y divide-line md:table-row-group">
                {dict.items.map((item) => (
                  <tr
                    key={item.id}
                    className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1 px-4 py-3.5 transition hover:bg-canvas/70 md:table-row md:p-0"
                  >
                    <td className="hidden whitespace-nowrap px-4 py-3 align-top font-mono text-xs font-semibold tabular-nums text-ink-muted md:table-cell">
                      #{item.no}
                    </td>
                    <td className="col-start-1 row-start-1 min-w-0 md:px-4 md:py-3 md:align-top">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-xs font-semibold tabular-nums text-ink-muted md:hidden">
                          #{item.no}
                        </span>
                        <span className="break-words text-sm font-bold tracking-tight text-ink">
                          {item.word}
                        </span>
                        <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-xs font-medium text-ink-secondary">
                          {item.pos}
                        </span>
                      </div>
                    </td>
                    <td className="col-start-2 row-start-1 shrink-0 justify-self-end md:px-4 md:py-3 md:align-top">
                      <LevelBadge level={item.cefr} />
                    </td>
                    <td className="col-span-2 mt-0.5 text-sm font-semibold text-brand-text md:mt-0 md:px-4 md:py-3 md:align-top">
                      {item.meaning_id}
                    </td>
                    <td className="col-span-2 mt-1.5 text-xs leading-relaxed md:mt-0 md:px-4 md:py-3 md:align-top">
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
        </div>
      )}

      {/* Navigasi Paginasi (50 per halaman) */}
      {totalPages > 1 ? (
        <nav
          aria-label="Paginasi kamus"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none"
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
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line-strong bg-canvas px-3 py-2 text-xs font-bold text-ink transition hover:bg-subtle"
              >
                <IconArrowLeft className="h-3.5 w-3.5" />
                <span>Sebelumnya</span>
              </Link>
            ) : (
              <span className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line bg-subtle/50 px-3 py-2 text-xs font-semibold text-ink-muted opacity-50">
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
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-xs font-bold tabular-nums transition ${
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
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line-strong bg-canvas px-3 py-2 text-xs font-bold text-ink transition hover:bg-subtle"
              >
                <span>Berikutnya</span>
                <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line bg-subtle/50 px-3 py-2 text-xs font-semibold text-ink-muted opacity-50">
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
