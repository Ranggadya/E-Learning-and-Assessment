---
slug: latency-dan-performance
title: "Latency dan Performance (Latensi, Throughput, & Persentil)"
track: system-design
chapter: "Fundamental System Design"
level: menengah
order: 10
prerequisites: [availability]
estimated_minutes: 15
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Latency and Performance"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/latency-and-performance"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan ke Bahasa Indonesia mengikuti struktur Heading 1, 2, 3 asli beserta analisis persentil p99 dan keterangan diagram."
---

# Latency dan Performance

## Latency, Throughput, dan Performance

- **Latency (Latensi):** Waktu tunggu sejak permintaan dikirim hingga respons diterima, biasanya diukur dalam **milidetik (ms)**. Jika Anda menekan tombol dan hasilnya muncul 200 ms kemudian, latensinya adalah 200 ms.
- **Throughput:** Jumlah permintaan yang berhasil diselesaikan sistem dalam satu satuan waktu, umumnya diukur dalam **requests per second (RPS)**.
- **Performance (Performa):** Seberapa baik sistem menyelesaikan pekerjaannya—selalu digambarkan memakai **latensi dan throughput secara bersamaan**.

Analogi kasir supermarket: **latensi** adalah lama satu pembeli menunggu di kasir, sedangkan **throughput** adalah total pembeli yang terlayani dalam satu jam. Membuka kasir kedua menggandakan *throughput*, tetapi tidak membuat proses pembayaran per orang menjadi lebih cepat. Sebuah sistem bisa punya *throughput* tinggi sekaligus latensi buruk, sehingga tim wajib memantau keduanya.

### Ke Mana Waktu Sebuah Request Habis?

Satu request melewati beberapa tahapan yang masing-masing menyumbang latensi:
1. **Setup:** DNS lookup (mengubah nama domain menjadi alamat IP), lalu jabat tangan koneksi TCP dan TLS untuk HTTPS.
2. **Perjalanan Jaringan (*Network Travel*):** Request melintas ke server dan respons kembali ke klien.
3. **Kerja Server (*Server Work*):** Request menunggu di antrean hingga server bebas, lalu kode aplikasi dieksekusi.
4. **Database & Layanan Lain:** Membaca/menulis data atau memanggil microservice lain.

![Gambar 10: Rincian 350 ms latensi satu request — Setup (80 ms), Network (80 ms), Server work (40 ms), dan satu query Database lambat (150 ms). Selalu ukur dulu sebelum mengoptimasi: mempercepat kode aplikasi 2x hanya menghemat 15 ms, sedangkan memperbaiki query database bisa menghemat lebih dari 100 ms.](/images/belajar/fundamental-system-design/image10.png)

Jarak fisik sering lebih berpengaruh daripada kecepatan perangkat keras: membaca RAM hanya butuh ~100 nanodetik, perjalanan pulang-pergi di dalam satu data center ~0,5 ms, sedangkan lintas benua memakan ~150 ms—tidak ada CPU cepat yang dapat menghapus waktu tempuh cahaya di kabel serat optik.

### Rata-Rata vs Persentil (p50, p95, p99)

Bayangkan 100 request: 98 request selesai dalam **100 ms**, tetapi 2 request memakan **5.000 ms**. Nilai rata-ratanya tampak bagus (**198 ms**), padahal dua pengguna menunggu 5 detik!

Karena rata-rata menyembunyikan request lambat, engineer menggunakan **persentil**:
- **p50 (median):** Batas waktu yang dipenuhi oleh 50% request.
- **p95:** Batas waktu yang dipenuhi oleh 95% request.
- **p99:** Batas waktu yang dipenuhi oleh 99% request.

Pada contoh tadi, `p50 = 100 ms`, `p95 = 100 ms`, tetapi **`p99 = 5.000 ms`**. Kelambatan di ujung paling lambat ini disebut **tail latency**.

![Gambar 11: Mengapa persentil menyingkap masalah yang disembunyikan rata-rata — Untuk 100 request yang sama, rata-rata terlihat wajar (198 ms), padahal p99 menunjukkan pengguna paling lambat menunggu 5.000 ms (50x lebih lama).](/images/belajar/fundamental-system-design/image11.png)

**Tail latency** jauh lebih berbahaya daripada kelihatannya karena dua alasan:
1. Pengguna aktif mengirim banyak request—jika seorang pengguna mengirim 100 request sehari, ada peluang ~63% minimal satu request-nya lebih lambat dari p99.
2. Satu halaman web sering memanggil banyak backend sekaligus—jika halaman memanggil 10 layanan dan tiap layanan punya peluang 1% lambat, halaman tersebut menjadi lambat di sekitar 10% total kunjungan!

Sebagai patokan psikologi antarmuka: respons `< 100 ms` terasa instan, sekitar `1 detik` terasa ada jeda namun fokus terjaga, dan `> 10 detik` membuat banyak pengguna menyerah dan menutup halaman.

## Cara Mengurangi Latensi (How to Reduce Latency)

Hampir semua teknik optimasi latensi melakukan salah satu dari tiga hal: **menghindari kerja berulang**, **memperpendek jarak tempuh data**, atau **mencegah antrean panjang**.

### Caching

**Caching** menyimpan data yang sering diakses atau hasil komputasi di memori cepat (seperti Redis) agar tidak perlu membaca database berulang kali.
- **Cache hit:** Data ditemukan di cache (~1 ms).
- **Cache miss:** Data tidak ada di cache, aplikasi membaca database (150 ms) lalu menyimpannya ke cache untuk permintaan berikutnya (total 151 ms).

