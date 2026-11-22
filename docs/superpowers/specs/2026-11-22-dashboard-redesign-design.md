# Desain Redesign Dashboard & Kerangka Navigasi (`e-assessment`)

**Tanggal:** 22 November 2026  
**Status:** Disetujui  
**Pendekatan Terpilih:** Pendekatan 1 — *Clean Workspace Grid + Halaman `/riwayat` Terpisah* (**Varian 1A: Solid Cobalt Anchor**)

---

## 1. Maksud & Latar Belakang

Dashboard `e-assessment` saat ini berfungsi baik sebagai MVP, namun terasa generik seperti template admin standar: blok-blok putih seragam dengan border pudar, strip 4 angka mentah di atas, dan kolom katalog yang terhimpit karena berbagi ruang dengan daftar riwayat di sisi kanan.

Redesign ini mempertahankan identitas warna **putih dominan dengan aksen biru** dan **kerangka sidebar kiri**, namun merombak tata letak serta ketegasan visualnya agar:
- Peserta langsung melihat satu titik fokus jelas untuk melanjutkan atau memulai latihan.
- Katalog perusahaan dan paket tampil jauh lebih lapang (grid 2 kolom penuh) dan cepat dipindai saat konten berkembang (Astra, Paragon, serta rencana BUMN/CPNS).
- Sidebar kiri benar-benar bermakna karena memuat menu terpisah untuk meninjau riwayat & progres lokal (`/riwayat`), bukan sekadar mengulang daftar perusahaan.
- Tampilan terasa **tegas, bersih, dan berwibawa** seperti platform asesmen karier profesional, bukan pastel atau pudar.

---

## 2. Tujuan, Non-Tujuan, dan Anti-Tujuan

### Tujuan (Goals)
1. **Kerangka sidebar kiri lebih ramping dan tegas** (`LearnerShell.tsx`) dengan hierarki menu jelas (`Dashboard`, `Riwayat & Progres`, `Perusahaan`, ringkasan progres lokal, toggle tema, dan tautan `CMS Admin`).
2. **Beranda dashboard (`/`) tetap ringkas dan langsung ke aksi** (`LearnerDashboard.tsx`): pencarian cepat, satu *Solid Cobalt Focus Hero* yang menyatukan CTA *Lanjutkan Latihan* + ringkasan progres singkat + tautan ke `/riwayat`, diikuti grid katalog perusahaan 2 kolom penuh.
3. **Halaman `/riwayat` khusus** (`src/app/riwayat/page.tsx` + `HistoryProgressView.tsx`) untuk melihat metrik progres lokal, seluruh riwayat sesi tersimpan (termasuk perlakuan rapi untuk subtes non-kuis `PERSONALITY`, `PAULI`, dan `DRAWING`), tautan ke halaman hasil/pembahasan, serta aksi reset lokal 2 langkah.
4. **Identitas visual putih-biru lebih tegas** lewat kontras teks lebih pekat, border lebih tajam, radius sudut presisi, blok biru solid (`#1d4ed8` / `#1e3a8a`) sebagai jangkar fokus, dan tipografi heading yang lebih berani — sambil mempertahankan dukungan **Dark Mode** dengan kontras WCAG ≥ 4.5:1.

### Non-Tujuan (Non-Goals)
- Tidak mengubah skema database PostgreSQL maupun endpoint API yang ada.
- Tidak menambahkan sistem akun/login peserta (progres tetap tersimpan lokal via `localStorage` di `src/lib/local-progress.ts`).
- Tidak menambahkan kolom kategori perusahaan (Swasta/BUMN/CPNS) ke database maupun ke file paket JSON pada tahap ini.
- Tidak merombak halaman pengerjaan tes (`QuizRunner`, `PersonalityRunner`, `PauliRunner`, `DrawingRunner`), halaman hasil (`ResultReviewClient`), maupun halaman CMS Admin.

