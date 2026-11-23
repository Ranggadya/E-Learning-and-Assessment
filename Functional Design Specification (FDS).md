# Functional Design Specification (FDS)

**Aplikasi Latihan Psikotes & Materi Bahasa Inggris** · Versi 1.2 · 23 November 2026 · Penyusun: Dya

Dokumen ini menjelaskan rancangan fungsional dan teknis aplikasi terkini: arsitektur, alur pengguna, spesifikasi halaman, API, logika bisnis, skema basis data, keamanan, struktur kode Domain-First, dan rencana pengujian.

---

## 1. Ringkasan Sistem

Aplikasi adalah satu proyek **Next.js 16.4.6 (App Router, Turbopack)** berbahasa TypeScript (*strict*) dengan Tailwind CSS 4 yang mengakses PostgreSQL langsung melalui `pg` Pool (maks. 5 koneksi, tanpa ORM).

| Lapisan | Teknologi / Lokasi | Peran |
| --- | --- | --- |
| Tipe Murni | `src/types/{assessment,admin,english}.ts` | 100% definisi `type`/`interface`, aman untuk client & server |
| Tampilan | React 19 (Server & Client Components), Tailwind CSS 4 | Halaman publik psikotes, materi Inggris, dan CMS admin |
| Logika Domain | `src/lib/{assessment,admin,english}/*`, `src/lib/format.ts` | Penilaian, Leitner, generator kuis, validasi JSON, analisis diff |
| Akses Data | `src/lib/db/pool.ts`, `*.queries.ts`, `admin/{audit-log,pack-import,explanation-pack}.ts` | Seluruh query SQL berparameter & transaksi PostgreSQL |
| State Browser | `src/lib/client/{local-progress,anon-user}.ts` | Riwayat psikotes lokal & `user_id` anonim materi Inggris |

Seluruh halaman dinamis memakai `export const dynamic = "force-dynamic"` agar selalu membaca data terbaru. Pemeriksaan otorisasi admin dilakukan di setiap halaman dan route `/api/admin/*`.

---

## 2. Spesifikasi Halaman (Routes)

| Halaman | Route | Akses | Data / Perilaku Utama |
| --- | --- | --- | --- |
| Beranda Psikotes | `/` | Publik | `LearnerShell` + `LearnerDashboard` (Focus Hero 3-status, statistik lokal, kartu perusahaan 2-kolom maks. 4 paket) |
| Riwayat & Progres | `/riwayat` | Publik | `HistoryProgressView` (riwayat pengerjaan lokal, filter kategori subtes, reset progres) |
| Katalog Perusahaan | `/c/[companySlug]` | Publik | `CompanyPackagesView` (daftar seluruh paket milik perusahaan; 404 bila slug tidak ditemukan) |
| Daftar Subtes Paket | `/c/[companySlug]/[packageSlug]` | Publik | `PackageSubtestsView` (daftar subtes, jenis, jumlah item, durasi, status pengerjaan lokal, tombol Mulai) |
| Sesi Tes | `/test/[subtestId]` | Publik | Memilih runner sesuai `subtest.kind`: `TestRunner` (`QUIZ`), `PersonalityRunner`, `PauliRunner`, atau `DrawingRunner` |
| Review Hasil | `/result/[attemptId]` | Publik | `ResultReviewClient` (skor, akurasi, pembahasan lengkap `steps`/`wrongNotes`/`quickTip`, atau hasil non-kuis; otomatis mencatat progres lokal) |
| Pusat Materi Inggris | `/materi` | Publik | `MateriOverviewClient` (distribusi 5 kotak Leitner, persentase per level CEFR A1–C1, kartu Kamus + 3 kartu *Segera Hadir*) |
| Kamus 1.000 Kata | `/materi/kamus` | Publik | Server-rendered filter chip CEFR (`A1`–`C1`), dropdown `pos`, pencarian `q`, `LevelBadge`, paginasi 50 kata/halaman |
| Flashcard Leitner | `/materi/kamus/belajar` | Publik | `FlashcardStudyClient` (antrean jatuh tempo + $N$ kata baru, filter CEFR, batas kata baru 5–50, keyboard `Spasi`/`1`/`2`) |
| Kuis Kosakata | `/materi/kamus/kuis` | Publik | `EnglishQuizClient` (10 soal otomatis bolak-balik EN↔ID, 4 opsi, filter CEFR, keyboard `1–4`, skor & pembahasan salah) |
| Dashboard Admin | `/admin` | Admin | Login form bila belum terautentikasi; `AdminDashboardClient` (metrik + % pembahasan rinci `QUIZ`, filter, inline edit paket/subtes, ekspor, hapus) |
| Impor JSON Admin | `/admin/import` | Admin | `PackImporter` (dry-run 2-fase paket & `pembahasanSaja`, spot-check, konfirmasi 409) + `EnglishWordsImporter` (upsert kamus JSON) |
| Audit Log Admin | `/admin/audit` | Admin | `AuditLogView` (riwayat log `import_audit_logs`, filter status & aksi, modal detail JSON, pesan ramah jika migrasi belum dijalankan) |

