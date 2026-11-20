# Software Requirements Specification (SRS)

**Aplikasi Latihan Psikotes** · Versi 1.0 · 19 November 2026 · Penyusun: Dya

## 1. Pendahuluan

### 1.1 Tujuan dokumen

Dokumen ini menjelaskan kebutuhan perangkat lunak untuk Aplikasi Latihan Psikotes, yaitu situs web untuk berlatih soal berbagai tes seleksi (psikotes perusahaan seperti Astra dan Paragon, serta tes seleksi lain seperti CPNS yang ditambahkan bertahap) dengan timer, penilaian otomatis, dan pembahasan. Dokumen dipakai sebagai acuan pengembangan, pengujian, dan pengelolaan konten soal.

### 1.2 Ruang lingkup

Aplikasi terdiri dari dua bagian:

- **Situs latihan (publik):** pengguna memilih perusahaan, paket, dan subtes, mengerjakan soal dengan batas waktu, lalu melihat skor dan pembahasan.
- **CMS admin (terlindungi password):** admin mengimpor paket soal dari file JSON, melihat isi database, mengekspor, dan menghapus paket atau subtes.

Soal tidak ditulis lewat formulir. Soal dibuat di luar aplikasi sebagai satu file JSON per paket, lalu diimpor lewat CMS tanpa perlu mengubah kode atau deploy ulang.

**Aplikasi dirancang sebagai platform yang terus berkembang.** Astra dan Paragon adalah isi awal, bukan batas cakupan. Penyelenggara lain (perusahaan swasta, BUMN, instansi pemerintah, seleksi CPNS) dan jenis tes baru akan ditambahkan dari waktu ke waktu. Karena itu hierarki perusahaan, paket, subtes, dan soal bersifat generik, dan penambahan penyelenggara baru dilakukan lewat file paket tanpa mengubah kode. Rencana perluasan diuraikan pada bagian 9.

### 1.3 Definisi dan singkatan

| Istilah | Arti |
| --- | --- |
| Perusahaan (company) | Penyelenggara tes, yaitu perusahaan atau instansi, misalnya Astra Group, Paragon, atau seleksi CPNS |
| Paket (package) | Kumpulan subtes milik satu perusahaan, misalnya Paket 1, Paket 2 |
| Subtes (subtest) | Satu jenis tes dengan batas waktu sendiri, misalnya QR atau Verbal |
| Soal (question) | Satu butir pertanyaan pilihan ganda dalam suatu subtes |
| Pengerjaan (attempt) | Satu kali sesi mengerjakan sebuah subtes |
| Slug | Pengenal singkat huruf kecil, angka, dan tanda hubung, dipakai pada URL dan file paket |
| QR, DR, RC, IR, VIZ, PS, WM | Quantitative, Deductive, Reading Comprehension, Inductive, Visualization, Perceptual Speed, Working Memory |
| SVG | Format gambar vektor yang dipakai untuk soal bergambar |
| CMS | Content Management System, di sini halaman admin |

### 1.4 Referensi

- Deskripsi format tes Astra International dan Paragon dari pemilik proyek.
- Dokumen pendamping: Functional Design Specification (FDS) Aplikasi Latihan Psikotes.
- README proyek (cara menjalankan, format paket soal, panduan deploy).

## 2. Deskripsi umum

### 2.1 Perspektif produk

Aplikasi berdiri sendiri (stand-alone), dibangun sebagai satu aplikasi Next.js full-stack dengan basis data PostgreSQL. Tidak ada integrasi dengan sistem pihak ketiga selain layanan hosting dan basis data saat deploy. Aplikasi ini adalah alat latihan mandiri dan tidak berafiliasi dengan penyelenggara tes mana pun, termasuk Astra, Paragon, maupun instansi penyelenggara seleksi CPNS.

### 2.2 Fungsi utama

- Menampilkan hierarki perusahaan, paket, dan subtes.
- Menjalankan subtes dengan timer hitung mundur dan pengiriman otomatis saat waktu habis.
- Mendukung empat tipe soal: teks, gambar SVG, memori (gambar hilang setelah 5 detik), dan kecepatan persepsi (pindah otomatis setelah memilih).
- Menilai jawaban di server dan menampilkan skor serta pembahasan.
- Mengelola paket soal lewat CMS: impor dengan pratinjau, ekspor, hapus.

### 2.3 Karakteristik pengguna

