# Software Requirements Specification (SRS)

**Aplikasi Latihan Psikotes** · Versi 1.1 · 23 November 2026 · Penyusun: Dya

## 1. Pendahuluan

### 1.1 Tujuan dokumen

Dokumen ini menjelaskan kebutuhan perangkat lunak untuk Aplikasi Latihan Psikotes, yaitu platform web responsif untuk berlatih soal seleksi (psikotes perusahaan seperti Astra International dan Paragon Corp, serta seleksi BUMN dan CPNS yang dapat diperluas) dengan timer akurat, penilaian otomatis di server, analisis pengerjaan, pembahasan detail, dan sistem manajemen konten (CMS) yang aman. Dokumen ini menjadi acuan tunggal pengembangan sistem, audit keamanan, pengujian fungsional, dan pengelolaan bank soal.

### 1.2 Ruang lingkup

Aplikasi terdiri dari dua subsistem utama:

1. **Situs Latihan Peserta (Learner Experience / Publik):**
   - **Dashboard Beranda (`/`):** Tampilan bertema Solid Cobalt (Navy Slate profesional) dengan *Focus Hero Banner* 3-status dinamis (Fresh/Lanjut/Selesai), metrik ringkas latihan, dan kartu perusahaan 2-kolom responsif dengan preview 4 paket teratas.
   - **Riwayat & Progres Latihan (`/riwayat`):** Halaman riwayat mandiri yang melacak progres latihan di browser peserta (Local Storage + verifikasi sesi), statistik per kategori tes (Quiz, Kepribadian, Pauli/Koran, Gambar), dan tautan langsung ke review hasil pengerjaan.
   - **Katalog Perusahaan (`/c/[companySlug]`):** Menampilkan seluruh paket dan subtes milik perusahaan terpilih.
   - **Sesi Tes Interaktif (`/test/[subtestId]`):** Menjalankan subtes dengan timer berbasis clock drift-resistant, navigasi butir soal cepat, keyboard shortcut (1-5 / A-E), dan engine khusus (soal pilihan ganda, visual SVG, memory countdown, speed jump, serta placeholder ramah untuk tes kepribadian, pauli, dan gambar).
   - **Review Hasil & Pembahasan (`/result/[attemptId]`):** Menampilkan skor akhir, akurasi, waktu pengerjaan, status tiap nomor soal, dan pembahasan mendalam per butir soal.

2. **Command Center Admin / CMS (`/admin`):**
   - **Navigasi Terpadu (`AdminShell`):** Desktop sidebar collapsible dengan active route highlight, badge real-time, status koneksi database, dan mobile drawer dengan overlay.
   - **Ringkasan Konten & Metrik (`/admin`):** Statistik total perusahaan, paket, subtes, butir soal, serta rasio & persentase kelengkapan pembahasan khusus subtes bertipe QUIZ.
   - **Pengelolaan Cepat (Inline Quick-Edit & Delete):** Mengubah nama/deskripsi paket dan subtes secara langsung (inline) tanpa mengganggu relasi soal, serta penghapusan atomik aman (`DELETE ... USING ... RETURNING`).
   - **Sistem Proteksi Impor Pintar (`/admin/import`):**
     - Menerima file `.json` paket soal lengkap (`pack`) maupun pembaruan pembahasan mandiri (`pembahasanSaja`).
     - **Dry-Run 2-Fase (Read-Only Diff Analysis):** Analisis perbedaan tanpa mutasi database. Membandingkan canonical SHA-256 hash konten, mendeteksi subtes identik untuk dilewati (*skip rewrite*), mendeteksi risiko kehilangan riwayat attempt peserta, serta mendeteksi penurunan cakupan pembahasan.
     - **Spot-Check Preview & Key Matching:** Menampilkan cuplikan soal database vs file baru, memverifikasi kecocokan nomor soal, teks prompt, dan kunci jawaban sebelum konfirmasi.
     - **Server-Enforced 409 Conflict:** Menolak eksekusi impor berisiko kecuali admin secara eksplisit menyertakan parameter `?force=1` setelah menyetujui checkbox konfirmasi.
     - **Batch UNNEST Database Writes:** Eksekusi penulisan batch PostgreSQL performa tinggi untuk ribuan soal sekaligus.
   - **Audit Trail & Jejak Aktivitas (`/admin/audit`):**
     - Pencatatan permanen pada tabel `import_audit_logs`.
     - Melacak aktor, kategori aksi (`PACK_IMPORT`, `EXPLANATION_IMPORT`), status (`SUCCESS`, `FORCED`, `REJECTED`, `FAILED`), ringkasan diff, rincian subtes, dan pesan penolakan/kesalahan.
     - Tampilan log interaktif dengan filter status, filter kategori, dan modal payload JSON rincian.
     - Ketahanan fail-safe kode error PostgreSQL `42P01` (tabel belum termigrasi).

