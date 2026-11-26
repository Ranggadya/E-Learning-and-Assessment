---
slug: resilience-dan-error-handling
title: "Resilience & Error Handling (Timeout, Retry, Circuit Breaker, Bulkhead)"
track: system-design
chapter: "Fundamental System Design"
level: lanjut
order: 13
prerequisites: [monitoring-dan-observability]
estimated_minutes: 16
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Resilience and Error Handling"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/resilience-and-error-handling"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan ke Bahasa Indonesia mengikuti struktur Heading 1, 2, 3 asli beserta tabel praktik resilience dan keterangan diagram."
---

# Resilience dan Error Handling

## Kegagalan Adalah Hal Normal (Failures Are Normal)

Pada sistem berskala besar, selalu ada komponen yang rusak setiap saat. Jika satu server rata-rata rusak sekali dalam 1.000 hari, maka perusahaan dengan 1.000 server akan mengalami **rata-rata satu kerusakan server setiap hari**. Karena itu sistem besar harus dirancang **mengantisipasi kegagalan**, bukan berasumsi kegagalan bisa dicegah total.

**Resilience (ketangguhan)** adalah kemampuan sistem untuk tetap bekerja saat sebagian komponennya gagal, lalu pulih kembali dengan cepat.

### Cascading Failures

**Cascading failure** adalah kegagalan pada satu komponen yang merembet dan menjatuhkan komponen-komponen lain yang sebenarnya sehat.

Contoh: setiap web server toko online punya 200 thread. Setiap halaman produk memanggil layanan ulasan (*reviews service*) dan menunggu respons. Ketika layanan ulasan mendadak melambat menjadi 30 detik per panggilan, seluruh 200 thread habis terpakai hanya untuk menunggu ulasan. Akibatnya tidak ada thread tersisa untuk halaman *checkout*—seluruh toko pun tumbang padahal layanan *checkout* tidak pernah memanggil ulasan!

![Gambar 24: Bagaimana satu layanan lambat memicu cascading failure dan melumpuhkan seluruh toko — Layanan ulasan melambat 30 detik -> seluruh 200 thread web server penuh menunggu -> halaman checkout ikut gagal -> seluruh toko tumbang.](/images/belajar/fundamental-system-design/image24.png)

## Fault Tolerance

**Fault tolerance** menjaga sistem tetap berfungsi benar saat terjadi kegagalan melalui redundansi berlapis: **replikasi data**, banyak instance layanan di belakang **load balancer**, node cadangan, serta **sharding** agar gangguan satu shard hanya berdampak pada sebagian kecil pengguna. Redundansi melindungi dari komponen yang mati total, sedangkan teknik-teknik berikut melindungi dari layanan yang lambat, rusak sebagian, atau gagal sesaat.

## Timeouts

**Timeout** adalah batas waktu maksimum pemanggil menunggu respons sebelum menghentikan tunggu dan menganggap panggilan gagal. Tentukan batas *timeout* berdasarkan latensi normal (misal jika p99 layanan ulasan < 200 ms, pasang timeout 1 detik agar thread langsung bebas jauh sebelum 30 detik).
- **Terlalu singkat:** Memotong panggilan sah yang hampir selesai.
- **Terlalu lama:** Mengunci thread dan memicu *cascading failure*.

## Retries dan Backoff

Banyak gangguan bersifat sementara (**transient**)—seperti kedipan jaringan atau layanan yang sedang restart—sehingga percobaan ulang (**retry**) sering berhasil.

Namun me-retry tanpa jeda sangat berbahaya: jika 10.000 klien gagal lalu langsung retry 3 kali sekaligus, layanan yang sedang sekarat mendadak dibanjiri 40.000 request! Solusinya adalah **exponential backoff**: menggandakan jeda tunggu setelah setiap kegagalan (misal `100 ms -> 200 ms -> 400 ms`) lalu berhenti setelah 3–4 percobaan.

![Gambar 25: Strategi Retry dengan Exponential Backoff — Setiap percobaan yang gagal (timeout atau HTTP 503) menggandakan waktu tunggu (100 ms, 200 ms, 400 ms) hingga percobaan ke-4 berhasil, memberi ruang bagi layanan yang sedang tertekan untuk pulih.](/images/belajar/fundamental-system-design/image25.png)

### Tiga Aturan Wajib pada Retry
1. **Tambahkan Jitter:** Tambahkan sedikit variasi waktu acak pada setiap jeda tunggu agar ribuan klien yang gagal bersamaan tidak melakukan retry pada milidetik yang sama persis.
2. **Retry Hanya untuk Error Transient:** Lakukan retry pada *timeout*, `HTTP 503`, `HTTP 429` (*Too Many Requests*), atau `HTTP 408` (hormati header `Retry-After`). Jangan pernah retry error permanen seperti `HTTP 400 Bad Request`.
3. **Pastikan Operasi Bersifat Idempotent:** Operasi **idempotent** menghasilkan efek akhir sama meski dipanggil dua kali. Membaca profil sudah idempotent; memotong kartu kredit tidak. Agar pembayaran aman di-retry, klien mengirim **idempotency key** unik sehingga server mengembalikan hasil transaksi pertama alih-alih menagih dua kali.

## Circuit Breakers

Jika suatu layanan mati selama beberapa menit, melakukan retry terus-menerus hanya membuang thread. **Circuit breaker** memantau kegagalan panggilan dan langsung menerapkan **fail fast** (gagal seketika tanpa menunggu) melalui tiga status:
- **Closed:** Panggilan berjalan normal sambil menghitung rasio kegagalan (misal membuka jika > 50% gagal dalam 10 detik).
- **Open:** Semua panggilan langsung ditolak seketika tanpa menghubungi dependensi yang rusak. Setelah masa jeda (misal 30 detik), pindah ke *Half-open*.
- **Half-open:** Meloloskan beberapa panggilan uji coba. Jika sukses, kembali ke *Closed*; jika gagal, kembali ke *Open*.

