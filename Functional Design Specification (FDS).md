# Functional Design Specification (FDS)

**Aplikasi Latihan Psikotes** · Versi 1.0 · 19 November 2026 · Penyusun: Dya

Dokumen ini menjelaskan rancangan fungsional dan teknis aplikasi: arsitektur, alur, spesifikasi halaman, API, logika bisnis, dan struktur data. Kebutuhan yang dipenuhi tercantum pada dokumen SRS (kode FR, VR, NFR).

**Cakupan yang berkembang.** Rancangan sengaja generik. Astra dan Paragon adalah isi awal. Perusahaan lain dan seleksi lain seperti CPNS ditambahkan dengan mengimpor file paket baru, tanpa mengubah kode. Hal yang belum didukung dan rencana penambahannya ada pada bagian 14.

## 1. Ringkasan sistem

Aplikasi adalah satu proyek Next.js 16 (App Router) berbahasa TypeScript dengan Tailwind CSS. Halaman dirender di server dan membaca PostgreSQL langsung lewat library `pg`. Soal diisi lewat file paket JSON yang diimpor di CMS, bukan lewat kode.

| Lapisan | Teknologi | Peran |
| --- | --- | --- |
| Tampilan | React (server component dan client component), Tailwind CSS | Halaman publik dan admin |
| Logika server | Route handler Next.js (`/api/...`), modul `src/lib` | Penilaian, impor, autentikasi |
| Data | PostgreSQL, `pg` Pool (maks. 5 koneksi) | Penyimpanan soal dan hasil |
| Hosting (rencana) | Vercel dan Neon | Produksi |

Semua halaman memakai `force-dynamic` sehingga selalu membaca data terbaru. Tidak ada middleware: pemeriksaan admin dilakukan di setiap halaman dan route admin.

## 2. Hierarki konten

| Level | Contoh | URL |
| --- | --- | --- |
| Perusahaan | Astra Group | `/c/astra` |
| Paket | Paket 2 | `/c/astra/paket-2` |
| Subtes | Visualization (VIZ) | `/test/{subtestId}` |
| Hasil | Skor dan pembahasan | `/result/{attemptId}` |

Isi saat ini: Astra Paket 1 (7 subtes, 90 soal), Astra Paket 2 (7 subtes, 90 soal), Paragon Paket 1 (3 subtes, 40 soal), Paragon Paket 2 (3 subtes, 40 soal).

Istilah "perusahaan" pada tabel `companies` dan URL `/c/...` berarti penyelenggara tes secara umum, termasuk instansi seperti penyelenggara CPNS. Slug penyelenggara baru yang muncul pada file paket otomatis membuat penyelenggara baru dan tampil di beranda.

## 3. Alur pengguna

### 3.1 Peserta latihan

1. Membuka halaman utama dan memilih perusahaan.
2. Memilih paket, lalu melihat daftar subtes dengan jumlah soal dan durasi.
3. Menekan Mulai. Timer berjalan segera.
4. Menjawab soal, berpindah soal, atau melompat lewat nomor soal.
5. Menekan Selesai atau menunggu waktu habis. Jawaban dikirim otomatis.
6. Melihat skor dan pembahasan, lalu kembali ke daftar subtes paket.

### 3.2 Admin

1. Membuka `/admin` dan login dengan password.
2. Dari dashboard memilih Impor paket soal.
3. Memilih file atau menempelkan JSON, lalu menekan Periksa dulu.
4. Membaca pratinjau. Bila ada kesalahan, memperbaiki file dan mengulang.
5. Menekan Impor sekarang. Paket muncul di situs.
6. Opsional: mengekspor atau menghapus paket dan subtes dari dashboard.

## 4. Spesifikasi halaman

