# Software Requirements Specification (SRS)

**Aplikasi Latihan Psikotes & Materi Bahasa Inggris** · Versi 1.2 · 23 November 2026 · Penyusun: Dya

## 1. Pendahuluan

### 1.1 Tujuan dokumen

Dokumen ini menetapkan kebutuhan perangkat lunak untuk platform web **e-assessment** yang mencakup latihan soal tes seleksi (psikotes perusahaan seperti Astra International dan Paragon Corp, serta dapat diperluas ke BUMN dan CPNS), modul **Materi Bahasa Inggris** (kamus CEFR, flashcard Leitner 5 kotak, kuis kosakata), dan **CMS Admin** dengan proteksi integritas impor serta audit trail. Dokumen ini menjadi acuan tunggal pengembangan, pengujian, audit keamanan, dan pengelolaan konten.

### 1.2 Ruang lingkup

Aplikasi terdiri dari tiga subsistem utama:

1. **Situs Latihan Psikotes (Learner Experience / Publik):**
   - **Dashboard Beranda (`/`):** Tema Solid Cobalt dengan *Focus Hero Banner* 3-status dinamis (Mulai / Lanjutkan / Tuntas), metrik ringkas progres lokal, dan kartu perusahaan 2-kolom responsif dengan pratinjau hingga 4 paket teratas.
   - **Riwayat & Progres (`/riwayat`):** Pelacakan progres pengerjaan mandiri di `localStorage`, filter kategori subtes, dan tautan langsung ke review hasil.
   - **Katalog Perusahaan & Paket (`/c/[companySlug]`, `/c/[companySlug]/[packageSlug]`):** Hierarki perusahaan → paket → subtes.
   - **Sesi Tes Interaktif (`/test/[subtestId]`):** Mendukung 4 ragam subtes (`QUIZ`, `PERSONALITY`, `PAULI`, `DRAWING`) dengan timer drift-resistant dan pintasan keyboard.
   - **Review Hasil & Pembahasan (`/result/[attemptId]`):** Skor akhir, akurasi, status tiap butir soal, dan pembahasan rinci (`explanation`, `steps`, `wrongNotes`, `quickTip`).

2. **Modul Materi Bahasa Inggris (`/materi`):**
   - **Beranda Materi (`/materi`):** Daftar topik (Kamus 1.000 Kata aktif; Verb 1-2-3, Grammar, Merangkai Kata sebagai kartu *Segera Hadir*) serta ringkasan progres jumlah kata per kotak Leitner (Kotak 1–5 + Belum Dilihat) dan persentase penguasaan per level CEFR (`A1`–`C1`).
   - **Kamus 1.000 Kata (`/materi/kamus`):** Filter chip level CEFR (`A1`–`C1`), filter jenis kata (`pos`), pencarian kata/arti, badge level konsisten (`LevelBadge`), dan paginasi 50 kata per halaman.
   - **Mode Kartu / Flashcard (`/materi/kamus/belajar`):** Sistem pengulangan berjarak Leitner 5 kotak (benar naik 1 kotak dengan jeda `1, 2, 4, 8, 16` hari; salah kembali ke kotak 1), antrean jatuh tempo diikuti kata baru berurutan menurut `no` (batas kata baru per sesi dapat diatur), filter level CEFR, serta pintasan keyboard (`Spasi` = balik, `1` = Tahu, `2` = Belum).
   - **Kuis Kosakata (`/materi/kamus/kuis`):** 10 soal pilihan ganda otomatis (bergantian Inggris → Indonesia dan Indonesia → Inggris), 4 opsi unik dengan pengecoh se-jenis kata dan se-level CEFR, pintasan keyboard `1–4`, serta rekap skor dan pembahasan jawaban salah di akhir.