| Pengguna | Deskripsi | Hak akses |
| --- | --- | --- |
| Peserta latihan | Pencari kerja atau mahasiswa yang berlatih. Tidak perlu akun. | Halaman publik saja |
| Admin | Pemilik situs, mengelola konten soal. | Halaman publik dan CMS (password) |

### 2.4 Batasan

- Pilihan teknologi: Next.js (App Router), TypeScript, Tailwind CSS, PostgreSQL lewat library `pg` (tanpa ORM).
- Hosting yang direncanakan: Vercel untuk aplikasi dan Neon untuk PostgreSQL.
- Konten soal dibuat sendiri dan bukan salinan soal resmi. Durasi subtes adalah perkiraan untuk latihan.
- Satu admin dengan satu password, tanpa manajemen pengguna.

### 2.5 Asumsi dan ketergantungan

- Variabel lingkungan `DATABASE_URL` dan `ADMIN_PASSWORD` diatur di server.
- Skema basis data dibuat dengan `npm run db:migrate` sebelum pemakaian pertama.
- Peserta memakai browser modern dengan JavaScript aktif.

## 3. Kebutuhan fungsional

Prioritas: **W** = wajib, **S** = sebaiknya ada.

### 3.1 Situs latihan (publik)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-01 | Sistem menampilkan daftar perusahaan pada halaman utama. | W |
| FR-02 | Sistem menampilkan daftar paket milik perusahaan yang dipilih. | W |
| FR-03 | Sistem menampilkan daftar subtes pada paket beserta jumlah soal dan durasinya, dengan tombol mulai. | W |
| FR-04 | Sistem menampilkan satu soal per layar berisi teks soal, gambar (bila ada), dan pilihan jawaban. | W |
| FR-05 | Sistem menampilkan timer hitung mundur dan mengirim jawaban otomatis saat waktu habis. | W |
| FR-06 | Peserta dapat memilih jawaban, berpindah ke soal sebelumnya atau berikutnya, dan melompat ke nomor soal tertentu. | W |
| FR-07 | Peserta dapat memilih jawaban dengan keyboard (tombol 1-5 atau huruf A-E). | S |
| FR-08 | Pada soal bertipe MEMORY, gambar disembunyikan setelah 5 detik dan tidak tampil lagi. | W |
| FR-09 | Pada soal bertipe SPEED, sistem langsung pindah ke soal berikutnya setelah peserta memilih jawaban. | W |
| FR-10 | Peserta dapat mengakhiri subtes sebelum waktu habis dengan tombol Selesai. | W |
| FR-11 | Sistem menilai jawaban di server: benar +1, salah atau kosong 0, tanpa pengurangan nilai. | W |
| FR-12 | Sistem menampilkan halaman hasil berisi skor, jumlah soal, dan pembahasan per soal (jawaban peserta, jawaban benar, penjelasan). | W |
| FR-13 | Halaman hasil menyediakan tautan kembali ke daftar subtes pada paket yang sama. | S |
| FR-14 | Kunci jawaban dan pembahasan tidak boleh dikirim ke browser sebelum subtes dikumpulkan. | W |

### 3.2 CMS admin

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-20 | Admin masuk dengan password yang diatur lewat variabel lingkungan. Bila belum diatur, halaman admin menampilkan pesan bahwa admin belum aktif. | W |
| FR-21 | Sistem membuat sesi admin yang berlaku 7 hari dan admin dapat keluar (logout). | W |
| FR-22 | Admin dapat memilih file `.json` atau menempelkan isi JSON paket soal. | W |
| FR-23 | Tombol Periksa dulu memvalidasi file dan menampilkan pratinjau tanpa menyimpan: status perusahaan, paket, tiap subtes (baru atau soal lama diganti), jumlah soal, durasi. | W |
| FR-24 | Bila validasi gagal, sistem menampilkan daftar kesalahan yang jelas (maksimal 30). | W |
| FR-25 | Tombol Impor sekarang menyimpan paket. Perusahaan, paket, dan subtes dengan slug yang sama diperbarui, dan soal pada subtes yang sama diganti seluruhnya. | W |
| FR-26 | Impor bersifat atomik: bila gagal di tengah jalan, tidak ada data yang berubah. | W |
| FR-27 | Subtes lain pada paket yang sama tidak berubah saat impor, sehingga satu file dapat menambah subtes ke paket yang sudah ada. | W |
| FR-28 | Pratinjau memperingatkan jumlah riwayat pengerjaan yang akan kehilangan detail jawaban karena soal diganti. | S |
| FR-29 | Dashboard admin menampilkan seluruh perusahaan, paket, subtes, jumlah soal, dan durasi. | W |
| FR-30 | Admin dapat mengekspor paket ke file JSON dengan format yang sama dengan format impor. | S |
| FR-31 | Admin dapat menghapus satu paket atau satu subtes dengan konfirmasi. Bila paket terakhir sebuah perusahaan dihapus, perusahaan ikut terhapus. | W |
| FR-32 | Admin dapat mengunduh contoh format paket. | S |