### Anti-Tujuan (Anti-Goals)
- **Jangan jadi penuh grafik analitik berat di beranda:** Beranda harus tetap cepat untuk memilih paket dan langsung mulai latihan.
- **Jangan memakai warna pastel pudar atau gradasi lembut yang melemahkan kontras:** Ketegasan datang dari putih bersih, border jelas, dan aksen biru solid.
- **Jangan merusak akurasi perhitungan yang sudah ada:** Subtes non-`QUIZ` (`PERSONALITY`, `PAULI`, `DRAWING`) tetap tidak boleh masuk hitungan total soal pilihan ganda maupun rata-rata persentase akurasi kuis.
- **Jangan memutus halaman detail paket/subtes:** `CompanyPackagesView.tsx`, `PackageSubtestsView.tsx`, dan `/result/[attemptId]` harus otomatis tampil selaras di dalam `LearnerShell` yang baru tanpa error atau regresi.

---

## 3. Batasan Teknis & Produk

- **Stack:** Next.js 16.4.6 (App Router, `force-dynamic`), React 19, Tailwind CSS v4 (`src/app/globals.css`), TypeScript, tanpa menambah library UI/ikon eksternal baru.
- **Sumber data:**
  - Katalog server-side dari `getCompanies()` dan `getDashboardCatalog()` di `src/lib/queries.ts`.
  - Progres peserta client-side dari `useLocalProgress()` di `src/lib/local-progress.ts` (maks. 24 `recentAttempts`, idempoten per `attemptId`).
- **Tipe subtes aktif:** `QUIZ`, `PERSONALITY`, `PAULI`, `DRAWING` (`SUBTEST_UNIT` dan `SUBTEST_KIND_LABEL` dari `src/lib/types.ts`).
- **Aksesibilitas & Responsif:** Kontras teks normal ≥ 4.5:1 di Light & Dark mode, navigasi keyboard + `:focus-visible` jelas, dialog drawer mobile dapat ditutup dengan `Escape`, mendukung `prefers-reduced-motion`, responsif dari 375px hingga 1440px+.
- **Tanpa ikon emoji:** Semua ikon menggunakan SVG vektor konsisten di `src/components/ui/Icons.tsx`.

---

## 4. Pendekatan yang Dipertimbangkan

Sebelum menetapkan rancangan ini, tiga pendekatan tata letak putih-biru dengan sidebar kiri dibandingkan:

| Pendekatan | Ringkasan Tata Letak | Tradeoff |
|---|---|---|
| **1. Clean Workspace Grid + Halaman `/riwayat` *(Dipilih — Varian 1A)*** | Sidebar kiri memuat `Dashboard`, `Riwayat & Progres` (`/riwayat`), dan daftar perusahaan. Beranda memadukan CTA *Lanjutkan Latihan* + ringkasan progres di satu hero banner atas, lalu katalog perusahaan tampil dalam grid 2 kolom penuh. | Menambah 1 rute `/riwayat` (memakai `useLocalProgress` yang sudah ada, nol perubahan DB/API); daftar riwayat lengkap diakses lewat 1 klik. |
| **2. Direct Package Cards + Compact Progress Card** | Sidebar abu tipis + area utama putih murni. Atas split 2 kartu (Lanjutkan + Card Progres ringkas dengan drawer riwayat), bawah tab filter perusahaan + grid 3 kartu paket langsung. | Tidak menambah rute baru, tetapi bagian atas beranda lebih padat dan struktur perusahaan di-flatten jadi tab. |
| **3. Refined Split-View (70% / 30%)** | Top bar pencarian & CTA, kiri katalog perusahaan 1 kolom (70%), kanan 1 sticky progress card (30%). | Perubahan kebiasaan paling kecil, tetapi daftar perusahaan tetap 1 kolom memanjang ke bawah. |

**Alasan Pilihan:** Pengguna memilih **Pendekatan 1** karena membuat beranda paling lega untuk memilih paket sekaligus memberi ruang tersendiri untuk progres/riwayat, lalu memilih **Varian 1A (Solid Cobalt Anchor)** agar tampilan lebih tegas dibanding gaya border tipis/pastel.

---

## 5. Spesifikasi Desain (Keputusan Terkunci)

### 5.1 Sistem Warna & Token Visual (`src/app/globals.css`)