3. **Command Center Admin / CMS (`/admin`):**
   - **Navigasi Terpadu (`AdminShell`):** Sidebar desktop dan mobile drawer responsif dengan tombol logout dan pengalih tema.
   - **Dashboard Konten (`/admin`):** Ringkasan perusahaan, paket, subtes, dan persentase kelengkapan pembahasan rinci khusus subtes `QUIZ`; inline edit paket/subtes (`FOR UPDATE`), ekspor JSON, dan penghapusan atomik (`DELETE ... RETURNING`).
   - **Sistem Proteksi Impor (`/admin/import`):**
     - Impor paket soal utuh (`pack`) dan file `pembahasanSaja: true` dengan dry-run 2-fase murni read-only, canonical SHA-256 hash, *skip rewrite* subtes identik, peringatan riwayat terdampak & penurunan pembahasan rinci, spot-check sampel soal, server-enforced HTTP `409 Conflict` (`?force=1`), dan penulisan batch `UNNEST`.
     - Pengimpor JSON **Kamus Bahasa Inggris** (`/api/admin/english`) dengan upsert idempoten berdasarkan `no` tanpa menghapus progres belajar pengguna.
   - **Audit Trail (`/admin/audit`):** Tabel `import_audit_logs`, filter status (`SUCCESS`, `FORCED`, `REJECTED`, `FAILED`) & kategori aksi, inspeksi payload JSON, dan fail-safe kode PostgreSQL `42P01`.

### 1.3 Definisi dan singkatan

| Istilah | Arti |
| --- | --- |
| Perusahaan (company) | Penyelenggara tes (Astra, Paragon, BUMN, CPNS, dll.) |
| Paket (package) | Kumpulan subtes terstruktur milik satu perusahaan |
| Subtes (subtest) | Satu unit tes dengan durasi, urutan, dan ragam (`QUIZ`, `PERSONALITY`, `PAULI`, `DRAWING`) |
| Soal (question) | Satu butir pertanyaan pilihan ganda (`TEXT`, `IMAGE`, `MEMORY`, `SPEED`) |
| Pembahasan rinci | Penjelasan tambahan berisi `steps`, `wrongNotes`, dan/atau `quickTip` |
| Pengerjaan (attempt) | Rekam jejak satu sesi pengerjaan subtes oleh peserta |
| CEFR | Common European Framework of Reference for Languages (`A1`, `A2`, `B1`, `B2`, `C1`) |
| Sistem Kotak Leitner | Metode *spaced repetition* 5 kotak dengan jeda ulang `1, 2, 4, 8, 16` hari |
| Canonical Content Hash | SHA-256 hash deterministik dari payload JSON terkanonisasi untuk deteksi duplikasi isi |
| Dry Run | Simulasi impor murni read-only (`SELECT`) untuk analisis diff tanpa mutasi database |
| Audit Log | Catatan permanen (append-only) seluruh transaksi impor, edit, dan hapus di CMS |

### 1.4 Referensi

- `PROJECT.md`: Dokumentasi arsitektur Domain-First, peta file, API, skema DB, dan guardrail.
- `Functional Design Specification (FDS).md` & `Product Requirements Document (PRD).md`.
- `db/schema.sql`: Skema relasional PostgreSQL terkini (8 tabel).
- Guardrail arsitektur otomatis: `src/lib/architecture.test.ts`.

---

## 2. Deskripsi Umum

### 2.1 Perspektif produk

Aplikasi berdiri sendiri (*stand-alone*) berbasis Next.js 16 (App Router, Turbopack) full-stack dengan PostgreSQL via driver native `pg` (tanpa ORM). Kode diorganisasi secara **Domain-First** dengan pemisahan ketat antara definisi tipe murni (`src/types/*`), logika murni (`src/lib/<domain>/{constants,logic,scoring,dashboard}.ts`), query SQL server (`src/lib/<domain>/*.queries.ts`), dan state browser (`src/lib/client/*`).

### 2.2 Karakteristik pengguna

| Pengguna | Deskripsi | Hak akses |
| --- | --- | --- |
| Peserta Latihan (Learner) | Pencari kerja/mahasiswa. Tanpa registrasi akun; progres psikotes & ID anonim materi disimpan di `localStorage`. | Publik (`/`, `/riwayat`, `/c/*`, `/test/*`, `/result/*`, `/materi/*`) |
| Administrator | Pengelola konten soal, pembahasan, kamus, dan pemantau audit. | CMS terlindungi password (`/admin`, `/admin/import`, `/admin/audit`, `/api/admin/*`) |

### 2.3 Batasan teknologi & lingkungan