| Halaman | Route | Akses | Data yang dibaca | Perilaku utama |
| --- | --- | --- | --- | --- |
| Beranda | `/` | Publik | Daftar perusahaan | Kartu perusahaan menuju daftar paket |
| Daftar paket | `/c/[companySlug]` | Publik | Perusahaan dan paketnya | Menampilkan 404 bila slug tidak ada |
| Daftar subtes | `/c/[companySlug]/[packageSlug]` | Publik | Paket dan subtesnya | Tombol Mulai per subtes |
| Pengerjaan | `/test/[subtestId]` | Publik | Subtes dan soal tanpa kunci | Menjalankan TestRunner |
| Hasil | `/result/[attemptId]` | Publik | Skor dan pembahasan | Tautan kembali ke `/c/{company}/{package}` |
| Admin | `/admin` | Admin | Ringkasan semua paket | Form login atau dashboard |
| Impor | `/admin/import` | Admin | Tidak ada | Pengalihan ke `/admin` bila belum login |

### 4.1 Halaman pengerjaan (TestRunner)

| Elemen | Perilaku |
| --- | --- |
| Timer | Menampilkan sisa waktu mm:ss. Berwarna peringatan saat sisa 30 detik atau kurang. Dihitung dari jam sistem. Saat nol, jawaban dikirim otomatis. |
| Soal TEXT | Menampilkan teks soal dan pilihan. |
| Soal IMAGE | Menampilkan SVG di atas pilihan. Pada soal bergambar, pilihan A sampai E ada di dalam SVG, tombol berlabel Gambar A sampai E. |
| Soal MEMORY | Gambar tampil 5 detik, lalu disembunyikan dan tidak dapat ditampilkan lagi. Peserta menjawab dari ingatan. |
| Soal SPEED | Setelah memilih opsi, sistem langsung pindah ke soal berikutnya. |
| Navigasi | Tombol Sebelumnya dan Berikutnya, serta nomor soal untuk melompat. Soal yang sudah dijawab ditandai. |
| Keyboard | Tombol 1 sampai 5 atau huruf A sampai E memilih pilihan dengan urutan tersebut. Teks bantuan ditampilkan di layar. |
| Selesai | Mengirim jawaban ke `/api/attempts` lalu mengarahkan ke halaman hasil. Tombol dinonaktifkan selama pengiriman untuk mencegah kirim ganda. |

Jawaban disimpan sementara di memori browser selama sesi berjalan. Menutup tab sebelum selesai membuat pengerjaan tidak tercatat.

### 4.2 Halaman hasil

Menampilkan nama subtes, skor dengan format benar per total, catatan aturan nilai (benar +1, salah atau kosong 0, tanpa pengurangan), dan bagian Pembahasan. Setiap butir pembahasan memuat teks soal, gambar (bila ada), jawaban peserta, jawaban benar, status benar atau salah, dan penjelasan.

### 4.3 Dashboard admin

Menampilkan setiap perusahaan, paket, dan subtes dengan jumlah soal dan durasi dalam menit. Tersedia tautan Impor paket soal, Unduh contoh format, Lihat situs, dan Logout. Per paket tersedia Ekspor dan Hapus paket, per subtes tersedia Hapus. Penghapusan meminta konfirmasi dan menyegarkan halaman setelah berhasil.

### 4.4 Halaman impor

Mesin status pada komponen PackImporter: `idle` → `checking` → `previewed` → `importing` → `done`. Mengubah isi teks atau file mengembalikan status ke `idle`. Tombol Impor sekarang hanya muncul setelah pratinjau berhasil. Setelah impor selesai tampil tautan kembali ke dashboard.

## 5. Spesifikasi API

Semua respons berformat JSON, kecuali ekspor yang berupa unduhan file.

| Endpoint | Metode | Akses | Fungsi | Respons |
| --- | --- | --- | --- | --- |
| `/api/attempts` | POST | Publik | Mengirim jawaban dan menilai | 200 `{attemptId}`; 400 `{error}` bila payload tidak valid |
| `/api/admin/login` | POST | Publik | Login admin | 200 `{ok:true}` dan cookie sesi; 401 password salah; 503 admin belum dikonfigurasi |
| `/api/admin/logout` | POST | Admin | Menghapus sesi (tidak memerlukan sesi aktif) | 200 |
| `/api/admin/packs` | POST | Admin | Validasi dan impor paket. Tambahkan `?dryRun=1` untuk pratinjau tanpa menyimpan | 200 `{summary}`; 400 `{errors[]}`; 401; 413 file lebih dari 8 MB; 500 impor gagal |
| `/api/admin/packs/[packageId]` | DELETE | Admin | Menghapus paket | 200; 400 ID tidak valid; 404 tidak ditemukan |
| `/api/admin/packs/[packageId]/export` | GET | Admin | Mengunduh paket sebagai JSON | File JSON; 404 |
| `/api/admin/subtests/[subtestId]` | DELETE | Admin | Menghapus subtes | 200; 400; 404 |
| `/api/admin/template` | GET | Admin | Mengunduh contoh format paket | File JSON |

