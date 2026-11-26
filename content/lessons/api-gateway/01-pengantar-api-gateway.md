---
slug: pengantar-api-gateway
title: "Pengantar API Gateway & Perbedaannya dengan Load Balancer"
track: system-design
chapter: "API Gateway"
level: pemula
order: 5
prerequisites: []
estimated_minutes: 12
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Introduction to API Gateway"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/introduction-to-api-gateway"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan dan disusun ulang ke Bahasa Indonesia beserta tabel perbandingan API Gateway vs Load Balancer dan keterangan diagram."
---

# Pengantar API Gateway

Bayangkan sebuah aplikasi belanja menampilkan satu halaman beranda (*home screen*). Untuk membangun satu layar tersebut, aplikasi memerlukan profil pengguna, riwayat pesanan terbaru, dan rekomendasi produk. Masing-masing data berasal dari layanan backend yang berbeda, dan setiap layanan punya alamat jaringannya sendiri.

Akibatnya, aplikasi ponsel harus mengirim tiga panggilan terpisah ke tiga alamat berbeda. Setiap layanan backend pun harus memeriksa token login pengguna dengan salinan kode yang sama persis. Lebih repot lagi, begitu tim memindahkan alamat *order service*, seluruh aplikasi klien di ponsel pengguna harus diperbarui.

Subbab ini membahas komponen arsitektur yang menyelesaikan masalah tersebut: **api gateway**—mulai dari cara kerjanya, alur perjalanan sebuah request, hingga perbedaannya yang tegas dengan **load balancer**.

## Apa Itu API Gateway?

**API gateway** adalah komponen di sisi server yang berperan sebagai perantara antara klien dan layanan-layanan backend:

- **Klien (*Clients*):** Peramban web (*web browser*), aplikasi seluler (*mobile app*), atau layanan mitra pihak ketiga yang memanggil sistem Anda.
- **Layanan Backend (*Backend Services*):** Kumpulan **microservices** dan API internal Anda—yaitu layanan-layanan kecil yang berdiri sendiri di mana masing-masing mengerjakan satu tugas khusus (seperti mengelola akun pengguna atau memproses pesanan).

Tujuan utama sebuah API gateway adalah menyediakan **satu pintu masuk tunggal (*single entry point*)** bagi konsumen eksternal untuk mengakses sistem backend. Ia menerima setiap permintaan klien, meneruskannya ke microservice yang tepat, lalu mengembalikan respons layanan tersebut kepada klien.

![Gambar 1: API gateway sebagai satu pintu masuk tunggal — Web browser, aplikasi seluler, dan layanan mitra semuanya mengirim request ke satu alamat API gateway, yang kemudian meneruskan setiap permintaan ke microservice tujuan (/users, /orders, /products).](/images/belajar/api-gateway/image1.png)

## Mengapa Sistem Memakai API Gateway?

Tanpa gateway, setiap klien harus menghafal alamat setiap layanan yang dipakainya, dan setiap layanan terpaksa mengulang pekerjaan yang sama berulang kali (seperti memverifikasi token login).

Kehadiran API gateway mengubah pola tersebut dalam tiga hal mendasar:

1. **Satu alamat tunggal bagi klien.** Klien cukup menghubungi alamat gateway, bukan alamat masing-masing layanan. Karena gateway yang mengetahui lokasi setiap layanan berjalan, tim backend bebas memindahkan, menggabungkan, atau memecah layanan tanpa harus mengubah aplikasi klien.
2. **Pekerjaan bersama dipusatkan di satu tempat.** Gateway menangani tugas-tugas lintas layanan seperti perutean (*routing*), autentikasi, dan **rate limiting** (membatasi jumlah maksimum permintaan yang boleh dilakukan klien dalam rentang waktu tertentu). Setiap microservice pun bisa fokus penuh pada logika bisnis intinya.
3. **Performa dan skalabilitas lebih baik.** Pekerjaan bersama cukup dieksekusi satu kali di gateway alih-alih diulang di setiap layanan. Gateway juga bisa menyediakan **cache** respons dan menyebarkan request ke beberapa salinan layanan.

![Gambar 2: Perbandingan tanpa gateway dan dengan gateway — Tanpa gateway, aplikasi harus memanggil 3 alamat berbeda dan 3 layanan mengulang pengecekan token yang sama; dengan gateway, aplikasi cukup melakukan satu panggilan dan pemeriksaan bersama dijalankan sekali saja di gateway.](/images/belajar/api-gateway/image2.png)

## Bagaimana Alur Request Melewati API Gateway?

Berikut lima tahapan standar yang dijalankan API gateway terhadap setiap permintaan yang masuk:

1. **Menerima (*Receive*):** Klien mengirim permintaan, misalnya `GET /orders?user=42`, ke alamat gateway.
2. **Autentikasi (*Authenticate*):** Gateway memeriksa token login pengguna. Jika token kosong atau tidak valid, gateway langsung menolak request seketika.
3. **Batas Laju (*Rate Limit*):** Gateway memeriksa apakah klien ini sudah mengirim terlalu banyak permintaan belakangan ini. Jika melampaui batas, request langsung ditolak dengan status `429 Too Many Requests`.
4. **Rute (*Route*):** Gateway membaca jalur URL permintaan untuk menentukan microservice yang tepat, lalu meneruskan request ke layanan tersebut.
5. **Mengembalikan (*Return*):** Layanan backend memproses permintaan dan mengirim jawaban, lalu gateway meneruskan respons tersebut kembali ke klien.

