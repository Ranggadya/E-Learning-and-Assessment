"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  IconBuilding,
  IconClose,
  IconDashboard,
  IconMenu,
  IconShield,
} from "@/components/ui/Icons";
import { useLocalProgress } from "@/lib/local-progress";
import type { Company } from "@/lib/types";

interface LearnerShellProps {
  companies: Company[];
  children: React.ReactNode;
}

export function LearnerShell({ companies, children }: LearnerShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const progress = useLocalProgress();
  const completedSubtestCount = Object.keys(progress.bySubtestId).length;

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const isDashboardActive = pathname === "/";

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-surface">
      <div className="overflow-y-auto px-4 py-5">
        <div className="flex items-center justify-between px-2">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-ink"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
              eA
            </span>
            <span>e-assessment</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu navigasi"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-subtle hover:text-ink lg:hidden"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Navigasi utama" className="mt-6 space-y-6">
          <div>
            <p className="px-2.5 text-xs font-medium text-ink-muted">Menu</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  aria-current={isDashboardActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                    isDashboardActive
                      ? "bg-brand-soft font-semibold text-brand-text"
                      : "text-ink-secondary hover:bg-subtle hover:text-ink"
                  }`}
                >
                  <IconDashboard className="h-4 w-4 shrink-0" />
                  <span>Dashboard</span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between px-2.5">
              <p className="text-xs font-medium text-ink-muted">Perusahaan</p>
              <span className="tabular-nums text-xs text-ink-muted">{companies.length}</span>
            </div>
            {companies.length === 0 ? (
              <p className="mt-2 px-2.5 text-xs text-ink-muted">Belum ada perusahaan</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {companies.map((company) => {
                  const isActive = pathname === `/c/${company.slug}` || pathname.startsWith(`/c/${company.slug}/`);
                  return (
                    <li key={company.id}>
                      <Link
                        href={`/c/${company.slug}`}
                        onClick={() => setMobileOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                          isActive
                            ? "bg-brand-soft font-semibold text-brand-text"
                            : "text-ink-secondary hover:bg-subtle hover:text-ink"
                        }`}
                      >
                        <span className="inline-flex min-w-0 items-center gap-2.5">
                          <IconBuilding className="h-4 w-4 shrink-0" />
                          <span className="truncate">{company.name}</span>
                        </span>
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${
                            isActive
                              ? "bg-brand/15 text-brand-text"
                              : "bg-subtle text-ink-muted"
                          }`}
                        >
                          {company.packageCount}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </nav>
      </div>

      <div className="border-t border-line p-4 space-y-3">
        <div className="rounded-lg bg-subtle px-3 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-secondary">Progres perangkat ini</span>
            <span className="font-semibold tabular-nums text-ink">
              {completedSubtestCount} subtes
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Tersimpan otomatis di browser tanpa akun.
          </p>
        </div>

        <ThemeToggle />

        <div className="flex items-center justify-between pt-1 text-xs text-ink-muted">
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center gap-1.5 font-medium text-ink-secondary transition hover:text-ink"
          >
            <IconShield className="h-3.5 w-3.5" />
            <span>CMS Admin</span>
          </Link>
          <span>Latihan mandiri</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Sidebar Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r border-line lg:block">
        {sidebarContent}
      </aside>

      {/* Topbar Mobile */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu navigasi"
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary transition hover:bg-subtle hover:text-ink"
          >
            <IconMenu className="h-4 w-4" />
          </button>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-[11px] font-bold text-white">
              eA
            </span>
            <span>e-assessment</span>
          </Link>
        </div>
        <ThemeToggle compact />
      </header>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="animate-drawer fixed inset-y-0 left-0 w-[276px] max-w-[85vw] border-r border-line bg-surface shadow-xl">
            {sidebarContent}
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      <div className="lg:pl-[260px]">
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-5xl border-t border-line px-4 py-5 text-xs text-ink-muted sm:px-6 lg:px-8">
          <p>e-assessment adalah alat latihan psikotes mandiri dan tidak berafiliasi resmi dengan perusahaan penyelenggara tes.</p>
        </footer>
      </div>
    </div>
  );
}
