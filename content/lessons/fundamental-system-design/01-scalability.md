---
slug: scalability
title: "Scalability (Skalabilitas Sistem)"
track: system-design
chapter: "Fundamental System Design"
level: pemula
order: 8
prerequisites: []
estimated_minutes: 14
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Scalability"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/scalability"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan ke Bahasa Indonesia mengikuti struktur Heading 1, 2, 3 asli beserta keterangan diagram."
---

# Scalability

## Apa Itu Skalabilitas? (What Scalability Means)

**Skalabilitas (*scalability*)** adalah kemampuan sebuah sistem untuk menangani beban kerja (*workload*) yang terus bertumbuh dengan cara menambahkan sumber daya (*resources*). Sistem yang skalabel tetap bekerja dengan baik seiring bertambahnya jumlah pengguna, permintaan, dan ukuran data.

Beban kerja dapat bertumbuh dalam beberapa dimensi:
- **Lebih banyak permintaan (*requests*).** Trafik biasanya diukur dalam *requests per second* (RPS), yaitu jumlah permintaan yang diterima sistem setiap detiknya.
- **Lebih banyak data.** Ukuran database tumbuh dari 10 GB menjadi 10 TB.
- **Lebih banyak pengguna di berbagai lokasi.** Pengguna di Jakarta, Chennai, maupun London sama-sama mengharapkan respons yang cepat.

Contoh sederhana: satu server aplikasi sanggup menangani **500 RPS**. Saat jam sibuk (*peak time*), situs menerima **2.000 RPS**. Jika sistem dirancang skalabel, empat server dapat menangani lonjakan tersebut dengan lancar.

**Skalabilitas tidak sama dengan kecepatan (*speed*).** Performa (*performance*) adalah seberapa cepat sistem menjawab satu permintaan. Skalabilitas adalah apakah sistem **tetap cepat** ketika jumlah permintaan melonjak drastis. Sebuah sistem bisa menjawab satu pengguna dalam 50 ms, tetapi gagal total ketika 10.000 pengguna datang bersamaan.

Ada dua cara untuk menambahkan sumber daya: memperbesar satu mesin, atau menambah jumlah mesin.

## Vertical Scaling

**Vertical scaling** (disebut juga *scaling up*) berarti meningkatkan kapasitas **satu mesin** dengan meng-upgrade perangkat kerasnya—menambah core CPU, kapasitas RAM, atau penyimpanan.

Misalnya, sebuah server database memiliki 8 core CPU dan 32 GB RAM. Tim memindahkannya ke mesin berkapasitas 64 core dan 512 GB RAM. Mesin tunggal tersebut kini sanggup menampung beban jauh lebih besar. Ini adalah cara paling umum untuk memperbesar database relasional seperti MySQL.

### Kelebihan Vertical Scaling
- **Sederhana:** Kode aplikasi umumnya tidak perlu diubah sama sekali.
- **Mudah dikelola:** Tetap hanya ada satu mesin untuk dijalankan, dipantau, dan di-*backup*.
- **Konsistensi langsung:** Semua data berada di satu tempat, sehingga setiap pembacaan selalu melihat tulisan terbaru.

### Batasan Keras Vertical Scaling
- **Ada batas atas fisik:** Anda tidak bisa membeli mesin yang lebih besar daripada spesifikasi mesin terbesar yang tersedia di pasaran.
- **Biaya melonjak tidak linear:** Mesin berspesifikasi tertinggi sangat mahal; harganya naik jauh lebih cepat dibanding tambahan kapasitasnya.
- **Membutuhkan *downtime* saat upgrade:** Mesin biasanya harus dimatikan dan dimulai ulang di perangkat keras baru.
- **Single point of failure:** Tetap hanya satu mesin—jika rusak, seluruh layanan ikut berhenti.

## Horizontal Scaling

**Horizontal scaling** (disebut juga *scaling out*) berarti **menambahkan lebih banyak mesin** (disebut *nodes*) sehingga beban kerja tersebar merata di antara semuanya. Sebuah **load balancer** berdiri di depan node-node tersebut untuk membagikan setiap permintaan yang masuk.

### Kelebihan Horizontal Scaling
- **Tanpa batas tetap:** Anda dapat terus menambahkan mesin baru sesuai pertumbuhan trafik.
- **Tambah kapasitas tanpa *downtime*:** Mesin baru bisa langsung bergabung ke dalam **server pool** saat sistem sedang berjalan.
- **Hemat biaya pada trafik naik-turun:** Anda dapat menambah mesin saat hari promo dan mematikannya kembali sesudahnya.
- **Tahan kegagalan tunggal:** Jika satu mesin rusak, mesin lainnya tetap melayani pengguna.

