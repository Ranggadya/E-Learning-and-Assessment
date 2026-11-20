# Desain Redesign UI/UX Dashboard & CMS `e-assessment`

**Tanggal:** 19 November 2026  
**Status:** Disetujui untuk eksekusi (Pendekatan A · Modern EdTech Canon)

## 1. Tujuan & Alasan
Aplikasi `e-assessment` saat ini berfungsi baik di sisi logika bisnis & penilaian server-side, tetapi antarmuka masih berupa kerangka dasar Tailwind dengan beberapa celah UX (mode gelap rusak di halaman hasil & pengerjaan, tombol Selesai hanya di soal terakhir tanpa konfirmasi soal kosong, soal `MEMORY` tanpa bar hitung mundur visual, navigasi nomor soal sempit di mobile, dan `window.confirm()` di CMS). Redesign ini mengubah aplikasi menjadi dashboard belajar modern yang jelas, cepat dipindai, dan siap berkembang ke banyak perusahaan maupun modul e-learning nantinya — sambil menjaga CMS admin tetap ringkas.

## 2. Tujuan, Non-Tujuan, dan Anti-Tujuan
- **Tujuan:**
  - Memberikan konsep dashboard peserta dengan sidebar persisten (desktop) / drawer (mobile), ringkasan progres & riwayat skor lokal (`localStorage` tanpa login), serta alur navigasi Perusahaan → Paket → Subtes → Pengerjaan → Pembahasan yang jernih.
  - Menyempurnakan `TestRunner` agar tenang, fokus, aman dari klik tidak sengaja atau penutupan tab, serta memberi umpan balik visual yang jelas untuk `MEMORY` (5 detik) dan `SPEED` (auto-next).
  - Memperbaiki halaman hasil dengan ringkasan akurasi, breakdown benar/salah/kosong, filter pembahasan, dan tombol *Ulangi Subtes*.
  - Menyediakan CMS Admin sederhana dengan top bar ringkas, pencarian, konfirmasi hapus inline, dan area drag-and-drop JSON.
  - Dukungan penuh mode terang & mode gelap (mengikuti OS secara default + tombol toggle manual).
- **Non-Tujuan:** Perubahan skema database, autentikasi peserta/akun lintas perangkat, editor soal berbasis form, atau menu dummy/placeholder "segera hadir".
- **Anti-Tujuan:** Tampilan penuh gamifikasi/dekorasi berlebihan, kartu bersarang (nested cards), kebocoran kunci jawaban ke browser, atau memperlambat pengerjaan tes.

## 3. Batasan Teknis & Produk
- Tetap menggunakan Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, dan PostgreSQL via `pg` tanpa ORM.
- Seluruh kebutuhan SRS (FR-01 s.d. FR-32, VR-01 s.d. VR-06, NFR-01 s.d. NFR-13) tetap terjaga.
- Penilaian tetap 100% di server; `getPublicQuestions` tidak pernah memilih `correct_option` atau `explanation`.
- Timer tetap berbasis jam sistem (`useCountdown`).

## 4. Pendekatan yang Dipertimbangkan
1. **Pendekatan A (Dipilih): Persistent Learner Dashboard Shell + Isolated Focus Exam Mode + Simple Admin Topbar.** Sidebar dinamis daftar perusahaan di sisi peserta + mode ujian terisolasi tanpa sidebar + top bar ringkas di CMS. Paling sesuai dengan konsep dashboard peserta yang mudah dipahami dan siap ditambah modul baru di masa depan.
2. **Pendekatan B (Ditolak):** Top-bar navigation satu kolom tanpa sidebar. Lebih sedikit komponen shell, tetapi terasa kurang seperti dashboard saat jumlah perusahaan & fitur bertambah.

## 5. Rancangan Detail
- **Sistem Desain (Patokan: Dicoding / Coursera / Linear):**
  - Tipografi: `Inter` untuk seluruh UI, `JetBrains Mono` khusus timer, skor, slug, dan JSON (`tabular-nums`).
  - Warna: Terang (`#F8FAFC` canvas, `#FFFFFF` surface, `#0F172A` teks, `#2563EB` aksen utama) dan Gelap (`#0B1120` canvas, `#111827` surface, `#F8FAFC` teks, `#3B82F6` aksen utama) dengan token status emerald/amber/red berkontras ≥4.5:1.
  - Ikon: Set SVG seragam `strokeWidth={1.75}` di `src/components/ui/Icons.tsx` (tanpa emoji sebagai ikon).
- **Progres Lokal (`src/lib/local-progress.ts`):** Menyimpan riwayat attempt & skor terbaik/terakhir per `subtestId` di `localStorage` memakai `useSyncExternalStore` agar aman terhadap SSR/hidrasi.
- **Query Read-Only Tambahan (`src/lib/queries.ts`):**
  - `getDashboardCatalog()` untuk menampilkan perusahaan, paket, dan subtes dalam satu query efisien.
  - Tambahan `questionTypes: QuestionType[]` pada `Subtest`, `companyName`/`packageName` pada `SubtestLocation`, serta `subtestId`/`companyName`/`packageName` pada `AttemptResult`.
- **Halaman & Komponen Utama:**
  - `LearnerShell`: sidebar dinamis + mobile drawer + theme toggle + indikator progres lokal.
  - `LearnerDashboard` (`/`): header + CTA "Lanjutkan Latihan", 4 metrik ringkas, pencarian katalog, daftar perusahaan & paket ber-progress bar, dan panel riwayat skor terakhir.
  - `CompanyPage` (`/c/[companySlug]`) & `PackagePage` (`/c/[companySlug]/[packageSlug]`): breadcrumb, progress bar paket, daftar subtes terstruktur dengan badge tipe soal & skor lokal terakhir.
  - `TestRunner` (`/test/[subtestId]`): sticky exam bar (timer, progress bar, tombol Selesai selalu tersedia, tombol Keluar aman), workspace 2 kolom (soal + panel nomor soal desktop / drawer mobile), bar hitung mundur 5 detik `MEMORY`, mikro-feedback `SPEED`, pintasan `1–5`/`A–E`/`←`/`→`, proteksi `beforeunload`, dan dialog konfirmasi kumpulkan jawaban.
  - `ResultReviewClient` (`/result/[attemptId]`): ringkasan skor/akurasi/benar/salah/kosong, perekaman otomatis ke `localStorage`, tombol *Ulangi Subtes*, dan filter pembahasan (`Semua`, `Salah`, `Kosong`, `Benar`).
  - `AdminShell`, `AdminDashboardClient`, `DeleteButton`, `PackImporter`, `AdminLoginForm`: top bar CMS sederhana, pencarian paket/subtes, konfirmasi hapus inline 2-langkah, dan dropzone JSON + stepper 3 tahap.
  - Halaman fallback: `loading.tsx` (skeleton), `not-found.tsx`, `error.tsx`.
