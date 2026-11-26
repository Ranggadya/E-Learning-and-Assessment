---
slug: fault-tolerance-vs-high-availability
title: "Fault Tolerance vs. High Availability (Dua Janji yang Berbeda)"
track: system-design
chapter: "Fundamental System Design"
level: lanjut
order: 14
prerequisites: [resilience-dan-error-handling]
estimated_minutes: 12
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Fault Tolerance vs. High Availability"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/fault-tolerance-vs-high-availability"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan ke Bahasa Indonesia mengikuti struktur Heading 1, 2, 3 asli beserta tabel perbandingan dan diagram keputusan."
---

# Fault Tolerance vs. High Availability

## Dua Janji yang Berbeda (Two Different Promises)

Kedua istilah ini sering dianggap sama, padahal keduanya menawarkan janji yang berbeda kepada pengguna:

- **Fault Tolerance (Toleransi Kegagalan):** Kemampuan sistem untuk **terus beroperasi dengan benar tanpa jeda sama sekali** ketika sebagian komponennya rusak. Pengguna tidak menyadari adanya kegagalan, dan **tidak ada data yang hilang**.
- **High Availability (Ketersediaan Tinggi):** Kemampuan sistem untuk tetap beroperasi pada persentase waktu yang sangat tinggi (misal 99,99%). Ketika suatu komponen rusak, **boleh terjadi jeda singkat** sementara sistem mendeteksi dan melakukan pemulihan cepat.

Singkatnya: **Fault tolerance berarti pengguna tidak pernah merasakan kegagalan. High availability berarti pengguna jarang merasakannya, dan hanya sebentar saja.**

![Gambar 29: Apa yang terjadi setelah satu server gagal pada kedua pendekatan — Pada Fault tolerance (atas), salinan aktif langsung melayani tanpa jeda dan tanpa kehilangan data; pada High availability (bawah), ada jeda singkat (misal 30 detik) untuk deteksi dan failover sebelum layanan kembali normal.](/images/belajar/fundamental-system-design/image29.png)

## Cara Kerja Fault Tolerance (How Fault Tolerance Works)

Sistem *fault-tolerant* dirancang agar kegagalan tidak memerlukan langkah pemulihan yang terasa oleh pengguna karena salinannya sudah bekerja bersamaan sejak awal:
- **Salinan Aktif (*Active Copies*):** Beberapa salinan menjalankan pekerjaan yang sama secara bersamaan. Jika satu mati, yang lain sudah siap tanpa perlu menyalakan atau memindahkan apa pun.
- **Replikasi Sinkron (*Synchronous Replication*):** Operasi tulis baru dianggap selesai (`"saved"`) setelah benar-benar tersimpan di minimal **dua mesin**. Jika mesin pertama crash sedetik kemudian, data tetap utuh di mesin kedua—tidak ada data hilang.
- **Voting:** Beberapa sistem kritis (seperti komputer kendali penerbangan pesawat) menjalankan perhitungan identik di 3+ komputer lalu mengambil hasil suara mayoritas (**quorum**).
- **Perangkat Keras Redundan:** Dua *power supply*, dua jalur jaringan, dan susunan disk **RAID** di dalam mesin fisik.
- **Failover Otomatis Seketika:** Tanpa campur tangan manusia.

![Gambar 30: Mengapa Fault Tolerance tidak kehilangan data — Synchronous replication (kiri) menunggu replica ikut menyimpan sebelum menjawab "saved" ke klien (nol kehilangan data, tulis sedikit lebih lambat), sedangkan Asynchronous replication (kanan) langsung menjawab "saved" sebelum menyalin ke replica (tulis cepat, tetapi tulisan terbaru bisa hilang saat crash).](/images/belajar/fundamental-system-design/image30.png)

Konsekuensinya: **biaya jauh lebih mahal** (sumber daya selalu ganda/tiga kali lipat), operasi tulis lebih lambat karena menunggu sinkronisasi lintas mesin, serta arsitektur lebih rumit dibangun dan diuji.

## Cara Kerja High Availability (How High Availability Works)

