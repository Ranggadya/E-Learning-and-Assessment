"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  IconClipboardList,
  IconClose,
  IconDashboard,
  IconExternalLink,
  IconMenu,
  IconShield,
  IconUpload,
} from "@/components/ui/Icons";

export type AdminNavKey = "dashboard" | "import" | "audit";

interface AdminShellProps {
  activeNav: AdminNavKey;
  children: React.ReactNode;
}

const ADMIN_NAV_ITEMS: Array<{
  key: AdminNavKey;
  href: string;
  label: string;
  Icon: typeof IconDashboard;
}> = [
  { key: "dashboard", href: "/admin", label: "Paket & Subtes", Icon: IconDashboard },
  { key: "import", href: "/admin/import", label: "Impor JSON", Icon: IconUpload },
  { key: "audit", href: "/admin/audit", label: "Audit Log", Icon: IconClipboardList },
];

function navItemClassName(isActive: boolean): string {
  return `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
    isActive
      ? "bg-brand font-bold text-white shadow-xs"
      : "font-semibold text-ink-secondary hover:bg-subtle hover:text-ink"
  }`;
}

export function AdminShell({ activeNav, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeDrawerButtonRef = useRef<HTMLButtonElement>(null);
  const wasMobileOpenRef = useRef(false);

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

  function renderSidebar(isMobileDrawer: boolean) {
    return (
      <div className="flex h-full flex-col justify-between bg-surface">
        <div className="overflow-y-auto px-4 py-5">
          <div className="flex items-center justify-between gap-2 border-b border-line px-1 pb-4">
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="inline-flex min-w-0 items-center gap-2 text-sm font-extrabold tracking-tight text-ink"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-extrabold text-white">
                eA
              </span>
              <span className="truncate">e-assessment</span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-subtle px-1.5 py-0.5 text-[11px] font-semibold text-ink-secondary">
                <IconShield className="h-3 w-3" />
                Admin
              </span>
            </Link>
            {isMobileDrawer ? (
              <button
                ref={closeDrawerButtonRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup menu navigasi admin"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-subtle hover:text-ink lg:hidden"
              >
                <IconClose className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <nav aria-label="Navigasi Admin" className="mt-5">
            <p className="px-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              CMS Admin
            </p>
            <ul className="mt-2 space-y-1">
              {ADMIN_NAV_ITEMS.map(({ key, href, label, Icon }) => {
                const isActive = activeNav === key;
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={navItemClassName(isActive)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="space-y-3 border-t border-line p-4">
          <ThemeToggle />

          <div className="flex items-center justify-between gap-2 pt-1">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary transition hover:text-ink"
            >
              <IconExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span>Lihat Situs</span>
            </Link>
            <LogoutButton />
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
            aria-label="Buka menu navigasi admin"
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink-secondary transition hover:bg-subtle hover:text-ink"
          >
            <IconMenu className="h-4 w-4" />
          </button>
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-[11px] font-extrabold text-white">
              eA
            </span>
            <span>e-assessment</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-subtle px-1.5 py-0.5 text-[11px] font-semibold text-ink-secondary">
              <IconShield className="h-3 w-3" />
              Admin
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
          aria-label="Menu navigasi admin"
        >
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
      </div>
    </div>
  );
}
