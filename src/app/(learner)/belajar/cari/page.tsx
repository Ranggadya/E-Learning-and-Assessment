import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft, IconClock, IconSearch } from "@/components/ui/Icons";
import { searchPublishedLessons } from "@/lib/belajar/belajar.queries";
import { LESSON_LEVEL_LABEL } from "@/lib/belajar/constants";

export const metadata: Metadata = {
  title: "Cari Materi Belajar",
};

interface CariBelajarPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function CariBelajarPage({ searchParams }: CariBelajarPageProps) {
  const { q: rawQ } = await searchParams;
  const query = (rawQ ?? "").trim();
  const hits = query ? await searchPublishedLessons(query) : [];

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/belajar"
          className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-ink-secondary transition hover:text-ink"
        >
          <IconArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Roadmap</span>
        </Link>

        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
          Pencarian Materi
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Cari kata kunci pada judul maupun isi seluruh pelajaran yang sudah berstatus reviewed.
        </p>
      </div>

      <form method="GET" action="/belajar/cari" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Contoh: closure, index, http, git..."
            aria-label="Kata kunci pencarian materi"
            className="min-h-[42px] w-full rounded-full border border-line-strong bg-surface py-2 pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus-visible:outline-2 focus-visible:outline-brand"
          />
        </div>
        <button
          type="submit"
          className="min-h-[42px] rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white transition hover:bg-brand-hover"
        >
          Cari Materi
        </button>
      </form>

      {!query ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-ink-muted">
          Masukkan kata kunci di atas untuk mencari pelajaran lintas jalur.
        </div>
      ) : hits.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-ink-secondary">
          Tidak ditemukan pelajaran berstatus reviewed untuk kata kunci{" "}
          <strong className="text-ink">&ldquo;{query}&rdquo;</strong>.
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-ink-muted tabular-nums">
            Ditemukan {hits.length} pelajaran untuk &ldquo;{query}&rdquo;
          </p>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
            {hits.map((hit) => (
              <li key={hit.id}>
                <Link
                  href={`/belajar/${hit.trackSlug}/${hit.slug}`}
                  className="block p-5 transition hover:bg-canvas/70"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-brand-soft px-2 py-0.5 font-bold text-brand-text">
                      {hit.trackTitle}
                    </span>
                    <span className="rounded-md bg-subtle px-2 py-0.5 font-medium text-ink-secondary">
                      {LESSON_LEVEL_LABEL[hit.level]}
                    </span>
                    {hit.estimatedMinutes ? (
                      <span className="inline-flex items-center gap-1 text-ink-muted tabular-nums">
                        <IconClock className="h-3.5 w-3.5" />
                        <span>{hit.estimatedMinutes} mnt</span>
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-1.5 text-base font-bold text-ink">{hit.title}</h2>
                  {hit.snippet ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-secondary">
                      {hit.snippet}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