### 1.3 Definisi dan singkatan

| Istilah | Arti |
| --- | --- |
| Perusahaan (company) | Entitas penyelenggara tes (Astra, Paragon, BUMN, CPNS, dll.) |
| Paket (package) | Kumpulan subtes latihan terstruktur milik satu perusahaan |
| Subtes (subtest) | Satu unit tes dengan durasi, instruksi, dan tipe spesifik |
| Subtest Kind | Ragam tes: `QUIZ` (pilihan ganda bernilai), `PERSONALITY` (skala psikologis), `PAULI` (hitung cepat konsentrasi), `DRAWING` (BAUM/Wartegg) |
| Soal (question) | Satu butir pertanyaan dengan opsi jawaban dan kunci (khusus QUIZ) |
| Pembahasan (explanation) | Penjelasan rasional di balik jawaban yang benar |
| Pengerjaan (attempt) | Rekam jejak satu sesi pengerjaan subtes oleh peserta |
| Jawaban (answer) | Rekaman pilihan peserta pada tiap nomor soal dalam satu attempt |
| Canonical Content Hash | SHA-256 hash dari data normalisasi soal (mengabaikan urutan key JSON dan whitespace) untuk deteksi kebaruan konten |
| Dry Run | Simulasi impor murni read-only untuk menghasilkan diff tanpa menyimpan ke database |
| Force Overwrite | Penimpaan paket/subtes yang berisiko mereset riwayat jawaban peserta dengan konfirmasi wajib |
| Audit Log | Catatan transaksi dan keamanan sistem yang tidak dapat diubah (append-only) |

### 1.4 Referensi

- Spesifikasi kebutuhan tes seleksi Astra International (Day 1 & Day 2) dan Paragon Technology & Innovation.
- `db/schema.sql`: Skema relasional PostgreSQL terkini.
- Modul inti sistem: `src/lib/pack-import.ts`, `src/lib/explanation-pack.ts`, `src/lib/import-analysis.ts`, `src/lib/audit-log.ts`, `src/lib/admin-auth.ts`.
- Desain antarmuka: `LearnerShell.tsx`, `LearnerDashboard.tsx`, `HistoryProgressView.tsx`, `AdminShell.tsx`, `AdminDashboardClient.tsx`, `PackImporter.tsx`, `AuditLogView.tsx`.

---

## 2. Deskripsi Umum

### 2.1 Perspektif produk

Aplikasi Latihan Psikotes adalah platform mandiri berbasis Next.js (App Router) full-stack dengan basis data PostgreSQL (Neon Serverless). Aplikasi dirancang tanpa ketergantungan library eksternal berbobot besar (menggunakan pustaka native `pg` dengan pooling terkontrol, tanpa ORM bloat). Seluruh logic penilaian, sanitasi, dan verifikasi integritas data berjalan di server demi keamanan dan keandalan maksimal.

