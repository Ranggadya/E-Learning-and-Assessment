"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import {
  IconBookOpen,
  IconBuilding,
  IconClose,
  IconDashboard,
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
  rightRail?: React.ReactNode;
}

function navItemClassName(isActive: boolean): string {
  return `group flex min-h-[42px] items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition ${
    isActive
      ? "bg-subtle font-bold text-ink"
      : "font-semibold text-ink-muted hover:bg-subtle/60 hover:text-ink"
  }`;
}

function navIconClassName(isActive: boolean): string {
  return `h-4 w-4 shrink-0 transition-colors ${
    isActive ? "text-ink" : "text-ink-muted group-hover:text-ink"
  }`;
}

function navBadgeClassName(isActive: boolean): string {
  return `shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
    isActive ? "bg-surface text-ink" : "bg-subtle text-ink-muted"
  }`;
}

export function LearnerShell({ companies, children, rightRail }: LearnerShellProps) {
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
      <div className="flex h-full flex-col justify-between bg-surface px-5 py-7">
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <div className="flex items-center justify-between pb-6">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center gap-2.5"
            >
              <IconBookOpen className="h-7 w-7 shrink-0 text-brand" strokeWidth={2} />
              <span className="text-xl font-bold tracking-tight text-brand-text">
                e-assessment
              </span>
            </Link>
            {isMobileDrawer ? (
              <button
                ref={closeDrawerButtonRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup menu navigasi"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-secondary transition hover:bg-subtle hover:text-ink lg:hidden"
              >
                <IconClose className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <nav aria-label="Navigasi utama" className="space-y-6">
            <div>
              <p className="px-3 text-xs font-semibold text-ink-muted">Menu Utama</p>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    aria-current={isDashboardActive ? "page" : undefined}
                    className={navItemClassName(isDashboardActive)}
                  >
                    <span className="inline-flex min-w-0 items-center gap-3">
                      <IconDashboard
                        className={navIconClassName(isDashboardActive)}
                        strokeWidth={isDashboardActive ? 2.1 : 1.75}
                      />
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
                    <span className="inline-flex min-w-0 items-center gap-3">
                      <IconHistory
                        className={navIconClassName(isHistoryActive)}
                        strokeWidth={isHistoryActive ? 2.1 : 1.75}
                      />
                      <span className="truncate">Riwayat &amp; Progres</span>
                    </span>
                    {recentAttemptCount > 0 ? (
                      <span className={navBadgeClassName(isHistoryActive)}>
                        {recentAttemptCount}
                      </span>
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
                    <span className="inline-flex min-w-0 items-center gap-3">
                      <IconBookOpen
                        className={navIconClassName(isMateriActive)}
                        strokeWidth={isMateriActive ? 2.1 : 1.75}
                      />
                      <span className="truncate">Materi Inggris</span>
                    </span>
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between px-3">
                <p className="text-xs font-semibold text-ink-muted">Perusahaan</p>
                <span className="tabular-nums text-xs font-semibold text-ink-muted">
                  {companies.length}
                </span>
              </div>
              {companies.length === 0 ? (
                <p className="mt-2 px-3 text-xs text-ink-muted">Belum ada perusahaan</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {companies.map((company) => {
                    const isActive =
                      pathname === `/c/${company.slug}` ||
                      pathname.startsWith(`/c/${company.slug}/`);
                    return (
                      <li key={company.id}>
                        <Link
                          href={`/c/${company.slug}`}
                          onClick={() => setMobileOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          className={navItemClassName(isActive)}
                        >
                          <span className="inline-flex min-w-0 items-center gap-3">
                            <IconBuilding
                              className={navIconClassName(isActive)}
                              strokeWidth={isActive ? 2.1 : 1.75}
                            />
                            <span className="truncate">{company.name}</span>
                          </span>
                          <span className={navBadgeClassName(isActive)}>
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

        <div className="mt-4 space-y-2.5 border-t border-line pt-4">
          <div className="rounded-xl bg-canvas px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-ink-secondary">Progres lokal</span>
              <span className="font-mono font-bold tabular-nums text-brand-text">
                {totalSubtests > 0
                  ? `${completedSubtestCount}/${totalSubtests}`
                  : `${completedSubtestCount} subtes`}
              </span>
            </div>
            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progres subtes lokal"
            >
              <div
                className="h-full rounded-full bg-brand transition-all duration-200"
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface lg:block">
        {renderSidebar(false)}
      </aside>

      {/* Topbar Mobile */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu navigasi"
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-secondary transition hover:bg-subtle hover:text-ink"
          >
            <IconMenu className="h-4 w-4" />
          </button>
          <Link href="/" className="inline-flex items-center gap-2">
            <IconBookOpen className="h-6 w-6 shrink-0 text-brand" strokeWidth={2} />
            <span className="text-base font-bold tracking-tight text-brand-text">
              e-assessment
            </span>
          </Link>
        </div>
        <ThemeToggle compact />
      </header>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="animate-drawer fixed inset-y-0 left-0 w-[276px] max-w-[85vw] border-r border-line bg-surface shadow-xl">
            {renderSidebar(true)}
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      {rightRail ? (
        <div className="lg:pl-64 xl:flex xl:min-h-screen xl:items-stretch">
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">{children}</main>
            <footer className="w-full border-t border-line px-4 py-5 text-xs text-ink-muted sm:px-6 lg:px-8">
              <p>
                e-assessment adalah alat latihan psikotes mandiri dan tidak berafiliasi resmi
                dengan perusahaan penyelenggara tes.
              </p>
            </footer>
          </div>
          <aside
            aria-label="Ringkasan peserta"
            className="w-full border-t border-line bg-surface px-4 py-6 sm:px-6 xl:sticky xl:top-0 xl:flex xl:h-screen xl:w-80 xl:shrink-0 xl:flex-col xl:justify-between xl:overflow-y-auto xl:border-t-0 xl:border-l xl:px-6 xl:py-7"
          >
            {rightRail}
          </aside>
        </div>
      ) : (
        <div className="flex min-h-screen flex-col lg:pl-64">
          <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-7 lg:py-7">{children}</main>
          <footer className="w-full border-t border-line px-4 py-5 text-xs text-ink-muted sm:px-6 lg:px-7">
            <p>
              e-assessment adalah alat latihan psikotes mandiri dan tidak berafiliasi resmi dengan
              perusahaan penyelenggara tes.
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}
