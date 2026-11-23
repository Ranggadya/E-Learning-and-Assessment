# Desain Redesain CMS Admin, Proteksi Impor Soal/Pembahasan, dan Audit Log

**Tanggal:** 2026-11-23  
**Pendekatan Terpilih:** Pendekatan 1 — Ekstensi Langsung Tanpa Ubah Tabel Lama (mode Ponytail)

## 1. Tujuan & Latar Belakang

Dashboard CMS admin saat ini (`/admin` dan `/admin/import`) masih berupa *top bar* sederhana, belum menampilkan status kelengkapan pembahasan per paket/subtes, belum memiliki fitur edit *inline*, dan menyimpan tiga celah operasional pada proses impor:

1. **Duplikasi tanpa pencegahan:** Mengunggah ulang file paket soal atau file pembahasan yang sama persis langsung menimpa data lama (untuk paket soal bahkan menghapus `questions` dan merusak detail jawaban riwayat percobaan) tanpa memberi tahu bahwa kontennya sudah pernah diunggah.
2. **Pemeriksaan upload pembahasan belum memadai:** Tidak ada indikasi apakah pembahasan rinci (`steps`, `wrongNotes`, `quickTip`) sudah terisi di database, apakah cakupan nomor soal lengkap, atau verifikasi visual apakah pembahasan cocok dengan teks soal di database.
3. **Risiko ketidaksesuaian pembahasan terhadap soal yang baru:** Saat soal diperbarui dengan file baru, pembahasan rinci lama bisa hilang diam-diam (jika file soal baru tidak menyertakan pembahasan rinci), atau sebaliknya file `pembahasanSaja` lama bisa tak sengaja diunggah ulang ke soal baru yang kebetulan memiliki `correctIndex` sama.

Selain menutup celah tersebut secara praktis (skala kecil–sedang, tanpa mengubah format JSON yang sudah ada), perubahan ini menyelaraskan tampilan CMS dengan identitas visual **Solid Cobalt** yang sudah dipakai di dashboard peserta, menambahkan edit *inline* paket/subtes, dan menyediakan **Audit Log** untuk melacak seluruh aktivitas impor dan perubahan paket.

## 2. Goals, Non-Goals, dan Anti-Goals

### Goals
- Mengubah `AdminShell` menjadi sidebar navigasi kiri Solid Cobalt (**Paket & Subtes**, **Impor JSON**, **Audit Log**) lengkap dengan *mobile drawer* yang aksesibel.
- Menampilkan indikator kelengkapan pembahasan rinci (`steps` / `wrongNotes` / `quickTip`) pada metrik ringkasan, kartu paket, dan setiap baris subtes `QUIZ` di `/admin`.
- Menambahkan edit *inline* di `/admin` untuk mengubah nama & deskripsi paket serta nama & durasi subtes.
- Menutup celah impor soal & pembahasan lewat deteksi hash konten terkanonisasi (SHA-256), analisis *diff* terhadap database aktual saat *dry-run*, konfirmasi *Force Overwrite* yang ditegakkan di server (`?force=1` / HTTP `409`), tombol **Tolak / Batalkan Impor**, serta pratinjau kecocokan 3 soal pertama untuk file `pembahasanSaja`.
- Menambahkan 1 tabel baru `import_audit_logs` di `db/schema.sql` dan halaman `/admin/audit` untuk mencatat impor soal, impor pembahasan (sukses, timpa paksa, gagal, ditolak), serta edit dan hapus paket/subtes.
- Mempertahankan kompatibilitas 100% dengan seluruh file JSON lama (`db/packs/*.json`, `db/Pembahasan/*.json`, dan CLI `scripts/import-packs.ts`).

### Non-Goals
- Tidak menambahkan multi-user admin, peran/RBAC, atau mengubah mekanisme autentikasi `ADMIN_PASSWORD`.
- Tidak membangun sistem *versioning* / *1-click rollback* dengan tabel snapshot revisi soal penuh.
- Tidak membangun form editor per butir soal (`questions`) di UI CMS (butir soal tetap dikelola via impor/ekspor JSON).
- Tidak mewajibkan perubahan skema file JSON paket soal maupun `pembahasanSaja` yang sudah berjalan.
- Tidak menambah dependensi npm baru (memanfaatkan `node:crypto` bawaan Node).