### 2.2 Karakteristik pengguna

| Pengguna | Deskripsi | Hak Akses |
| --- | --- | --- |
| Peserta Latihan (Learner) | Siswa/pencari kerja yang berlatih. Bebas hambatan, tanpa registrasi akun wajib. Progres pengerjaan dicatat lokal dan divalidasi ke server. | Akses publik (`/`, `/riwayat`, `/c/*`, `/test/*`, `/result/*`) |
| Administrator | Pengelola konten, kurator soal, dan pemantau sistem. | Akses penuh CMS (`/admin`, `/admin/import`, `/admin/audit`) terlindungi otentikasi aman |

### 2.3 Batasan teknologi & lingkungan

- Framework: Next.js (Node.js runtime, App Router).
- Bahasa: TypeScript murni (*strict mode*).
- Styling: Tailwind CSS dengan palet token warna Solid Cobalt terstandarisasi (WCAG AA compliant).
- Basis Data: PostgreSQL (Neon Serverless Pooler) via driver `pg`.
- Keamanan Auth: Session cookie HTTP-only berbasis password server-side timing-safe, rate-limiting in-memory per-IP.
- Integritas Data: Transaksi atomik (`BEGIN`/`COMMIT`/`ROLLBACK`), deduplikasi canonical SHA-256 hash.

---

## 3. Kebutuhan Fungsional

Prioritas: **W** = Wajib, **S** = Sebaiknya ada.

### 3.1 Pengalaman Peserta (Learner Experience)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-01 | Sistem menampilkan beranda berdesain Solid Cobalt dengan *Focus Hero Banner* dinamis (menampilkan status "Mulai Latihan Baru", "Lanjutkan Tes Terakhir", atau "Semua Subtes Tuntas"). | W |
| FR-02 | Sistem menampilkan kartu ringkasan progres di beranda: total subtes dicoba, rata-rata skor, dan aktivitas terakhir. | W |
| FR-03 | Sistem menampilkan katalog perusahaan dalam grid 2-kolom responsif dengan preview hingga 4 paket teratas per perusahaan dan tombol jelajah lengkap. | W |
| FR-04 | Halaman `/riwayat` menampilkan daftar riwayat pengerjaan mandiri, filter kategori (Quiz, Kepribadian, Pauli, Gambar), serta tautan langsung ke review hasil. | W |
| FR-05 | Sistem menyajikan halaman katalog perusahaan (`/c/[companySlug]`) berisi seluruh paket dan rincian subtes (jumlah soal, durasi, jenis subtes). | W |
| FR-06 | Sistem mendukung 4 ragam subtes (`subtest_kind`): `QUIZ` (pilihan ganda terukur), `PERSONALITY` (tipe kepribadian), `PAULI` (hitung koran), dan `DRAWING` (gambar visual). | W |
| FR-07 | Sesi tes interaktif (`/test/[subtestId]`) dilengkapi timer hitung mundur berbasis jam sistem (drift-proof) yang otomatis mengumpulkan jawaban saat waktu habis. | W |
| FR-08 | Peserta dapat menavigasi soal: tombol Sebelumnya/Selanjutnya, daftar nomor soal (palette), dan tombol pintasan keyboard (1-5 atau A-E). | W |
| FR-09 | Soal bertipe `MEMORY` menyembunyikan gambar stimulus otomatis setelah 5 detik pertama. | W |
| FR-10 | Soal bertipe `SPEED` berpindah otomatis ke butir soal berikutnya seketika setelah pilihan jawaban diklik. | W |
| FR-11 | Penilaian dihitung secara eksklusif di server saat peserta mengklik "Selesai" atau waktu habis: benar bernilai +1, salah atau kosong bernilai 0 (tanpa penalti). | W |
| FR-12 | Kunci jawaban (`correct_index`) dan pembahasan (`explanation`) **dilarang keras** dikirimkan ke browser selama sesi tes berlangsung. | W |
| FR-13 | Halaman `/result/[attemptId]` menampilkan skor numerik, persentase akurasi, waktu pengerjaan, status per nomor soal (benar, salah, terlewat), serta pembahasan komprehensif. | W |