---

## 3. Spesifikasi API

| Endpoint | Metode | Akses | Fungsi | Respons Utama |
| --- | --- | --- | --- | --- |
| `/api/attempts` | `POST` | Publik | Menilai & menyimpan sesi `QUIZ` atau non-kuis (`PERSONALITY`, `PAULI`, `DRAWING`) | `200 {attemptId}`; `400 {error}`; `404` |
| `/api/materi/progress` | `GET` | Publik | Ringkasan kotak Leitner & persentase CEFR berdasarkan `?userId=...` | `200 {overview}` |
| `/api/materi/study` | `GET` | Publik | Antrean flashcard (`?userId=...&cefr=...&newLimit=10`) | `200 {dueWords, newWords}`; `400` |
| `/api/materi/study` | `POST` | Publik | Menyimpan hasil review kartu (`{userId, wordId, known}`) | `200 {box, intervalDays, nextReviewAt}`; `400` |
| `/api/materi/quiz` | `GET` | Publik | Menghasilkan 10 soal pilihan ganda (`?cefr=...`) | `200 {questions}` |
| `/api/admin/login` | `POST` | Publik | Login admin dengan timing-safe check & rate limit 5/menit per IP | `200 {ok:true}` + cookie; `401`; `429` (`Retry-After`); `503` |
| `/api/admin/logout` | `POST` | Publik | Menghapus cookie `admin_session` | `200 {ok:true}` |
| `/api/admin/packs` | `POST` | Admin | Validasi & impor paket soal atau `pembahasanSaja` (`?dryRun=1`, `?force=1`, header `X-Import-Filename`) | `200 {summary}`; `400 {errors}`; `401`; `409 {requiresConfirmation, summary, errors}`; `413`; `500` |
| `/api/admin/packs/reject` | `POST` | Admin | Mencatat pembatalan impor berisiko ke `import_audit_logs` (`IMPORT_REJECTED`) | `200 {ok:true}`; `400`; `401` |
| `/api/admin/packs/[packageId]` | `PATCH` | Admin | Edit inline nama & deskripsi paket (`FOR UPDATE`) + audit log | `200 {updated}`; `400`; `401`; `404` |
| `/api/admin/packs/[packageId]` | `DELETE` | Admin | Hapus paket atomik (`DELETE ... RETURNING`, ikut hapus perusahaan bila paket terakhir) + audit log | `200 {ok:true}`; `400`; `401`; `404` |
| `/api/admin/packs/[packageId]/export` | `GET` | Admin | Unduh paket dalam format JSON kompatibel impor | `200` file JSON; `400`; `401`; `404` |
| `/api/admin/subtests/[subtestId]` | `PATCH` | Admin | Edit inline nama & durasi subtes (`FOR UPDATE`, durasi terkunci untuk `PAULI`/`DRAWING`) + audit log | `200 {updated}`; `400`; `401`; `404` |
| `/api/admin/subtests/[subtestId]` | `DELETE` | Admin | Hapus subtes atomik + audit log | `200 {ok:true}`; `400`; `401`; `404` |
| `/api/admin/english` | `POST` | Admin | Validasi & batch upsert JSON kamus bahasa Inggris (maks. 8 MB, maks. 10.000 kata) | `200 {upsertedCount, totalInFile}`; `400 {errors}`; `401`; `413` |
| `/api/admin/template` | `GET` | Admin | Unduh contoh file paket soal JSON | `200` file JSON; `401` |

---

## 4. Logika Bisnis Utama

