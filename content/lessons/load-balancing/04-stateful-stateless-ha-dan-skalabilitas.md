---
slug: stateful-stateless-ha-dan-skalabilitas
title: "Stateless vs Stateful, High Availability, dan Optimasi Performa"
track: system-design
chapter: "Load Balancer"
level: lanjut
order: 4
prerequisites: [kegunaan-dan-jenis-load-balancer]
estimated_minutes: 15
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Stateless vs Stateful, High Availability & Scalability"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/stateless-vs-stateful-load-balancing"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan dan disusun ulang ke Bahasa Indonesia dengan pembahasan arsitektur Redis session store, failover Active-Active/Active-Passive, dan optimasi latensi."
---

# Stateless vs. Stateful Load Balancing

Saat merancang lapisan aplikasi dan **load balancer**, salah satu keputusan arsitektur paling mendasar adalah: **di mana data sesi pengguna disimpan?** Jawaban atas pertanyaan ini menentukan apakah Anda menggunakan *stateless* atau *stateful* load balancing.

## 1. Stateless Load Balancing

Load balancer yang **stateless** tidak menyimpan catatan sama sekali tentang server mana yang pernah dikunjungi oleh seorang klien sebelumnya. Setiap keputusan perutean diambil murni berdasarkan informasi pada request yang sedang masuk (seperti URL atau header) beserta kondisi beban server saat itu. Karena tidak ada riwayat yang harus diingat, load balancer bebas mengirimkan setiap request ke server mana pun yang paling siap, sehingga beban tersebar dengan sangat merata.

> **Contoh:** Halaman pencarian produk e-commerce. Server mana pun dapat menjawab pencarian produk karena request itu sendiri sudah membawa kata kunci pencarian yang dibutuhkan.

## 2. Stateful Load Balancing (Sticky Sessions)

Sebaliknya, load balancer yang **stateful** berusaha menjaga agar setiap klien selalu diarahkan ke server backend yang sama sepanjang sesinya berlangsung—mekanisme yang dikenal sebagai **sticky sessions**. Load balancer sebenarnya tidak menyimpan isi data sesi pengguna (seperti isi keranjang belanja), melainkan hanya memastikan seluruh request dari klien tersebut selalu mendarat di server tempat data sesinya tersimpan.

Ada dua cara umum untuk mengikat klien ke server yang sama:
- **Source IP Affinity:** Load balancer menentukan server berdasarkan hasil *hash* alamat IP klien. Tidak butuh tabel penyimpanan sesi, namun akan gagal ketika alamat IP klien berubah (misalnya saat berpindah dari Wi-Fi ke jaringan seluler) dan berisiko menumpuk banyak pengguna di balik satu gateway NAT kantor/operator ke satu server yang sama.
- **Session Affinity (Berbasis Cookie):** Load balancer menyematkan *cookie* khusus (atau membaca *session ID*) yang mencatat identitas server tujuan. Dengan cara ini, klien tetap diarahkan ke server yang sama meskipun alamat IP-nya berganti.

Kelemahan terbesar dari kedua metode di atas adalah: **begitu server tempat klien menempel mengalami kerusakan, seluruh data sesi di memori server tersebut langsung hilang dan pengguna terpaksa keluar (*logged out*).**

---

## Apakah Kita Benar-Benar Butuh Sticky Sessions?

Data sesi sebenarnya **tidak harus disimpan di memori lokal server aplikasi**. Praktik terbaik (*best practice*) modern adalah memindahkan data sesi ke penyimpanan bersama (*shared session store*) seperti **Redis** atau **Memcached** yang dapat diakses oleh seluruh server aplikasi. Dengan demikian, server aplikasi menjadi *stateless* dan load balancer juga dapat bekerja secara *stateless*.

Pendekatan penyimpanan bersama ini hampir selalu menjadi pilihan utama karena tiga alasan:
1. **Server mana pun bisa melayani request apa pun.** Load balancer dapat membagi trafik secara merata tanpa terikat riwayat sesi.
2. **Satu server mati tidak membuat pengguna ter-logout.** Data sesi tetap aman di dalam cluster Redis.
3. **Scaling jauh lebih mudah.** Menambah atau mengurangi server saat trafik naik-turun tidak akan memindahkan atau menghilangkan sesi pengguna.