### 5.1 Payload pengiriman jawaban

`{ "subtestId": number, "answers": [ { "questionId": number, "selectedOption": string | null } ] }`

`selectedOption` bernilai `null` bila soal tidak dijawab. Payload diperiksa bentuknya sebelum diproses.

### 5.2 Ringkasan hasil impor

`summary` berisi `companyName`, `companyStatus`, `packageName`, `packageStatus`, `totalQuestions`, dan daftar `subtests` dengan `slug`, `name`, `questionCount`, `durationSeconds`, `status` (baru atau diganti), dan `replacedAttemptCount`.

## 6. Logika bisnis

### 6.1 Penilaian

1. Server menerima `subtestId` dan daftar jawaban.
2. Server membaca kunci jawaban dari tabel `questions` untuk subtes tersebut. Kunci dari klien tidak pernah dipakai.
3. Dalam satu transaksi, server membuat baris `attempts`, menulis satu baris `answers` untuk setiap soal (kosong bila tidak dijawab) dengan `is_correct`, menghitung skor, lalu mengisi `score`, `total_questions`, dan `finished_at`.
4. Skor = jumlah jawaban benar. Jawaban salah atau kosong bernilai 0 dan tidak ada pengurangan.
5. Server mengembalikan `attemptId`. Pembahasan dibaca dari database saat halaman hasil dibuka.

### 6.2 Impor paket

| Langkah | Aturan |
| --- | --- |
| 1. Validasi | Struktur dan aturan VR-01 sampai VR-06 diperiksa. Kesalahan dikumpulkan (maksimal 30) dan impor tidak dilanjutkan. |
| 2. Perusahaan | Upsert berdasarkan slug. Nama dan deskripsi diperbarui. |
| 3. Paket | Upsert berdasarkan slug di dalam perusahaan. |
| 4. Subtes | Upsert berdasarkan slug di dalam paket. Nama, deskripsi, durasi, dan urutan diperbarui. |
| 5. Soal | Untuk subtes yang sudah ada, seluruh soal lama dihapus lalu diganti soal dari file. Subtes lain di paket yang sama tidak disentuh. |
| 6. Pengerjaan lama | Baris `attempts` tetap ada dengan skornya. Detail `answers` hilang karena soalnya diganti. Jumlahnya dilaporkan di pratinjau. |
| 7. Dry run | Semua langkah dijalankan di dalam transaksi lalu di-ROLLBACK, sehingga ringkasan akurat tanpa mengubah data. |
| 8. Kegagalan | Kesalahan database membatalkan seluruh transaksi. |

Kunci jawaban pada file ditulis sebagai `correctIndex` (urutan pilihan mulai dari 0). Saat disimpan, pilihan diberi kunci huruf A sampai E dan `correct_option` berisi hurufnya.

### 6.3 Penghapusan

Menghapus paket menghapus subtes, soal, pengerjaan, dan jawabannya (cascade). Bila paket tersebut paket terakhir pada perusahaan, perusahaan ikut dihapus. Menghapus subtes menghapus soal dan riwayatnya.

### 6.4 Ekspor

Ekspor menghasilkan JSON dengan format yang sama dengan format impor (termasuk `type` eksplisit pada setiap soal), sehingga hasil ekspor dapat diimpor kembali.

## 7. Format file paket soal

Satu file memuat satu paket milik satu perusahaan.