### Anti-Goals
- Mengubah kolom/struktur tabel existing (`companies`, `test_packages`, `subtests`, `questions`, `attempts`, `answers`).
- Menegakkan konfirmasi duplikat/timpa hanya di browser tanpa validasi server-side di `POST /api/admin/packs`.
- Membuat halaman `/admin` atau `/admin/audit` error/crash total apabila `npm run db:migrate` belum sempat dijalankan setelah update.

## 3. Batasan Teknis (Constraints)

- **Stack:** Next.js `16.4.6` App Router, React `19.3`, TypeScript, Tailwind CSS v4, PostgreSQL (`pg` Pool di `src/lib/db.ts`).
- **Migrasi DB:** `db/schema.sql` wajib idempoten (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) dan dijalankan lewat `npm run db:migrate`.
- **Keamanan:** Semua endpoint `/api/admin/**` wajib memanggil `rejectIfNotAdmin()` di awal; semua halaman `/admin/**` memakai `export const dynamic = "force-dynamic"` dan memeriksa autentikasi admin.
- **Aksesibilitas & Tema:** Memakai CSS tokens di `src/app/globals.css`, mendukung Light & Dark mode dengan kontras teks WCAG AA (&ge; 4.5:1), serta manajemen fokus keyboard pada *drawer* mobile dan form konfirmasi.
- **Tipe Subtes:** Mendukung keempat `SubtestKind` (`QUIZ`, `PERSONALITY`, `PAULI`, `DRAWING`). Indikator pembahasan rinci hanya dihitung untuk subtes `QUIZ`; subtes non-`QUIZ` ditampilkan sesuai label jenisnya dan tidak dihitung sebagai "belum ada pembahasan".

## 4. Pendekatan yang Dipertimbangkan

### Pendekatan 1: Ekstensi Langsung Tanpa Ubah Tabel Lama *(Dipilih)*
- Menambah **1 tabel baru** (`import_audit_logs`) di `db/schema.sql`. Tabel lama tidak diubah.
- Deteksi duplikat dan *diff* dilakukan secara *live* terhadap isi database aktual + pengecekan `content_hash` di `import_audit_logs`.
- Menambah `PATCH` di route yang sudah ada (`/api/admin/packs/[packageId]` dan `/api/admin/subtests/[subtestId]`) dan memperluas `POST /api/admin/packs` dengan penegakan `?force=1`.
- **Trade-off:** Diff terkecil, risiko migrasi paling rendah, mudah dirawat; cadangan sebelum menimpa tetap melalui tombol **Ekspor JSON** (tanpa *1-click rollback*).

### Pendekatan 2: Snapshot Versi Penuh + Rollback *(Ditolak)*
- Menambah tabel `subtest_revisions` yang menyimpan salinan JSON soal utuh setiap penimpaan beserta fitur *Restore* di halaman audit.
- **Trade-off:** Mendukung *rollback* instan, tetapi menambah kompleksitas skema/logika dan membengkakkan ukuran DB akibat duplikasi soal dan SVG.

**Alasan pemilihan:** Sesuai kebutuhan pengguna untuk menyelesaikan celah skala kecil–sedang secara ringkas (*Ponytail*) tanpa membebani struktur pembuatan soal/pembahasan terstruktur ke depan.

## 5. Rancangan Detail

### 5.1 Skema Database (`db/schema.sql`)