Mempertahankan tema dominan putih & biru, dengan penajaman kontras border, teks, dan aksen biru solid (*Cobalt* + *Deep Navy*):

| Token CSS | Light Mode | Dark Mode | Penggunaan |
|---|---|---|---|
| `--bg-canvas` | `#f8fafc` | `#090e1a` | Latar area konten utama |
| `--bg-surface` | `#ffffff` | `#111827` | Permukaan kartu, sidebar, input |
| `--bg-subtle` | `#f1f5f9` | `#1e293b` | Header kartu beraksen tipis, chip netral, track progress bar |
| `--border-default` | `#d5dde8` | `#243044` | Pemisah baris internal dalam kartu |
| `--border-strong` | `#b8c4d4` | `#36465f` | Border luar kartu, sidebar, input pencarian (lebih tegas dari `#e2e8f0`) |
| `--text-primary` | `#0b1220` | `#f8fafc` | Heading bold & teks utama |
| `--text-secondary` | `#334155` | `#cbd5e1` | Deskripsi, subjudul, label sekunder |
| `--text-muted` | `#526075` | `#94a3b8` | Metadata durasi, tanggal, catatan kecil |
| `--accent` (`bg-brand`) | `#1d4ed8` | `#2563eb` | Hero banner solid, menu aktif sidebar, tombol utama, bar progres |
| `--accent-hover` | `#1e40af` | `#1d4ed8` | Hover tombol utama & elemen biru solid |
| `--accent-deep` (`bg-brand-deep`) | `#1e3a8a` | `#1d4ed8` | Monogram perusahaan solid (2 huruf) & kontras teks pada tombol putih di atas hero |
| `--accent-text` | `#1d4ed8` | `#60a5fa` | Tautan teks biru & angka progres |
| `--accent-soft` | `#eff6ff` | `rgba(59, 130, 246, 0.18)` | Chip biru & highlight ringan |

**Tipografi & Geometri:**
- Font tetap menggunakan `Inter` (`--font-sans`) + `JetBrains Mono` (`--font-mono`, `tabular-nums`) yang sudah terpasang di `src/app/layout.tsx` (tidak menambah beban font baru).
- Heading utama memakai bobot lebih tegas (`font-extrabold tracking-tight`), label grup sidebar `text-[11px] font-bold uppercase tracking-wider`.
- Radius sudut lebih presisi: `rounded-[10px]` untuk kartu & hero, `rounded-lg` (`8px`) untuk tombol, input, dan item sidebar, `rounded-[3px]` untuk progress bar (`h-1.5`).

### 5.2 Kerangka Navigasi (`src/components/layout/LearnerShell.tsx`)

- **Proporsi Layout:**
  - Sidebar desktop tetap di kiri dengan lebar `248px` (`lg:w-[248px]`, offset konten `lg:pl-[248px]`), permukaan putih (`bg-surface`), border kanan tegas (`border-r border-line-strong`).
  - Kontainer konten utama dilebarkan dari `max-w-5xl` menjadi `max-w-6xl` agar grid katalog 2 kolom di beranda terasa lapang pada layar desktop.
- **Struktur Sidebar (dari atas ke bawah):**
  1. **Brand Header** (dengan garis bawah pemisah): Kotak logo solid biru (`bg-brand text-white font-extrabold rounded-md`) + teks `e-assessment` bold.
  2. **Grup `MENU UTAMA`:**
     - `Dashboard` (`/`) dengan `IconDashboard`.
     - `Riwayat & Progres` (`/riwayat`) dengan `IconHistory` baru + badge angka jumlah sesi tersimpan (`progress.recentAttempts.length`, hanya tampil jika `> 0`).
     - State aktif memakai **blok biru solid** (`bg-brand text-white font-bold`, badge angka `bg-white/20 text-white`).
  3. **Grup `PERUSAHAAN`** (dengan total jumlah perusahaan):
     - Daftar setiap perusahaan menuju `/c/${company.slug}` dengan `IconBuilding` dan badge `packageCount`.
     - State aktif memakai blok biru solid yang sama saat berada di `/c/${slug}` atau sub-halamannya.
  4. **Footer Sidebar:**
     - **Kartu Progres Lokal Ringkas** (berbingkai border tegas `border-line-strong bg-subtle`): menampilkan label `Progres lokal`, rasio mono `{completedSubtestCount}/{totalSubtests}` (atau `{completedSubtestCount} subtes` bila `totalSubtests === 0`), serta bar progres biru `h-1.5`.
     - `ThemeToggle` (tetap penuh di sidebar, kompak di mobile topbar).
     - Baris utilitas bawah: tautan `CMS Admin` (`/admin`) dengan `IconShield` dan teks `Latihan mandiri`.
