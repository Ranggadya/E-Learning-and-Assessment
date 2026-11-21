"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/admin/DeleteButton";
import {
  IconDownload,
  IconExternalLink,
  IconLayers,
  IconSearch,
  IconUpload,
} from "@/components/ui/Icons";
import { SUBTEST_UNIT, type AdminCompany } from "@/lib/types";

interface AdminDashboardClientProps {
  companies: AdminCompany[];
}

export function AdminDashboardClient({ companies }: AdminDashboardClientProps) {
  const [query, setQuery] = useState("");

  const totals = useMemo(() => {
    let packages = 0;
    let subtests = 0;
    let questions = 0;
    for (const company of companies) {
      packages += company.packages.length;
      for (const pkg of company.packages) {
        subtests += pkg.subtests.length;
        for (const subtest of pkg.subtests) {
          questions += subtest.questionCount;
        }
      }
    }
    return {
      companies: companies.length,
      packages,
      subtests,
      questions,
    };
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return companies;
    }
    return companies
      .map((company) => {
        if (
          company.name.toLowerCase().includes(trimmed) ||
          company.slug.toLowerCase().includes(trimmed)
        ) {
          return company;
        }
        const matchedPackages = company.packages
          .map((pkg) => {
            if (
              pkg.name.toLowerCase().includes(trimmed) ||
              pkg.slug.toLowerCase().includes(trimmed)
            ) {
              return pkg;
            }
            const matchedSubtests = pkg.subtests.filter(
              (s) =>
                s.name.toLowerCase().includes(trimmed) ||
                s.slug.toLowerCase().includes(trimmed),
            );
            return matchedSubtests.length > 0 ? { ...pkg, subtests: matchedSubtests } : null;
          })
          .filter((item): item is AdminCompany["packages"][number] => item !== null);

        return matchedPackages.length > 0 ? { ...company, packages: matchedPackages } : null;
      })
      .filter((item): item is AdminCompany => item !== null);
  }, [companies, query]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Manajemen Paket Soal</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Lihat daftar paket yang aktif di situs, impor paket JSON baru, ekspor untuk cadangan, atau hapus paket/subtes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/admin/template"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-subtle"
          >
            <IconDownload className="h-4 w-4 text-ink-secondary" />
            <span>Contoh JSON</span>
          </a>
          <Link
            href="/admin/import"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            <IconUpload className="h-4 w-4" />
            <span>Impor Paket Soal</span>
          </Link>
        </div>
      </div>

      {/* Unified Summary Strip */}
      <section aria-label="Ringkasan database soal" className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <dl className="grid grid-cols-2 divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="p-4 sm:px-5">
            <dt className="text-xs font-medium text-ink-muted">Perusahaan</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">{totals.companies}</dd>
          </div>
          <div className="border-l border-line p-4 sm:border-l-0 sm:px-5">
            <dt className="text-xs font-medium text-ink-muted">Paket</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">{totals.packages}</dd>
          </div>
          <div className="p-4 sm:px-5">
            <dt className="text-xs font-medium text-ink-muted">Subtes</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">{totals.subtests}</dd>
          </div>
          <div className="border-l border-line p-4 sm:border-l-0 sm:px-5">
            <dt className="text-xs font-medium text-ink-muted">Total Soal</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-brand-text">{totals.questions}</dd>
          </div>
        </dl>
      </section>

      {/* Filter Bar */}
      {companies.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-sm">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter perusahaan, paket, atau subtes..."
              aria-label="Filter paket soal"
              className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted transition focus:border-brand focus:outline-none"
            />
          </div>
          {query.trim() ? (
            <span className="text-xs text-ink-muted">
              Menampilkan {filteredCompanies.length} perusahaan
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Companies & Packages List */}
      {companies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface p-10 text-center">
          <IconLayers className="mx-auto h-8 w-8 text-ink-muted" />
          <h2 className="mt-3 text-base font-semibold text-ink">Belum ada paket di database</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Mulai dengan mengimpor satu file paket JSON atau unduh contoh formatnya terlebih dahulu.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/admin/import"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              <IconUpload className="h-4 w-4" />
              <span>Impor Paket Pertama</span>
            </Link>
            <a
              href="/api/admin/template"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:bg-subtle"
            >
              <IconDownload className="h-4 w-4" />
              <span>Unduh Contoh JSON</span>
            </a>
          </div>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-ink-secondary">
          Tidak ada paket atau subtes yang cocok dengan &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="space-y-5">
          {filteredCompanies.map((company) => (
            <section
              key={company.id}
              className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-semibold text-ink">{company.name}</h2>
                  <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-xs text-ink-muted">
                    {company.slug}
                  </code>
                </div>
                <span className="font-mono text-xs tabular-nums text-ink-muted">
                  {company.packages.length} paket
                </span>
              </div>

              <div className="divide-y divide-line">
                {company.packages.map((testPackage) => {
                  const pkgQuestions = testPackage.subtests.reduce((acc, s) => acc + s.questionCount, 0);
                  return (
                    <div key={testPackage.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-subtle/50 px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/c/${company.slug}/${testPackage.slug}`}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition hover:text-brand-text"
                          >
                            <span>{testPackage.name}</span>
                            <IconExternalLink className="h-3.5 w-3.5 text-ink-muted" />
                          </Link>
                          <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-ink-muted border border-line">
                            {testPackage.slug}
                          </code>
                          <span className="text-xs text-ink-muted tabular-nums">
                            {testPackage.subtests.length} subtes · {pkgQuestions} soal
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <a
                            href={`/api/admin/packs/${testPackage.id}/export`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-text transition hover:bg-brand-soft"
                          >
                            <IconDownload className="h-3.5 w-3.5" />
                            <span>Ekspor JSON</span>
                          </a>
                          <DeleteButton
                            url={`/api/admin/packs/${testPackage.id}`}
                            label="Hapus paket"
                            confirmLabel="Hapus paket?"
                          />
                        </div>
                      </div>

                      <ul className="divide-y divide-line text-sm">
                        {testPackage.subtests.map((subtest) => (
                          <li
                            key={subtest.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 transition hover:bg-subtle/30"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-ink">{subtest.name}</span>
                              <code className="font-mono text-xs text-ink-muted">{subtest.slug}</code>
                              <span className="text-xs text-ink-muted tabular-nums">
                                · {subtest.questionCount} {SUBTEST_UNIT[subtest.kind ?? "QUIZ"]} · {Math.max(1, Math.round(subtest.durationSeconds / 60))} menit
                              </span>
                            </div>
                            <DeleteButton
                              url={`/api/admin/subtests/${subtest.id}`}
                              label="Hapus"
                              confirmLabel="Hapus?"
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