*Tentu ada biayanya:* setiap request kini bergantung pada penyimpanan bersama tersebut (sehingga Redis juga harus dibuat *highly available*) dan ada tambahan satu panggilan jaringan internal (biasanya hanya sekitar `~1 ms` di dalam satu *data center*).

### Kapan Sticky Sessions Tetap Masuk Akal Digunakan?
- **State-nya adalah koneksi itu sendiri:** Koneksi **WebSocket** atau sesi permainan *multiplayer real-time* terikat langsung pada soket TCP di satu server fisik dan tidak bisa dipindahkan begitu saja ke Redis.
- **State sementara per pengguna berukuran terlalu besar:** Misalnya *in-memory cache* besar yang dibangun khusus untuk satu pengguna, atau potongan file (*chunked upload*) yang sedang diunggah sebagian ke disk lokal.
- **Aplikasi warisan (*legacy*):** Aplikasi lama yang sudah terlanjur menyimpan sesi di memori lokal dan biaya perombakan kodenya lebih besar daripada manfaatnya.

---

# High Availability dan Fault Tolerance pada Load Balancer

Jika sebuah load balancer menjaga agar kegagalan satu server backend tidak melumpuhkan sistem, lalu **siapa yang menjaga apabila load balancer itu sendiri yang mati?**

Untuk menjamin ketersediaan tinggi (*high availability*), load balancer wajib dideploy secara redundan menggunakan salah satu dari dua strategi *failover* berikut:

## 1. Konfigurasi Active-Passive

Satu unit load balancer (**Active**) menangani 100% trafik masuk, sementara unit kedua (**Passive**) bersiaga dalam mode *standby*.
- Untuk mendeteksi kerusakan, unit Active mengirimkan pesan singkat *"Saya masih hidup"* yang disebut **heartbeat** ke unit Passive sekitar satu kali setiap detik.
- Klien di internet tidak pernah menghubungi IP fisik masing-masing mesin, melainkan menghubungi satu alamat IP bersama yang bisa berpindah mesin, yaitu **virtual ip** (VIP).
- Begitu detak *heartbeat* berhenti, unit Passive langsung mengambil alih kepemilikan Virtual IP tersebut. Klien tetap mengakses alamat IP yang sama tanpa menyadari bahwa mesin di baliknya telah berganti.

## 2. Konfigurasi Active-Active

Beberapa unit load balancer sama-sama aktif memproses trafik secara bersamaan. Agar tidak membutuhkan satu mesin tunggal lagi di depan mereka, distribusi trafik ke beberapa load balancer aktif ini dilakukan dengan dua cara:
- **DNS Load Balancing:** Catatan DNS situs mencantumkan beberapa alamat IP load balancer sekaligus. DNS hanya membagikan alamat IP kepada klien, sehingga trafik data aplikasi sama sekali tidak melewati server DNS.
- **Anycast:** Seluruh instance load balancer mengumumkan (*advertise*) satu alamat IP yang sama ke jaringan menggunakan protokol BGP, dan router jaringan internet secara otomatis mengarahkan setiap klien ke instance load balancer yang paling dekat secara topologi jaringan.

Baik pada metode DNS maupun **anycast**, tidak ada satu mesin tunggal yang menanggung seluruh trafik, sehingga langkah distribusi awal ini tidak menciptakan **single point of failure** baru.

---

## Sinkronisasi dan Berbagi State Antar-Load Balancer

Dalam konfigurasi *active-passive* maupun *active-active*, seluruh instance load balancer harus memiliki pandangan yang seragam mengenai kondisi sistem (server mana yang sedang sehat, aturan perutean terbaru, hingga batas *rate limit*). Hal ini dicapai melalui:
- **Manajemen Konfigurasi Terpusat (*Centralized Configuration Management*):** Menggunakan penyimpanan konfigurasi terdistribusi seperti **etcd**, **Consul**, atau **ZooKeeper** agar setiap perubahan aturan otomatis tersinkronisasi ke seluruh instance load balancer.
- **Pemantauan & Peringatan (*Monitoring & Alerting*):** Selain memantau server backend lewat **health check**, load balancer itu sendiri wajib dipantau metrik waktu respons, *error rate*, dan utilisasi CPU-nya disertai sistem peringatan otomatis bagi tim *on-call*.