### 3.2 Command Center Admin & CMS

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-20 | Admin melakukan login pada `/admin` dengan password terkonfigurasi. Percobaan login dibatasi maksimal 5 kali per menit per IP (rate limited, HTTP 429). | W |
| FR-21 | Sesi admin diamankan dengan cookie `httpOnly`, `sameSite=lax`, `secure` (production), dengan validasi token berbasis timing-safe HMAC. | W |
| FR-22 | Layout CMS (`AdminShell`) menyediakan sidebar desktop (collapsible), mobile drawer responsif dengan overlay, header dengan indikator status DB, dan navigasi tab aktif. | W |
| FR-23 | Dashboard Admin (`/admin`) menampilkan metrik ringkas: Total Perusahaan, Total Paket, Total Subtes, Total Soal, serta Rasio & Persentase Kelengkapan Pembahasan (dihitung khusus subtes bertipe `QUIZ`). | W |
| FR-24 | Admin dapat melakukan inline edit nama dan deskripsi paket soal secara langsung tanpa reload halaman. | W |
| FR-25 | Admin dapat melakukan inline edit nama, durasi, deskripsi, urutan, dan jenis (`kind`) subtes secara langsung dengan locking transaksi `FOR UPDATE`. | W |
| FR-26 | Admin dapat menghapus paket atau subtes secara aman dan atomik (`DELETE ... RETURNING`). Jika paket terakhir suatu perusahaan dihapus, record perusahaan ikut terhapus otomatis. | W |
| FR-27 | Admin dapat mengekspor paket soal ke format file JSON standar yang kompatibel dengan format impor. | S |

### 3.3 Sistem Proteksi & Integritas Impor (`/admin/import`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-30 | Sistem menerima unggahan file `.json` atau input teks langsung untuk paket soal utuh (`pack`) maupun pembaruan pembahasan terpisah (`pembahasanSaja`). | W |
| FR-31 | **Dry-Run 2-Fase (Read-Only Analysis):** Tombol "Periksa Dulu" menjalankan analisis murni query `SELECT` tanpa mutasi data sedikit pun, menghasilkan laporan perubahan terperinci. | W |
| FR-32 | **Canonical SHA-256 Hashing:** Sistem menghitung hash kanonikal konten soal. Jika hash subtes pada file baru identik dengan database, sistem menandai `SKIP` (tidak menulis ulang soal demi menjaga integritas data riwayat). | W |
| FR-33 | **Deteksi Risiko Riwayat (Attempt Guard):** Sistem mendeteksi jika subtes lama yang sudah memiliki riwayat pengerjaan (`attempts > 0`) mengalami perubahan soal. Sistem menandai status `DANGER` dan menghitung jumlah attempt yang terancam terpengaruh. | W |
| FR-34 | **Deteksi Penurunan Pembahasan:** Sistem memperingatkan jika file impor memiliki jumlah pembahasan yang lebih sedikit daripada database saat ini (*coverage drop warning*). | W |
| FR-35 | **Spot-Check Preview:** Sistem menampilkan pratinjau perbandingan butir soal (nomor soal, teks prompt database vs file baru, kunci jawaban, dan cuplikan pembahasan) untuk memvalidasi kesesuaian konten sebelum eksekusi. | W |
| FR-36 | **Server-Enforced 409 Conflict:** Endpoint API wajib menolak impor berisiko tinggi dengan HTTP 409 Conflict kecuali permintaan menyertakan `?force=1` yang didorong oleh persetujuan eksplisit checkbox admin. | W |
| FR-37 | **Pembaruan Pembahasan Delta:** Mode `pembahasanSaja` hanya memperbarui baris soal yang mengalami perubahan isi pembahasan tanpa memicu modifikasi nomor atau pilihan jawaban. | W |
| FR-38 | **Batch UNNEST Performance:** Penyimpanan soal dalam jumlah besar dilakukan menggunakan teknik batch `UNNEST` array PostgreSQL untuk menjamin latensi rendah dan mencegah timeout serverless. | W |