Tambahkan satu tabel dan dua indeks di akhir `db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS import_audit_logs (
  id                SERIAL PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_type       TEXT NOT NULL CHECK (action_type IN (
                      'PACK_NEW',
                      'PACK_OVERWRITE',
                      'PACK_DUPLICATE_FORCED',
                      'EXPLANATION_NEW',
                      'EXPLANATION_OVERWRITE',
                      'EXPLANATION_DUPLICATE_FORCED',
                      'IMPORT_REJECTED',
                      'IMPORT_FAILED',
                      'PACKAGE_UPDATED',
                      'SUBTEST_UPDATED',
                      'PACKAGE_DELETED',
                      'SUBTEST_DELETED'
                    )),
  status            TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FORCED', 'REJECTED', 'FAILED')),
  company_slug      TEXT,
  package_slug      TEXT,
  target_label      TEXT,
  file_name         TEXT,
  content_hash      TEXT,
  forced_overwrite  BOOLEAN NOT NULL DEFAULT false,
  summary           JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS import_audit_logs_created_at_idx
  ON import_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS import_audit_logs_hash_status_idx
  ON import_audit_logs (content_hash, status)
  WHERE content_hash IS NOT NULL;
```

- **Keputusan arsitektur (builder call):** Jika kueri ke `import_audit_logs` menemui error PostgreSQL `42P01` (*undefined table*, karena `npm run db:migrate` belum dijalankan), fungsi penulisan audit gagal-aman (mencatat peringatan di `console.warn` tanpa menggagalkan transaksi utama), dan fungsi pembacaan mengembalikan status `migrationRequired: true` agar `/admin/audit` menampilkan instruksi menjalankan `npm run db:migrate` secara rapi.

### 5.2 Hash Konten & Analisis Integritas Impor

Tambahkan modul murni (`src/lib/import-analysis.ts`) yang dapat diuji unit secara terpisah:

1. **Canonical SHA-256 Hash (`computeCanonicalHash`):**
   - Menormalisasi objek JSON dengan mengurutkan kunci objek secara rekursif lalu menghitung SHA-256 hex via `node:crypto`.
   - Mengabaikan perbedaan spasi/indentasi atau urutan properti JSON sehingga unggahan ulang file yang sama tetap terdeteksi identik.
2. **Definisi Pembahasan Rinci (`hasDetailedExplanation`):**
   - Bernilai `true` bila minimal satu dari `steps` (array tak kosong), `wrongNotes` (array tak kosong dengan minimal 1 catatan non-kosong atau array berpanjang > 0), atau `quickTip` (string tak kosong) terisi.
   - Catatan: Di DB `questions`, kolom `explanation` singkat wajib ada di setiap soal `PackQuestion`, sehingga metrik kelengkapan pembahasan di CMS menggunakan definisi "pembahasan rinci" ini agar benar-benar mencerminkan status unggahan `db/Pembahasan/*.json` maupun soal versi pembaruan.