![Gambar 26: Tiga status Circuit Breaker — Closed (normal sambil memantau error) -> Open saat error berlebih (langsung fail fast tanpa membebani dependensi) -> Half-open setelah 30 detik untuk mengirim panggilan uji coba guna memastikan pemulihan.](/images/belajar/fundamental-system-design/image26.png)

## Graceful Degradation dan Fallbacks

**Graceful degradation** memungkinkan sistem tetap melayani fungsi utama dengan fitur terbatas ketika layanan pendukung rusak, menggunakan **fallback** (jawaban cadangan):
- **Sembunyikan fitur:** Jika layanan ulasan mati, tampilkan halaman produk tanpa kotak ulasan.
- **Jawaban lebih sederhana:** Jika rekomendasi personal mati, tampilkan daftar produk terlaris (*best sellers*).
- **Gunakan data cache:** Jika layanan kurs mata uang mati, tampilkan kurs terakhir yang tersimpan lengkap dengan waktu pembaruannya.
- **Nilai bawaan (*default*):** Gunakan pengaturan standar jika layanan konfigurasi mati.

![Gambar 27: Halaman produk yang menerapkan Graceful Degradation — Meski layanan Reviews mati (bagian disembunyikan) dan Recommendations mati (fallback menampilkan produk terlaris), detail produk dan tombol Beli tetap berjalan normal sehingga pelanggan tetap bisa bertransaksi.](/images/belajar/fundamental-system-design/image27.png)

*Timeout*, *circuit breaker*, dan *fallback* bekerja serangkai: **timeout** menghentikan penantian, **circuit breaker** memutus panggilan yang pasti gagal, dan **fallback** menentukan apa yang tetap dilihat pengguna.

## Bulkheads

**Bulkhead** terinspirasi dari sekat kedap air di lambung kapal: jika satu kompartemen bocor, sekat mencegah air menenggelamkan seluruh kapal. Dalam perangkat lunak, setiap dependensi diberi **pool sumber daya terpisah** (misal dari 200 thread server, panggilan ke layanan ulasan dibatasi maksimal 20 thread). Saat layanan ulasan macet, hanya 20 thread tersebut yang terhambat sementara 180 thread lainnya tetap lancar melayani *checkout*.

## Error Handling dan Reporting

- Pisahkan **transient error** (boleh di-retry) dan **permanent error** (*fail fast* dengan pesan jelas).
- **Jangan pernah menelan/menyembunyikan error** secara diam-diam (`empty catch`) karena membuat sistem tampak sehat padahal menghasilkan data salah.
- Catat setiap error secara konsisten beserta kategori, nama layanan, dan `trace_id`, lalu hitung sebagai metrik.
- Pada antrean pesan (*message queue*), pindahkan pesan yang terus gagal diproses ke **Dead Letter Queue (DLQ)** agar tidak menyumbat pesan lain dan bisa diinspeksi engineer belakangan.

## Chaos Engineering

**Chaos engineering** adalah praktik menyuntikkan kegagalan secara sengaja dalam kondisi terkendali untuk membuktikan apakah mekanisme ketangguhan benar-benar bekerja sebelum insiden nyata terjadi. Eksperimen chaos mengikuti 4 langkah:
1. **Define normal:** Tentukan metrik kesehatan standar (misal tingkat sukses checkout).
2. **Predict:** Nyatakan hipotesis (*"Checkout tetap lancar jika satu instance reviews dimatikan"*).
3. **Inject:** Suntikkan kegagalan kecil (matikan 1 instance atau tambah delay pada 1% trafik).
4. **Compare & fix:** Bandingkan metrik dengan kondisi normal; bila meleset, perbaiki kelemahannya.

![Gambar 28: Empat langkah eksperimen Chaos Engineering — (1) Tentukan kondisi normal, (2) Buat prediksi, (3) Suntikkan kegagalan kecil (misal pakai Chaos Monkey atau Gremlin), dan (4) Bandingkan hasil serta perbaiki kelemahan yang ditemukan.](/images/belajar/fundamental-system-design/image28.png)

| Praktik Resilience | Melindungi dari | Biaya / Konsekuensi |
| :--- | :--- | :--- |
| **Fault tolerance** | Komponen yang berhenti total | Mesin dan salinan tambahan |
| **Timeouts** | Menunggu terlalu lama pada panggilan lambat | Sebagian panggilan lambat terpotong meski mungkin sukses |
| **Retries + Backoff** | Kegagalan sesaat (*transient*) | Tambahan sedikit latensi |
| **Circuit breakers** | Membanjiri dependensi yang sedang mati | Sebagian request langsung *fail fast* saat masa pemulihan |
| **Fallbacks** | Matinya dependensi fitur pendukung | Tampilan atau jawaban lebih sederhana |
| **Bulkheads** | Satu gangguan menghabiskan seluruh thread | Sumber daya terpecah sehingga kurang fleksibel berbagi |
| **Chaos engineering** | Kelemahan tersembunyi yang belum pernah diuji | Risiko terkendali saat menjalankan eksperimen |

## Ringkasan Poin Penting (Key Takeaways)

- Pada skala besar, kegagalan terjadi setiap hari; cegah **cascading failure** sebelum merembet ke layanan sehat.
- Kombinasikan **timeouts**, **retries dengan exponential backoff & jitter** (hanya untuk error transient + *idempotency key*), **circuit breakers**, **fallbacks**, dan **bulkheads**.
- Jangan sembunyikan error, gunakan **Dead Letter Queue** untuk pesan gagal, dan uji ketangguhan secara berkala lewat **chaos engineering**.
