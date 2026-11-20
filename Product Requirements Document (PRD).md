# Product Requirements Document (PRD)

**Aplikasi Latihan Psikotes** · Versi 1.0 · 20 November 2026 · Pemilik produk: Dya

## 1. Ringkasan

Aplikasi Latihan Psikotes adalah situs web untuk berlatih soal berbagai tes seleksi dengan kondisi yang mirip aslinya: ada batas waktu, penilaian otomatis, dan pembahasan tiap soal. Isi awalnya adalah psikotes Astra dan Paragon. Produk ini dirancang sebagai platform yang terus tumbuh: perusahaan lain, BUMN, dan seleksi CPNS akan ditambahkan bertahap tanpa membangun ulang situs.

Konten soal tidak ditulis lewat formulir. Soal dibuat sebagai satu file paket per perusahaan dan paket, lalu diimpor lewat halaman admin. Cara ini membuat penambahan soal cepat dan tidak perlu mengubah kode.

## 2. Latar belakang dan masalah

| Masalah | Dampak pada pencari kerja |
| --- | --- |
| Soal latihan tersebar di banyak sumber dan kualitasnya tidak seragam | Sulit berlatih terarah |
| Latihan tanpa batas waktu tidak mencerminkan tes sebenarnya | Peserta kaget dengan tekanan waktu |
| Tidak semua soal punya pembahasan | Peserta tidak tahu letak kesalahan |
| Tipe soal khusus (gambar, memori, kecepatan persepsi) jarang tersedia | Subtes ini jadi titik lemah |
| Format tes tiap penyelenggara berbeda | Peserta harus mencari latihan satu per satu |

## 3. Tujuan dan non-tujuan

### 3.1 Tujuan

- Peserta dapat berlatih subtes tertentu dengan timer dan mendapat skor serta pembahasan dalam hitungan menit.
- Struktur latihan meniru tes asli: subtes, durasi, dan aturan nilai.
- Menambah penyelenggara atau paket baru cukup dengan mengimpor satu file.
- Kunci jawaban benar dan tidak bocor sebelum peserta mengumpulkan.
- Mendukung tipe soal yang sulit dilatih di tempat lain: soal gambar, memori jangka pendek, dan kecepatan persepsi.

### 3.2 Non-tujuan (untuk saat ini)

- Bukan tes resmi dan tidak memprediksi hasil seleksi sungguhan.
- Tidak menyalin soal resmi atau soal berbayar milik pihak lain.
- Tidak menyediakan akun peserta, papan peringkat, atau pembayaran pada versi awal.
- Tidak ada editor soal berbasis formulir di admin.

## 4. Pengguna sasaran

| Persona | Kebutuhan | Cara memakai produk |
| --- | --- | --- |
| Pencari kerja atau magang (fresh graduate, mahasiswa tingkat akhir) | Berlatih psikotes perusahaan tertentu sebelum seleksi | Memilih perusahaan, paket, dan subtes, lalu mengerjakan dengan timer |
| Peserta seleksi CPNS (tahap berikutnya) | Berlatih tes seleksi dengan struktur dan penilaian khasnya | Sama, dengan subtes dan aturan nilai CPNS |
| Admin atau pembuat konten (Dya) | Menambah soal dengan cepat dan aman | Mengimpor file paket, memeriksa pratinjau, mengekspor atau menghapus |

### 4.1 Cerita pengguna utama

| ID | Sebagai | Saya ingin | Agar |
| --- | --- | --- | --- |
| US-01 | Peserta | melihat daftar perusahaan, paket, dan subtes | cepat menemukan latihan yang saya butuhkan |
| US-02 | Peserta | mengerjakan subtes dengan timer hitung mundur | merasakan tekanan waktu seperti tes asli |
| US-03 | Peserta | langsung melihat skor dan pembahasan setelah selesai | tahu letak kesalahan |
| US-04 | Peserta | berlatih soal memori dan kecepatan persepsi dengan perilaku seperti aslinya | melatih subtes yang paling menantang |
| US-05 | Admin | mengimpor satu file paket dan melihat pratinjau dulu | tidak merusak data yang sudah ada |
| US-06 | Admin | menambah perusahaan baru hanya dengan file baru | produk bisa berkembang tanpa ubah kode |
| US-07 | Admin | mengekspor atau menghapus paket | menjaga isi konten tetap rapi |
| US-08 | Peserta | mencari dan menyaring penyelenggara berdasarkan kategori | tetap mudah memakai situs saat pilihannya banyak (direncanakan) |
| US-09 | Peserta | mengerjakan seluruh subtes dalam satu paket berurutan dengan skor gabungan | mensimulasikan satu sesi tes penuh (direncanakan) |