![Gambar 3: Alur sebuah request melewati API gateway — (1) Receive, (2) Auth untuk cek token login, (3) Limit untuk cek rate limiting, (4) Route berdasarkan URL ke layanan tujuan, dan (5) Return respons ke klien. Request dengan token rusak atau melampaui batas langsung dihentikan sejak awal sebelum menyentuh microservice.](/images/belajar/api-gateway/image3.png)

Aturan perutean (*routing table*) di dalam gateway sering kali berbentuk pemetaan sederhana dari jalur URL ke layanan tujuan:

```text
GET /users/42         -> user service
GET /orders?user=42   -> order service
GET /products/9001    -> product catalog service
```

Karena permintaan yang gagal autentikasi atau melebihi *rate limit* langsung ditolak di gerbang depan, permintaan bermasalah tersebut sama sekali tidak membebani sumber daya CPU atau memori microservice di belakangnya.

## API Gateway vs. Load Balancer

**API gateway** dan **load balancer** sering kali tertukar karena keduanya berdiri di depan server dan sama-sama menentukan ke mana sebuah request harus pergi. Namun, keduanya mengambil keputusan yang berbeda:

- **API gateway fokus pada perutean (*routing*):** Memilih **layanan (*microservice*) mana** yang bertugas menangani request tersebut berdasarkan URL, identitas klien, dan aturan API.
- **Load balancer fokus pada pendistribusian (*distributing*):** Menyebarkan trafik secara merata ke **salinan server mana** di antara sekumpulan server identik yang mengerjakan tugas yang sama.

![Gambar 4: Perbandingan API gateway vs load balancer — API gateway merutekan request berdasarkan URL ke layanan yang berbeda (/users ke User service, /orders ke Order service), sedangkan load balancer membagi trafik secara merata (50% / 50%) ke beberapa server identik yang menjalankan kode yang sama.](/images/belajar/api-gateway/image4.png)

| Aspek Perbandingan | API Gateway | Load Balancer |
| :--- | :--- | :--- |
| **Fokus Utama** | Perutean (*Routing*) | Pendistribusian (*Distributing*) |
| **Dasar Keputusan** | URL, identitas klien, dan aturan kebijakan API | Kesehatan (*health*) & beban server, terkadang jalur URL |
| **Tugas Tambahan** | Autentikasi, rate limit per klien, agregasi respons, konversi format, *API versioning* | *Health check* dan pemerataan trafik |
| **Apa yang Ada di Belakangnya** | **Layanan-layanan berbeda** dengan tugas berbeda | **Banyak server identik** dengan tugas yang sama |
| **Pertanyaan yang Dijawab** | *"Layanan mana yang harus menangani request ini?"* | *"Salinan server mana yang harus menangani request ini?"* |

Baris **"Apa yang Ada di Belakangnya"** adalah cara termudah membedakannya: **load balancer memilih di antara server-server yang sama, sedangkan API gateway memilih di antara layanan-layanan yang berbeda.**

Perlu dicatat bahwa merutekan berdasarkan URL saja belum cukup membedakan keduanya—karena *Layer 7 load balancer* juga mampu mengirim `/orders` ke satu grup server dan `/users` ke grup lain. Yang benar-benar membedakan API gateway adalah **manajemen API (*API management*)**: verifikasi token login, rate limit per klien, penggabungan respons lintas layanan, konversi format data (XML/JSON), hingga manajemen versi API.

## Keduanya Bekerja Bersama di Produksi

Sistem berskala nyata hampir selalu memakai **keduanya secara bersamaan**:
1. API gateway dijalankan dalam beberapa salinan (*instances*) demi kapasitas dan keandalan. Sebuah **load balancer** dipasang di depan untuk membagikan trafik klien ke salinan-salinan gateway tersebut.
2. Setiap microservice di belakang gateway juga dijalankan dalam beberapa salinan. Setelah gateway memilih layanan yang tepat, load balancer internal (atau fitur load balancing bawaan gateway) memilih satu salinan sehat dari microservice tersebut.

## Contoh Implementasi API Gateway Populer

- **Layanan Cloud Terkelola (*Managed Cloud Services*):** Amazon API Gateway, Azure API Management, dan Google Cloud Apigee. Penyedia cloud yang menjalankan dan menskalakannya secara otomatis.
- **Perangkat Lunak Self-Hosted:** **Kong**, atau gateway yang dibangun di atas **Nginx** maupun **Envoy** yang dioperasikan langsung oleh tim engineering Anda.

## Biaya & Konsekuensi Pemakaian API Gateway

Di balik kemudahannya, memasang API gateway tetap membawa tiga biaya dasar:
- **Potensi Single Point of Failure:** Karena seluruh trafik melewati gateway, gangguan pada gateway bisa melumpuhkan seluruh sistem. Tim wajib menjalankan beberapa instance gateway secara redundan.
- **Tambahan Satu Lompatan Jaringan (*Extra Hop*):** Setiap request melewati satu server tambahan sehingga menambah sedikit latensi.
- **Satu Sistem Tambahan untuk Dikelola:** Aturan konfigurasi gateway harus diuji, dipantau, dan dijaga agar selalu sinkron dengan perubahan layanan.

## Ringkasan Poin Penting

- **API gateway** adalah perantara sisi server yang menyediakan satu pintu masuk tunggal bagi klien menuju kumpulan **microservices**.
- Ia memusatkan pekerjaan bersama (*routing*, autentikasi, *rate limiting*) di satu tempat agar setiap microservice tetap ringkas.
- API gateway berfokus merutekan request ke **layanan berbeda** berdasarkan URL & aturan API, sedangkan **load balancer** berfokus menyebarkan trafik ke **server-server identik**.
- Sistem produksi menggabungkan keduanya dan selalu menjalankan banyak salinan gateway agar tidak menjadi **single point of failure**.