Jika 90% pembacaan adalah *cache hit*, rata-rata latensi turun drastis dari 150 ms menjadi `0,9 × 1 + 0,1 × 151 = 16 ms` (**hampir 10x lebih cepat**).

![Gambar 12: Cara cache memangkas latensi — Aplikasi memeriksa cache dulu (hit ~1 ms); hanya saat cache miss aplikasi membaca database (150 ms). Dengan 90% hit rate, rata-rata latensi turun dari 150 ms menjadi ~16 ms.](/images/belajar/fundamental-system-design/image12.png)

Tiga strategi caching umum: **In-memory caching** (di RAM server aplikasi, tercepat tetapi tidak dibagi antar-server), **Distributed caching** (cluster Redis bersama), dan **CDN** (untuk berkas statis dekat pengguna). Biaya utama caching adalah risiko **stale data** (data usang di cache setelah database berubah).

### Data Locality

**Data locality** menempatkan data sedekat mungkin dengan pengguna dan node yang paling sering membacanya, serta mengelompokkan data yang saling berkaitan bersama.

Pembacaan dari pengguna di London ke database di California memakan ~150 ms per perjalanan bolak-balik; dengan salinan (*replica*) di London, latensinya turun menjadi di bawah 10 ms. Di dalam satu data center pun, menyimpan data profil pengguna dan pesanannya di server yang sama mengurangi panggilan lintas jaringan.

![Gambar 13: Data locality menjaga data dekat dengan penggunanya — Pengguna di London membaca database di California butuh ~150 ms per round trip, sedangkan membaca replica di London hanya butuh di bawah 10 ms.](/images/belajar/fundamental-system-design/image13.png)

Tiga teknik membangun *data locality*: **data partitioning**, **sharding**, dan **data replication**.

### Load Balancing

**Load balancer** menjaga agar tidak ada satu server pun yang menumpuk antrean request. Jika Server A punya 50 request di antrean dan Server B kosong, mengirim request baru ke Server B langsung mengeksekusinya tanpa menunggu. Tiga algoritma yang paling sering dipakai: **round robin**, **least connections**, dan **consistent hashing** (yang menjaga cache lokal tetap efektif karena pengguna yang sama selalu mendarat di server yang sama).

![Gambar 14: Tiga cara umum load balancer memilih server untuk mencegah antrean panjang — Round-robin (bergiliran), Least connections (mengikuti beban nyata), dan Consistent hashing (kunci sama ke server sama agar cache tetap relevan).](/images/belajar/fundamental-system-design/image14.png)

### Teknik Optimasi Lainnya (Other Techniques)

- **Tambahkan Database Index:** **Index** mempercepat pencarian dari memindai 10 juta baris (detik) menjadi hitungan milidetik.
- **Panggil Layanan Secara Paralel (*Parallel Calls*):** Memanggil 3 layanan (50 ms, 80 ms, 120 ms) secara berurutan butuh 250 ms; dipanggil bersamaan hanya butuh ~120 ms (selama layanan paling lambat).
- **Gunakan Kembali Koneksi (*Connection Pooling*):** Mempertahankan koneksi TCP/TLS tetap terbuka agar tidak mengulang *handshake* puluhan milidetik di tiap request.
- **Kirim Data Lebih Kecil:** Kembalikan hanya kolom yang dibutuhkan dan aktifkan kompresi Gzip/Brotli untuk JSON.
- **Pindahkan Pekerjaan Lambat ke Message Queue:** Kirim email atau olah gambar di latar belakang setelah respons dikembalikan ke pengguna.

| Teknik Optimasi | Apa yang Dikurangi | Biaya / Konsekuensi Utama |
| :--- | :--- | :--- |
| **Caching** | Pekerjaan / query berulang | Risiko *stale data* (data usang) |
| **Data locality** | Jarak tempuh data di jaringan | Lebih banyak salinan untuk disinkronkan |
| **Load balancing** | Waktu tunggu di antrean server | Satu komponen tambahan untuk dikelola |
| **Indexes** | Jumlah baris yang dipindai database | Operasi tulis sedikit melambat & butuh ruang disk |
| **Parallel calls** | Waktu tunggu panggilan berurutan | Logika kode & penanganan error lebih kompleks |

## Trade-off antara Latency dan Throughput

Meningkatkan salah satu metrik sering kali memperburuk metrik lainnya:
- **Batching:** Mengumpulkan 100 operasi tulis dalam satu *batch* meningkatkan *throughput* secara drastis, tetapi tulisan pertama harus menunggu sampai *batch* penuh atau *timer* habis sehingga **latensinya naik**.
- **Server Terlalu Sibuk:** Menjalankan server mendekati 100% CPU memaksimalkan *throughput* per mesin, namun memperpanjang antrean request. Pada model antrean sederhana, rata-rata waktu tunggu saat server 90% sibuk adalah **~9 kali lebih lama** daripada saat 50% sibuk. Itulah sebabnya tim selalu menyisakan kapasitas cadangan (*headroom*) untuk melindungi latensi.

## Ringkasan Poin Penting (Key Takeaways)

- **Latency** adalah durasi satu request; **throughput** adalah jumlah request selesai per detik.
- Selalu ukur rincian waktu sebelum mengoptimasi dan perbaiki penyumbang waktu terbesar lebih dulu.
- Rata-rata menyembunyikan request lambat; gunakan persentil **p95** dan **p99** untuk melihat **tail latency**.
- Kurangi latensi lewat **caching** (in-memory, distributed, CDN), **data locality**, **load balancing**, **index**, panggilan paralel, *connection pooling*, dan antrean asinkron.
- Waspadai trade-off: memaksimalkan *throughput* lewat *batching* atau utilisasi CPU terlalu tinggi dapat memperburuk latensi.
