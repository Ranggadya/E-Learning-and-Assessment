---
slug: algoritma-load-balancing
title: "9 Algoritma Load Balancing & Cara Memilihnya"
track: system-design
chapter: "Load Balancer"
level: menengah
order: 2
prerequisites: [pengantar-load-balancing]
estimated_minutes: 18
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Load Balancing Algorithms"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/load-balancing-algorithms"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan dan disusun ulang ke Bahasa Indonesia beserta tabel perbandingan algoritma dan keterangan diagram."
---

# Algoritma Load Balancing

Algoritma load balancing adalah metode logika yang digunakan oleh **load balancer** untuk mendistribusikan trafik dan permintaan yang masuk ke sejumlah server di dalam **server pool**. Tujuan utamanya adalah memastikan pemanfaatan sumber daya secara efisien, meningkatkan performa sistem secara menyeluruh, serta menjaga ketersediaan tinggi (*high availability*).

Dengan menyebarkan beban kerja secara cerdas, algoritma load balancing mengoptimalkan waktu respons, memaksimalkan *throughput*, dan mencegah satu server mengalami kelumpuhan. Algoritma-algoritma ini dapat mempertimbangkan berbagai faktor seperti kapasitas perangkat keras, jumlah koneksi aktif, waktu respons terkini, hingga status kesehatan server.

Berikut adalah 9 algoritma load balancing yang paling penting untuk dikuasai:

---

## 1. Round Robin

Algoritma **round robin** mendistribusikan permintaan yang masuk ke server secara berurutan dan berputar (*cyclic order*). Permintaan pertama dikirim ke Server 1, permintaan kedua ke Server 2, permintaan ketiga ke Server 3, dan setelah mencapai server terakhir, urutan kembali lagi ke Server 1.

![Gambar 5: Algoritma Round Robin — Load balancer membagikan request secara bergiliran (1st ke Server 1, 2nd ke Server 2, 3rd ke Server 3, lalu kembali lagi ke Server 1).](/images/belajar/load-balancing/image5.png)

### Kelebihan (Pros)
- Memastikan pembagian jumlah request yang sama rata karena setiap server mendapat giliran secara tetap.
- Sangat mudah diimplementasikan dan dipahami.
- Bekerja sangat baik apabila seluruh server memiliki spesifikasi dan kapasitas yang setara.

### Kekurangan (Cons)
- **Tidak Peka Beban (*No Load Awareness*):** Tidak memperhitungkan beban kerja atau pemakaian CPU saat ini pada masing-masing server.
- **Tanpa Afinitas Sesi (*No Session Affinity*):** Request berikutnya dari klien yang sama bisa diarahkan ke server berbeda, yang bermasalah bagi aplikasi *stateful*.
- **Kurang Optimal pada Kapasitas Berbeda:** Jika ada server yang berspesifikasi lebih kecil atau sedang melambat, ia tetap menerima jatah request yang sama banyaknya dengan server lain.

### Kasus Penggunaan
- **Lingkungan Homogen:** Seluruh server memiliki kapasitas CPU dan RAM yang identik.
- **Aplikasi Stateless:** Setiap request bersifat independen dan memiliki durasi pemrosesan yang relatif seragam.

---

## 2. Least Connections

Algoritma **least connections** adalah teknik dinamis yang mengarahkan permintaan baru ke server yang memiliki **jumlah koneksi aktif paling sedikit** pada saat request tersebut tiba. Metode ini sangat efektif ketika pola trafik sulit ditebak dan durasi pemrosesan tiap request bervariasi.

![Gambar 6: Algoritma Least Connections — Load balancer memeriksa jumlah koneksi aktif (Server 1: 7 aktif, Server 2: 2 aktif, Server 3: 5 aktif) dan mengarahkan request baru ke Server 2 yang paling longgar.](/images/belajar/load-balancing/image6.png)