### 3.3 Aturan validasi paket soal

| ID | Aturan |
| --- | --- |
| VR-01 | Slug perusahaan, paket, dan subtes hanya huruf kecil, angka, dan tanda hubung (contoh: `paket-2`). |
| VR-02 | Durasi subtes antara 10 dan 10.800 detik. |
| VR-03 | Setiap soal memiliki 2 sampai 5 pilihan yang unik, indeks jawaban benar yang valid, teks soal, dan penjelasan. |
| VR-04 | Soal bertipe IMAGE dan MEMORY wajib memiliki `imageSvg`. |
| VR-05 | SVG ditolak bila mengandung `script`, `foreignObject`, `iframe`, `embed`, `object`, atribut `on...=`, `javascript:`, atau `data:text/html`. |
| VR-06 | Ukuran file maksimal 8 MB dan harus berupa JSON yang valid. |

## 4. Kebutuhan antarmuka eksternal

### 4.1 Antarmuka pengguna

- Berbahasa Indonesia, responsif untuk layar ponsel sampai desktop, mendukung mode gelap mengikuti pengaturan perangkat.
- Soal gambar ditampilkan dari SVG sebagai bagian halaman. Pilihan jawaban pada soal bergambar berlabel "Gambar A" sampai "Gambar E".
- Timer selalu terlihat selama subtes berjalan.

### 4.2 Antarmuka perangkat lunak

- PostgreSQL (disarankan Neon dengan `sslmode=require`) lewat koneksi `DATABASE_URL`.
- Platform hosting Node.js (Vercel). Tidak ada API pihak ketiga.

### 4.3 Antarmuka data

File paket soal berformat JSON (lihat FDS bagian format paket) dengan satu file untuk satu paket milik satu perusahaan.

## 5. Kebutuhan nonfungsional

| ID | Kategori | Kebutuhan |
| --- | --- | --- |
| NFR-01 | Keamanan | Penilaian dilakukan di server. Kunci jawaban tidak pernah dikirim ke klien sebelum pengumpulan. |
| NFR-02 | Keamanan | Seluruh endpoint admin menolak permintaan tanpa sesi admin yang valid (HTTP 401). |
| NFR-03 | Keamanan | Cookie sesi admin bersifat httpOnly, sameSite lax, dan secure pada produksi. Token diturunkan dari password sehingga mengganti password mengeluarkan semua sesi. |
| NFR-04 | Keamanan | Perbandingan password berwaktu konstan dan login gagal ditunda sekitar 800 ms untuk memperlambat tebakan. |
| NFR-05 | Keamanan | Query basis data memakai parameter (tanpa penyambungan string) untuk mencegah SQL injection. |
| NFR-06 | Keamanan | SVG dari file impor disaring sesuai VR-05 untuk mencegah XSS. |
| NFR-07 | Keandalan | Impor dan pengiriman jawaban berjalan dalam transaksi basis data. |
| NFR-08 | Akurasi timer | Hitung mundur berbasis jam sistem, bukan jumlah tick, agar tidak melambat saat tab tidak aktif. |
| NFR-09 | Kinerja | Halaman soal tampil kurang dari 2 detik pada koneksi normal. Pool koneksi basis data dibatasi 5 koneksi. |
| NFR-10 | Portabilitas | Dapat dijalankan lokal dengan Node.js dan PostgreSQL, dan dideploy ke Vercel dengan Neon. |
| NFR-11 | Pemeliharaan | Kode berbahasa TypeScript dengan lint yang lulus. Penambahan soal tidak memerlukan perubahan kode. |
| NFR-12 | Kegunaan | Dapat dioperasikan dengan keyboard dan memiliki label aksesibilitas pada gambar soal. |
| NFR-13 | Privasi | Aplikasi tidak meminta akun atau data pribadi peserta. |

## 6. Model data tingkat tinggi