Database NoSQL seperti **Cassandra** dan **MongoDB** memang dirancang sejak awal untuk *scale out*. Namun database relasional juga bisa: **Vitess** membagi MySQL ke banyak server, **Citus** melakukan hal serupa untuk PostgreSQL, sedangkan **CockroachDB**, **Google Spanner**, dan **YugabyteDB** adalah database SQL terdistribusi sejak awal. Konsekuensinya sama di semua kasus: saat baris data terkait tinggal di mesin berbeda, operasi `JOIN` atau **transaction** lintas mesin menjadi lebih lambat dan lebih rumit.

Horizontal scaling juga membawa biaya tambahan: lebih banyak mesin untuk di-deploy dan dipantau, komunikasi antar-mesin lewat jaringan menambah latensi dan peluang error, serta aplikasi harus dirancang agar mesin mana pun bisa melayani request apa pun.

![Gambar 1: Dua cara menambah kapasitas sistem — Vertical scaling (scaling up) memperbesar satu server dari 8 core/32 GB menjadi 64 core/512 GB namun tetap satu mesin, sedangkan Horizontal scaling (scaling out) menambahkan beberapa node di belakang load balancer secara dinamis tanpa downtime.](/images/belajar/fundamental-system-design/image1.png)

| Aspek | Vertical (Scaling Up) | Horizontal (Scaling Out) |
| :--- | :--- | :--- |
| **Yang berubah** | Ukuran spesifikasi satu mesin | Jumlah mesin (*nodes*) |
| **Batas atas** | Mesin terbesar yang tersedia | Tidak ada batas tetap |
| **Menambah kapasitas** | Biasanya butuh *downtime* | Tambah node saat sistem berjalan |
| **Jika satu mesin rusak** | Semua layanan di atasnya mati | Mesin lainnya tetap beroperasi |
| **Perubahan kode** | Umumnya tidak ada | Aplikasi harus dirancang *stateless* |
| **Contoh** | Satu server MySQL / PostgreSQL besar | Cassandra, MongoDB, MySQL + Vitess |

Sebagian besar sistem nyata memakai keduanya. Tim biasanya mulai dari *scale up* karena sederhana, lalu beralih ke *scale out* saat menyentuh batas satu mesin atau membutuhkan ketahanan tinggi. Beberapa beban kerja bahkan menggabungkan keduanya sekaligus (**diagonal scaling**)—misalnya layanan *encoding* video yang memakai mesin besar agar satu video cepat selesai (*scale up*) sekaligus menambah jumlah mesin besar tersebut saat unggahan meningkat (*scale out*).

## Stateless Servers

**Horizontal scaling** hanya dapat bekerja dengan baik apabila **server mana pun dapat menangani request apa pun**. Penghalang utama hal ini adalah **state**.

*State* adalah data yang diingat server di antara dua request, seperti sesi login atau keranjang belanja pengguna. Server yang menyimpan data tersebut di dalam memori RAM-nya sendiri disebut **stateful**.

Masalahnya: pengguna menambahkan ponsel ke keranjang dan load balancer mengirim request itu ke **Server A** (yang menyimpannya di memori lokal). Request berikutnya dikirim ke **Server B** yang tidak tahu apa-apa soal keranjang tersebut—pengguna pun melihat keranjang kosong.

Solusinya adalah **mengeluarkan state dari server aplikasi**. Seluruh server menyimpan sesi dan keranjang belanja di satu penyimpanan bersama (*shared session store*) seperti **Redis** atau database. Server yang tidak menyimpan data pengguna di memorinya sendiri disebut **stateless**. Kini load balancer bebas mengirim request ke server mana pun, dan menambah server baru tinggal menyalakannya lalu mendaftarkannya ke load balancer.

![Gambar 2: Mengapa scaling out membutuhkan server stateless — Pada server stateful (kiri), keranjang belanja hanya tersimpan di memori Server A sehingga request ke Server B melihat keranjang kosong; pada server stateless (kanan), Server A dan Server B membaca/menulis ke Shared session store (Redis/database) yang sama.](/images/belajar/fundamental-system-design/image2.png)

Meskipun **sticky sessions** bisa memaksa pengguna selalu kembali ke server yang sama, cara itu hanya menyembunyikan masalah, bukan menyelesaikannya—jika server tersebut mati, sesi pengguna tetap hilang dan pembagian beban menjadi tidak merata.

## Menskalakan Database (Scaling the Database)

Server aplikasi *stateless* mudah diskalakan. Sebaliknya, **database** jauh lebih sulit diskalakan karena seluruh *state* kini berkumpul di sana, sehingga database sering menjadi **bottleneck** utama sistem.

Tim engineering biasanya menskalakan database secara bertahap, mulai dari langkah paling sederhana:

1. **Tambahkan Cache:** Gunakan penyimpanan cepat di memori seperti **Redis** untuk menyimpan data yang paling sering dibaca. Jika 80% permintaan baca menanyakan barang populer yang sama, **cache** langsung menjawabnya sehingga database hanya menangani 20% sisanya.
2. **Tambahkan Read Replicas:** *Read replica* adalah salinan database yang khusus melayani permintaan baca (*reads*). Database utama (*primary*) menerima seluruh operasi tulis (*writes*) lalu menyalinnya ke replika. Langkah ini sangat efektif pada aplikasi yang jauh lebih banyak membaca daripada menulis, dengan catatan replika bisa sedikit tertinggal beberapa milidetik/detik dari *primary*.
3. **Pecah Data ke Beberapa Shard (Sharding):** Ketika beban tulis (*writes*) atau volume data sudah melampaui kapasitas satu mesin, data dipecah melintasi beberapa server database. Setiap potongan disebut **shard** (*sharding* / *horizontal partitioning*)—misal pengguna ber-ID 1–1.000.000 masuk ke Shard 1 dan satu juta berikutnya ke Shard 2. Setiap shard punya struktur tabel yang sama dengan baris berbeda, serta dapat memiliki *primary* dan *read replicas* sendiri. *(Memisahkan tabel berbeda ke database berbeda—misal tabel pesanan dan inventaris terpisah—disebut vertical/functional partitioning).*

**Sharding** membawa kompleksitas terbesar (query lintas shard lebih lambat, pemindahan data saat menambah shard rumit), sehingga hanya diterapkan bila langkah 1 dan 2 sudah tidak cukup.

![Gambar 3: Tahapan menskalakan database langkah demi langkah — Mulai dari satu database, lalu (1) tambahkan cache untuk bacaan berulang, (2) tambahkan read replicas untuk membagi beban baca, dan (3) sharding jika beban tulis dan ukuran data melampaui satu mesin. Berhenti di langkah paling sederhana yang sudah menyelesaikan masalah.](/images/belajar/fundamental-system-design/image3.png)

## Cara Lain untuk Menskalakan Sistem (Other Ways to Scale)

- **Content Delivery Network (CDN):** Jaringan server di banyak kota yang menyimpan salinan berkas statis (gambar, video, skrip JS/CSS). Pengguna mengunduh dari server CDN terdekat sehingga memangkas sebagian besar trafik dari server utama Anda.
- **Message Queues:** Pekerjaan yang tidak harus selesai sebelum pengguna mendapat respons—seperti mengirim email, membuat faktur, atau mengubah ukuran foto—dimasukkan ke antrean pesan (*message queue*). Mesin **workers** terpisah mengambil pekerjaan dari antrean tersebut dan memprosesnya di latar belakang. Saat antrean memanjang, cukup tambah jumlah *worker*.
- **Autoscaling:** Menambah atau menghapus server secara otomatis berdasarkan metrik terukur (misal tambah server saat rata-rata CPU > 70% selama 5 menit, dan kurangi saat CPU < 30%). Aplikasi pesan antar makanan bisa berjalan dengan 20 server saat jam makan siang dan turun ke 5 server pada malam hari. *Autoscaling* mewajibkan server bersifat *stateless*.

![Gambar 4: Arsitektur aplikasi web yang dirancang untuk berskala besar — Berkas statis dilayani oleh CDN, panggilan API melewati Load Balancer ke kumpulan App Server stateless, data populer dilayani Cache, baca/tulis diatur oleh Database (primary + replicas + shards), dan pekerjaan berat dialirkan ke Queue + Workers.](/images/belajar/fundamental-system-design/image4.png)

## Menemukan Bottleneck (Finding the Bottleneck)

Menambah mesin hanya membantu **jika mesin itulah sumber masalahnya**. Menggandakan server aplikasi dari 10 menjadi 20 tidak akan meningkatkan kapasitas jika setiap request tetap mengantre di satu database yang sudah jenuh.

*Linear scaling* (menggandakan mesin = menggandakan kapasitas 2x) adalah kondisi ideal; di dunia nyata peningkatannya selalu lebih rendah karena komponen bersama dan biaya komunikasi jaringan.

Karena itu, tim selalu mengukur terlebih dahulu dengan **load testing**—mengirim trafik uji besar ke salinan sistem lalu menaikkannya bertahap sambil memantau tiap komponen. Komponen pertama yang menyentuh batas kapasitasnya (misal CPU database menyentuh 100% atau query melambat dari milidetik menjadi detik) itulah **bottleneck**-nya. Tim memperbaiki bagian itu, lalu menguji ulang untuk menemukan bottleneck berikutnya.