- **Mobile (`< lg`):** Sticky topbar `h-14` dengan tombol hamburger berborder tegas, logo `e-assessment`, dan `ThemeToggle compact`; drawer slide-in menutup via backdrop atau tombol `Escape`.
- **Data Denominator `totalSubtests`:** `getCompanies()` di `src/lib/queries.ts` ditambah satu sub-query `subtest_count` sehingga tipe `Company` memiliki `subtestCount: number`. `LearnerShell` menjumlahkan `companies.reduce((sum, c) => sum + c.subtestCount, 0)` sehingga rasio progres di sidebar akurat di seluruh 5 rute tanpa mengubah signature props `LearnerShell`.

### 5.3 Halaman Utama Dashboard (`src/components/dashboard/LearnerDashboard.tsx`)

Urutan blok dari atas ke bawah:

1. **Top Header + Pencarian Inline:**
   - Kiri: `<h1>` `Dashboard Latihan` (`text-2xl sm:text-[26px] font-extrabold tracking-tight`) + subjudul 1 baris singkat.
   - Kanan: Kotak pencarian `Cari perusahaan, paket, atau subtes...` (`w-full sm:w-72`, border `border-line-strong`, focus `border-brand ring-2 ring-brand/15`), hanya dirender bila `catalog.length > 0`.
2. **Solid Cobalt Focus Hero Banner** *(tampil jika `nextAction` tersedia)*:
   - Latar **biru solid tegas** (`bg-brand text-white rounded-[10px] shadow-[0_6px_18px_rgba(29,78,216,0.22)] dark:shadow-none`).
   - **Tiga state `computeNextAction` (progresi lintas paket otomatis):**
     1. **`resume` (`LANJUTKAN LATIHAN` / CTA `Lanjutkan →`):** Jika pengguna sudah punya riwayat (`recentAttempts[0]`), cari subtes berikutnya yang memiliki soal (`questionCount > 0`) dan belum selesai dengan urutan prioritas: (a) paket terakhir, lalu (b) paket lain dalam perusahaan yang sama, lalu (c) paket pada perusahaan lain di katalog. Tautan langsung ke `/test/{subtest.id}` dengan metadata subtes (`itemLabel` menggunakan `SUBTEST_UNIT[kind]`, `durationMinutes`).
     2. **`completed` (`SEMUA LATIHAN SELESAI` / CTA `Buka Paket →`):** Hanya muncul jika 100% subtes yang memiliki soal di seluruh katalog sudah selesai. Tautan mengarah ke paket terakhir (`/c/{company.slug}/{pkg.slug}`) dengan ringkasan tingkat paket (jumlah subtes & total estimasi menit).
     3. **`start` (`MULAI LATIHAN` / CTA `Mulai →`):** Jika pengguna belum punya riwayat sama sekali, arahkan ke paket pertama yang memiliki soal (`/c/{company.slug}/{pkg.slug}`) agar peserta melihat daftar subtes lebih dulu sebelum timer mulai berjalan *(keputusan desain: mencegah timer berjalan mendadak pada klik pertama pengguna baru)*.
   - **Bagian Kiri:**
     - Tag kecil uppercase semi-transparan (`bg-white/18 text-white`) sesuai state di atas.
     - Judul tegas: `{companyName} · {packageName}` (ditambah `— {subtestName}` untuk state `resume`).
     - Baris info 1 baris (teks `#dbeafe`): metadata subtes (`15 soal` / `45 pernyataan` / `10 kolom` / `2 tugas gambar` + durasi menit + timer otomatis) atau metadata paket untuk state `start`/`completed`.
   - **Bagian Kanan (responsif menumpuk rapi di mobile):**
     - **Ringkasan Progres Lokal** (dipisahkan garis vertikal `border-white/25` di desktop): label kecil `PROGRES LOKAL`, nilai mono bold `{completedSubtests}/{totalSubtests}` + `· {avgAccuracy}%` (bila ada nilai kuis), dan tautan teks `Buka Riwayat →` menuju `/riwayat`.
     - **Tombol CTA Utama Putih Kontras Tinggi:** `bg-white text-brand-deep font-bold hover:bg-blue-50` dengan label sesuai state.