| Bidang | Tipe | Keterangan |
| --- | --- | --- |
| `company.slug`, `company.name`, `company.description?` | teks | Slug sesuai VR-01 |
| `package.slug`, `package.name`, `package.description?` | teks | Slug sesuai VR-01 |
| `subtests[].slug`, `name`, `description?` | teks | Slug sesuai VR-01 |
| `subtests[].durationSeconds` | angka | 10 sampai 10.800 |
| `questions[].type?` | teks | TEXT (bawaan), IMAGE, MEMORY, atau SPEED |
| `questions[].prompt` | teks | Teks soal |
| `questions[].imageSvg?` | teks | Wajib untuk IMAGE dan MEMORY |
| `questions[].options` | daftar teks | 2 sampai 5 pilihan unik |
| `questions[].correctIndex` | angka | Indeks pilihan benar, mulai dari 0 |
| `questions[].explanation` | teks | Pembahasan |

Contoh ringkas:

`{ "company": {"slug":"astra","name":"Astra Group"}, "package": {"slug":"paket-2","name":"Paket 2"}, "subtests": [ {"slug":"quantitative-reasoning","name":"Quantitative Reasoning (QR)","durationSeconds":660,"questions":[ {"prompt":"...","options":["...","..."],"correctIndex":0,"explanation":"..."} ]} ] }`

## 8. Desain basis data

| Tabel | Kolom utama | Kunci dan batasan |
| --- | --- | --- |
| companies | id, slug, name, description, created\_at | slug UNIQUE |
| test\_packages | id, company\_id, slug, name, description, created\_at | FK ke companies (cascade); UNIQUE (company\_id, slug) |
| subtests | id, test\_package\_id, slug, name, description, duration\_seconds, order\_index | FK ke test\_packages (cascade); UNIQUE (test\_package\_id, slug) |
| questions | id, subtest\_id, type, order\_index, prompt, image\_svg, options (JSONB), correct\_option, explanation | FK ke subtests (cascade); type dibatasi TEXT, IMAGE, MEMORY, SPEED; indeks (subtest\_id, order\_index) |
| attempts | id, subtest\_id, started\_at, finished\_at, score, total\_questions | FK ke subtests (cascade) |
| answers | id, attempt\_id, question\_id, selected\_option, is\_correct | FK ke attempts dan questions (cascade); UNIQUE (attempt\_id, question\_id) |

Skema dibuat dengan `npm run db:migrate` (`db/schema.sql`, idempoten). Skrip migrasi menghapus tabel versi lama bila `test_packages.company_id` belum ada.

## 9. Keamanan

| Aspek | Rancangan |
| --- | --- |
| Autentikasi admin | Password dari `ADMIN_PASSWORD`. Sesi berupa cookie `admin_session` berisi token HMAC-SHA256 yang diturunkan dari `SESSION_SECRET` (bila ada) atau password. |
| Cookie | httpOnly, sameSite lax, secure pada produksi, berlaku 7 hari. |
| Perbandingan password | Di-hash lalu dibandingkan dengan `timingSafeEqual`. Login gagal ditunda 800 ms. |
| Otorisasi | Setiap route admin memanggil `rejectIfNotAdmin()` (401). Halaman admin memeriksa sesi dan mengalihkan atau menampilkan login. |
| Kerahasiaan kunci | Query soal publik tidak memilih `correct_option` dan `explanation`. |
| SQL | Seluruh query memakai parameter `$1, $2, ...`. |
| SVG | Disaring pada validasi impor (VR-05). |
| Batas ukuran | Impor maksimal 8 MB. |
| Risiko yang diterima | Belum ada pembatasan percobaan login per IP. Disarankan password panjang dan unik. |

## 10. Penanganan kesalahan

| Situasi | Perilaku |
| --- | --- |
| Slug atau ID tidak ditemukan | Halaman 404 |
| Payload jawaban tidak valid | 400 dan pesan kesalahan |
| Pengiriman jawaban gagal karena jaringan | Tombol Selesai aktif kembali agar peserta dapat mencoba lagi |
| File impor bukan JSON atau tidak lolos validasi | Daftar kesalahan tampil di halaman impor, tidak ada data berubah |
| Kesalahan database saat impor | 500 dengan pesan bahwa tidak ada data yang berubah |
| `ADMIN_PASSWORD` belum diatur | Halaman admin menampilkan pesan admin belum aktif, login 503 |

## 11. Struktur kode