3. **Analisis Impor Paket Soal (`importPack`):**
   - Signature diperluas secara kompatibel: `importPack(pack, { dryRun, force?, contentHash? })`.
   - `scripts/import-packs.ts` (CLI) meneruskan `force: true` agar skrip impor massal CLI tetap berjalan tanpa terhenti.
   - Saat transaksi berjalan, sistem:
     - Mengecek apakah `contentHash` (bila diberikan) pernah berhasil diimpor (`status IN ('SUCCESS', 'FORCED')`) di `import_audit_logs` untuk mendapatkan `previousUploadAt`.
     - Membandingkan metadata `company` & `package` (`name` dan `description`, di mana `description: undefined` pada JSON berarti **pertahankan deskripsi lama di DB**, bukan mengosongkannya ke `NULL`) untuk mendeteksi `metadataChanged` (keputusan teknis: mencegah impor penambahan subtes seperti `paragon-tambahan.json` menghapus/menimpa edit *inline* secara diam-diam).
     - Membandingkan tiap subtes terhadap data DB saat ini (metadata subtes + seluruh daftar soal/config secara terkanonisasi) dan mengelompokkannya menjadi:
       - `changeType: "baru"` — subtes belum ada di paket tersebut.
       - `changeType: "identik"` — subtes sudah ada dan seluruh metadata + soal/config-nya identik 100% dengan DB.
       - `changeType: "berubah"` — subtes sudah ada dan terdapat perubahan; mencatat `existingQuestionCount`, `incomingQuestionCount`, `changedQuestionCount`, `existingDetailedCount`, `incomingDetailedCount`, `losesDetailedExplanations`, dan `replacedAttemptCount`.
   - **Perilaku penulisan pada subtes `"identik"` (keputusan teknis):** Saat `force: true` dijalankan pada paket yang memuat subtes `"identik"` (baik paket campuran maupun duplikat 100%), subtes `"identik"` **dilewati (skip rewrite)** — baris `subtests` dan `questions` tidak dihapus/ditulis ulang sehingga riwayat `answers` peserta pada subtes tersebut tetap utuh (`replacedAttemptCount = 0`). Hanya subtes `"berubah"` yang soalnya diganti dan subtes `"baru"` yang disisipkan.
   - Kondisi `requiresConfirmation`:
     - `allSubtestsIdentical`: `true` bila seluruh subtes dalam file berstatus `"identik"`.
     - `isDuplicateContent`: `allSubtestsIdentical && !metadataChanged`.
     - `hasOverwrite`: `true` bila minimal satu subtes berstatus `"berubah"` ATAU `metadataChanged === true`.
     - `requiresConfirmation = isDuplicateContent || hasOverwrite`.
   - Daftar `warnings` terstruktur dalam bahasa Indonesia:
     - Peringatan duplikat identik (menyertakan tanggal `previousUploadAt` jika ada, plus catatan bahwa melanjutkan tidak akan mengubah soal/riwayat).
     - Peringatan perubahan metadata perusahaan/paket (menampilkan nama/deskripsi lama vs baru bila `metadataChanged === true`).
     - Peringatan penimpaan soal beserta total `replacedAttemptCount` (khusus subtes `"berubah"`) yang akan kehilangan detail jawaban.
     - Peringatan khusus jika `losesDetailedExplanations` aktif (misal: *"Subtes Tes Verbal saat ini memiliki 20 pembahasan rinci, sedangkan file baru memuat 0 pembahasan rinci — pembahasan rinci lama akan terhapus jika ditimpa"*).
4. **Analisis Impor Pembahasan (`importExplanations`):**
   - Signature: `importExplanations(pack, { dryRun, force?, contentHash? })`.
   - Tetap kompatibel penuh dengan format `pembahasanSaja: true` saat ini (`number`, `correctIndex`, `explanation?`, `steps?`, `wrongNotes?`, `quickTip?`).
   - **Dukungan opsional `prompt`:** Jika sebuah entri pembahasan menyertakan properti opsional `prompt` (string non-kosong), validasi membandingkannya terhadap `question.prompt` di DB setelah normalisasi whitespace (`trim().replace(/\s+/g, " ")`). Jika berbeda, impor **ditolak keras** dengan pesan kesalahan spesifik pada nomor soal tersebut. File lama tanpa `prompt` tetap berjalan normal.
   - Untuk setiap subtes di file pembahasan:
     - Memeriksa cakupan (`incomingCount` vs `existingQuestionCount` di DB); bila tidak sama (`coverageMismatch: true`), memunculkan peringatan eksplisit bahwa jumlah butir pembahasan tidak sama dengan jumlah soal aktif.
     - Memeriksa apakah nilai pembahasan yang masuk sudah identik 100% dengan DB (`changeType: "identik"`, skip `UPDATE` saat `force: true`), akan menimpa soal yang sudah memiliki pembahasan rinci (`existingDetailedOverwriteCount > 0`, `changeType: "berubah"`), atau mengisi soal yang belum memiliki pembahasan rinci (`changeType: "baru"`).
     - Menghasilkan `spotChecks` (hingga 3 soal pertama per subtes, dibatasi total 6 item untuk pratinjau UI): nomor soal, kunci jawaban di DB (`A`–`E`), potongan teks soal di DB, cuplikan pembahasan yang masuk (`quickTip` / langkah pertama `steps` / `explanation`), dan penanda apakah soal tersebut sudah punya pembahasan rinci.
   - Kondisi `requiresConfirmation`: `isDuplicateContent || existingDetailedOverwriteCount > 0 || hasCoverageMismatch`.
