"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import {
  IconBuilding,
  IconClose,
  IconDashboard,
  IconFileText,
  IconHistory,
  IconMenu,
  IconShield,
} from "@/components/ui/Icons";
import { countCompletedActiveSubtests } from "@/lib/assessment/dashboard";
import { useLocalProgress } from "@/lib/client/local-progress";
import type { Company } from "@/types/assessment";

interface LearnerShellProps {
  companies: Company[];
  children: React.ReactNode;
}

function navItemClassName(isActive: boolean): string {
  return `flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
    isActive
      ? "bg-brand font-bold text-white shadow-xs"
      : "font-semibold text-ink-secondary hover:bg-subtle hover:text-ink"
  }`;
}

function navBadgeClassName(isActive: boolean): string {
  return `shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
    isActive ? "bg-blue-950/35 text-white" : "bg-subtle text-ink-muted"
  }`;
}

export function LearnerShell({ companies, children }: LearnerShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeDrawerButtonRef = useRef<HTMLButtonElement>(null);
  const wasMobileOpenRef = useRef(false);
  const progress = useLocalProgress();
  const activeSubtestIds = useMemo(
    () => companies.flatMap((company) => company.subtestIds),
    [companies],
  );
  const completedSubtestCount = useMemo(
    () => countCompletedActiveSubtests(activeSubtestIds, progress),
    [activeSubtestIds, progress],
  );
  const recentAttemptCount = progress.recentAttempts.length;
  const totalSubtests = activeSubtestIds.length;
  const progressPercent =
    totalSubtests > 0 ? Math.min(100, Math.round((completedSubtestCount / totalSubtests) * 100)) : 0;

  useEffect(() => {
    const wasOpen = wasMobileOpenRef.current;
    wasMobileOpenRef.current = mobileOpen;

    if (!wasOpen && mobileOpen) {
      closeDrawerButtonRef.current?.focus();
    } else if (wasOpen && !mobileOpen) {
      menuButtonRef.current?.focus();
    }
  }, [mobileOpen]);

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
  const isHistoryActive = pathname === "/riwayat";
  const isMateriActive = pathname === "/materi" || pathname.startsWith("/materi/");

  function renderSidebar(isMobileDrawer: boolean) {
    return (
      <div className="flex h-full flex-col justify-between bg-surface">
        <div className="overflow-y-auto px-4 py-5">
          <div className="flex items-center justify-between border-b border-line px-2 pb-4">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center gap-2.5 text-base font-extrabold tracking-tight text-ink"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-xs font-extrabold text-white">
                eA
              </span>
              <span>e-assessment</span>
            </Link>
            {isMobileDrawer ? (
              <button
                ref={closeDrawerButtonRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup menu navigasi"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-secondary hover:bg-subtle hover:text-ink lg:hidden"
              >
                <IconClose className="h-4 w-4" />
              </button>
            ) : null}
          </div>

        <nav aria-label="Navigasi utama" className="mt-5 space-y-6">
          <div>
            <p className="px-2.5 text-xs font-semibold text-ink-muted">
              Menu Utama
            </p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  aria-current={isDashboardActive ? "page" : undefined}
                  className={navItemClassName(isDashboardActive)}
                >
                  <span className="inline-flex min-w-0 items-center gap-2.5">
                    <IconDashboard className="h-4 w-4 shrink-0" />
                    <span className="truncate">Dashboard</span>
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/riwayat"
                  onClick={() => setMobileOpen(false)}
                  aria-current={isHistoryActive ? "page" : undefined}
                  className={navItemClassName(isHistoryActive)}
                >
                  <span className="inline-flex min-w-0 items-center gap-2.5">
                    <IconHistory className="h-4 w-4 shrink-0" />
                    <span className="truncate">Riwayat &amp; Progres</span>
                  </span>
                  {recentAttemptCount > 0 ? (
                    <span className={navBadgeClassName(isHistoryActive)}>{recentAttemptCount}</span>
                  ) : null}
                </Link>
              </li>
              <li>
                <Link
                  href="/materi"
                  onClick={() => setMobileOpen(false)}
                  aria-current={isMateriActive ? "page" : undefined}
                  className={navItemClassName(isMateriActive)}
                >
                  <span className="inline-flex min-w-0 items-center gap-2.5">
                    <IconFileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">Materi Inggris</span>
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between px-2.5">
              <p className="text-xs font-semibold text-ink-muted">
                Perusahaan
              </p>
              <span className="tabular-nums text-xs font-semibold text-ink-muted">
                {companies.length}
              </span>
            </div>
            {companies.length === 0 ? (
              <p className="mt-2 px-2.5 text-xs text-ink-muted">Belum ada perusahaan</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {companies.map((company) => {
                  const isActive =
                    pathname === `/c/${company.slug}` || pathname.startsWith(`/c/${company.slug}/`);
                  return (
                    <li key={company.id}>
                      <Link
                        href={`/c/${company.slug}`}
                        onClick={() => setMobileOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={navItemClassName(isActive)}
                      >
                        <span className="inline-flex min-w-0 items-center gap-2.5">
                          <IconBuilding className="h-4 w-4 shrink-0" />
                          <span className="truncate">{company.name}</span>
                        </span>
                        <span className={navBadgeClassName(isActive)}>{company.packageCount}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </nav>
      </div>

      <div className="space-y-3 border-t border-line p-4">
        <div className="rounded-lg border border-line-strong bg-subtle px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-ink">Progres lokal</span>
            <span className="font-mono font-bold tabular-nums text-brand-text">
              {totalSubtests > 0
                ? `${completedSubtestCount}/${totalSubtests}`
                : `${completedSubtestCount} subtes`}
            </span>
          </div>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-[3px] bg-line-strong/60"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progres subtes lokal"
          >
            <div
              className="h-full rounded-[3px] bg-brand transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <ThemeToggle />

        <div className="flex items-center justify-between pt-1 text-xs text-ink-muted">
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center gap-1.5 font-semibold text-ink-secondary transition hover:text-ink"
          >
            <IconShield className="h-3.5 w-3.5" />
            <span>CMS Admin</span>
          </Link>
          <span>Latihan mandiri</span>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Sidebar Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line-strong bg-surface lg:block">
        {renderSidebar(false)}
      </aside>

      {/* Topbar Mobile */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line-strong bg-surface/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu navigasi"
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink-secondary transition hover:bg-subtle hover:text-ink"
          >
            <IconMenu className="h-4 w-4" />
          </button>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-xs font-extrabold text-white">
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
          <div className="animate-drawer fixed inset-y-0 left-0 w-[276px] max-w-[85vw] border-r border-line-strong bg-surface shadow-xl">
            {renderSidebar(true)}
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      <div className="lg:pl-[248px]">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-6xl border-t border-line px-4 py-5 text-xs text-ink-muted sm:px-6 lg:px-8">
          <p>e-assessment adalah alat latihan psikotes mandiri dan tidak berafiliasi resmi dengan perusahaan penyelenggara tes.</p>
        </footer>
      </div>
    </div>
  );
}