| Lokasi | Isi |
| --- | --- |
| `db/schema.sql`, `db/packs/*.json` | Skema dan file paket soal |
| `src/app/` | Halaman dan route API (App Router) |
| `src/components/` | TestRunner, QuestionImage, dan komponen admin (login, logout, hapus, impor) |
| `src/hooks/useCountdown.ts` | Hitung mundur berbasis jam sistem |
| `src/lib/queries.ts` | Seluruh query data dan penilaian |
| `src/lib/pack-schema.ts`, `pack-import.ts` | Validasi dan impor paket |
| `src/lib/admin-auth.ts`, `db.ts`, `types.ts` | Autentikasi, koneksi, tipe |
| `scripts/` | Migrasi, impor lewat terminal, dan generator soal berbasis Python dengan kunci terverifikasi kode |

## 12. Konfigurasi dan deployment

| Variabel | Fungsi |
| --- | --- |
| `DATABASE_URL` | Koneksi PostgreSQL (Neon: tambahkan `sslmode=require`) |
| `ADMIN_PASSWORD` | Password admin |
| `SESSION_SECRET` | Opsional, rahasia penanda sesi |

Langkah deploy: unggah kode ke GitHub, hubungkan ke Vercel, buat basis data di Neon, isi variabel lingkungan, jalankan `npm run db:migrate` sekali, lalu unggah paket soal lewat `/admin/import`. Langkah deploy ini belum diuji pada hosting sungguhan.

Menjalankan lokal: `npm install`, atur `.env.local`, `npm run db:migrate`, `npm run db:import`, lalu `npm run dev`.

## 13. Rencana pengujian

| Area | Pengujian | Hasil yang diharapkan |
| --- | --- | --- |
| Penilaian | Kirim semua jawaban sesuai kunci untuk tiap subtes | Skor sama dengan jumlah soal |
| Kerahasiaan | Periksa HTML halaman pengerjaan | Tidak memuat kunci jawaban atau pembahasan |
| Impor | Dry run lalu impor file paket | Ringkasan sesuai, data tersimpan hanya setelah impor |
| Impor ulang | Impor file yang sama dua kali | Tidak ada data ganda, soal diganti |
| Validasi | File dengan slug salah, SVG berbahaya, atau pilihan ganda | Ditolak dengan pesan jelas |
| Autentikasi | Akses `/api/admin/*` tanpa login | 401 |
| Timer | Biarkan waktu habis | Jawaban terkirim otomatis |
| MEMORY dan SPEED | Jalankan subtes WM dan PS | Gambar hilang setelah 5 detik, soal pindah otomatis |
| Ekspor | Ekspor lalu impor ulang | Isi sama dengan aslinya |

Pengujian di atas sudah dijalankan secara lokal untuk Astra Paket 1 dan 2 serta Paragon Paket 1 dan 2 (penilaian, kerahasiaan kunci, impor, dan tampilan soal gambar).

## 14. Rancangan perluasan ke penyelenggara dan jenis tes lain

Bagian ini memenuhi EX-01 sampai EX-09 pada SRS. Perubahan bersifat bertahap dan kompatibel mundur.

### 14.1 Menambah penyelenggara baru (sudah bisa sekarang)

1. Buat file paket dengan `company.slug` dan `company.name` yang baru (misalnya `cpns`), `package`, dan `subtests` berisi soal.
2. Impor lewat `/admin/import`. Penyelenggara, paket, subtes, dan soal dibuat otomatis.
3. Penyelenggara baru langsung tampil di beranda dan dapat dikerjakan.

Tidak ada perubahan kode, skema, atau deploy. Syaratnya subtes memakai tipe soal pilihan ganda yang sudah ada (TEXT, IMAGE, MEMORY, SPEED) dan penilaian biner.

### 14.2 Keterbatasan saat ini

| Keterbatasan | Dampak pada tes lain |
| --- | --- |
| Penilaian hanya biner (+1 atau 0) | Subtes berbobot per pilihan (contoh: karakteristik pribadi pada seleksi CPNS) belum dapat dinilai dengan benar |
| Tidak ada ambang batas kelulusan | Skor tidak dibandingkan dengan nilai minimal |
| Satu soal berdiri sendiri | Bacaan panjang yang dipakai banyak soal harus diulang pada tiap soal |
| Hanya pilihan ganda 2 sampai 5 opsi | Tes kepribadian berskala, Koran atau Pauli, dan menggambar belum didukung |
| Beranda berupa daftar datar | Tidak nyaman bila penyelenggara banyak |
| Subtes dikerjakan satu per satu | Belum ada simulasi paket penuh dengan skor gabungan |

