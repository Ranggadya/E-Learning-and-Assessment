---
slug: pengantar-load-balancing
title: "Pengantar Load Balancing & Cara Kerjanya"
track: system-design
chapter: "Load Balancer"
level: pemula
order: 1
prerequisites: []
estimated_minutes: 12
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Introduction to Load Balancing"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/introduction-to-load-balancing"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan dan disusun ulang ke Bahasa Indonesia dengan penyesuaian istilah teknis serta keterangan diagram."
---

# Pengantar Load Balancing

Bayangkan sebuah situs penjualan tiket konser yang berjalan di atas tiga server. Saat penjualan tiket dibuka, ribuan penggemar masuk pada menit yang sama. Namun, seluruh permintaan (*request*) ternyata hanya mengarah ke server pertama karena hanya alamat server itulah yang diberikan oleh situs web kepada pengunjung.

Akibatnya, server pertama melambat drastis lalu tumbang (*crash*). Sementara itu, dua server lainnya hampir menganggur sepanjang waktu.

Situs web tersebut sebenarnya punya jumlah server yang cukup. Yang tidak dimilikinya adalah cara untuk **membagi beban kerja** secara merata ke seluruh server tersebut.

Ada dua cara untuk menambah kapasitas sebuah sistem:
- Mengganti server dengan mesin yang berspesifikasi lebih besar disebut **vertical scaling** (*scaling up*).
- Menambahkan lebih banyak server sejenis ke dalam sistem disebut **horizontal scaling** (*scaling out*).

Horizontal scaling hanya akan berguna apabila trafik permintaan benar-benar menjangkau seluruh server yang ada. Komponen yang mewujudkan hal ini disebut **load balancer**. Bab pertama ini membahas apa tugas load balancer, bagaimana cara kerjanya, serta di mana posisinya dalam arsitektur sistem.

## Apa Itu Load Balancing?

**Load balancing** adalah proses menyebarkan permintaan dan trafik jaringan yang masuk ke beberapa server sekaligus. Tujuan utamanya adalah mencegah satu server pun mengalami kelebihan beban (*overloaded*) atau menjadi titik kegagalan tunggal (**single point of failure**). Hal ini meningkatkan ketersediaan (*availability*), keandalan (*reliability*), dan performa seluruh sistem.

Sebuah **load balancer** adalah perangkat keras maupun perangkat lunak yang menjalankan tugas tersebut. Ia berada di antara klien (*client*) dan server-server di belakangnya (*backend servers*). Load balancer menerima trafik jaringan dan aplikasi yang masuk, lalu meneruskan setiap permintaan ke salah satu server berdasarkan aturan atau algoritma yang telah ditentukan.

Server-server di belakang load balancer disebut **backend servers**. Sebagai satu kesatuan kelompok, kumpulan server ini disebut **server pool** atau **server farm**.

![Gambar 1: Load balancer di depan server pool — Klien cukup mengakses satu alamat publik, lalu load balancer meneruskan setiap permintaan hanya ke server yang sehat (Server 1 dan Server 2) serta melewati Server 3 yang sedang gagal pemeriksaan kesehatan.](/images/belajar/load-balancing/image1.png)

Sebuah load balancer memberikan tiga manfaat utama:

- **Skalabilitas (*Scalability*).** Untuk menangani lonjakan trafik, Anda cukup menambahkan server baru ke dalam server pool. Klien tetap menggunakan satu alamat yang sama tanpa perlu tahu ada penambahan mesin di belakang layar.
- **Ketersediaan (*Availability*).** Jika salah satu server rusak atau mati, load balancer berhenti mengirimkan trafik ke server tersebut, dan server-server lain tetap melayani pengguna tanpa gangguan.
- **Performa (*Performance*).** Tidak ada server yang menanggung beban berlebihan sementara server lain menganggur, sehingga waktu respons (*response time*) tetap rendah dan stabil.

## Bagaimana Load Balancer Bekerja?

Sebuah load balancer menjalankan lima langkah yang sama untuk setiap permintaan yang datang:

1. **Menerima (*Receive*):** Menerima permintaan dari klien atau pengguna.
2. **Memilih (*Choose*):** Memilih satu server dari server pool menggunakan algoritma load balancing yang dapat mempertimbangkan kapasitas server, waktu respons, jumlah koneksi aktif, maupun lokasi geografis.
3. **Meneruskan (*Forward*):** Meneruskan permintaan tersebut ke server yang terpilih.
4. **Memproses (*Process*):** Server backend memproses permintaan dan mengirimkan respons kembali ke load balancer.
5. **Mengembalikan (*Return*):** Load balancer mengembalikan respons tersebut kepada klien yang mengirim permintaan.

![Gambar 2: Lima tahapan kerja load balancer dalam menangani satu request — (1) Menerima request dari klien, (2) Memilih server memakai algoritma, (3) Meneruskan request ke server terpilih, (4) Server memproses dan membuat respons, serta (5) Mengembalikan respons ke klien.](/images/belajar/load-balancing/image2.png)

Klien tidak pernah perlu tahu berapa banyak server yang ada di belakang layar atau server mana yang menjawab permintaan mereka. Klien hanya terhubung ke satu alamat tunggal—sering disebut **virtual ip**—yang dimiliki oleh load balancer.

## Konsep-Konsep Kunci

### 1. Algoritma Load Balancing

Algoritma load balancing adalah metode yang digunakan load balancer untuk memutuskan server backend mana yang akan menerima setiap request. Misalnya, **round robin** mengirim permintaan ke setiap server secara bergiliran. Sementara **least connections** mengirim permintaan baru ke server dengan jumlah koneksi aktif paling sedikit. Bab berikutnya akan membandingkan 9 algoritma secara mendalam.

### 2. Pemeriksaan Kesehatan (Health Checks)

**Health check** adalah pengujian berkala yang dijalankan oleh load balancer untuk memastikan apakah setiap server backend masih aktif dan bekerja dengan baik. Server yang tidak sehat akan dikeluarkan sementara dari server pool sampai kembali pulih.

Berikut contoh konfigurasi yang umum digunakan di produksi:
- Setiap **10 detik**, load balancer mengirimkan request ringan seperti `GET /health` ke setiap server.
- Jika sebuah server gagal menjawab **3 pemeriksaan berturut-turut**, load balancer berhenti mengirimkan trafik ke server tersebut.
- Jika server tersebut kemudian berhasil lolos **2 pemeriksaan berturut-turut**, load balancer memasukkannya kembali ke dalam antrean trafik aktif.

Mekanisme di atas disebut **active health checks** karena load balancer secara aktif mengirim request pengujian memakai pengatur waktu (*timer*). Banyak load balancer juga menerapkan **passive health checks**, yaitu memantau trafik request nyata dari pengguna dan otomatis menghentikan pengiriman ke server yang terus-menerus mengembalikan error atau mengalami *timeout*.

![Gambar 3: Alur health check saat mengeluarkan dan memulihkan server — Pemeriksaan GET /health dilakukan tiap 10 detik; 3 kegagalan beruntun membuat server dikeluarkan dari rotasi trafik, dan 2 keberhasilan beruntun memasukkannya kembali.](/images/belajar/load-balancing/image3.png)

### 3. Persistensi Sesi (Session Persistence)

Session persistence, atau sering disebut **sticky sessions**, memastikan bahwa permintaan-permintaan berikutnya dari klien yang sama selalu diarahkan ke server backend yang sama. Load balancer biasanya melakukan ini dengan menyematkan *cookie* yang mencatat server mana yang digunakan oleh klien tersebut.

Pendekatan ini membantu ketika server menyimpan data sesi pengguna—seperti keranjang belanja—di dalam memorinya sendiri (RAM lokal). Namun ada konsekuensinya: pembagian beban bisa menjadi timpang, dan pengguna akan kehilangan sesinya apabila server tempat ia menempel tiba-tiba mati. Desain jangka panjang yang jauh lebih baik adalah menyimpan data sesi di penyimpanan bersama (*shared store* seperti Redis), sehingga server mana pun dapat melayani request apa pun.

### 4. Terminasi SSL/TLS (SSL/TLS Termination)

SSL (*Secure Sockets Layer*) dan TLS (*Transport Layer Security*) adalah protokol kriptografi yang mengenkripsi trafik HTTPS. TLS merupakan versi modern dari SSL.

**SSL termination** berarti proses mendekripsi trafik HTTPS dilakukan di tingkat load balancer, bukan di masing-masing server backend. Langkah ini mengangkat beban kerja dekripsi dari pundak server backend sehingga CPU server dapat difokuskan sepenuhnya untuk logika aplikasi. Selain itu, pengelolaan sertifikat keamanan menjadi terpusat di satu tempat.