5. **Penegakan Server-Side (`ImportConfirmationRequiredError`):**
   - Bila `dryRun === false`, `requiresConfirmation === true`, dan `force !== true`, `importPack` maupun `importExplanations` melakukan `ROLLBACK` dan melempar `ImportConfirmationRequiredError` yang membawa `summary`.
   - `POST /api/admin/packs` menangkap error ini dan mengembalikan HTTP `409 Conflict` dengan `{ requiresConfirmation: true, summary, errors: ["Konfirmasi timpa paksa diperlukan sebelum menyimpan."] }`.

### 5.3 Kontrak API Admin

Semua endpoint wajib diawali `rejectIfNotAdmin()`.

1. **`POST /api/admin/packs`** *(diperluas)*:
   - Query params: `?dryRun=1` (pratinjau tanpa simpan), `?force=1` (mengizinkan penimpaan/duplikat saat `dryRun` tidak aktif).
   - Header opsional: `X-Import-Filename` (disanitasi maksimal 180 karakter, hanya untuk metadata audit log; tidak mengubah kontrak JSON body).
   - Audit logging *(keputusan teknis: pencatatan `import_audit_logs` khusus dilakukan di lapisan API web CMS, bukan di skrip CLI `scripts/import-packs.ts`, agar proses seed massal CLI tidak membanjiri tabel audit; deteksi duplikat tetap akurat karena membandingkan langsung ke isi DB aktual)*:
     - `dryRun=1`: tidak menulis audit log.
     - `dryRun=0` sukses: mencatat `PACK_NEW` / `PACK_OVERWRITE` / `PACK_DUPLICATE_FORCED` (atau varian `EXPLANATION_*`) dengan `forced_overwrite = summary.requiresConfirmation && force`, status `FORCED` bila `forced_overwrite === true` dan `SUCCESS` bila tidak, beserta `content_hash`, `file_name`, dan ringkasan `summary`.
     - `dryRun=0` gagal (JSON rusak, validasi gagal, `ExplanationImportError`, atau DB error): mencatat `IMPORT_FAILED` dengan status `FAILED` dan potongan daftar error (maks 10 item).
     - `dryRun=0` ditolak karena `409` (belum `?force=1`): tidak mencatat `IMPORT_FAILED` karena admin masih di tahap konfirmasi.
2. **`POST /api/admin/packs/reject`** *(baru)*:
   - Dipanggil ketika admin mengklik tombol **Tolak / Batalkan Impor** pada layar peringatan konfirmasi di `/admin/import`.
   - Body JSON: `{ mode: "pack" | "pembahasan", companySlug?: string, packageSlug?: string, targetLabel?: string, fileName?: string, contentHash?: string, warnings?: string[] }`.
   - Mencatat `action_type: "IMPORT_REJECTED"`, `status: "REJECTED"` ke `import_audit_logs` dan mengembalikan `{ ok: true }`.
3. **`PATCH /api/admin/packs/[packageId]`** *(baru di route yang sudah ada)*:
   - Body JSON: `{ name: string, description?: string | null }`.
   - Validasi: `name` setelah `trim()` wajib 1–160 karakter; `description` bila bukan `null`/`undefined` wajib string maksimal 1000 karakter (string kosong disimpan sebagai `null`).
   - Memperbarui `test_packages` dan mencatat `PACKAGE_UPDATED` (dengan nilai sebelum & sesudah) di `import_audit_logs`.
   - `DELETE /api/admin/packs/[packageId]` yang sudah ada diperluas untuk membaca identitas paket sebelum dihapus dan mencatat `PACKAGE_DELETED` di `import_audit_logs`.