### Kelebihan (Pros)
- **Sadar Beban (*Load Awareness*):** Memperhitungkan beban nyata di tiap server berdasarkan jumlah koneksi yang masih terbuka.
- **Distribusi Dinamis:** Otomatis beradaptasi terhadap perubahan trafik. *(Catatan penting: server yang baru saja ditambahkan atau baru restart memiliki 0 koneksi, sehingga ia akan menyerap seluruh request baru sampai jumlah koneksinya setara dengan server lain).*
- **Tangguh untuk Request Berdurasi Beragam:** Sangat cocok saat ada request yang cepat dan ada yang lambat, selama satu koneksi mewakili satu pekerjaan aktif. *(Pada HTTP/2, HTTP keep-alive, atau gRPC di mana satu koneksi membawa banyak request sekaligus, jumlah koneksi tidak lagi mencerminkan beban kerja secara akurat).*

### Kekurangan (Cons)
- **Kompleksitas Lebih Tinggi:** Membutuhkan pemantauan jumlah koneksi aktif secara *real-time*.
- **Pemeliharaan State:** Load balancer wajib mencatat dan memperbarui tabel status koneksi aktif setiap saat.
- **Potensi Lonjakan Koneksi Singkat:** Jika durasi koneksi sangat pendek, angka koneksi bisa berubah drastis dalam hitungan milidetik sehingga memicu penyeimbangan ulang yang terlalu sering.

### Kasus Penggunaan
- **Durasi Request Tidak Merata:** Ketika sebagian request selesai dalam 10 ms dan sebagian lain butuh beberapa detik.
- **Koneksi Jangka Panjang (*Long-Lived Connections*):** Sangat efektif untuk **WebSocket** atau koneksi *streaming* karena jumlah koneksi terbuka mencerminkan beban nyata yang ditanggung server.

---

## 3. Weighted Round Robin (WRR)

**Weighted Round Robin (WRR)** adalah pengembangan dari Round Robin yang memberikan nilai **bobot (*weight*)** pada setiap server berdasarkan kapasitas perangkat kerasnya. Permintaan didistribusikan secara proporsional sesuai bobot tersebut, sehingga server berspesifikasi besar menangani porsi trafik lebih besar dibandingkan server kecil.

![Gambar 7: Algoritma Weighted Round Robin — Server 1 (bobot 5) menerima 5 dari 10 request, Server 2 (bobot 3) menerima 3 dari 10 request, dan Server 3 (bobot 2) menerima 2 dari 10 request.](/images/belajar/load-balancing/image7.png)

### Kelebihan (Pros)
- **Distribusi Sesuai Kapasitas:** Server yang memiliki core CPU dan RAM lebih besar menerima porsi request lebih banyak.
- **Fleksibel:** Bobot mudah disesuaikan saat ada *upgrade* mesin atau penambahan server baru.
- **Mencegah Overload pada Server Kecil:** Melindungi server berspesifikasi rendah agar tidak kewalahan.

### Kekurangan (Cons)
- **Penentuan Bobot yang Rumit:** Menentukan angka bobot yang tepat membutuhkan pengujian metrik performa yang akurat.
- **Tidak Memantau Beban Real-Time:** Sama seperti Round Robin biasa, WRR tidak melihat apakah suatu server sedang mengeksekusi query berat pada detik tersebut.

### Kasus Penggunaan
- **Lingkungan Server Heterogen:** Kombinasi server generasi lama dan server generasi baru dalam satu cluster.
- **Cluster Database:** Beberapa *node* replika memiliki daya komputasi lebih tinggi untuk melayani lebih banyak query baca.

---

## 4. Weighted Least Connections

**Weighted Least Connections** menggabungkan keunggulan *Least Connections* dan *Weighted Round Robin*. Algoritma ini membagi jumlah koneksi aktif pada server dengan bobot kapasitasnya (`koneksi_aktif / bobot`), lalu memilih server dengan rasio beban per kapasitas paling rendah.

![Gambar 8: Algoritma Weighted Least Connections — Server 1 (8 koneksi / bobot 4 = rasio 2.0), Server 2 (3 koneksi / bobot 1 = rasio 3.0), Server 3 (5 koneksi / bobot 5 = rasio 1.0). Request diarahkan ke Server 3 karena memiliki rasio beban per kapasitas terendah.](/images/belajar/load-balancing/image8.png)