### 3.4 Audit Trail & Pemantauan Sistem (`/admin/audit`)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-40 | Sistem mencatat setiap operasi impor ke tabel `import_audit_logs` secara otomatis, mencakup aktor, kategori aksi, status (`SUCCESS`, `FORCED`, `REJECTED`, `FAILED`), ringkasan diff, rincian subtes, dan durasi eksekusi. | W |
| FR-41 | Sistem mencatat upaya impor yang ditolak (*rejected*) atau dibatalkan karena konflik data untuk keperluan investigasi keamanan dan integritas. | W |
| FR-42 | Halaman `/admin/audit` menyajikan antarmuka pemantauan log dengan filter status, filter kategori, kartu ringkasan metrik, dan modal inspeksi payload JSON rincian. | W |
| FR-43 | Sistem memiliki mekanisme ketahanan fail-safe: jika tabel `import_audit_logs` belum ada (kode PostgreSQL `42P01`), sistem mengembalikan array kosong secara anggun tanpa menyebabkan crash aplikasi. | W |

---

## 4. Kebutuhan Antarmuka Eksternal

### 4.1 Antarmuka pengguna (UI/UX)

- **Desain & Tipografi:** Menggunakan tema Solid Cobalt (Slate & Cobalt) berstandar WCAG AA, tipografi sans-serif interaktif yang nyaman dibaca untuk durasi lama.
- **Responsivitas:** Sepenuhnya adaptif untuk perangkat mobile (320px+), tablet, hingga layar desktop lebar (1440px+).
- **Aksesibilitas & Keyboard Navigation:** Navigasi soal dapat dikendalikan penuh via tombol keyboard angka 1-5 atau huruf A-E; form kontrol dilengkapi label semantik dan status ARIA.
- **Rendering Visual:** Soal bergambar disajikan dalam format SVG terinspeksi yang diskalakan secara proporsional dan bebas dari elemen berbahaya.

### 4.2 Antarmuka perangkat lunak & basis data

- Database: PostgreSQL 15+ (kompatibel Neon Serverless) dengan connection pooling terkonfigurasi.
- Runtime: Node.js 18+ pada Vercel / Linux Environment.

---

## 5. Kebutuhan Nonfungsional (NFR)

| ID | Kategori | Kebutuhan |
| --- | --- | --- |
| NFR-01 | **Keamanan Data** | Kunci jawaban dan kalkulasi skor diisolasi murni di sisi server. Token otentikasi dienkripsi dengan timing-safe HMAC. |
| NFR-02 | **Proteksi Brute-Force** | Endpoint login admin dibatasi rate limit 5 request per menit per alamat IP; percobaan gagal diberi penundaan respons acak ~800ms. |
| NFR-03 | **Sanitasi Konten (XSS Prevention)** | File SVG yang diimpor disaring secara ketat: melarang tag `<script>`, `<foreignObject>`, `<iframe>`, `<embed>`, `<object>`, atribut event `on*`, serta skema URL `javascript:` dan `data:text/html`. |
| NFR-04 | **Integritas Transaksional** | Operasi impor dan mutasi metadata berjalan dalam blok transaksi `BEGIN ... COMMIT`; rollback instan dieksekusi jika terjadi anomali di salah satu tahap. |
| NFR-05 | **Performa Query** | Pemuatan halaman latihan merespons di bawah 1,5 detik pada koneksi standar. Batch insert/update memanfaatkan `UNNEST` array untuk meminimalkan round-trip basis data. |
| NFR-06 | **Keandalan Koneksi** | Penggunaan koneksi database dibatasi pool maksimal 5-10 sambungan dengan penanganan penutupan koneksi otomatis pada lingkungan serverless. |
| NFR-07 | **Akurasi Pewaktuan** | Timer subtes sinkron dengan jam epoch sistem (`Date.now()`), mencegah perlambatan timer saat tab browser di-minimize atau dalam kondisi low-power mode. |
| NFR-08 | **Privasi Pengguna** | Tidak ada penyimpanan cookie pelacak pihak ketiga atau pengumpulan data pribadi tanpa izin (zero-PII requirement untuk peserta publik). |

