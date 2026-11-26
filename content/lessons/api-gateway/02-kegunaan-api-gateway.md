---
slug: kegunaan-api-gateway
title: "20 Kegunaan API Gateway di Arsitektur Microservices"
track: system-design
chapter: "API Gateway"
level: menengah
order: 6
prerequisites: [pengantar-api-gateway]
estimated_minutes: 16
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Usage of API Gateway"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/usage-of-api-gateway"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan dan disusun ulang ke Bahasa Indonesia dalam 4 pilar utama beserta keterangan diagram agregasi dan circuit breaker."
---

# 20 Kegunaan API Gateway

Arsitektur **microservices** terdiri dari banyak layanan kecil yang berdiri sendiri. Mengatur komunikasi antara puluhan layanan tersebut dengan beragam aplikasi klien bisa menjadi sangat rumit dengan cepat. Di sinilah **api gateway** berperan menampung kompleksitas lintas layanan tersebut.

Secara keseluruhan, ada **20 kegunaan utama** API gateway di industri yang terbagi rapi ke dalam **4 pilar**:

![Gambar 5: Dua puluh kegunaan API gateway yang dikelompokkan menjadi empat pilar — (1) Menentukan tujuan request (Where it goes), (2) Membentuk ulang request/respons (How it is shaped), (3) Melindungi backend (What protects it), dan (4) Menjalankan operasional & bisnis (Running it).](/images/belajar/api-gateway/image5.png)

---

## Pilar 1: Menentukan Tujuan Request (*Where It Goes*)

### 1. Request Routing
Mengarahkan setiap request yang masuk ke layanan backend yang tepat. Pada aplikasi e-commerce yang memiliki layanan terpisah untuk pengguna, katalog produk, dan pesanan, request detail produk diarahkan ke *product catalog service*, sedangkan request pembelian diarahkan ke *order processing service*.

### 2. Content-Based Routing
Merutekan trafik berdasarkan **isi konten** permintaan, bukan hanya jalur URL—melainkan memeriksa *header*, *body*, atau parameter *query*. Misalnya, API unggah berkas dapat meminta gateway membaca header `Content-Type` lalu mengarahkan gambar, video, dan dokumen ke layanan pemrosesan media yang khusus menangani tipe masing-masing.

### 3. Integrasi Service Discovery
Pada lingkungan dinamis seperti Kubernetes di mana instance layanan terus bertambah dan berkurang secara otomatis, API gateway terintegrasi dengan perangkat **service discovery** seperti **Consul** atau **Eureka**. Dengan begitu, gateway selalu merutekan request hanya ke instance yang benar-benar aktif dan sehat tanpa konfigurasi ulang manual.

### 4. A/B Testing & Canary Releases
Mengalihkan sebagian kecil persentase trafik ke versi backend yang berbeda. Saat merilis layanan rekomendasi baru, gateway dapat mengirim 5% trafik ke versi baru sementara 95% sisanya tetap memakai versi stabil (*canary deployment*), sehingga tim dapat memantau perilaku versi baru secara aman sebelum dirilis penuh.

---

## Pilar 2: Membentuk Ulang Request & Respons (*How It Is Shaped*)

### 5. Agregasi Multi-Layanan (*Aggregation*)
Menggabungkan respons dari beberapa backend menjadi satu respons tunggal. Aplikasi seluler yang butuh profil, pesanan terbaru, dan rekomendasi pada satu layar tidak perlu melakukan tiga panggilan terpisah. Gateway memanggil ketiganya di jaringan internal yang cepat, menyatukan hasilnya, lalu mengembalikan satu respons utuh ke klien.

![Gambar 6: Perbandingan tanpa agregasi vs dengan agregasi — Tanpa agregasi, aplikasi seluler mengirim 3 request terpisah dan merangkai datanya sendiri; dengan agregasi, klien cukup melakukan satu panggilan ke gateway dan menerima satu respons terpadu.](/images/belajar/api-gateway/image6.png)

### 6. Translasi Protokol (*Protocol Translation*)
Menerjemahkan protokol komunikasi antara klien dan layanan backend. Klien di internet cukup mengirim request via HTTP/HTTPS standar, sementara layanan internal di belakang layar bisa memakai **gRPC** atau **WebSockets**—gateway yang menangani konversinya sehingga kedua sisi tetap berjalan tanpa saling memaksa perubahan.

### 7. Transformasi Format Data (*Transformation*)
Mengubah struktur atau format **payload** permintaan maupun jawaban. Jika aplikasi frontend modern mengharapkan format **JSON** namun layanan warisan (*legacy backend*) hanya mengembalikan **XML**, gateway mengonversi XML tersebut menjadi JSON sebelum mengirimkannya ke klien.

