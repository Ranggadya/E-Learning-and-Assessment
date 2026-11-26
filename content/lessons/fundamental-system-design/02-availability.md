---
slug: availability
title: "Availability (Ketersediaan Sistem & The Nines)"
track: system-design
chapter: "Fundamental System Design"
level: pemula
order: 9
prerequisites: [scalability]
estimated_minutes: 16
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Availability"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/availability"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan ke Bahasa Indonesia mengikuti struktur Heading 1, 2, 3 asli beserta tabel The Nines, rumus seri/paralel, dan keterangan diagram."
---

# Availability

## Apa Itu Availability? (What Availability Means)

**Availability (ketersediaan)** adalah persentase waktu ketika sebuah sistem dapat diakses dan bekerja melayani penggunanya. Waktu saat sistem bekerja disebut **uptime**, sedangkan waktu saat sistem tidak dapat melayani disebut **downtime**.

```text
Availability = uptime / (uptime + downtime) × 100%
```

Contoh: dalam sebulan (30 hari = 720 jam), sebuah sistem mati selama **7,2 jam**. Artinya *uptime*-nya adalah 712,8 jam, sehingga ketersediaannya adalah `712,8 / 720 = 99%`.

Sistem yang sangat lambat juga bisa dianggap *down*. Halaman yang butuh 40 detik untuk terbuka membuat pengguna pergi sebelum selesai. Karena itu, banyak tim menghitung ketersediaan berbasis **permintaan (*request-based*)**: membagi jumlah request sukses (yang selesai dalam batas waktu, misal di bawah 2 detik) dengan total request. Metode ini lebih adil karena gangguan 10 menit pada jam sibuk sore berdampak jauh lebih besar daripada 10 menit pada dini hari.

## Target "The Nines" (The Nines)

Target ketersediaan biasanya disebut berdasarkan jumlah angka sembilannya (*nines*): *"three nines"* berarti `99,9%`, *"four nines"* berarti `99,99%`. Setiap penambahan satu angka sembilan memangkas jatah *downtime* menjadi **10 kali lebih kecil**:

| Target | Sebutan | Downtime / Tahun | Downtime / Bulan (30 hr) | Downtime / Hari |
| :--- | :--- | :--- | :--- | :--- |
| **99%** | Two nines | 3,65 hari | 7,2 jam | 14,4 menit |
| **99,9%** | Three nines | 8,76 jam | 43,2 menit | 1,44 menit |
| **99,99%** | Four nines | 52,6 menit | 4,32 menit | 8,6 detik |
| **99,999%** | Five nines | 5,26 menit | 25,9 detik | 0,86 detik |

![Gambar 5: Batas downtime yang diperbolehkan tiap target ketersediaan — Setiap langkah ke kanan memotong jatah downtime 10 kali lipat; target five nines (99,999%) hanya menyisakan sekitar 26 detik per bulan sehingga pemulihan wajib berlangsung otomatis tanpa menunggu manusia.](/images/belajar/fundamental-system-design/image5.png)

Pada `99,9%`, tim punya sekitar 43 menit per bulan untuk menemukan dan memperbaiki masalah. Pada `99,999%`, jatahnya tinggal ~26 detik per bulan—manusia bahkan belum sempat membuka notifikasi peringatan. Maka sistem *five nines* wajib mampu mendeteksi dan memulihkan kegagalan secara **otomatis**, dan biayanya pun jauh lebih mahal (lebih banyak server, pusat data, dan upaya rekayasa).

## Planned dan Unplanned Downtime

- **Planned downtime:** Waktu henti yang direncanakan tim (upgrade software, migrasi skema database, penggantian perangkat keras).
- **Unplanned downtime:** Waktu henti tak terduga (server crash, rilis kode bermasalah, disk penuh, jaringan putus, atau listrik padam).

Bagi pengguna, keduanya sama-sama merugikan. Karena itu sistem modern juga menghindari *planned downtime* dengan teknik **rolling update**—memperbarui satu server demi satu server sementara server lain tetap melayani trafik.

## Availability pada Komponen Seri dan Paralel (Availability of Connected Parts)

Sebuah request melewati banyak komponen sekaligus (load balancer, app server, database). Ketersediaan total bergantung pada apakah komponen tersebut terhubung secara **seri** atau **paralel**:

- **Komponen Seri (*In Series*):** Request membutuhkan **seluruh** komponen. Jika satu saja gagal, request gagal.
  - Rumus: `A(total) = A1 × A2 × A3`
  - Contoh: Load balancer `99,99%` × App server `99,9%` × Database `99,9%` = **`99,79%`** (~18 jam downtime/tahun). Perhatikan bahwa meski tiap komponen minimal 99,9%, gabungannya justru turun di bawah 99,9%!