3. **Katalog Perusahaan — Grid 2 Kolom Penuh (`grid gap-4 md:grid-cols-2 items-start`):**
   - Menghapus strip 4 KPI lama dan kolom riwayat kanan dari `/`.
   - **Batas & Pengurutan Paket per Kartu Perusahaan:**
     - Saat kotak pencarian **kosong**, setiap kartu perusahaan menampilkan **maksimal 4 paket** agar tinggi kartu di grid 2 kolom tetap seimbang.
     - Urutan prioritas paket dalam kartu: (1) paket yang **sedang dikerjakan** (`0 < doneSub < totalSub`), (2) paket yang **belum dimulai** (`doneSub === 0`), (3) paket yang **sudah lengkap** (`doneSub === totalSub && totalSub > 0`), dengan mempertahankan urutan katalog asli di dalam tiap kelompok.
     - Jika jumlah paket perusahaan `> 4` dan pencarian kosong, tampilkan baris footer `Lihat {hiddenCount} paket lainnya →` mengarah ke `/c/{company.slug}`.
     - Saat kotak pencarian **terisi**, batas 4 paket **dinonaktifkan (bypass)** sehingga seluruh paket yang cocok dengan kata kunci langsung terlihat.
   - Setiap **Kartu Perusahaan**:
     - Bingkai putih tegas (`rounded-[10px] border border-line-strong bg-surface shadow-[0_1px_3px_rgba(15,23,42,0.06)]`).
     - **Header Kartu** (`bg-subtle/70 border-b border-line px-4 py-3.5`):
       - **Monogram 2 Huruf Biru Tua Solid** (`h-9 w-9 rounded-lg bg-brand-deep text-white font-extrabold text-xs`): diambil secara deterministik dari nama perusahaan dengan mengabaikan prefiks badan usaha (`PT`, `CV`, `UD`, `TBK`) — ambil huruf pertama dari 2 kata signifikan pertama, atau 2 huruf awal jika hanya 1 kata signifikan *(keputusan desain)*.
       - Judul perusahaan (link ke `/c/{slug}`) + metadata 1 baris (`{packages.length} paket · {completed}/{total} subtes selesai`).
       - Tautan kanan `Semua ›` ke `/c/{slug}`.
     - **Daftar Paket di dalam Kartu** (`divide-y divide-line`):
       - Setiap baris mengarah ke `/c/{company.slug}/{pkg.slug}` dengan hover halus (`hover:bg-brand-soft/45`).
       - Kiri: Nama paket (`font-bold text-ink`), badge hijau `Lengkap` jika semua subtes selesai, baris bawah berisi chip jenis tes unik di paket tersebut (maks. 3 chip ringkas: `Kognitif` untuk `QUIZ`, `Kepribadian`, `Pauli`, `Menggambar` + estimasi `~{totalMinutes} mnt` dan jumlah soal kuis bila > 0).
       - Kanan: Rasio mono tegas `{doneSub}/{totalSub}` + progress bar `h-1.5 rounded-[3px]` berwarna biru solid (`bg-brand`).
   - **Empty States:**
     - Katalog kosong (`catalog.length === 0`): kartu berborder putus-putus dengan ikon `IconLayers`, penjelasan unggah JSON, dan tombol biru solid `Buka CMS Admin`.
     - Pencarian tidak cocok: kartu ringkas dengan pesan kata kunci + tombol `Reset pencarian`.

### 5.4 Halaman Baru `/riwayat` (`src/app/riwayat/page.tsx` & `src/components/dashboard/HistoryProgressView.tsx`)