### 8. Lokalisasi & Internasionalisasi (*Localization*)
Menyesuaikan respons berdasarkan lokasi atau preferensi bahasa klien yang dideteksi dari header atau parameter request—sehingga format tanggal, angka, mata uang, atau sumber konten langsung sesuai dengan wilayah pengguna.

### 9. Menyederhanakan Logika Klien (*Simpler Clients*)
Memindahkan alur kerja multi-langkah dari sisi aplikasi klien ke sisi server. Alur pendaftaran akun yang perlu membuat akun, mengirim email sambutan, dan mencatat log aktivitas cukup dibungkus menjadi satu **endpoint** di gateway yang mengorkestrasi ketiga langkah tersebut di belakang layar.

---

## Pilar 3: Melindungi Backend (*What Protects It*)

### 10. Penegakan Keamanan (*Security Enforcement*)
Sebelum request menyentuh satu pun layanan backend, gateway memverifikasi tiga hal sekaligus: **autentikasi** (*siapa kamu?* lewat validasi token), **otorisasi** (*data apa yang boleh kamu akses?*), dan kontrol akses.

### 11. Rate Limiting & Throttling
Mengendalikan seberapa banyak request yang boleh dikirim satu klien dalam jendela waktu tertentu untuk melindungi backend dari lonjakan trafik atau penyalahgunaan. Contohnya, API publik membatasi maksimal **100 request per menit per pengguna** dan menolak sementara permintaan yang melampaui kuota tersebut.

### 12. Pola Circuit Breaker (*Circuit Breaker Pattern*)
Mendeteksi ketika suatu layanan backend mulai gagal atau tidak merespons, lalu segera **memutus aliran request** ke layanan tersebut agar tidak memicu efek domino (*cascading failure*). Saat *order service* macet, gateway membuka *circuit breaker* (`circuit open`): menghentikan panggilan baru selama beberapa saat agar layanan sempat pulih, sembari mengembalikan respons *fallback* ke klien.

![Gambar 7: Cara kerja Circuit Breaker pada API gateway — Saat sirkuit tertutup (circuit closed) dan Order service mulai gagal, gateway membukanya (circuit open): menghentikan panggilan ke layanan yang bermasalah agar sempat pulih dan langsung menjawab klien dengan respons fallback.](/images/belajar/api-gateway/image7.png)

### 13. SSL Termination
Menangani enkripsi dan dekripsi SSL/TLS (HTTPS) secara terpusat di gateway. Klien terhubung ke gateway melalui HTTPS, lalu gateway meneruskan trafik melalui jaringan internal privat yang aman sehingga pengelolaan sertifikat tidak tersebar di puluhan microservice.

### 14. Penegakan Kebijakan (*Policy Enforcement*)
Menerapkan standar aturan organisasi secara konsisten ke seluruh trafik—misalnya mewajibkan keberadaan header keamanan tertentu atau memvalidasi format skema request sebelum meneruskannya ke backend.

---

## Pilar 4: Menjalankan Operasional & Bisnis (*Running It*)

### 15. Load Balancing
Membagikan permintaan secara merata ke beberapa instance dari sebuah microservice agar tidak ada satu instance pun yang menjadi leher botol (*bottleneck*).

### 16. Caching Respons
Menyimpan hasil respons data yang sering diminta namun jarang berubah (seperti katalog produk) langsung di gateway. Melayani permintaan dari **cache** memangkas latensi secara drastis sekaligus menghemat beban database dan server aplikasi.

### 17. Pemantauan & Pencatatan (*Monitoring & Logging*)
Mencatat jalur URL, waktu respons (*latency*), serta tingkat error secara terpusat di pintu masuk sistem. Data telemetri ini sangat vital untuk mendeteksi anomali performa, memahami pola pemakaian pengguna, dan mempercepat *troubleshooting*.

### 18. API Versioning
Mengelola berbagai versi API secara berdampingan (misal `/v1/` dan `/v2/`). Gateway mengarahkan aplikasi ponsel lama yang belum di-update ke layanan versi lama sementara klien baru diarahkan ke versi terbaru, sehingga rilis fitur baru tidak mematahkan pengguna lama.

### 19. Monetisasi API (*API Monetization*)
Memungkinkan penjualan akses API berdasarkan paket langganan (*tier*). Misalnya penyedia API cuaca menawarkan paket *Free*, *Basic*, dan *Premium*: gateway menangani autentikasi kunci API, menghitung pemakaian kuota tiap pelanggan, lalu mengintegrasikannya ke sistem penagihan (*billing*).

### 20. Dukungan Multi-Tenancy
Melayani banyak organisasi pelanggan (SaaS) dari satu infrastruktur yang sama. Gateway membedakan setiap *tenant* berdasarkan header atau token autentikasi, lalu menerapkan perutean, batas *rate limit*, pencatatan log, dan kebijakan keamanan yang terisolasi khusus untuk masing-masing *tenant*.
