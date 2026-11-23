# Product Requirements Document (PRD)

**Aplikasi Latihan Psikotes & Materi Bahasa Inggris (e-assessment)** · Versi 1.2 · 23 November 2026 · Pemilik produk: Dya

## 1. Ringkasan

**e-assessment** adalah platform web mandiri untuk membantu pencari kerja dan mahasiswa mempersiapkan seleksi kerja/magang melalui dua pilar utama:

1. **Simulasi Psikotes:** latihan soal bertimer untuk berbagai penyelenggara (isi awal Astra dan Paragon, dapat diperluas ke BUMN/CPNS tanpa ubah kode), mencakup pilihan ganda kognitif (teks, SVG, memori 5 detik, kecepatan persepsi) serta subtes non-kuis (Kepribadian, Pauli/Koran, dan Menggambar), lengkap dengan penilaian server-side dan pembahasan terstruktur.
2. **Materi Bahasa Inggris:** kamus 1.000 kata inti (CEFR A1–C1), latihan hafalan flashcard berbasis sistem 5 kotak Leitner (*spaced repetition*), dan kuis kosakata 10 soal otomatis — dirancang modular agar topik berikutnya (Verb 1-2-3, Grammar, Merangkai Kata) tinggal menambah file data.

Seluruh konten soal, pembahasan, maupun kamus dikelola melalui **CMS Admin** berbasis unggah JSON (bukan formulir manual) dengan pratinjau dry-run, perlindungan anti-timpa tidak sengaja, dan audit log.

## 2. Latar Belakang dan Masalah

| Masalah | Dampak pada pencari kerja |
| --- | --- |
| Soal latihan tersebar dan kualitasnya tidak seragam | Sulit berlatih terarah sesuai format perusahaan |
| Latihan tanpa batas waktu tidak mencerminkan tes asli | Peserta kaget dengan tekanan waktu |
| Pembahasan sering tidak menjelaskan langkah & alasan opsi salah | Peserta mengulang kesalahan yang sama |
| Tipe soal khusus (gambar SVG, memori 5 detik, kecepatan, Pauli, kepribadian) jarang tersedia | Subtes ini menjadi titik lemah saat seleksi |
| Penguasaan kosakata bahasa Inggris sering lemah tanpa metode pengulangan terjadwal | Cepat lupa kata yang baru dibaca |

## 3. Tujuan dan Non-Tujuan

### 3.1 Tujuan
- Peserta dapat langsung berlatih psikotes dan bahasa Inggris tanpa hambatan registrasi akun.
- Simulasi meniru kondisi tes asli: timer akurat, navigasi keyboard, penilaian di server, dan pembahasan langkah demi langkah.
- Penambahan penyelenggara, paket, pembahasan, atau kosakata baru cukup lewat file JSON di CMS tanpa deploy ulang.
- Pengelolaan konten di CMS aman dari duplikasi file, penimpaan pembahasan rinci, atau reset riwayat peserta secara tidak sengaja.

### 3.2 Non-Tujuan (Saat Ini)
- Bukan tes resmi dan tidak berafiliasi dengan penyelenggara tes mana pun (Astra, Paragon, BUMN, CPNS).
- Tidak menyalin soal resmi atau materi berbayar pihak lain.
- Tidak menyediakan akun lintas perangkat, papan peringkat, pembayaran, atau editor soal berbasis formulir.

## 4. Pengguna Sasaran & Cerita Pengguna

| Persona | Kebutuhan | Cara memakai produk |
| --- | --- | --- |
| Pencari kerja / mahasiswa | Berlatih psikotes perusahaan & memperkuat kosakata bahasa Inggris | Memilih perusahaan/paket di `/` atau belajar kamus/flashcard/kuis di `/materi`, memantau progres di `/riwayat` & `/materi` |
| Admin / kurator konten (Dya) | Mengelola bank soal, pembahasan rinci, dan kamus dengan cepat dan aman | Mengimpor JSON lewat `/admin/import`, mengecek diff dry-run, memantau `/admin/audit`, serta edit/ekspor/hapus di `/admin` |

### Cerita Pengguna Utama

| ID | Sebagai | Saya ingin | Agar | Status |
| --- | --- | --- | --- | --- |
| US-01 | Peserta | melihat dashboard yang langsung mengarahkan ke latihan berikutnya dan melacak riwayat lokal | bisa fokus belajar tanpa bingung mulai dari mana | Tersedia |
| US-02 | Peserta | mengerjakan subtes kognitif (teks, SVG, memori, kecepatan) serta kepribadian, Pauli, dan gambar dengan timer | terbiasa dengan tekanan waktu dan ragam tes seleksi | Tersedia |
| US-03 | Peserta | melihat skor dan pembahasan langkah demi langkah termasuk alasan opsi salah | memahami pola soal dan tidak mengulang kesalahan | Tersedia |
| US-04 | Peserta | belajar 1.000 kata bahasa Inggris lewat kamus berfilter CEFR, flashcard Leitner 5 kotak, dan kuis 10 soal | hafalan kosakata bertahan jangka panjang | Tersedia |
| US-05 | Admin | memeriksa diff dry-run, deteksi duplikasi, dan spot-check sebelum menyimpan impor JSON | tidak menimpa pembahasan rinci atau merusak riwayat peserta secara tidak sengaja | Tersedia |
| US-06 | Admin | menyunting nama/deskripsi paket & subtes secara inline, mengunggah ulang kamus JSON, dan melihat Audit Log | pengelolaan konten cepat, rapi, dan terlacak | Tersedia |
| US-07 | Peserta | berlatih Verb 1-2-3, Grammar, dan Merangkai Kata di modul Materi | kemampuan bahasa Inggris lengkap di luar kosakata | Direncanakan |
| US-08 | Peserta | berlatih soal berbobot (mis. TKP CPNS) dan simulasi paket penuh dengan skor gabungan | persiapan seleksi CPNS & tes maraton lebih realistis | Direncanakan |

