---
slug: kegunaan-dan-jenis-load-balancer
title: "5 Kegunaan Nyata & 8 Jenis Load Balancer (Layer 4 vs Layer 7)"
track: system-design
chapter: "Load Balancer"
level: menengah
order: 3
prerequisites: [algoritma-load-balancing]
estimated_minutes: 16
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Uses of Load Balancing & Load Balancer Types"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/uses-of-load-balancing"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan dan disusun ulang ke Bahasa Indonesia dengan studi kasus produksi serta tabel perbandingan Layer 4 vs Layer 7."
---

# 5 Kegunaan Nyata Load Balancing di Produksi

Mengapa hampir setiap arsitektur modern menempatkan **load balancer** sebagai komponen wajib? Berikut adalah lima peran kritisnya beserta studi kasus nyata di industri.

---

## 1. High Availability & Fault Tolerance (Aturan "Bertahan Hidup")

Perangkat keras pasti suatu saat rusak. Jaringan bisa putus-nyambung. Kebocoran memori (*memory leak*) bisa terjadi kapan saja. Jika Anda hanya punya satu server dan server itu mati, bisnis Anda ikut mati. Jika Anda punya sepuluh server dan satu mati, tetapi klien tidak tahu server mana yang masih hidup, bisnis Anda tetap lumpuh bagi sebagian pengguna.

Load balancer menjalankan **health check** sebagai pemantau detak jantung (*heartbeat monitor*) bagi cluster Anda. Ia terus-menerus menyapa server backend (*"Apakah kamu masih hidup? Bisa terima request?"*). Begitu ada server yang gagal menjawab atau mengembalikan error `5xx`, load balancer langsung memutus aliran trafik ke server yang rusak tersebut dan mengalihkannya ke server yang sehat.

> **Studi Kasus — Aplikasi Ride-Hailing (Uber) di Jumat Malam:**
> Anda memiliki 50 server API yang melayani pemesanan kendaraan. Tiba-tiba, Server #3 mengalami *memory leak* parah dan membeku (*freeze*).
> - **Tanpa Load Balancer:** 2% pengguna yang kebetulan diarahkan ke IP Server #3 hanya melihat layar berputar tanpa henti. Mereka pindah ke aplikasi kompetitor dan Anda kehilangan pendapatan.
> - **Dengan Load Balancer:** Load balancer mendeteksi Server #3 gagal mengembalikan `200 OK` pada `/health` dalam batas 2 detik. Server #3 langsung dikeluarkan dari rotasi aktif, dan 100% trafik disebarkan ke 49 server lainnya. Pengguna sama sekali tidak merasakan adanya gangguan.

---

## 2. Horizontal Scalability (Pertahanan "Black Friday")

**Vertical scaling** (membeli mesin yang lebih besar) memiliki batas fisik dan biaya. Pada titik tertentu Anda wajib menerapkan **horizontal scaling**, yaitu menambah jumlah mesin. Namun bagaimana cara memberi tahu seluruh pengguna di internet bahwa Anda baru saja menyalakan 50 server baru? Anda tidak memberi tahu mereka—Anda cukup mendaftarkannya ke load balancer.

Load balancer bertindak sebagai pintu masuk terpadu (**virtual ip**). Klien hanya mengenal satu alamat milik load balancer. Saat trafik melonjak, *Auto-Scaling Group* menyalakan instance backend baru, mendaftarkannya ke load balancer, dan kapasitas sistem langsung bertambah seketika tanpa perlu mengubah catatan DNS di sisi pengguna.

---

## 3. Zero-Downtime Deployments (Rilis Tanpa Waktu Henti)

Di lingkungan produksi modern, menampilkan halaman *"Sedang Dalam Perbaikan (Under Maintenance)"* saat memperbarui kode aplikasi sudah tidak dapat diterima. Anda harus bisa merilis versi baru sementara pengguna tetap bertransaksi.

Load balancer menyediakan fitur **Connection Draining**: Anda memberi sinyal kepada load balancer untuk berhenti mengirim koneksi baru ke server tertentu sambil membiarkan transaksi yang sedang berjalan di server itu selesai secara alami, barulah server tersebut dimatikan untuk pembaruan.

Lebih jauh lagi, load balancer memungkinkan dua strategi rilis standar industri yang sering tertukar di wawancara:

- **Blue-Green Deployment:** Anda menyiapkan dua lingkungan produksi yang identik (*Blue* dan *Green*). Saat ini *Blue* melayani 100% trafik produksi dan *Green* tidak melayani trafik publik. Anda memasang versi baru di *Green*, mengujinya secara internal, lalu memerintahkan load balancer untuk **memindahkan 100% trafik dari Blue ke Green dalam satu langkah sekaligus**. Lingkungan *Blue* tetap menyala tanpa disentuh, sehingga jika ditemukan masalah, *rollback* cukup dilakukan dengan satu klik sakelar kembali ke *Blue*. Cepat dan mudah *rollback*, namun membutuhkan biaya dua kali lipat jumlah server selama proses rilis.
- **Canary Deployment:** Anda menggeser trafik **secara bertahap**. Kirim 1% trafik pengguna ke versi baru, pantau *error rate* dan latensi, lalu naikkan ke 10%, 50%, hingga akhirnya 100%. Strategi ini jauh lebih hemat server cadangan dibanding *blue-green*, dan apabila ada *bug* kritis yang lolos pengujian, hanya 1% pengguna yang terdampak sebelum Anda menghentikannya. Konsekuensinya adalah waktu rilis lebih lama dan kedua versi aplikasi harus kompatibel dengan skema database yang sama.

> **Jangan Tertukar Saat Wawancara:** *Blue-Green* adalah satu perpindahan penuh di antara dua lingkungan utuh, sedangkan *Canary* adalah pergeseran persentase trafik secara bertahap sambil dipantau. Mengatakan *"kita akan melakukan blue-green dengan menaikkan trafik 1%, 10%, lalu 50%"* sebenarnya sedang menjelaskan *Canary*.

---

## 4. Security & Attack Mitigation (Perisai Pelindung)

Jangan pernah mengekspos alamat IP server aplikasi Anda langsung ke internet publik. Jika penyerang mengetahui IP asli backend Anda, mereka dapat melewati firewall tepi dan menyerang server aplikasi secara langsung.

Load balancer bertindak sebagai **reverse proxy** yang memutus koneksi langsung dari luar: klien berbicara dengan load balancer, dan load balancer berbicara dengan server backend melalui jaringan privat. Load balancer modern juga mampu meredam serangan DDoS (seperti *SYN Flood*), menyaring trafik berbahaya melalui integrasi **WAF (*Web Application Firewall*)**, serta menerapkan **rate limiting** untuk membatasi jumlah request per klien dalam satu jendela waktu.

---

## 5. SSL Termination (Pengangkat Beban Enkripsi)

Operasi kriptografi SSL/TLS untuk mendekripsi trafik HTTPS membutuhkan daya komputasi CPU yang cukup besar. Jika setiap web server harus melakukan jabat tangan (*handshake*) dan dekripsi SSL untuk setiap request, banyak siklus CPU terbuang untuk perhitungan matematika enkripsi alih-alih menjalankan logika bisnis.

Dengan **SSL termination** di load balancer, klien berkomunikasi via HTTPS ke load balancer, lalu load balancer mendekripsinya dan meneruskan trafik melalui jaringan internal privat yang aman ke server backend.

> **Dampak Nyata pada Kapasitas CPU:**
> Misalkan server aplikasi Anda mencapai pemakaian CPU **90%**, dan hasil *profiling* menunjukkan **30%** di antaranya habis hanya untuk proses enkripsi OpenSSL. Setelah memindahkan terminasi SSL ke load balancer, beban CPU server backend turun menjadi **60%** pada volume trafik yang sama. Artinya, server backend Anda kini sanggup menampung sekitar **50% lebih banyak trafik** (`90 / 60 = 1.5x`) sebelum menyentuh batas 90% lagi, tanpa membeli satu pun server aplikasi baru!

---

# Memahami 8 Jenis Load Balancer

Delapan jenis load balancer yang sering dibahas di literatur sistem terdistribusi **bukanlah delapan pilihan yang saling bersaing**. Kedelapannya sebenarnya menjawab **tiga pertanyaan yang berbeda dan independen**, dan sebuah sistem nyata memilih satu jawaban untuk masing-masing pertanyaan tersebut:

1. **Bagaimana wujud pembangunannya?** Hardware (Tipe 1), Software (Tipe 2), atau Cloud-based (Tipe 3).
2. **Seberapa jauh jangkauan distribusinya?** DNS Load Balancing (Tipe 4) dan Global Server Load Balancing / GSLB (Tipe 5) menyebarkan trafik lintas pusat data atau lintas benua sebelum koneksi dibuka, sementara Hybrid (Tipe 6) memadukan beberapa pendekatan sekaligus.
3. **Seberapa dalam ia membaca isi setiap paket request?** Layer 4 (Tipe 7) atau Layer 7 (Tipe 8).

Ketiga dimensi ini bersifat independen. Sebagai contoh, sebuah *software load balancer* maupun *cloud load balancer* sama-sama dapat dikonfigurasi untuk bekerja di **Layer 4** maupun **Layer 7**.

---

## Dimensi 1: Berdasarkan Wujud Implementasi (Tipe 1–3)

### 1. Hardware Load Balancing
Perangkat fisik khusus yang dilengkapi chip ASIC (*Application-Specific Integrated Circuits*) atau FPGA untuk memproses paket jaringan berkecepatan ekstrem di dalam *data center* on-premise.
- **Kelebihan:** *Throughput* sangat tinggi, latensi perangkat keras sangat rendah.
- **Kekurangan:** Biaya investasi awal sangat mahal, butuh keahlian khusus, dan kapasitasnya kaku (harus beli unit fisik baru jika ingin menambah kapasitas).