### Kelebihan (Pros)
- **Dinamis Sekaligus Sadar Kapasitas:** Menyesuaikan diri dengan jumlah koneksi aktif sekaligus menghormati perbedaan spesifikasi mesin.
- **Sangat Andal untuk Beban Fluktuatif:** Pilihan terbaik untuk lingkungan produksi dengan ukuran server berbeda-beda dan durasi request yang bervariasi.

### Kekurangan (Cons)
- **Kompleksitas & Overhead Tinggi:** Load balancer harus memelihara state koneksi aktif sekaligus menghitung rasio bobot setiap kali request masuk.

---

## 5. IP Hash

Algoritma **IP Hash** menentukan server tujuan berdasarkan alamat IP klien. Load balancer menjalankan fungsi *hash* terhadap IP klien untuk menghasilkan angka numerik, lalu melakukan operasi modulo dengan jumlah server (`hash(IP) % jumlah_server`). Selama alamat IP klien dan jumlah server di dalam pool tidak berubah, klien tersebut akan selalu diarahkan ke server yang sama.

![Gambar 9: Algoritma IP Hash — IP John (192.168.1.10) menghasilkan hash(IP) % 3 = 0 sehingga selalu ke Server 1, sedangkan IP Sarah (10.0.4.77) menghasilkan hash(IP) % 3 = 2 sehingga selalu ke Server 3.](/images/belajar/load-balancing/image9.png)

### Kelebihan (Pros)
- **Persistensi Sesi Tanpa Cookie:** Permintaan dari IP klien yang sama selalu mendarat di server yang sama tanpa memerlukan penyimpanan tabel sesi di load balancer (berguna pada Layer 4 load balancer yang tidak bisa membaca cookie HTTP).
- **Deterministik dan Sederhana:** Perutean konsisten dan mudah diprediksi.

### Kekurangan (Cons)
- **Distribusi Tidak Merata (*Hotspot*):** Banyak pengguna yang berada di balik satu jaringan kantor, kampus, atau gateway operator seluler (NAT) berbagi satu IP publik yang sama, sehingga semuanya menumpuk di satu server.
- **Masalah Perubahan Jumlah Server:** Jika satu server mati atau ditambah, hasil operasi modulo `% N` berubah untuk hampir seluruh klien, sehingga mayoritas sesi berpindah server dan hilang.

> **Catatan tentang Consistent Hashing & 5-Tuple Hash:**
> - **Consistent Hashing** menyelesaikan masalah perubahan jumlah server di atas dengan menempatkan server dan klien pada struktur cincin (*ring*), sehingga saat server ditambah atau dihapus hanya sekitar `1/N` klien yang berpindah server.
> - **5-Tuple Hash:** Banyak load balancer Layer 4 melakukan hash pada 5 nilai sekaligus (*source IP, source port, destination IP, destination port, protocol*). Semua paket dalam satu koneksi TCP memiliki 5-tuple yang sama sehingga menuju server yang sama, namun koneksi baru dari klien yang sama bisa menggunakan *source port* berbeda sehingga beban tersebar lebih merata.

---

## 6. Least Response Time

Algoritma **Least Response Time** mengarahkan permintaan baru ke server dengan waktu respons terkini paling cepat. Untuk mencegah satu request lambat merusak nilai rata-rata terlalu lama, implementasi modern menggunakan rata-rata bergerak berbobot eksponensial (**EWMA — Exponentially Weighted Moving Average**) yang memberi bobot lebih besar pada pengukuran terbaru, serta mengombinasikannya dengan jumlah request yang sedang berjalan (*in-flight*).

![Gambar 10: Algoritma Least Response Time — Load balancer memantau rata-rata waktu respons terbaru (Server 1: 120 ms, Server 2: 45 ms, Server 3: 200 ms) dan memilih Server 2 yang paling responsif.](/images/belajar/load-balancing/image10.png)

### Kelebihan (Pros)
- **Optimasi Latensi:** Mengutamakan server yang terbukti paling cepat menjawab saat itu.
- **Adaptif terhadap Gangguan Server:** Server yang mulai melambat otomatis dikurangi jatah trafiknya sampai kembali pulih.