| Entitas | Hubungan | Keterangan |
| --- | --- | --- |
| companies | 1 perusahaan memiliki banyak paket | slug unik |
| test\_packages | 1 paket memiliki banyak subtes | slug unik per perusahaan |
| subtests | 1 subtes memiliki banyak soal dan pengerjaan | durasi dan urutan, slug unik per paket |
| questions | milik satu subtes | tipe, teks, SVG, pilihan, kunci, penjelasan |
| attempts | milik satu subtes | waktu mulai dan selesai, skor, total soal |
| answers | milik satu pengerjaan dan satu soal | pilihan peserta dan status benar atau salah |

Penghapusan bersifat berjenjang (cascade): menghapus paket menghapus subtes, soal, pengerjaan, dan jawabannya.

## 7. Di luar cakupan versi 1.0

- Tes kepribadian Astra.
- Tes Koran atau Pauli dan tes menggambar Paragon (membutuhkan antarmuka khusus).
- Akun peserta, riwayat lintas perangkat, papan peringkat.
- Pembatasan percobaan login per alamat IP.
- Editor soal lewat formulir di CMS.

## 8. Kriteria penerimaan

- Peserta dapat menyelesaikan satu subtes dari pilih perusahaan sampai melihat skor dan pembahasan.
- Skor sama dengan jumlah jawaban benar, dan jawaban kosong atau salah bernilai 0.
- Halaman soal tidak memuat kunci jawaban pada HTML atau respons yang dikirim ke browser.
- Admin dapat mengimpor, mengekspor, dan menghapus paket, dan impor yang gagal tidak mengubah data.
- File paket yang diimpor dua kali tidak menggandakan data.

## 9. Rencana perluasan: penyelenggara dan jenis tes lain

Bagian ini menetapkan kebutuhan agar aplikasi dapat berkembang melampaui Astra dan Paragon, misalnya ke perusahaan lain dan seleksi CPNS. Struktur seleksi CPNS (misalnya subtes TWK, TIU, dan TKP) dipakai sebagai contoh arah pengembangan. Struktur, durasi, dan bobot nilai resminya harus diperiksa dari sumber resmi pada saat paketnya dibuat.

| ID | Kebutuhan | Status |
| --- | --- | --- |
| EX-01 | Penyelenggara baru (perusahaan, BUMN, instansi, CPNS) dapat ditambahkan hanya dengan mengimpor file paket baru. Perusahaan baru dibuat otomatis dari slug pada file dan langsung tampil di beranda. | Sudah didukung |
| EX-02 | Beranda tetap mudah dipakai saat penyelenggara banyak: ada pencarian dan pengelompokan berdasarkan kategori (misalnya Swasta, BUMN, CPNS). | Direncanakan |
| EX-03 | Metode penilaian dapat dipilih per subtes: biner (benar +1, salah 0, seperti sekarang) atau berbobot per pilihan (misalnya soal karakteristik pribadi yang tiap pilihannya bernilai 1 sampai 5). | Direncanakan |
| EX-04 | Ambang batas kelulusan opsional per subtes atau paket, ditampilkan pada halaman hasil. | Direncanakan |
| EX-05 | Satu wacana atau gambar dapat dipakai bersama oleh beberapa soal. | Direncanakan |
| EX-06 | Tipe soal khusus: tes kepribadian berskala, Koran atau Pauli, dan menggambar. | Direncanakan |
| EX-07 | Mode simulasi paket penuh: mengerjakan seluruh subtes berurutan dan melihat skor gabungan. | Direncanakan |
| EX-08 | Setiap perubahan format file paket kompatibel mundur: bidang baru bersifat opsional sehingga file lama tetap dapat diimpor. | Wajib |
| EX-09 | Setiap paket baru lolos verifikasi yang sama: kunci jawaban diperiksa, sebaran kunci seimbang, dan soal gambar dilihat sebelum dipublikasikan. | Wajib |

### 9.1 Dampak pada kebutuhan yang ada

- Penilaian +1 benar, 0 salah atau kosong (FR-11) berlaku untuk semua subtes sampai EX-03 tersedia. Pada subtes berbobot, aturan nilainya ditampilkan pada halaman hasil sesuai metode subtes tersebut.
- Nama aplikasi bersifat sementara. Bila cakupan melebar ke tes non-psikotes, nama dan teks antarmuka dapat disesuaikan tanpa mengubah struktur data.
- Hak cipta: soal dibuat sendiri dan tidak menyalin soal resmi atau soal berbayar milik pihak lain.