- Framework: Next.js 16.4.6 (App Router, Turbopack), React 19, TypeScript 5 (*strict mode*), Tailwind CSS 4.
- Database: PostgreSQL 15+ (Neon / Supabase / lokal) via `pg` Pool (`max: 5`).
- Pengujian: `npm test` (`scripts/run-tests.mjs` + `tsx --test`), wajib lulus tanpa `DATABASE_URL`.
- Keamanan: Session cookie `httpOnly` HMAC-SHA256, timing-safe password check, rate limiting per-IP in-memory (5 gagal/menit).

---

## 3. Kebutuhan Fungsional

Prioritas: **W** = Wajib, **S** = Sebaiknya ada.

### 3.1 Latihan Psikotes (Publik)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-01 | Beranda menampilkan *Focus Hero Banner* 3-status dinamis (Mulai / Lanjutkan / Tuntas), ringkasan statistik lokal, dan katalog perusahaan 2-kolom dengan pratinjau hingga 4 paket teratas. | W |
| FR-02 | Halaman `/riwayat` menampilkan riwayat pengerjaan lokal, filter kategori subtes, dan tautan ke halaman hasil. | W |
| FR-03 | Halaman `/c/[companySlug]` dan `/c/[companySlug]/[packageSlug]` menampilkan seluruh paket dan subtes dengan jumlah item, jenis subtes, dan durasi. | W |
| FR-04 | Sistem mendukung 4 ragam subtes: `QUIZ`, `PERSONALITY`, `PAULI`, dan `DRAWING`. | W |
| FR-05 | Sesi tes (`/test/[subtestId]`) menampilkan timer hitung mundur berbasis jam sistem (drift-resistant) dan mengirim jawaban otomatis saat waktu habis. | W |
| FR-06 | Pada `QUIZ`, peserta dapat memilih jawaban lewat klik atau keyboard (`1–5` / `A–E`), berpindah soal, dan melompat ke nomor soal. | W |
| FR-07 | Soal `MEMORY` menyembunyikan gambar SVG otomatis setelah 5 detik; soal `SPEED` otomatis berpindah ke soal berikutnya setelah jawaban dipilih. | W |
| FR-08 | Penilaian dilakukan murni di server: benar +1, salah/kosong 0 (tanpa penalti). Kunci jawaban dan pembahasan dilarang dikirim ke browser selama tes berlangsung. | W |
| FR-09 | Halaman `/result/[attemptId]` menampilkan skor, akurasi, dan pembahasan lengkap (`explanation`, `steps`, `wrongNotes`, `quickTip`) atau ringkasan hasil non-kuis (`PERSONALITY`, `PAULI`, `DRAWING`). | W |

### 3.2 Materi Bahasa Inggris (`/materi`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-10 | Halaman `/materi` menampilkan daftar topik (Kamus aktif; Verb 1-2-3, Grammar, Merangkai Kata sebagai kartu *Segera Hadir*) serta ringkasan progres jumlah kata per kotak Leitner (1–5 + belum dilihat) dan persentase per level CEFR (`A1`–`C1`). | W |
| FR-11 | Halaman `/materi/kamus` menyediakan chip filter level CEFR (`A1`–`C1`), filter jenis kata (`pos`), pencarian kata/arti, daftar kata lengkap (kata, pos, arti ID, contoh EN + ID, `LevelBadge`), dan paginasi 50 kata per halaman. | W |
| FR-12 | Halaman `/materi/kamus/belajar` menjalankan mode flashcard: tampil kata dulu, tombol "Balik" menampilkan arti & contoh, lalu tombol "Tahu" / "Belum". Pintasan keyboard: `Spasi` = balik, `1` = Tahu, `2` = Belum. | W |
| FR-13 | Sistem kotak Leitner: "Tahu" menaikkan 1 kotak (maks. kotak 5) dengan jeda `1, 2, 4, 8, 16` hari; "Belum" mengembalikan ke kotak 1 (jeda 1 hari). Antrean sesi = kata jatuh tempo dulu, lalu $N$ kata baru berikutnya menurut urutan `no` (default 10, dapat diatur 5–50) dengan filter level CEFR opsional. | W |
| FR-14 | Progres materi disimpan di tabel `english_progress` memakai `user_id` anonim yang dihasilkan dan disimpan di `localStorage` browser peserta. | W |
| FR-15 | Halaman `/materi/kamus/kuis` menghasilkan 10 soal pilihan ganda otomatis (Inggris → Indonesia & Indonesia → Inggris) dengan 4 opsi unik yang pengecohnya memprioritaskan `pos` dan `cefr` yang sama, pintasan keyboard `1–4`, serta skor dan daftar jawaban salah di akhir. | W |
| FR-16 | Skrip CLI `npm run db:seed-english` bersifat idempoten (upsert berdasarkan `no` dari `db/english/kamus-1000.json`) dan struktur tabel mendukung perluasan topik (`topic`). | W |