### 4.1 Penilaian Psikotes (`src/lib/assessment/attempt.queries.ts` & `scoring.ts`)
- **`QUIZ`:** Server membaca `correct_option` dari `questions`, menulis `attempts` + batch `UNNEST` ke `answers` dalam satu transaksi, menghitung skor (+1 benar, 0 salah/kosong).
- **`PERSONALITY`:** `scorePersonality()` menormalisasi skala 1–5 (membalik skor `6 - raw` untuk pernyataan `reverse`) menjadi persentase `0–100%` dan level (`Tinggi` ≥ 65%, `Rendah` ≤ 35%, `Sedang`, atau `Belum dijawab`).
- **`PAULI` & `DRAWING`:** Payload disanitasi & di-clamp terhadap `subtests.config` (termasuk verifikasi prefix PNG data URL pada gambar) lalu disimpan ke `attempts.result` (JSONB).

### 4.2 Impor Paket & Pembahasan 2-Fase (`src/lib/admin/pack-import.ts`, `explanation-pack.ts`, `import-analysis.ts`)
1. **Fase 1 (Read-Only Analysis):** Hanya menjalankan `SELECT` — menghitung canonical SHA-256 hash, memeriksa duplikasi pada `import_audit_logs`, membandingkan snapshot DB vs file masuk per subtes (`baru`, `identik`, `berubah`), menghitung riwayat terdampak & risiko kehilangan pembahasan rinci, serta menyusun maksimal 3 spot-check per subtes (total maks. 6) untuk mode `pembahasanSaja`.
2. **Gerbang Konfirmasi:** Jika `?dryRun=1`, kembalikan `summary` tanpa membuka transaksi tulis. Jika berisiko (`requiresConfirmation === true`) dan `?force=1` tidak ada, lempar `ImportConfirmationRequiredError` → HTTP `409 Conflict`.
3. **Fase 2 (Transaksi Tulis):** Membuka `BEGIN ... COMMIT`, **melewati (*skip rewrite*)** subtes yang `identik` agar riwayat peserta aman, menulis soal baru lewat 1 query batch `UNNEST` (atau memperbarui hanya butir yang berubah pada `pembahasanSaja`), lalu mencatat hasil ke `import_audit_logs`.

### 4.3 Materi Bahasa Inggris (`src/lib/english/logic.ts` & `queries.ts`)
- **Leitner 5 Kotak (`computeNextLeitnerState`):**
  - Jeda hari per kotak: `{ 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 }`.
  - Jawaban **Tahu (`known: true`)**: kata baru (`null`) masuk Kotak 2 (2 hari); kata di Kotak `b` naik ke `min(5, b + 1)`.
  - Jawaban **Belum (`known: false`)**: langsung reset ke Kotak 1 (1 hari).
- **Antrean Sesi (`getStudyQueue`):** Mengambil kata jatuh tempo (`next_review_at <= now()`, maks. 100) diurutkan paling lama jatuh tempo lalu `no ASC`, diikuti hingga `newLimit` (1–50, default 10) kata yang belum ada di `english_progress` menurut urutan `no ASC`.
- **Generator Kuis (`buildQuizQuestionsFromPool`):** Mengambil 10 target acak (bergantian `en_to_id` dan `id_to_en`); menyusun 3 pengecoh unik dengan prioritas berjenjang: (1) `pos` & `cefr` sama → (2) `pos` sama → (3) `cefr` sama → (4) kata lain.

---

## 5. Desain Basis Data (`db/schema.sql`)

| Tabel | Kolom Utama | Kunci & Indeks |
| --- | --- | --- |
| `companies` | `id`, `slug`, `name`, `description`, `created_at` | `slug UNIQUE` |
| `test_packages` | `id`, `company_id`, `slug`, `name`, `description`, `created_at` | FK `companies` cascade; `UNIQUE (company_id, slug)` |
| `subtests` | `id`, `test_package_id`, `slug`, `name`, `description`, `duration_seconds`, `order_index`, `kind`, `config` | FK `test_packages` cascade; `UNIQUE (test_package_id, slug)` |
| `questions` | `id`, `subtest_id`, `type`, `order_index`, `prompt`, `image_svg`, `options`, `correct_option`, `explanation`, `steps`, `wrong_notes`, `quick_tip` | FK `subtests` cascade; indeks `(subtest_id, order_index)` |
| `attempts` | `id`, `subtest_id`, `started_at`, `finished_at`, `score`, `total_questions`, `result` | FK `subtests` cascade |
| `answers` | `id`, `attempt_id`, `question_id`, `selected_option`, `is_correct` | FK cascade; `UNIQUE (attempt_id, question_id)` |
| `import_audit_logs` | `id`, `created_at`, `action_type`, `status`, `company_slug`, `package_slug`, `target_label`, `file_name`, `content_hash`, `forced_overwrite`, `summary` | Indeks `created_at DESC` & partial index `(content_hash, status)` |
| `english_words` | `id`, `no`, `word`, `pos`, `meaning_id`, `example_en`, `example_id`, `cefr`, `topic` | `no UNIQUE`; indeks `(cefr, pos)` |
| `english_progress` | `user_id`, `word_id`, `box`, `next_review_at`, `correct_count`, `wrong_count` | `PK (user_id, word_id)`; FK `english_words` cascade; indeks `(user_id, next_review_at)` |