---

## 6. Model Data Relasional

```
companies (1) ───< test_packages (N) ───< subtests (N) ───< questions (N)
                                               │
                                               └───< attempts (N) ───< answers (N)

import_audit_logs (Tabel log independen untuk audit trail CMS)
```

### 6.1 Rincian Entitas

1. **`companies`**: `id` (PK), `name`, `slug` (Unique), `logo_svg`, `description`, `created_at`.
2. **`test_packages`**: `id` (PK), `company_id` (FK), `name`, `slug` (Unique per company), `description`, `order_index`, `created_at`.
3. **`subtests`**: `id` (PK), `package_id` (FK), `name`, `slug` (Unique per package), `description`, `duration_seconds`, `order_index`, `instructions`, `subtest_kind` (`QUIZ`, `PERSONALITY`, `PAULI`, `DRAWING`), `created_at`.
4. **`questions`**: `id` (PK), `subtest_id` (FK), `question_number`, `question_type` (`TEXT`, `IMAGE`, `MEMORY`, `SPEED`), `prompt`, `image_svg`, `options` (JSON array text), `options_svg` (JSON array SVG), `correct_index`, `explanation`, `created_at`.
5. **`attempts`**: `id` (PK), `subtest_id` (FK), `started_at`, `submitted_at`, `score`, `total_questions`, `duration_seconds`.
6. **`answers`**: `id` (PK), `attempt_id` (FK), `question_id` (FK), `selected_index`, `is_correct`.
7. **`import_audit_logs`**: `id` (PK), `actor`, `action`, `status` (`SUCCESS`, `FORCED`, `REJECTED`, `FAILED`), `company_slug`, `package_slug`, `details` (JSONB berisi subtest summary, diff stats, error message), `created_at`.

---

## 7. Batasan & Cakupan Luar (Out of Scope v1.1)

- Sistem akun peserta berbasis email/password (tetap dipertahankan tanpa akun demi kemudahan akses instan).
- Papan peringkat publik lintas pengguna (leaderboard).
- Sinkronisasi riwayat pengerjaan cloud lintas perangkat (saat ini riwayat tersimpan lokal di perangkat peserta).
- Simulasi pengerjaan interaktif spesifik untuk Pauli dinamis dan canvas interaktif tes menggambar (direncanakan pada v2.0).

---

## 8. Kriteria Penerimaan Sistem (Acceptance Criteria)

- Peserta dapat menyelesaikan simulasi tes secara lancar hingga halaman hasil dan pembahasan.
- Kunci jawaban tidak pernah bocor di sisi client selama tes berjalan.
- Dashboard Admin menampilkan metrik akurat, termasuk rasio kelengkapan pembahasan khusus `QUIZ`.
- Impor paket dengan konten identik otomatis melewati rewrite (`SKIP`) dan tidak merusak data pengerjaan peserta.
- Impor dengan potensi merusak riwayat wajib memicu penolakan HTTP 409 Conflict hingga checkbox konfirmasi ditandai oleh admin.
- Setiap aktivitas impor tercatat dengan benar pada log audit dan dapat ditinjau melalui `/admin/audit`.
- Seluruh suite automated unit tests (38+ test cases) lulus 100% dan build TypeScript berjalan tanpa error.