## 5. Cakupan Produk

### 5.1 Sudah Tersedia (Rilis 1.2)

| Area | Fitur Tersedia |
| --- | --- |
| **Dashboard & Navigasi Peserta** | Beranda Solid Cobalt dengan *Focus Hero Banner* 3-status, metrik progres lokal, kartu perusahaan 2-kolom (pratinjau 4 paket), sidebar responsif + mobile drawer, mode terang/gelap, dan halaman `/riwayat`. |
| **Mesin Tes Psikotes** | 4 ragam subtes (`QUIZ`, `PERSONALITY`, `PAULI`, `DRAWING`); 4 tipe soal kuis (`TEXT`, `IMAGE` SVG, `MEMORY` 5 detik, `SPEED` auto-advance); timer berbasis jam sistem; keyboard `1–5`/`A–E`; penilaian server-side tanpa kebocoran kunci. |
| **Pembahasan Rinci** | Halaman `/result/[attemptId]` menampilkan penjelasan, langkah pengerjaan (`steps`), catatan opsi salah (`wrongNotes`), dan `quickTip`. |
| **Materi Bahasa Inggris** | `/materi` (ringkasan 5 kotak Leitner & persentase per level A1–C1 + daftar topik), `/materi/kamus` (filter CEFR, filter POS, cari, paginasi 50/halaman), `/materi/kamus/belajar` (flashcard Leitner 1/2/4/8/16 hari, batas kata baru dapat diatur, keyboard `Spasi`/`1`/`2`), `/materi/kamus/kuis` (10 soal otomatis, pengecoh se-pos & se-level, rekap salah). |
| **CMS Admin & Keamanan** | Login cookie `httpOnly` HMAC-SHA256 + timing-safe + rate limit 5 gagal/menit per IP (`429`); metrik kelengkapan pembahasan khusus `QUIZ`; inline edit paket/subtes; ekspor JSON; hapus atomik; impor 2-fase (paket, `pembahasanSaja`, dan kamus Inggris) dengan SHA-256 hash, skip subtes identik, HTTP 409 force-gate, dan `/admin/audit`. |

### 5.2 Rencana Pengembangan Berikutnya

| Fitur | Nilai bagi pengguna | Prioritas |
| --- | --- | --- |
| Materi Inggris lanjutan: Verb 1-2-3, Grammar, Merangkai Kata | Melengkapi pembelajaran bahasa Inggris berbasis struktur `materi` yang sudah ada | Tinggi |
| Penyelenggara baru (BUMN, CPNS) & penilaian berbobot + ambang kelulusan | Mendukung tes seperti TKP CPNS yang bernilai 1–5 per opsi | Tinggi |
| Wacana / gambar bersama untuk beberapa soal (`passages`) | Bacaan panjang tidak perlu diulang di tiap butir soal | Sedang |
| Simulasi paket penuh berurutan dengan skor gabungan | Pengalaman mirip hari tes sesungguhnya | Sedang |
| Akun peserta opsional / sinkronisasi progres lintas perangkat | Progres psikotes & kotak Leitner tidak hilang saat ganti perangkat | Rendah |

## 6. Kualitas Konten & Indikator Keberhasilan

- **Standar konten:** soal dibuat mandiri (bukan salinan resmi), kunci diverifikasi dengan skrip, sebaran kunci seimbang, SVG diperiksa visual & disanitasi anti-XSS, dan setiap perubahan format JSON kompatibel mundur.
- **Indikator pemakaian:** jumlah `attempts` selesai, tingkat pengerjaan ulang subtes, jumlah kata masuk Kotak 4–5 pada `english_progress`, kelengkapan pembahasan rinci di dashboard admin, dan nol kesalahan kunci/regresi pada 52 automated tests.

## 7. Risiko dan Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Progres lokal hilang saat peserta membersihkan data browser | Disampaikan jelas sebagai latihan mandiri lokal; ID anonim di `localStorage` terpisah dari data server, siap di-upgrade ke akun bila diperlukan |
| Impor ulang menimpa pembahasan rinci atau mereset riwayat peserta | Dry-run 2-fase, canonical SHA-256 hash, skip subtes identik, spot-check, HTTP 409 force-gate, dan Audit Log |
| Brute force pada halaman login admin | Password panjang/acak + timing-safe + penundaan 800 ms + rate limit 5 gagal/menit per IP (`429`) |
| Kebocoran modul database server (`pg`) ke bundle client Next.js | Pemisahan ketat `src/types/` murni + Domain-First `src/lib/` + guardrail otomatis di `src/lib/architecture.test.ts` |

## 8. Dokumen Terkait

- [PROJECT.md](PROJECT.md) — Gambaran sistem & referensi teknis lengkap.
- [Software Requirements Specification (SRS).md](Software%20Requirements%20Specification%20(SRS).md) — Spesifikasi kebutuhan v1.2.
- [Functional Design Specification (FDS).md](Functional%20Design%20Specification%20(FDS).md) — Rancangan halaman, API, logika bisnis, dan basis data v1.2.
