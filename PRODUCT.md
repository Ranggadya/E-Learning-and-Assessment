# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Peserta latihan (primary):** Pencari kerja, mahasiswa, dan fresh graduate di Indonesia yang sedang mempersiapkan tes seleksi kerja dan magang perusahaan (saat ini Astra Group dan Paragon, ke depannya meluas ke perusahaan lain). Mereka membutuhkan latihan psikotes yang terstruktur, realistis dengan batas waktu, dan langsung memberikan evaluasi pembahasan tanpa perlu membuat akun.
- **Admin (secondary):** Pemilik situs yang mengelola bank soal melalui CMS sederhana — melihat daftar perusahaan/paket/subtes, mengimpor file paket JSON dengan pratinjau validasi, mengekspor JSON, dan menghapus paket atau subtes.

## Product Purpose

`e-assessment` adalah platform latihan psikotes seleksi kerja & magang berbasis CMS yang dirancang seperti dashboard belajar yang mudah dipahami. Peserta dapat memilih perusahaan dan paket latihan, melihat progres latihan pribadi di perangkatnya, mengerjakan subtes ber-timer dengan empat tipe soal (`TEXT`, `IMAGE` SVG, `MEMORY` 5 detik, `SPEED` auto-next), dan meninjau skor beserta pembahasan lengkap. Admin dapat menambah atau memperbarui paket soal tanpa mengubah kode atau deploy ulang.

## Positioning

Alat latihan psikotes multi-perusahaan yang fokus, bebas login (tanpa hambatan akun), penilaian aman di server (kunci jawaban tidak pernah bocor ke browser), dan konten dikelola lewat file paket JSON atomik yang tervalidasi.

## Operating Context

- Peserta mengakses dari laptop/desktop maupun ponsel (responsif), sering kali dalam sesi latihan berdurasi 5–30 menit per subtes dengan kebutuhan fokus tinggi dan dukungan pintasan keyboard (`1–5` / `A–E`).
- Tanpa akun peserta: progres latihan dan riwayat skor terbaru disimpan secara lokal di browser (`localStorage`) untuk ditampilkan di dashboard peserta, tanpa mengumpulkan data pribadi.
- Admin mengakses `/admin` dan `/admin/import` sesekali untuk mengelola paket soal melalui file JSON (hingga 8 MB) dengan alur `Periksa dulu` (dry-run) → `Impor sekarang`.
- Arsitektur: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, PostgreSQL (`pg`, tanpa ORM), target hosting Vercel + Neon.

## Capabilities and Constraints

- **Fitur aktif saat ini:** Hierarki Perusahaan → Paket → Subtes → Pengerjaan (`TEXT`, `IMAGE`, `MEMORY`, `SPEED`) → Hasil & Pembahasan; progres & riwayat skor lokal di browser; CMS Admin (login password tunggal via `ADMIN_PASSWORD`, dashboard ringkasan paket, impor JSON dengan dry-run preview & transaksi atomik, ekspor JSON, hapus paket/subtes, unduh template).
- **Kesiapan ekspansi:** Struktur navigasi dashboard peserta harus mudah diperluas untuk modul e-learning (misalnya materi pembelajaran) di masa depan, namun saat ini **tidak** menampilkan menu kosong atau placeholder "segera hadir".
- **Aturan keamanan & bisnis yang tidak boleh berubah:** Penilaian tetap di server, kunci & pembahasan tidak dikirim sebelum submit, timer berbasis jam sistem (`useCountdown`), validasi VR-01 s.d. VR-06, dan CMS tetap sederhana untuk pengelolaan paket.
- **Di luar cakupan v1.0:** Akun peserta lintas perangkat, papan peringkat, tes kepribadian, Pauli/Kraepelin, editor soal berbasis form.

## Brand Commitments

- **Nama produk:** `e-assessment`
- **Bahasa antarmuka:** Bahasa Indonesia.
- **Disclaimer faktual:** Alat latihan mandiri, tidak berafiliasi resmi dengan Astra maupun Paragon.
- **Standar visual (standing preference):** Standar kategori Modern EdTech (`canon`) dengan kualitas & nuansa patokan setara Dicoding, Coursera, dan Linear — bersih, modern, kontras tinggi, tipografi tajam, serta fokus pada keterbacaan dan kejelasan progres.

## Evidence on Hand

- Konten nyata tersedia di `db/packs/` dan basis data: Astra Group (Paket 1 & Paket 2, masing-masing 7 subtes, 90 soal) dan Paragon (Paket 1 & Paket 2, masing-masing 3 subtes, 40 soal).
- Dokumen spesifikasi: `Software Requirements Specification (SRS).md` dan `Functional Design Specification (FDS).md`.
- Tidak ada testimoni, data pengguna eksternal, atau klaim tingkat kelulusan — jangan mengarang angka/bukti sosial.

## Product Principles

1. **Kejelasan di atas hiasan:** Peserta harus langsung paham posisi mereka (perusahaan → paket → subtes), sisa waktu, status jawaban, dan hasil evaluasi dalam sekali pandang.
2. **Fokus penuh saat ujian:** Halaman pengerjaan (`TestRunner`) mengutamakan ketenangan visual, keterbacaan soal & SVG, serta perlindungan dari salah klik atau kehilangan progres.
3. **Progres yang terasa tanpa hambatan akun:** Riwayat dan progres lokal membantu peserta melanjutkan latihan dengan percaya diri tanpa dipaksa mendaftar.
4. **CMS yang ringkas dan aman:** Dashboard admin dibuat sederhana, cepat dipindai, dan mencegah kesalahan destruktif lewat pratinjau validasi dan konfirmasi yang jelas.

## Accessibility & Inclusion

- Mendukung pengoperasian penuh dengan keyboard (termasuk pintasan `1–5` / `A–E` saat mengerjakan soal).
- Mendukung mode terang dan mode gelap dengan kontras teks dan status (benar/salah/peringatan) yang terjaga.
- Responsif dari layar ponsel hingga desktop, dengan label aksesibilitas yang jelas pada timer, status soal, dan gambar SVG.