### 14.3 Rancangan perubahan data (usulan)

Semua kolom baru bersifat opsional dengan nilai bawaan yang menjaga perilaku lama, sehingga file paket lama tetap valid (EX-08).

| Perubahan | Fungsi | Kebutuhan |
| --- | --- | --- |
| `companies.category` (teks, boleh kosong) | Pengelompokan di beranda: Swasta, BUMN, CPNS, dan seterusnya | EX-02 |
| `subtests.scoring_mode` (`BINARY` bawaan atau `WEIGHTED`) | Memilih cara menghitung skor | EX-03 |
| `questions.option_weights` (JSONB, boleh kosong) | Bobot tiap pilihan pada subtes berbobot. Bila kosong dipakai `correct_option` | EX-03 |
| `subtests.passing_score` (angka, boleh kosong) | Nilai minimal untuk lulus | EX-04 |
| Tabel `passages` dan `questions.passage_id` | Wacana atau gambar bersama untuk beberapa soal | EX-05 |
| Nilai `type` baru pada `questions` (misalnya `SCALE`) | Soal berskala untuk tes kepribadian | EX-06 |

Migrasi memakai `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pada `db/schema.sql` sehingga `npm run db:migrate` aman dijalankan ulang.

### 14.4 Dampak pada format file paket (usulan)

- `company.category?`: teks opsional.
- `subtests[].scoringMode?`: `BINARY` (bawaan) atau `WEIGHTED`.
- `subtests[].passingScore?`: angka opsional.
- `questions[].optionWeights?`: daftar angka sepanjang `options`, wajib bila `scoringMode` adalah `WEIGHTED`.
- `passages?` pada subtes dan `questions[].passage?` yang merujuk ke wacana.

Validator (`pack-schema.ts`) menolak kombinasi yang tidak konsisten, misalnya `WEIGHTED` tanpa `optionWeights`.

### 14.5 Dampak pada logika dan tampilan

| Bagian | Perubahan |
| --- | --- |
| Penilaian (`submitAttempt`) | Cabang berdasarkan `scoring_mode`. Biner seperti sekarang. Berbobot menjumlahkan bobot pilihan yang dipilih. Skor maksimum dihitung dari bobot tertinggi tiap soal dan disimpan agar halaman hasil dapat menampilkan skor per maksimum. |
| Halaman hasil | Menampilkan aturan nilai sesuai metode subtes, status lulus atau belum bila ada ambang batas. |
| Beranda | Pencarian nama dan filter kategori. |
| TestRunner | Menampilkan wacana bersama di atas soal terkait. Tipe soal baru memakai komponen tersendiri. |
| Simulasi paket penuh | Halaman baru yang menjalankan subtes berurutan dan menggabungkan skor. |
| Ekspor dan impor | Memuat bidang baru agar ekspor dapat diimpor kembali. |

### 14.6 Urutan pengerjaan yang disarankan

1. Tambah penyelenggara lain dengan pilihan ganda biner (tanpa perubahan kode).
2. Kategori dan pencarian di beranda.
3. Penilaian berbobot dan ambang batas kelulusan.
4. Wacana bersama.
5. Simulasi paket penuh.
6. Tipe soal khusus: kepribadian, Koran atau Pauli, menggambar.

### 14.7 Pengujian tambahan

| Pengujian | Hasil yang diharapkan |
| --- | --- |
| Impor file paket lama setelah migrasi | Berhasil dan perilaku tidak berubah |
| Subtes `WEIGHTED` dengan jawaban terbobot tertinggi semua | Skor sama dengan skor maksimum |
| `WEIGHTED` tanpa `optionWeights` | Ditolak oleh validator |
| Subtes dengan ambang batas | Hasil menampilkan lulus atau belum sesuai skor |
| Halaman soal pada subtes berbobot | Tidak memuat bobot atau kunci |