4. **`PATCH /api/admin/subtests/[subtestId]`** *(baru di route yang sudah ada)*:
   - Body JSON: `{ name: string, durationSeconds?: number }`.
   - Validasi: `name` setelah `trim()` wajib 1–160 karakter.
   - **Penanganan `durationSeconds` per `SubtestKind` (keputusan teknis):**
     - Untuk `QUIZ` dan `PERSONALITY`: `durationSeconds` wajib bilangan bulat `10..10800` (konsisten dengan `pack-schema.ts`).
     - Untuk `PAULI` dan `DRAWING`: karena timer aktual di `PauliRunner`/`DrawingRunner` berasal dari `subtests.config` (bukan `duration_seconds`), edit *inline* dibatasi ke **nama saja**; `durationSeconds` tidak diubah di DB (jika dikirim dengan nilai berbeda, ditolak HTTP `400` dengan pesan bahwa durasi Pauli/Menggambar mengikuti konfigurasi JSON).
   - Memperbarui `subtests` dan mencatat `SUBTEST_UPDATED` (dengan nilai sebelum & sesudah) di `import_audit_logs`.
   - `DELETE /api/admin/subtests/[subtestId]` yang sudah ada diperluas untuk membaca identitas subtes sebelum dihapus dan mencatat `SUBTEST_DELETED` di `import_audit_logs`.

### 5.4 Redesain UI CMS (Opsi A — Unified Command Center)

1. **`AdminShell.tsx` (Sidebar Solid Cobalt):**
   - Mengadopsi arsitektur layout `LearnerShell.tsx`: sidebar kiri tetap `248px` di desktop (`lg:pl-[248px]`, kontainer utama `max-w-6xl`), *topbar* + *drawer* mobile dengan `Escape` close dan pemulihan fokus keyboard.
   - Navigasi utama (3 menu):
     - **Paket & Subtes** (`/admin`)
     - **Impor JSON** (`/admin/import`)
     - **Audit Log** (`/admin/audit`)
   - Active nav: `bg-brand font-bold text-white shadow-xs`; border panel: `border-line-strong`.
   - Footer sidebar: `ThemeToggle`, tautan **Lihat Situs** (`/`), dan `LogoutButton`.
2. **Dashboard Paket (`/admin` & `AdminDashboardClient.tsx`):**
   - `getAdminOverview()` di `src/lib/queries.ts` diperluas untuk mengembalikan `description` paket dan `detailedExplanationCount` per subtes `QUIZ` (menghitung soal yang `steps`, `wrong_notes`, atau `quick_tip` terisi).
   - **Strip 4 Metrik:** Perusahaan, Paket, Subtes, dan **Pembahasan Rinci** (persentase + rasio `terisi/total` khusus soal `QUIZ`).
   - **Filter Bar:** Input pencarian teks (perusahaan/paket/subtes) + filter status pembahasan (`Semua`, `Perlu Pembahasan`, `Lengkap`).
   - **Kartu Perusahaan & Paket:**
     - Header perusahaan memakai monogram tegas (konsisten dengan dashboard peserta) + slug + jumlah paket.
     - Header paket menampilkan nama, slug, deskripsi (jika ada), ringkasan jumlah subtes & soal, badge status pembahasan (`Lengkap X/X`, `Parsial X/Y`, `Belum Ada 0/Y`, atau `Non-Kuis` bila paket tidak punya subtes `QUIZ`), serta aksi: **Edit**, **Impor Pembahasan** (mengarah ke `/admin/import`), **Ekspor JSON**, **Lihat Situs**, dan **Hapus**.
     - Form edit paket dibuka *inline* tepat di bawah header paket (input Nama + textarea Deskripsi + tombol Simpan/Batal), memanggil `PATCH /api/admin/packs/[id]` lalu `router.refresh()`.
   - **Baris Subtes:**
     - Menampilkan nama, slug, tipe (`QUIZ` atau label `SUBTEST_KIND_LABEL`), jumlah item, durasi (menit), badge pembahasan per subtes `QUIZ`, tombol **Edit** (*inline* Nama + Durasi khusus `QUIZ`/`PERSONALITY`: tampilkan input menit `1–180` bila durasi kelipatan 60 detik dan &ge; 60 detik, atau input detik `10–10800` bila di bawah 60 detik/bukan kelipatan 60 agar presisi tidak hilang; untuk `PAULI`/`DRAWING`, input durasi dinonaktifkan dengan keterangan *"Durasi mengikuti config JSON"*), serta **Hapus**.