## 5. Cakupan produk

### 5.1 Sudah tersedia (rilis 1.0)

| Fitur | Keterangan |
| --- | --- |
| Hierarki perusahaan, paket, subtes | Navigasi tiga tingkat |
| Pengerjaan dengan timer | Hitung mundur, kirim otomatis saat waktu habis, navigasi soal, pintasan keyboard |
| Empat tipe soal | Teks, gambar SVG, memori (gambar hilang setelah 5 detik), kecepatan persepsi (pindah otomatis) |
| Penilaian di server | Benar +1, salah atau kosong 0, tanpa pengurangan. Kunci tidak dikirim ke browser |
| Hasil dan pembahasan | Skor dan penjelasan per soal |
| CMS admin | Login, impor dengan pratinjau, ekspor, hapus paket atau subtes |
| Konten awal | Astra Paket 1 dan 2 (7 subtes kognitif, 90 soal per paket), Paragon Paket 1 dan 2 (verbal, numerik, spasial, 40 soal per paket) |

### 5.2 Rencana pengembangan

| Fitur | Nilai bagi pengguna | Prioritas |
| --- | --- | --- |
| Penyelenggara dan paket baru (perusahaan lain, BUMN, CPNS) dengan pilihan ganda biner | Cakupan latihan melebar tanpa perubahan kode | Tinggi |
| Kategori dan pencarian di beranda | Tetap mudah dipakai saat penyelenggara banyak | Tinggi |
| Penilaian berbobot per pilihan dan ambang batas kelulusan | Mendukung subtes yang bobot nilainya berbeda, misalnya karakteristik pribadi pada seleksi CPNS | Tinggi |
| Wacana atau gambar bersama untuk beberapa soal | Bacaan panjang tidak perlu diulang | Sedang |
| Simulasi paket penuh dengan skor gabungan | Pengalaman mirip hari tes | Sedang |
| Tes kepribadian berskala | Melengkapi psikotes perusahaan | Sedang |
| Koran atau Pauli dan tes menggambar | Mendukung tes Paragon yang butuh antarmuka khusus | Rendah |
| Akun peserta dan riwayat lintas perangkat | Melihat perkembangan dari waktu ke waktu | Rendah |
| Pembatasan percobaan login admin per IP | Memperkuat keamanan admin | Sedang |

Catatan CPNS: struktur seleksi CPNS (misalnya subtes TWK, TIU, dan TKP) dipakai sebagai arah pengembangan. Struktur, durasi, dan bobot resmi harus diperiksa dari sumber resmi pada saat paket dibuat.

## 6. Kebutuhan produk

Rincian teknis ada pada SRS (kebutuhan) dan FDS (rancangan). Ringkasan kebutuhan produk:

| ID | Kebutuhan | Rujukan |
| --- | --- | --- |
| PR-01 | Pengunjung dapat memulai latihan tanpa membuat akun. | SRS FR-01 sampai FR-03 |
| PR-02 | Timer berjalan akurat dan jawaban terkirim otomatis saat waktu habis. | SRS FR-05, NFR-08 |
| PR-03 | Penilaian dilakukan di server dan kunci jawaban tidak terlihat sebelum pengumpulan. | SRS FR-14, NFR-01 |
| PR-04 | Admin dapat menambah atau mengganti konten lewat file tanpa deploy ulang. | SRS FR-22 sampai FR-27 |
| PR-05 | Struktur data generik agar penyelenggara dan jenis tes baru dapat ditambahkan. | SRS bagian 9 (EX-01 sampai EX-09) |
| PR-06 | Setiap soal punya pembahasan dan kunci jawaban yang sudah diverifikasi. | SRS EX-09 |
| PR-07 | Format file paket kompatibel mundur pada setiap perubahan. | SRS EX-08 |

## 7. Kualitas konten

Kualitas soal adalah inti produk. Standar yang dipakai:

- Soal dibuat sendiri, bukan salinan soal resmi atau soal berbayar.
- Kunci jawaban diverifikasi dengan kode (soal hitungan dan pola dihitung ulang oleh skrip).
- Letak kunci jawaban diacak seimbang agar tidak bisa ditebak dari posisinya.
- Soal gambar dilihat langsung (visual) sebelum dikirim.
- Pembahasan menjelaskan alasan jawaban benar dan jebakan pada pilihan lain.
- Durasi subtes yang tidak diketahui dari sumber resmi diberi catatan sebagai perkiraan latihan.

## 8. Indikator keberhasilan

Produk ini belum punya pengguna publik, jadi target angka belum ditetapkan. Indikator yang akan diukur setelah dirilis dan angkanya ditentukan kemudian:

| Indikator | Cara mengukur | Alasan |
| --- | --- | --- |
| Jumlah subtes yang selesai dikerjakan | Tabel `attempts` dengan `finished_at` terisi | Menunjukkan pemakaian nyata |
| Pengerjaan ulang subtes yang sama | Beberapa `attempts` pada subtes yang sama | Menunjukkan latihan berulang |
| Waktu menambah satu paket baru | Dari file siap sampai tampil di situs | Menunjukkan kemudahan mengelola konten |
| Jumlah paket dan penyelenggara | Hitungan di dashboard admin | Menunjukkan pertumbuhan cakupan |
| Kesalahan kunci jawaban yang dilaporkan | Laporan pengguna atau temuan pemeriksaan | Menjaga kepercayaan pada konten |

## 9. Peta jalan

| Tahap | Isi | Status |
| --- | --- | --- |
| 1. Fondasi | Situs latihan, timer, penilaian server, CMS impor | Selesai |
| 2. Konten awal | Astra Paket 1 dan 2, Paragon Paket 1 dan 2 | Selesai |
| 3. Penyelenggara baru | Perusahaan lain dan CPNS dengan pilihan ganda biner, lewat file paket | Berikutnya |
| 4. Penataan beranda | Kategori dan pencarian | Direncanakan |
| 5. Penilaian lanjutan | Skor berbobot, ambang kelulusan, wacana bersama | Direncanakan |
| 6. Simulasi dan tipe khusus | Simulasi paket penuh, tes kepribadian, Koran atau Pauli, menggambar | Direncanakan |
| 7. Akun dan riwayat | Akun peserta dan perkembangan | Opsional |

Urutan dapat berubah menurut kebutuhan pengguna dan waktu pengembangan. Tidak ada tanggal rilis yang dijanjikan.

## 10. Risiko dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Soal dianggap meniru soal resmi | Semua soal dibuat sendiri dan tidak menyalin sumber berbayar atau resmi |
| Format tes resmi berubah atau berbeda dari asumsi | Durasi dan struktur diberi catatan perkiraan dan diperbarui dari sumber resmi |
| Kesalahan kunci jawaban merusak kepercayaan | Verifikasi kunci dengan kode dan pembahasan di setiap soal |
| Penilaian CPNS berbeda dari model biner | Rancangan penilaian berbobot dan ambang batas pada SRS bagian 9 dan FDS bagian 14 |
| Konten makin banyak dan sulit dicari | Kategori dan pencarian di beranda |
| Brute force pada login admin | Password panjang dan unik, rencana pembatasan percobaan per IP |
| Layanan hosting gratis memiliki batas | Pool koneksi dibatasi dan data soal dapat diekspor kapan saja |
| Langkah deploy belum diuji di hosting sungguhan | Menguji deploy ke Vercel dan Neon sebelum dipakai publik |

## 11. Asumsi dan pertanyaan terbuka

- Siapa yang akan memakai situs: hanya Dya atau dibuka untuk umum? Jawabannya memengaruhi kebutuhan akun, keamanan, dan hak cipta.
- Apakah situs akan gratis atau berbayar di kemudian hari?
- Seberapa mirip aturan nilai CPNS dengan model berbobot yang dirancang? Perlu diperiksa dari sumber resmi saat paketnya dibuat.
- Apakah nama aplikasi perlu diganti agar mencakup tes non-psikotes?
- Kapan dan di mana situs akan dideploy?

## 12. Dokumen terkait

- SRS Aplikasi Latihan Psikotes: kebutuhan perangkat lunak.
- FDS Aplikasi Latihan Psikotes: rancangan fungsional dan teknis.