## Di Mana Menempatkan Load Balancer?

Sebuah sistem berskala besar dapat menempatkan load balancer di setiap lapisan arsitektur, bukan hanya di pintu paling depan. Untuk mendapatkan skalabilitas dan redundansi penuh, Anda dapat memasang load balancer di tiga titik:

1. **Antara pengguna (*users*) dan web server.** Ini adalah posisi yang paling umum.
2. **Antara web server dan lapisan platform internal**, seperti *application server* atau *cache server*.
3. **Antara lapisan platform internal dan database server.**

![Gambar 4: Penempatan load balancer di setiap lapisan — LB 1 berada di depan web server, LB 2 di depan application/cache server, dan LB 3 di depan cluster database (read replicas) sehingga tiap lapisan dapat berkembang dan bertahan dari kegagalan secara mandiri.](/images/belajar/load-balancing/image4.png)

Dengan pola ini, setiap lapisan dapat diperbesar kapasitasnya dan bertahan dari kerusakan mesin secara independen.

Khusus lapisan database memerlukan perhatian ekstra. Umumnya hanya database utama (*primary database*) yang menerima operasi tulis (*writes*). Oleh karena itu, load balancer di depan database biasanya bertugas menyebarkan permintaan baca (*read requests*) ke berbagai *read replica*, sedangkan operasi tulis tetap diarahkan langsung ke *primary*.

## Bentuk dan Jenis Load Balancer

Berdasarkan wujud implementasinya, load balancer terbagi menjadi tiga bentuk utama:
- **Hardware load balancer:** Perangkat fisik khusus berkecepatan sangat tinggi, namun mahal dan kurang fleksibel.
- **Software load balancer:** Program yang berjalan di atas server biasa atau VM. Contoh populernya adalah **Nginx**, **HAProxy**, dan **Envoy**.
- **Cloud load balancer:** Layanan terkelola (*managed service*) dari penyedia cloud (seperti AWS ALB/NLB atau Cloudflare) yang otomatis diatur dan diskalakan oleh penyedia.

Load balancer juga dibedakan berdasarkan seberapa dalam ia membaca isi paket permintaan:
- **Layer 4 load balancer** merutekan trafik berdasarkan alamat IP dan nomor port (lapisan transpor TCP/UDP).
- **Layer 7 load balancer** mampu membaca detail protokol HTTP seperti *URL path*, *header*, dan *cookie*.

## Load Balancer Tidak Boleh Gagal

Jika seluruh permintaan pengguna melewati satu load balancer tunggal, maka load balancer tersebut berubah menjadi **single point of failure** yang baru. Karena itu, sistem produksi selalu menjalankan minimal dua unit load balancer.

Konfigurasi yang paling umum adalah **active-passive**. Satu load balancer aktif menangani seluruh trafik, sementara unit kedua bersiaga sebagai cadangan (*standby*). Jika unit aktif gagal, unit cadangan langsung mengambil alih alamat **virtual ip** yang sama, sehingga klien tetap terhubung ke alamat yang sama tanpa menyadari adanya pergantian mesin.

## Ringkasan Poin Penting (Key Takeaways)

- **Load balancer** berada di antara klien dan server backend untuk mendistribusikan trafik yang masuk secara merata.
- Tujuan utamanya adalah mencegah server kelebihan beban atau menjadi *single point of failure*, sehingga meningkatkan *availability*, *reliability*, dan *performance*.
- Kumpulan server backend di belakang load balancer disebut **server pool** atau **server farm**.
- Untuk setiap request, load balancer: menerima request, memilih server dengan algoritma, meneruskan request, dan mengembalikan respons server ke klien.
- **Health check** otomatis mengeluarkan server yang bermasalah dari server pool hingga server tersebut pulih.
- **Session persistence** mengarahkan request klien yang sama ke server yang sama, sedangkan **SSL termination** mendekripsi trafik HTTPS di load balancer.
- Load balancer dapat dipasang di depan lapisan web server, lapisan aplikasi, hingga lapisan database (*read replicas*).
- Selalu jalankan minimal dua load balancer (*active-passive* atau *active-active*) agar load balancer itu sendiri tidak menjadi titik kegagalan tunggal.