3. **Halaman Impor & Layar Konfirmasi (`/admin/import` & `PackImporter.tsx`):**
   - Stepper 3 tahap: `1. Muat JSON` &rarr; `2. Pratinjau & Integritas` &rarr; `3. Tersimpan`.
   - Mendukung drag & drop / file picker / tempel JSON untuk paket soal maupun file `pembahasanSaja: true` (deteksi otomatis mode dari respons *dry-run*, mengirim nama file lewat header `X-Import-Filename`).
   - **Layar Pratinjau & Konfirmasi:**
     - Menampilkan ringkasan perusahaan, paket, hash pendek (8 karakter), dan tabel *diff* per subtes (Kondisi DB vs File Diunggah vs Dampak).
     - Bila `mode === "pembahasan"`, menampilkan panel **Cek Kecocokan Sampel Soal** (maks 6 baris *spot-check*: nomor, kunci di DB, potongan teks soal di DB, dan cuplikan pembahasan yang akan masuk) agar admin dapat memverifikasi secara visual bahwa pembahasan sesuai dengan versi soal saat ini.
     - Bila `requiresConfirmation === false`: tombol utama Solid Cobalt **"Simpan ke Database"**.
     - Bila `requiresConfirmation === true`:
       - Banner peringatan kontras tinggi (daftar seluruh `warnings`, termasuk info tanggal unggah sebelumnya jika duplikat).
       - Checkbox wajib: *"Saya memahami dampak penimpaan ini dan tetap ingin melanjutkan impor."*
       - Dua tombol tegas: **"Tolak / Batalkan Impor"** (mengirim pencatatan ke `POST /api/admin/packs/reject` lalu membersihkan pratinjau dengan status notifikasi pembatalan tercatat) dan **"Timpa Paksa (Force Overwrite)"** (merah tegas, nonaktif sampai checkbox dicentang, mengirim `POST /api/admin/packs?force=1`).
4. **Halaman Audit Log (`/admin/audit` & `AuditLogView.tsx`):**
   - Server page memeriksa autentikasi admin (`redirect("/admin")` jika belum login), mengambil maksimal 100 entri terbaru dari `import_audit_logs`.
   - Jika tabel belum dimigrasi (`migrationRequired: true`), tampilkan kartu panduan menjalankan `npm run db:migrate` tanpa melempar error 500.
   - Menyediakan filter kategori aksi (`Semua`, `Impor Soal`, `Impor Pembahasan`, `Edit & Hapus`), filter status (`Semua`, `Sukses`, `Timpa Paksa`, `Ditolak`, `Gagal`), dan pencarian cepat (target paket / nama file / potongan hash).
   - Menampilkan tabel responsif (dan tata letak kartu rapi di layar kecil) berisi: Waktu, Badge Tipe Aksi, Target Paket, File & Hash pendek, Ringkasan Dampak/Error, dan Badge Status.

## 6. Yang Diserahkan ke Builder

- Pembagian file komponen internal di `src/components/admin/` (misal memisahkan `InlinePackageEditor`/`InlineSubtestEditor` atau menyatukannya secara ringkas di `AdminDashboardClient.tsx`).
- Penambahan ikon SVG minimalis di `src/components/ui/Icons.tsx` (misal pensil untuk edit, ikon log/clipboard untuk audit) mengikuti `baseProps` yang sudah ada.
- Kalimat pasti untuk pesan peringatan, label badge, dan empty state dalam bahasa Indonesia yang konsisten dengan teks aplikasi saat ini.
- Desain test case unit (`src/lib/import-analysis.test.ts` atau sejenisnya) menggunakan runner `tsx --test` yang sudah ada di proyek.