### Kekurangan (Cons)
- **Jebakan Kegagalan Cepat (*Fooled by Fast Failures*):** Server yang sedang rusak bisa saja mengembalikan pesan error (`500 Internal Server Error`) dalam waktu 1 ms. Jika load balancer menghitung respons error tersebut sebagai "respons cepat", ia justru akan membanjiri server yang rusak itu dengan seluruh trafik baru! Karena itu, hanya respons sukses yang boleh dihitung.

---

## 7. Random

Algoritma **Random** memilih satu server secara acak untuk setiap permintaan yang masuk tanpa mengikuti urutan tetap maupun memantau metrik performa. Dalam jangka panjang dan volume trafik besar, distribusi acak yang seragam (*uniform*) akan menghasilkan jumlah request yang kurang lebih merata di tiap server.

![Gambar 11: Algoritma Random — Load balancer memilih server secara acak untuk tiap request; merata dalam jangka panjang namun bisa tidak seimbang dalam jangka pendek.](/images/belajar/load-balancing/image11.png)

### Kelebihan & Kekurangan
- **Kelebihan:** Sangat sederhana dan sama sekali tidak membutuhkan penyimpanan state (*stateless*).
- **Kekurangan:** Tidak peka beban, bisa timpang dalam jangka pendek, dan membuat *bug* spesifik pada satu server lebih sulit direproduksi karena request berikutnya berpindah-pindah secara acak.

---

## 8. Least Bandwidth

Algoritma **Least Bandwidth** memilih server yang sedang mengonsumsi *bandwidth* jaringan (Mbps) paling kecil pada saat itu.

![Gambar 12: Algoritma Least Bandwidth — Load balancer memantau trafik jaringan saat ini (Server 1: 90 Mbps, Server 2: 20 Mbps, Server 3: 60 Mbps) dan mengarahkan request ke Server 2.](/images/belajar/load-balancing/image12.png)

### Kapan Digunakan?
- Sangat cocok untuk aplikasi yang dibatasi oleh kapasitas pipa jaringan (*network-bound*), bukan CPU—seperti layanan **video streaming**, unduhan file berukuran besar, dan **CDN (*Content Delivery Network*)**.
- Untuk trafik API berpayload kecil yang sensitif terhadap latensi, *Least Response Time* jauh lebih tepat karena penggunaan bandwidth tidak mencerminkan kecepatan pemrosesan request kecil.

---

## 9. Custom Load

Algoritma **Custom Load** memungkinkan engineer mendefinisikan sendiri metrik dan formula aturan distribusi trafik—misalnya gabungan persentase pemakaian CPU, sisa memori RAM, antrean *disk I/O*, atau metrik khusus aplikasi yang dilaporkan oleh agen pemantau di tiap server.

---

## Panduan Memilih Algoritma (dan Tips Wawancara)

Untuk sebagian besar sistem dunia nyata, jawaban jujurnya adalah **Round Robin** atau **Least Connections** sudah lebih dari cukup. Gunakan tabel panduan cepat berikut saat merancang sistem:

| Kondisi Sistem & Karakteristik Trafik | Algoritma yang Direkomendasikan |
| :--- | :--- |
| Spesifikasi server seragam & durasi request singkat | **Round Robin** |
| Spesifikasi server berbeda-beda (heterogen) | **Weighted Round Robin** |
| Durasi request sangat bervariasi atau koneksi bertahan lama (WebSocket) | **Least Connections** |
| Spesifikasi server berbeda & durasi request bervariasi | **Weighted Least Connections** |
| Respons berupa file besar atau aliran video (*bandwidth-bound*) | **Least Bandwidth** |
| Klien yang sama harus kembali ke server yang sama tanpa cookie (L4) | **IP Hash** (atau **Consistent Hashing**) |

> **Tips Wawancara System Design:** Saat menjawab pertanyaan wawancara, sebutkan nama algoritma yang Anda pilih, **lalu jelaskan apa yang tidak diketahui oleh algoritma tersebut** (misalnya: *"Saya memilih Least Connections karena durasi request bervariasi, namun kita perlu berhati-hati saat server baru menyala karena koneksi awalnya nol sehingga berisiko langsung diserbu trafik baru"*). Bagian kedua itulah yang membuktikan Anda benar-benar memahami cara kerjanya di produksi.