---

# Skalabilitas dan Optimasi Performa Load Balancer

Seiring tumbuhnya trafik aplikasi hingga ratusan ribu request per detik, lapisan load balancer juga harus diskalakan dan dioptimalkan:

## 1. Horizontal vs Vertical Scaling pada Load Balancer
- **Vertical Scaling:** Menambah CPU, RAM, dan kapasitas kartu jaringan (NIC) pada mesin load balancer. Cepat dilakukan namun dibatasi oleh kapasitas maksimum satu perangkat keras.
- **Horizontal Scaling:** Menambahkan lebih banyak instance load balancer dalam mode *active-active* yang disebarkan melalui DNS atau **anycast**. Saat Anda menyewa *Cloud Load Balancer* (seperti AWS ALB), di balik layar penyedia cloud sebenarnya menjalankan kelompok mesin (*redundant fleet*) yang berskala horizontal secara otomatis, bukan hanya satu mesin tunggal.

## 2. Batas Koneksi & Rate Limiting
Menerapkan batas jumlah koneksi maksimum (*connection limits*) dan **rate limiting** di tingkat load balancer mencegah satu klien yang rusak atau serangan bot menghabiskan seluruh kuota koneksi server backend. Rate limit dapat diterapkan berdasarkan alamat IP, domain klien, maupun pola endpoint URL.

## 3. Caching dan Optimasi Konten
Banyak load balancer Layer 7 mampu menyimpan **cache** konten statis (gambar, CSS, JavaScript) serta melakukan **kompresi** (Gzip/Brotli) atau minifikasi secara langsung. Hal ini memangkas ukuran **payload** jaringan dan mengurangi jumlah request yang harus masuk ke server aplikasi.

## 4. Meminimalkan Dampak Latensi Load Balancer
Menambahkan load balancer di jalur komunikasi memang menambah satu lompatan jaringan (*network hop*). Meski tambahannya sangat kecil (biasanya di bawah 1–2 milidetik), performanya dapat dioptimalkan lebih jauh melalui tiga strategi:
- **Distribusi Geografis:** Menempatkan load balancer dan server backend di berbagai wilayah regional agar dekat secara fisik dengan pengguna.
- **Penggunaan Ulang Koneksi (*Connection Reuse / Keep-Alive*):** Load balancer mempertahankan kumpulan koneksi TCP yang tetap terbuka (*keep-alive pool*) ke server backend, sehingga tidak perlu mengulang proses *TCP 3-way handshake* setiap kali ada request baru.
- **Optimasi Protokol Modern:** Mengaktifkan dukungan **HTTP/2** atau **HTTP/3 (QUIC)** pada sisi load balancer untuk melakukan *multiplexing* banyak request sekaligus dengan latensi minimal.

---

## Ringkasan Akhir Modul Load Balancing

| Bab | Fokus Utama yang Telah Dipelajari |
| :--- | :--- |
| **Bab 1: Pengantar** | Peran load balancer, 5 tahapan request, *health checks*, *sticky sessions*, *SSL termination*, dan penempatan 3 layer. |
| **Bab 2: 9 Algoritma** | *Round Robin*, *Least Connections*, *Weighted*, *IP Hash* (*Consistent Hashing* & *5-tuple*), *Least Response Time* (EWMA), hingga panduan memilihnya. |
| **Bab 3: Kegunaan & Jenis** | 5 kasus produksi (*High Availability*, *Black Friday*, *Blue-Green vs Canary*, *Reverse Proxy/WAF*, *SSL Offloading*) & 8 tipe (Hardware/Software/Cloud, DNS/GSLB, Layer 4 vs Layer 7). |
| **Bab 4: Arsitektur Lanjut** | *Stateless vs Stateful* (Redis session store), *Active-Passive* (Heartbeat + Virtual IP) vs *Active-Active* (DNS + Anycast), serta optimasi *keep-alive* & HTTP/2. |
