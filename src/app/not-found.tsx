import Link from "next/link";
import { IconArrowLeft } from "@/components/ui/Icons";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <p className="font-mono text-3xl font-bold tabular-nums text-brand-text">404</p>
        <h1 className="mt-2 text-xl font-bold text-ink">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Perusahaan, paket, subtes, atau hasil pengerjaan yang kamu cari tidak tersedia atau sudah dihapus.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
        >
          <IconArrowLeft className="h-4 w-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>
    </main>
  );
}