### 2. Software Load Balancing
Aplikasi perangkat lunak (seperti **Nginx**, **HAProxy**, atau **Envoy**) yang berjalan di atas server komoditas, mesin virtual (VM), atau *container*.
- **Kelebihan:** Biaya terjangkau, sangat fleksibel dikonfigurasi, dan mudah diskalakan dengan menambah instance VM baru.
- **Kekurangan:** Mengonsumsi sumber daya CPU/RAM pada sistem host dan memerlukan pemeliharaan pembaruan perangkat lunak secara mandiri.

### 3. Cloud-Based Load Balancing
Layanan terkelola (*Load Balancer as a Service*) yang disediakan oleh penyedia cloud seperti AWS Elastic Load Balancing (ALB/NLB), Google Cloud Load Balancing, atau Cloudflare.
- **Kelebihan:** Otomatis berskala elastis mengikuti trafik, tanpa beban perawatan infrastruktur fisik, dan skema bayar sesuai pemakaian (*pay-as-you-go*).
- **Kekurangan:** Ketergantungan pada ekosistem penyedia cloud (*vendor lock-in*) dan kontrol kustomisasi tingkat rendah yang lebih terbatas dibanding solusi *self-hosted*.

---

## Dimensi 2: Berdasarkan Jangkauan Geografis (Tipe 4–6)

### 4. DNS Load Balancing
Memanfaatkan sistem DNS dengan mengembalikan beberapa alamat IP sekaligus untuk satu nama domain, sehingga klien diarahkan ke server yang berbeda-beda.
- **Kelebihan:** Mudah dikonfigurasi tanpa perangkat perantara tambahan di jalur trafik, mampu menyebarkan trafik ke server yang tersebar secara geografis.
- **Kekurangan:** Karena DNS tidak berada di jalur koneksi langsung, ia **tidak bisa menjalankan algoritma dinamis** seperti *least connections* atau *least response time*. Ia juga terkendala *caching* TTL DNS yang lambat diperbarui saat ada server yang tiba-tiba mati.

### 5. Global Server Load Balancing (GSLB)
Menggabungkan DNS load balancing dengan **health check** aktif dan perutean berbasis lokasi geografis (*GeoDNS*) atau latensi untuk mengarahkan pengguna ke pusat data (*data center*) terdekat yang sedang sehat di seluruh dunia.

### 6. Hybrid Load Balancing
Memadukan kombinasi hardware, software, cloud, dan GSLB dalam satu arsitektur terpadu—misalnya menggunakan GSLB untuk mengarahkan trafik global, cloud load balancer di tepi (*edge*), serta software load balancer (Envoy/Nginx) untuk komunikasi antar-microservice di dalam cluster.

---

## Dimensi 3: Berdasarkan Lapisan Protokol OSI (Tipe 7–8)

### 7. Layer 4 Load Balancing (Transport Layer)
Bekerja pada lapisan transpor (Lapisan ke-4 model OSI). Ia mengambil keputusan perutean **hanya dengan membaca header TCP atau UDP**—yakni alamat IP sumber, IP tujuan, nomor port, dan jenis protokol—tanpa membuka isi pesan aplikasi di dalamnya.

### 8. Layer 7 Load Balancing (Application Layer)
Bekerja pada lapisan aplikasi (Lapisan ke-7 model OSI). Ia membuka dan memahami protokol aplikasi seperti HTTP/HTTPS, sehingga mampu merutekan request berdasarkan **URL path** (misal `/api/pembayaran` ke service pembayaran dan `/api/katalog` ke service katalog), **HTTP header**, hingga isi **cookie**.

### Tabel Perbandingan Layer 4 vs Layer 7

| Aspek Perbandingan | Layer 4 (Transport Layer) | Layer 7 (Application Layer) |
| :--- | :--- | :--- |
| **Data yang Dibaca** | IP Sumber/Tujuan, Nomor Port, Protokol (TCP/UDP) | URL Path, HTTP Header, Cookie, Metode HTTP |
| **Kecepatan & Beban CPU** | Sangat cepat, pemakaian CPU sangat ringan | Lebih lambat sedikit karena inspeksi paket mendalam & dekripsi |
| **Unit yang Diseimbangkan** | Menyeimbangkan **koneksi** (*connections*) | Menyeimbangkan **permintaan individual** (*requests*) |
| **Persistensi Sesi (Stickiness)** | Hanya bisa berbasis IP (*IP Hash* / *5-tuple*) | Bisa menggunakan *Cookie* maupun *Session ID* |
| **Routing Berbasis Konten** | Tidak bisa (buta terhadap URL path) | Sangat bisa (cocok untuk arsitektur *Microservices*) |
| **Contoh Penggunaan Terbaik** | Server game online, trafik TCP mentah, database | API Gateway, aplikasi web modern, perutean microservice |