- **Rute Server:** `src/app/riwayat/page.tsx` (`export const dynamic = "force-dynamic"`, metadata title `"Riwayat & Progres"`). Memuat `getCompanies()` dan `getDashboardCatalog()` secara paralel, membungkus `<HistoryProgressView catalog={catalog} />` di dalam `<LearnerShell companies={companies}>`.
- **Bagian Header:**
  - Judul `Riwayat & Progres Latihan` + subjudul `"Tersimpan lokal di browser ini tanpa akun. Klik sesi mana saja untuk membuka hasil dan pembahasan."`
  - Tombol `Reset Riwayat Lokal` di kanan atas (hanya tampil jika ada riwayat) menggunakan konfirmasi inline 2 langkah (`Hapus` / `Batal`) agar aman dari klik tak sengaja.
- **3 Kartu Ringkasan Progres (`grid gap-3.5 sm:grid-cols-3`):**
  1. `Subtes Selesai`: `{completedSubtests} / {totalSubtests}` + bar progres biru.
  2. `Rata-rata Skor Kuis`: `{avgAccuracy}%` (atau `—`) — hanya menghitung subtes dengan `kind === "QUIZ"` dan `totalQuestions > 0`.
  3. `Sesi Tersimpan`: `{recentAttempts.length} sesi` (dengan subteks singkat `"Hingga 24 sesi terakhir di perangkat ini"`).
- **Daftar Riwayat Lengkap:**
  - Menampilkan seluruh `progress.recentAttempts` (hingga 24 sesi) dalam satu kontainer kartu putih berborder tegas (`border-line-strong`), setiap baris mengarah ke `/result/{attemptId}`.
  - Lookup `subtestKind` dilakukan via `Map<number, DashboardSubtest>` dari `catalog` (fallback ke `QUIZ` bila subtes sudah dihapus dari katalog) sehingga data lama di `localStorage` tetap tampil benar:
    - `QUIZ`: badge `{score}/{totalQuestions} ({pct}%)` — hijau (`>= 75%`), kuning (`50–74%`), merah (`< 50%`).
    - `PERSONALITY`: badge biru `Profil Tersimpan`.
    - `PAULI`: badge biru `{score}/{totalQuestions} benar` (atau `Selesai` bila `totalQuestions === 0`).
    - `DRAWING`: badge biru `Gambar Tersimpan`.
  - **Empty State:** Kartu bersih dengan `IconHistory` / `IconClock`, pesan singkat belum ada riwayat pengerjaan, dan tombol biru solid `Mulai Latihan` menuju `/`.

### 5.5 Penyelarasan Halaman Sekunder

- `CompanyPackagesView.tsx` dan `PackageSubtestsView.tsx` tetap mempertahankan struktur utamanya, namun otomatis mewarisi token warna/border tegas dan lebar `max-w-6xl` dari `LearnerShell` serta `globals.css`. Dilakukan penyesuaian ringan pada ketebalan border kartu utama (`border-line-strong`) agar terasa satu bahasa visual dengan beranda.
- `src/components/ui/Icons.tsx`: Menambahkan `IconHistory` dengan gaya stroke `1.75` yang seragam.

---

## 6. Keputusan yang Diserahkan ke Implementor (Builder)

- Penamaan dan lokasi helper bersama (misalnya `src/lib/dashboard-stats.ts`) untuk menghitung statistik progres dan inisial monogram perusahaan agar tidak ada duplikasi antara `LearnerDashboard` dan `HistoryProgressView`, plus unit test kecil dengan `node:test` untuk helper murni tersebut.
- Penyesuaian detail padding/gap dalam skala 4/8px Tailwind agar sejajar rapi di breakpoint `375px`, `768px`, `1024px`, dan `1440px`.
- Penyetelan halus warna dark mode untuk badge status (hijau/kuning/merah/biru) selama kontras teks ≥ 4.5:1 tetap terpenuhi.
- Menambahkan `.superpowers/` ke `.gitignore` (atau membersihkan folder sementara `.superpowers/` setelah redesign selesai).