Sistem *high availability* juga memakai redundansi, tetapi menerima jeda singkat saat pemulihan:
- **Clustering & Load Balancing:** Layanan berjalan dalam cluster di belakang **load balancer** yang mengeluarkan node rusak lewat **health check**.
- **Pemulihan Cepat (*Rapid Recovery*):** Salinan *standby* mengambil alih (atau replika database dipromosikan menjadi *primary* baru) dalam hitungan detik hingga satu-dua menit.
- **Replikasi Asinkron (*Asynchronous Replication*):** *Primary* mengonfirmasi tulis lebih dulu lalu menyalin ke replika sesaat kemudian. Operasi tulis lebih cepat, namun transaksi beberapa detik terakhir sebelum *primary* crash berisiko hilang.

Keunggulan utamanya adalah **efisiensi biaya**: memberikan perlindungan sangat tinggi dengan kompleksitas dan anggaran jauh lebih masuk akal untuk mayoritas bisnis.

## Lima Perbedaan Kunci (The Five Key Differences)

1. **Tujuan (*Objective*):** Fault tolerance mengejar operasi tanpa henti agar kegagalan tak terlihat pengguna; High availability mengejar persentase *uptime* setinggi mungkin dengan pemulihan cepat.
2. **Pendekatan (*Approach*):** Fault tolerance memakai salinan aktif paralel & replikasi sinkron; High availability memakai cluster, load balancing, dan failover cepat ke *standby*.
3. **Downtime:** Fault tolerance menargetkan **nol downtime** saat gagal; High availability menerima jeda singkat (detik sampai menit).
4. **Biaya & Kompleksitas:** Fault tolerance jauh lebih mahal dan kompleks; High availability jauh lebih hemat biaya.
5. **Integritas Data:** Fault tolerance menjamin **nol kehilangan data**; High availability mengutamakan *uptime* sehingga sebagian kecil data terbaru bisa hilang pada replikasi asinkron.

| Aspek Perbandingan | Fault Tolerance | High Availability |
| :--- | :--- | :--- |
| **Downtime saat gagal** | Tidak ada (nol jeda) | Singkat dan dapat diterima |
| **Kehilangan data** | Tidak ada | Mungkin terjadi pada tulisan paling baru |
| **Teknik utama** | Salinan aktif, replikasi sinkron, *voting* | Cluster, load balancing, *fast failover* |
| **Biaya operasional** | Tinggi | Seimbang dengan target *nines* |
| **Contoh penerapan** | Perbankan inti, alat medis, kontrol penerbangan | Toko online, streaming, mayoritas aplikasi bisnis |

## Cara Memilih di Antara Keduanya (Choosing Between Them)

Ajukan **dua pertanyaan sederhana** untuk setiap bagian sistem Anda:
1. *"Apakah jeda beberapa detik dapat menyebabkan bahaya serius atau kerugian masif?"* -> Jika **Ya**, bagian itu wajib **Fault Tolerance**.
2. *"Jika jeda singkat bisa diterima, apakah kehilangan data tulisan beberapa detik terakhir tidak dapat ditoleransi?"* -> Jika **Ya**, lindungi lapisan datanya dengan **replikasi sinkron**, lalu gunakan **High Availability** untuk komponen sisanya. Jika **Tidak**, **High Availability** sudah sangat cukup dan jauh lebih hemat.

![Gambar 31: Diagram alur keputusan memilih Fault Tolerance vs High Availability — Tanyakan dua hal per komponen: dampak downtime beberapa detik dan toleransi kehilangan data terbaru. Sistem nyata biasanya memadukan keduanya pada komponen yang berbeda.](/images/belajar/fundamental-system-design/image31.png)

Sebagian besar sistem nyata **menggabungkan keduanya secara selektif**: pada sebuah e-commerce, pencatatan pembayaran (*payment ledger*) memakai **fault tolerance** (replikasi sinkron agar tidak ada transaksi hilang), katalog produk memakai **high availability**, sedangkan layanan rekomendasi cukup menerapkan **graceful degradation**. Memilih per komponen memberi perlindungan maksimal di titik kritis tanpa pemborosan biaya di semua tempat.

## Ringkasan Poin Penting (Key Takeaways)

- **Fault tolerance** menjamin nol downtime dan nol kehilangan data dengan salinan selalu aktif serta replikasi sinkron (biaya tinggi).
- **High availability** menjaga *uptime* sangat tinggi lewat cluster, load balancing, dan failover cepat dengan menerima jeda singkat (lebih hemat biaya).
- Keduanya bukan sekadar "tingkat rendah vs tinggi", melainkan **trade-off berbeda** antara biaya, jeda layanan, dan keamanan data.
- Desain terbaik memadukan keduanya sesuai tingkat kekritisan masing-masing komponen sistem.
