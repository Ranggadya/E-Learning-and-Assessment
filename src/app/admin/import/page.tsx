import Link from "next/link";
import { redirect } from "next/navigation";
import { PackImporter } from "@/components/admin/PackImporter";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/admin" className="text-sm text-blue-600 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Impor paket soal</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Satu file berisi satu paket milik satu perusahaan. Bila perusahaan, paket, atau subtes dengan slug yang sama sudah ada,
        datanya diperbarui dan soal pada subtes itu diganti. Subtes lain di paket yang sama tidak diubah, jadi file ini juga
        bisa dipakai untuk menambah subtes baru ke paket yang sudah ada. Gunakan tombol periksa untuk melihat pratinjau
        sebelum menyimpan.
      </p>
      <PackImporter />
    </main>
  );
}
