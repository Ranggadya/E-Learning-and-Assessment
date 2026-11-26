import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft, IconSearch } from "@/components/ui/Icons";
import { getGlossaryEntries } from "@/lib/belajar/glossary";

export const metadata: Metadata = {
  title: "Glosarium Istilah Teknis · Belajar",
};

interface GlosariumPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function GlosariumPage({ searchParams }: GlosariumPageProps) {
  const { q: rawQ } = await searchParams;
  const query = (rawQ ?? "").trim().toLowerCase();
  const entries = getGlossaryEntries().filter(
    (item) =>
      !query ||
      item.term.toLowerCase().includes(query) ||
      item.definition.toLowerCase().includes(query),
  );

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
          Glosarium Istilah Software Engineering
        </h1>
        <p className="mt-1 max-w-[68ch] text-sm text-ink-secondary">
          Daftar istilah teknis bahasa Inggris yang dipertahankan pada seluruh materi beserta arti singkatnya dalam bahasa Indonesia.
        </p>
      </div>

      <form method="GET" action="/belajar/glosarium" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            name="q"
            defaultValue={rawQ ?? ""}
            placeholder="Cari istilah teknis atau arti..."
            aria-label="Cari istilah glosarium"
            className="min-h-[42px] w-full rounded-full border border-line-strong bg-surface py-2 pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus-visible:outline-2 focus-visible:outline-brand"
          />
        </div>
        <button
          type="submit"
          className="min-h-[42px] rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-hover"
        >
          Cari
        </button>
        {query ? (
          <Link
            href="/belajar/glosarium"
            className="inline-flex min-h-[42px] items-center rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-xs font-semibold text-ink hover:bg-subtle"
          >
            Reset
          </Link>
        ) : null}
      </form>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-ink-secondary">
          Tidak ada istilah yang cocok dengan pencarianmu.
        </div>
      ) : (
        <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_2px_10px_-4px_rgba(15,23,42,0.05)] dark:shadow-none">
          {entries.map((entry) => (
            <div
              key={entry.term}
              className="grid grid-cols-1 gap-1 px-5 py-4 sm:grid-cols-[200px_1fr] sm:gap-4"
            >
              <dt className="font-mono text-sm font-bold text-brand-text">{entry.term}</dt>
              <dd className="text-sm leading-relaxed text-ink">{entry.definition}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