- **Komponen Paralel (*In Parallel*):** Salah satu salinan saja sudah cukup melayani request; sistem hanya mati jika **semua** salinan mati bersamaan.
  - Rumus: `A(total) = 1 - (1 - A1) × (1 - A2)`
  - Contoh: Dua server biasa yang masing-masing `99%` (gagal 1%) hanya gagal bersamaan sebesar `1% × 1% = 0,01%`, menghasilkan ketersediaan gabungan **`99,99%` (*four nines*)**!

![Gambar 6: Ketersediaan komponen seri vs paralel — Pada rangkaian seri (atas), setiap komponen wajib menurunkan total ketersediaan (99,79%); pada rangkaian paralel (bawah), dua salinan independen 99% mengangkat total ketersediaan menjadi 99,99%.](/images/belajar/fundamental-system-design/image6.png)

Syarat mutlak rumus paralel: salinan-salinan tersebut harus **gagal secara independen** (*fail independently*). Dua server di rak yang sama berbagi satu sumber listrik, sehingga jika listrik rak padam keduanya mati bersamaan. Redundansi sejati menempatkan salinan di lokasi, listrik, dan jalur jaringan terpisah.

## Single Points of Failure (SPOF)

**Single point of failure (SPOF)** adalah satu komponen yang kegagalannya langsung melumpuhkan seluruh sistem. Contoh: tiga server aplikasi tetapi hanya satu database—saat database mati, ketiga server aplikasi tidak bisa berbuat apa-apa.

Cara menemukan SPOF sangat mudah: telusuri jalur satu request dari awal hingga akhir, lalu tanyakan pada setiap komponen: *"Jika hanya bagian ini yang mati, apakah request tetap berhasil?"* Setiap komponen yang jawabannya **"tidak"** adalah SPOF.

![Gambar 7: Menemukan dan menghilangkan Single Point of Failure — Sebelum perbaikan (atas), Load Balancer tunggal dan Database tunggal adalah SPOF; setelah perbaikan (bawah), setiap lapisan memiliki salinan cadangan (2 load balancer, app server di dua zona, serta primary dan replica database).](/images/belajar/fundamental-system-design/image7.png)

## Cara Sistem Menjaga Ketersediaan (How Systems Stay Available)

Tidak ada sistem yang dapat mencegah semua kegagalan. Sistem berketersediaan tinggi **mengasumsikan komponen pasti akan rusak** dan dirancang agar tetap melayani saat itu terjadi melalui teknik-teknik berikut:

### Redundancy

Menyimpan lebih dari satu salinan untuk setiap komponen penting, dijalankan dengan dua pola:
- **Active-Active:** Seluruh salinan aktif melayani trafik secara bersamaan. Jika satu mati, salinan lain menanggung bebannya (tiap mesin butuh kapasitas cadangan).
- **Active-Passive:** Satu salinan (*active*) melayani 100% trafik sementara salinan lain (*standby*) bersiaga mengambil alih saat *failover*.

![Gambar 8: Dua cara menjalankan salinan redundan — Active-active (kiri) membagi trafik 50%-50% tanpa mesin menganggur, sedangkan Active-passive (kanan) mengarahkan 100% ke Active dan memindahkan ke Standby saat failover.](/images/belajar/fundamental-system-design/image8.png)

### Replication

Menyimpan salinan data yang sama di beberapa mesin database. Database *primary* menerima tulis dan menyalinnya ke *replicas*. Keterlambatan sinkronisasi beberapa detik disebut **replication lag**. Jika *primary* mati, salah satu replika dapat dipromosikan menjadi *primary* baru.

### Load Balancing dan Health Checks

**Load balancer** menyebarkan request ke banyak server dan menjalankan **health check** berkala tiap beberapa detik untuk memutus pengiriman trafik ke server yang berhenti merespons.

### Monitoring dan Alerts

**Monitoring** mengumpulkan metrik sistem terus-menerus (*error rate*, latensi, CPU), sementara **alert** langsung memberi tahu engineer saat metrik melampaui batas (misal error > 1% selama 5 menit) sebelum sebagian besar pengguna menyadarinya.

### Failover

**Failover** adalah proses memindahkan trafik dari komponen yang rusak ke salinan yang sehat melalui 4 tahap:
1. **Detect:** Sistem mendeteksi kegagalan (misal gagal 3 kali *health check* berturut-turut × 5 detik = 15 detik).
2. **Decide:** Sistem memilih salinan sehat pengganti (atau mempromosikan replika database).
3. **Switch:** Trafik dialihkan dengan memperbarui konfigurasi load balancer atau DNS.
4. **Restore:** Komponen yang rusak diperbaiki dan dikembalikan ke pool saat pengguna sudah kembali terlayani.