### 3.3 Command Center Admin & CMS (`/admin`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-20 | Admin login dengan `ADMIN_PASSWORD` melalui cookie `httpOnly` HMAC-SHA256 (berlaku 7 hari). Percobaan gagal dibatasi maksimal 5 kali/menit per IP (HTTP `429`) dan ditunda ~800 ms. | W |
| FR-21 | Dashboard `/admin` menampilkan statistik perusahaan, paket, subtes, dan rasio/persentase kelengkapan pembahasan rinci khusus subtes `QUIZ`. | W |
| FR-22 | Admin dapat mengedit metadata paket (nama, deskripsi) dan subtes (nama, durasi) secara inline dengan penguncian transaksi `FOR UPDATE`. | W |
| FR-23 | Admin dapat mengekspor paket ke JSON dan menghapus paket/subtes secara atomik (`DELETE ... RETURNING`); menghapus paket terakhir otomatis menghapus perusahaan terkait. | W |
| FR-24 | Halaman `/admin/import` menyediakan panel unggah ulang JSON **Kamus Bahasa Inggris** (`/api/admin/english`) yang memvalidasi format array kata dan melakukan upsert idempoten berdasarkan `no`. | W |

### 3.4 Proteksi Integritas Impor & Audit Trail (`/admin/import`, `/admin/audit`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-30 | Impor mendukung paket soal lengkap maupun file `pembahasanSaja: true` (maks. 8 MB) dengan validasi struktur, slug, opsi unik, dan sanitasi SVG anti-XSS. | W |
| FR-31 | **Dry-Run 2-Fase:** `?dryRun=1` menjalankan analisis murni `SELECT` tanpa mutasi DB, menghitung canonical SHA-256 hash, menandai subtes identik sebagai `SKIP` (*skip rewrite*), mendeteksi riwayat terdampak, penurunan pembahasan rinci, dan mismatch cakupan. | W |
| FR-32 | **Spot-Check & Konfirmasi Server 409:** Mode pembahasan menampilkan sampel perbandingan prompt & kunci DB; impor berisiko ditolak dengan HTTP `409 Conflict` kecuali disertai `?force=1` setelah konfirmasi checkbox. | W |
| FR-33 | **Batch `UNNEST`:** Penulisan soal dan pembaruan pembahasan delta menggunakan array `UNNEST` PostgreSQL dalam satu transaksi atomik. | W |
| FR-34 | **Audit Trail:** Setiap impor (sukses, paksa, ditolak, gagal) dan edit/hapus dicatat di `import_audit_logs` dan dapat difilter/diinspeksi di `/admin/audit`, dengan ketahanan fail-safe `42P01` bila tabel belum dimigrasi. | W |

---

## 4. Kebutuhan Nonfungsional (NFR)

| ID | Kategori | Kebutuhan |
| --- | --- | --- |
| NFR-01 | Keamanan | Penilaian di server; kunci jawaban tidak pernah dikirim sebelum pengumpulan. Seluruh endpoint `/api/admin/*` wajib melewati `rejectIfNotAdmin()` (`401`). |
| NFR-02 | Proteksi Brute-Force | Perbandingan password timing-safe (`timingSafeEqual`), penundaan gagal ~800 ms, dan rate limit 5 gagal/menit per IP (`429`). |
| NFR-03 | Anti-XSS & SQLi | Seluruh query memakai parameter `$1, $2, ...`; SVG disaring dari `<script>`, `<foreignObject>`, `<iframe>`, `<embed>`, `<object>`, `<a>`, entity, event handler `on*`, `javascript:`, dan `data:text/html`. |
| NFR-04 | Batas Arsitektur | `src/types/*` murni tipe, `src/lib/*` tidak mengimpor `src/components/*`, dan modul `"use client"` tidak pernah menarik `pg`/`db`/`*.queries` (diverifikasi otomatis oleh `src/lib/architecture.test.ts`). |
| NFR-05 | Keandalan & Kinerja | Transaksi atomik pada impor/penilaian, pool DB maksimal 5 koneksi, batch `UNNEST` untuk tulis massal, dan timer sinkron dengan jam sistem (`Date.now()`). |
| NFR-06 | Aksesibilitas & Responsivitas | Mobile-first, mode terang/gelap, kontras WCAG AA, dan navigasi keyboard penuh pada tes psikotes, flashcard, serta kuis kosakata. |
| NFR-07 | Privasi | Tidak mewajibkan akun atau data pribadi (zero-PII) bagi peserta publik. |