---

## 6. Keamanan & Guardrail Arsitektur

- **Autentikasi Admin (`src/lib/admin/auth.ts`):** Cookie `admin_session` (`httpOnly`, `sameSite=lax`, `secure` di produksi, 7 hari), token HMAC-SHA256 dari `SESSION_SECRET || ADMIN_PASSWORD`, perbandingan SHA-256 + `timingSafeEqual`, penundaan gagal 800 ms, dan rate limiter in-memory per IP (maks. 5 gagal / 60 detik → HTTP `429`).
- **Sanitasi SVG (`src/lib/admin/pack-schema.ts`):** Menolak `<script`, `<foreignObject`, `<iframe`, `<embed`, `<object`, `<a`, entity `&#`/`&colon;`, event `on*=`, `javascript:`, dan `data:text/html`.
- **Guardrail Statis (`src/lib/architecture.test.ts`):** Otomatis memverifikasi pada setiap `npm test` bahwa `src/types/` murni tipe, `src/lib/` bebas impor `components`/`app`, root `src/components/` bersih, nol file 0-byte, dan tidak ada modul `"use client"` yang mengimpor `db`/`*.queries`/server `admin/*`.

---

## 7. Struktur Kode (Domain-First)

| Lokasi | Tanggung Jawab |
| --- | --- |
| `src/types/{assessment,admin,english}.ts` | Definisi tipe & interface murni (nol kode runtime) |
| `src/lib/db/pool.ts` | Singleton `pg` Pool (maks. 5 koneksi, SSL otomatis untuk cloud DB) |
| `src/lib/format.ts` | Formatter `formatDateTimeId` (WIB) & `formatDurationLabel` |
| `src/lib/client/{local-progress,anon-user}.ts` | Hook & penyimpanan `localStorage` sisi browser (`"use client"`) |
| `src/lib/assessment/` | `constants.ts`, `scoring.ts`, `dashboard.ts`, `catalog.queries.ts`, `attempt.queries.ts` + tests |
| `src/lib/admin/` | `auth.ts`, `audit-log.ts`, `queries.ts`, `pack-schema.ts`, `import-analysis.ts`, `pack-import.ts`, `explanation-pack.ts` + 6 tests |
| `src/lib/english/` | `constants.ts`, `logic.ts`, `queries.ts` + `logic.test.ts` |
| `src/components/` | `admin/`, `dashboard/`, `layout/` (termasuk `ThemeToggle`), `materi/`, `result/`, `test/` (6 runner), `ui/` |
| `src/hooks/useCountdown.ts` | Timer hitung mundur berbasis jam sistem |
| `scripts/` | `migrate.ts`, `import-packs.ts`, `seed-english.ts`, `run-tests.mjs` |

---

## 8. Pengujian Otomatis

Seluruh pengujian berjalan cepat tanpa memerlukan koneksi database (`$env:DATABASE_URL=$null; npm test`):

- **52 test cases** tersebar di 11 file `*.test.ts` berdampingan dengan domainnya (`admin/*`, `assessment/*`, `english/logic.test.ts`, `format.test.ts`, `architecture.test.ts`).
- Validasi tambahan sebelum rilis: `npx tsc --noEmit`, `npx eslint src scripts`, dan `npm run build` (Next.js 16 Turbopack).

---

## 9. Rencana Perluasan (Kompatibel Mundur)

1. **Topik Materi Bahasa Inggris baru** (Verb 1-2-3, Grammar, Merangkai Kata): cukup menambah data bertag `topic` dan halaman/komponen latihan spesifik tanpa mengubah skema psikotes.
2. **Penyelenggara & Penilaian Lanjutan** (BUMN, CPNS): menambah kolom opsional `companies.category`, `subtests.scoring_mode` (`BINARY|WEIGHTED`), `questions.option_weights`, `subtests.passing_score`, serta tabel `passages` untuk wacana bersama — semuanya opsional agar file JSON lama tetap valid.
