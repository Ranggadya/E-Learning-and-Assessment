import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconExternalLink, IconShield, IconUpload } from "@/components/ui/Icons";

interface AdminShellProps {
  activeNav: "dashboard" | "import";
  children: React.ReactNode;
}

export function AdminShell({ activeNav, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-ink">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
                eA
              </span>
              <span>e-assessment</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-ink-secondary">
                <IconShield className="h-3 w-3" />
                Admin
              </span>
            </Link>

            <nav aria-label="Navigasi Admin" className="hidden items-center gap-1 sm:flex">
              <Link
                href="/admin"
                aria-current={activeNav === "dashboard" ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeNav === "dashboard"
                    ? "bg-brand-soft font-semibold text-brand-text"
                    : "text-ink-secondary hover:bg-subtle hover:text-ink"
                }`}
              >
                Paket Soal
              </Link>
              <Link
                href="/admin/import"
                aria-current={activeNav === "import" ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeNav === "import"
                    ? "bg-brand-soft font-semibold text-brand-text"
                    : "text-ink-secondary hover:bg-subtle hover:text-ink"
                }`}
              >
                <IconUpload className="h-3.5 w-3.5" />
                <span>Impor JSON</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary transition hover:bg-subtle hover:text-ink sm:text-sm"
            >
              <span>Lihat Situs</span>
              <IconExternalLink className="h-3.5 w-3.5" />
            </Link>
            <ThemeToggle compact />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