---

## 5. Model Data Relasional

```text
companies (1) ───< test_packages (N) ───< subtests (N) ───< questions (N)
                                               │
                                               └───< attempts (N) ───< answers (N)

import_audit_logs  (Tabel independen untuk audit trail CMS)

english_words (1) ───< english_progress (N)  [per user_id anonim]
```

1. **`companies`**: `id`, `slug` (UNIQUE), `name`, `description`, `created_at`.
2. **`test_packages`**: `id`, `company_id` (FK cascade), `slug`, `name`, `description`, `created_at`; `UNIQUE (company_id, slug)`.
3. **`subtests`**: `id`, `test_package_id` (FK cascade), `slug`, `name`, `description`, `duration_seconds`, `order_index`, `kind` (`QUIZ|PERSONALITY|PAULI|DRAWING`), `config` (JSONB); `UNIQUE (test_package_id, slug)`.
4. **`questions`**: `id`, `subtest_id` (FK cascade), `type` (`TEXT|IMAGE|MEMORY|SPEED`), `order_index`, `prompt`, `image_svg`, `options` (JSONB), `correct_option`, `explanation`, `steps` (JSONB), `wrong_notes` (JSONB), `quick_tip`.
5. **`attempts`**: `id`, `subtest_id` (FK cascade), `started_at`, `finished_at`, `score`, `total_questions`, `result` (JSONB).
6. **`answers`**: `id`, `attempt_id` (FK cascade), `question_id` (FK cascade), `selected_option`, `is_correct`; `UNIQUE (attempt_id, question_id)`.
7. **`import_audit_logs`**: `id`, `created_at`, `action_type`, `status` (`SUCCESS|FORCED|REJECTED|FAILED`), `company_slug`, `package_slug`, `target_label`, `file_name`, `content_hash`, `forced_overwrite`, `summary` (JSONB).
8. **`english_words`**: `id`, `no` (UNIQUE), `word`, `pos`, `meaning_id`, `example_en`, `example_id`, `cefr` (`A1..C1`), `topic` (default `'kamus'`).
9. **`english_progress`**: `user_id`, `word_id` (FK cascade ke `english_words`), `box` (1..5), `next_review_at`, `correct_count`, `wrong_count`; `PRIMARY KEY (user_id, word_id)`.

---

## 6. Di Luar Cakupan Versi 1.2

- Akun peserta lintas perangkat (registrasi email/password) dan papan peringkat publik.
- Konten aktif untuk topik bahasa Inggris lanjutan (Verb 1-2-3, Grammar, Merangkai Kata — kerangka halaman dan kolom `topic` sudah siap).
- Penilaian berbobot per pilihan (mis. TKP CPNS), ambang batas kelulusan, dan simulasi paket penuh berurutan.
- Audio pelafalan (TTS) pada kamus/flashcard.

---

## 7. Kriteria Penerimaan Sistem

- Peserta dapat menyelesaikan latihan psikotes (`QUIZ`, `PERSONALITY`, `PAULI`, `DRAWING`) tanpa kebocoran kunci jawaban di browser.
- Peserta dapat mencari/memfilter kamus 1.000 kata (paginasi 50/halaman), berlatih flashcard Leitner 5 kotak dengan pintasan keyboard, dan mengerjakan kuis kosakata 10 soal.
- Admin dapat mengimpor paket, pembahasan, dan kamus JSON dengan aman (dry-run, skip identik, HTTP 409 force-gate, audit log).
- Seluruh 52 unit & guardrail test (`npm test` tanpa `DATABASE_URL`), `npx tsc --noEmit`, `npx eslint src scripts`, dan `npm run build` (Turbopack) lulus tanpa error.