![Gambar 9: Empat langkah failover — Pengguna mengalami error selama tiga tahap pertama (Detect, Decide, Switch); otomatisasi menjaga total jeda hanya dalam hitungan detik, sedangkan tahap Restore dilakukan setelah layanan pulih.](/images/belajar/fundamental-system-design/image9.png)

### Zona dan Region Terpisah (Separate Zones and Regions)

Penyedia cloud memisahkan infrastruktur menjadi **Availability Zone** (pusat data dengan listrik, pendingin, dan jaringan terpisah) dan **Region** (wilayah geografis berisi beberapa zona). Menyebar salinan lintas zona melindungi dari kerusakan satu gedung; menyebar lintas region melindungi dari bencana satu wilayah, dengan tambahan biaya dan latensi replikasi jarak jauh.

### Melayani Sebagian Alih-Alih Gagal Total (Serve Less Instead of Failing)

Teknik **graceful degradation**: jika layanan rekomendasi produk mati, halaman produk tetap tampil normal tanpa bagian *"Mungkin Anda Suka"* sehingga pengguna tetap bisa membeli barang.

### Load Shedding dan Rate Limiting

**Load shedding** sengaja menolak sebagian request dengan pesan cepat *"coba lagi nanti"* ketika server mulai kewalahan agar server tetap punya kapasitas melayani sisa request dengan baik. **Rate limiting** membatasi jumlah request per klien dalam satu jendela waktu.

### Safe Releases

Banyak insiden berawal dari rilis kode baru. **Canary deployment** mengirim versi baru ke persentase kecil pengguna (misal 5%), memantau *error rate*, lalu langsung melakukan **rollback** jika error meningkat.

## MTBF dan MTTR

Dua metrik kunci yang menjelaskan rumus ketersediaan:
- **MTBF (*Mean Time Between Failures*):** Rata-rata durasi sistem berjalan normal sebelum mengalami kegagalan.
- **MTTR (*Mean Time To Repair*):** Rata-rata waktu yang dibutuhkan untuk memulihkan sistem setelah kegagalan.

```text
Availability = MTBF / (MTBF + MTTR)
```

Jika sistem gagal setiap 1.000 jam dan butuh 1 jam untuk pulih, ketersediaannya `1.000 / 1.001 = 99,9%`. Jika frekuensi kegagalan **tetap sama**, namun *failover* otomatis mempercepat pemulihan menjadi 6 menit (`0,1` jam), ketersediaannya langsung melonjak menjadi `1.000 / 1.000,1 = 99,99%`. Mempercepat pemulihan menambah satu angka sembilan tanpa harus membuat sistem mustahil rusak.

## SLI, SLO, dan SLA

- **SLI (*Service Level Indicator*):** Angka nyata yang Anda ukur (misal persentase request sukses selama 30 hari terakhir).
- **SLO (*Service Level Objective*):** Target internal tim untuk SLI tersebut (misal `99,95%`).
- **SLA (*Service Level Agreement*):** Janji resmi dalam kontrak kepada pelanggan beserta penalti/diskon tagihan bila dilanggar (biasanya sedikit lebih longgar dari SLO, misal `99,9%`, agar tim mendapat peringatan lebih awal sebelum melanggar kontrak).

Jatah downtime yang diperbolehkan SLO disebut **error budget** (misal 43,2 menit/bulan untuk `99,9%`). Jika *error budget* hampir habis, tim menghentikan rilis fitur baru dan memprioritaskan stabilitas.

## Availability, Reliability, dan Consistency

- **Availability:** Apakah sistem merespons?
- **Reliability:** Apakah sistem memberikan hasil yang **benar** tanpa kesalahan dalam jangka panjang? *(Sistem bisa tersedia tetapi tidak andal bila cepat menjawab tetapi mengembalikan data salah).*
- **Consistency:** Apakah semua salinan data menampilkan nilai yang sama?
  - **Strong consistency:** Semua salinan selalu sama di setiap saat (tulis menunggu semua salinan; lebih lambat dan ketersediaan lebih rendah).
  - **Weak consistency:** Tidak ada jaminan pembacaan melihat tulisan terbaru (misal panggilan video live yang melewatkan beberapa frame; lebih cepat dan tersedia).
  - **Eventual consistency:** Jika penulisan berhenti, pada akhirnya semua salinan mencapai nilai yang sama.

Ketika jaringan antar-salinan terputus (*network partition*), sistem harus memilih antara tetap menjawab memakai data lama (*available*) atau menolak menjawab sampai salinan sepakat (*consistent*)—inilah inti dari **Teorema CAP**.
