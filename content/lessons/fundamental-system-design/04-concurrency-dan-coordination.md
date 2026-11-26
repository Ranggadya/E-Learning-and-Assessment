---
slug: concurrency-dan-coordination
title: "Concurrency, Synchronization, Coordination, & Consistency Models"
track: system-design
chapter: "Fundamental System Design"
level: lanjut
order: 11
prerequisites: [latency-dan-performance]
estimated_minutes: 18
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Concurrency and Coordination"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/concurrency-and-coordination"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan ke Bahasa Indonesia mengikuti struktur Heading 1, 2, 3 asli beserta tabel perbandingan dan 7 model konsistensi."
---

# Concurrency dan Coordination

## Apa Itu Concurrency? (What Concurrency Means)

**Concurrency (konkurensi)** berarti banyak tugas sedang berjalan pada rentang waktu yang sama. Web server melayani ribuan request sekaligus, database melayani banyak pengguna bersamaan, dan di sistem terdistribusi banyak mesin memodifikasi data yang sama. Sebuah program yang berjalan disebut *process*, dan di dalamnya bisa terdapat beberapa *threads* yang berbagi memori. Konkurensi memungkinkan sistem melayani banyak orang, tetapi juga melahirkan kelas bug yang sulit dilacak.

### Race Conditions

**Race condition** adalah bug di mana hasil akhir bergantung pada urutan waktu eksekusi tugas-tugas yang berjalan bersamaan.

Contoh klasik: sebuah unggahan memiliki **100 likes**. Dua pengguna menekan tombol *like* pada detik yang persis sama dan ditangani oleh dua server:
1. Server A membaca jumlah like: `100`.
2. Server B membaca jumlah like: `100`.
3. Server A menambah 1 dan menulis `101`.
4. Server B menambah 1 dan menulis `101` (menimpa perubahan Server A).

Dua *like* ditambahkan, tetapi angkanya hanya naik satu menjadi 101. Bug ini disebut **lost update** dan sering baru muncul ketika trafik tinggi.

![Gambar 15: Race condition yang menyebabkan lost update — Server A dan Server B sama-sama membaca nilai awal 100 sebelum keduanya menulis 101, sehingga satu penambahan like hilang. Solusinya adalah lock atau pengecekan versi.](/images/belajar/fundamental-system-design/image15.png)

## Concurrency Control

**Concurrency control** mengatur akses terhadap data atau sumber daya bersama agar proses paralel tidak saling menimpa atau merusak konsistensi data. Ada tiga teknik utama:

### Locking

**Lock (kunci)** membatasi akses sehingga hanya **satu proses** yang boleh memodifikasi sumber daya pada satu waktu; proses lain wajib menunggu hingga kunci dilepas. Pada contoh like di atas, Server A mengunci baris, membaca 100, menulis 101, lalu melepas kunci; barulah Server B membaca 101 dan menulis 102.

Biaya locking ada dua: **waktu tunggu** (kunci yang ditahan lama memperlambat sistem) dan risiko **deadlock** (Proses 1 memegang kunci X sambil menunggu Y, sementara Proses 2 memegang Y sambil menunggu X). Deadlock dicegah dengan selalu mengambil kunci dalam urutan yang sama atau memasang batas waktu tunggu (*lock timeout*).

### Optimistic Concurrency Control

Pendekatan optimistik mengasumsikan **konflik jarang terjadi**. Semua proses berjalan bebas tanpa mengunci di awal, lalu sebelum menyimpan, tiap proses memeriksa nomor versi data:
1. Server A dan Server B sama-sama membaca data: `likes = 100, version = 7`.
2. Server A menulis `101` dengan syarat `WHERE version = 7` -> sukses, versi naik menjadi `8`.
3. Server B mencoba menulis `101` dengan syarat `WHERE version = 7` -> gagal karena versi kini `8`.
4. Server B membaca ulang (`101, version = 8`), lalu mencoba lagi dan sukses menulis `102`.

![Gambar 16: Perbandingan Locking vs Optimistic Concurrency Control — Locking memaksa Server B menunggu gilirannya (cocok jika konflik sering terjadi), sedangkan Optimistic membiarkan keduanya jalan lalu meminta Server B mengulang bila versi sudah berubah (cocok jika konflik jarang terjadi).](/images/belajar/fundamental-system-design/image16.png)

| Aspek | Locking (Pessimistic) | Optimistic Concurrency Control |
| :--- | :--- | :--- |
| **Asumsi** | Konflik sering terjadi | Konflik jarang terjadi |
| **Saat terjadi konflik** | Proses kedua **menunggu** | Proses kedua **mencoba ulang (*retry*)** |
| **Biaya utama** | Antrean tunggu & risiko *deadlock* | Kerja berulang saat sering terjadi konflik |
| **Cocok untuk** | Pemesanan kursi pesawat terakhir | Mengedit profil pengguna |

### Transactional Memory

Mengelompokkan beberapa operasi menjadi satu **transaction** yang berjalan secara **atomik** (semua langkah berhasil bersama atau gagal bersama). Transfer uang (kurangi saldo A, tambah saldo B) tidak pernah bisa terpotong di tengah jalan sehingga tidak ada proses lain yang melihat uang "hilang sementara" dari kedua rekening.

## Synchronization

**Synchronization (sinkronisasi)** mengoordinasikan **urutan dan waktu eksekusi** antar-proses/thread menggunakan empat perangkat utama:

- **Mutexes:** **Mutex** (*mutual exclusion lock*) hanya mengizinkan tepat 1 thread mengakses sumber daya dalam satu waktu.
- **Semaphores:** **Semaphore** membatasi jumlah maksimum thread yang boleh mengakses pool sumber daya sekaligus memakai penghitung slot (misal 3 koneksi database untuk 4 request—request ke-4 tidur sampai salah satu slot dilepas; semaphore ber-1 slot bekerja persis seperti mutex).
- **Condition Variables:** Membuat thread tidur sampai suatu kondisi terpenuhi (misal *worker* tidur menunggu antrean berisi tugas, lalu dibangunkan oleh thread pengirim tugas tanpa *polling* boros CPU).
- **Barriers:** Menahan semua thread di titik temu sampai semuanya selesai fase 1, baru bersama-sama lanjut ke fase 2.

![Gambar 17: Semaphore membatasi jumlah proses yang boleh masuk secara bersamaan — Dengan 3 slot koneksi database, Request 1–3 langsung masuk sementara Request 4 menunggu sampai salah satu slot dilepas.](/images/belajar/fundamental-system-design/image17.png)

| Aspek | Concurrency Control | Synchronization |
| :--- | :--- | :--- |
| **Pertanyaan utama** | *"Siapa yang boleh mengubah data sekarang?"* | *"Dalam urutan apa pekerjaan dijalankan?"* |
| **Perangkat** | Locking, Optimistic Control, Transactional Memory | Mutex, Semaphore, Condition Variable, Barrier |
| **Masalah yang dicegah** | Konflik perubahan data bersamaan | Eksekusi pekerjaan dalam urutan yang salah |

## Coordination Services

Kunci dan semaphore mudah dipakai di dalam satu mesin yang berbagi RAM, namun **sangat sulit lintas banyak mesin** (tidak berbagi memori, pesan jaringan bisa terlambat/hilang, dan mesin bisa mati mendadak).

Karena itu sistem terdistribusi memakai layanan koordinasi khusus seperti **Apache ZooKeeper**, **etcd**, dan **Consul** yang menyediakan empat kapabilitas siap pakai:
1. **Configuration Management:** Seluruh server membaca pengaturan terpusat yang selalu tersinkronisasi.
2. **Service Discovery:** Menemukan alamat instance layanan lain yang sedang sehat secara otomatis.
3. **Leader Election:** Memilih tepat satu server sebagai pemimpin (*leader*) dan otomatis memilih pemimpin baru jika pemimpin lama mati.
4. **Distributed Locking:** Kunci bersama lintas mesin yang memiliki batas kedaluwarsa (*TTL/lease*) agar kunci otomatis terlepas bila pemegangnya crash.

Layanan koordinasi berjalan sebagai cluster kecil (biasanya 3 atau 5 node) yang hanya menerima perubahan apabila disetujui mayoritas node (**quorum**), sehingga tetap beroperasi walau satu node rusak.

![Gambar 18: Layanan koordinasi terdistribusi (ZooKeeper, etcd, Consul) — Cluster kecil berbasis quorum yang menyediakan manajemen konfigurasi, service discovery, leader election, dan distributed locks secara andal.](/images/belajar/fundamental-system-design/image18.png)

## Consistency Models

Saat data direplikasi ke banyak server (*replicas*), perubahan di satu replika tidak langsung muncul di replika lain pada detik yang sama. **Consistency model** adalah janji sistem mengenai siapa yang masih boleh melihat data lama setelah sebuah penulisan terjadi, dan berapa lama.

*Contoh bersama:* Sarah mengunggah status `"Got the job!"` di aplikasi media sosial yang memiliki replika lintas wilayah. Temannya, Raj dan Mia, membacanya dari wilayah berbeda.

## Janji untuk Satu Pembaca (What One Reader Is Promised)

- **Eventual Consistency:** Raj melihat unggahan setelah 2 detik dan Mia setelah 10 detik. Keduanya akhirnya melihat data yang sama, tanpa janji batas waktu. Sangat cepat dan tersedia tinggi.
- **Monotonic Read Consistency:** Begitu Raj sudah melihat unggahan Sarah, ia tidak akan pernah melihat unggahan itu "menghilang" pada refresh berikutnya (tidak mundur ke versi replika yang lebih tua).
- **Read-Your-Writes Consistency:** Sarah (sang penulis) dijamin langsung melihat unggahannya sendiri seketika, meski Raj dan Mia belum melihatnya.
- **Session Consistency:** Jaminan *read-your-writes* yang berlaku sepanjang satu sesi kunjungan pengguna meski request-nya berpindah replika.

## Aturan yang Disepakati Semua Pembaca (What Everyone Agrees On)

- **Causal Consistency:** Jika Raj membalas `"Selamat!"` pada unggahan Sarah, siapa pun yang bisa melihat balasan Raj wajib bisa melihat unggahan Sarah lebih dulu (sebab selalu terlihat sebelum akibat).
- **Sequential Consistency:** Jika Sarah mengunggah lalu Mia mengunggah, **semua pembaca** melihat urutan kedua unggahan secara identik—meskipun urutan bersama tersebut tidak harus cocok dengan jam dinding nyata.
- **Linearizability (Strong Consistency):** *Sequential consistency* **ditambah ketepatan jam nyata**. Setiap operasi bersifat atomik dan langsung terlihat oleh seluruh node di seluruh dunia tepat pada saat penulisan selesai dikonfirmasi. Jika tulisan Sarah selesai pukul `10:00:00` dan Raj membaca pukul `10:00:05`, linearizability melarang Raj menerima versi lama.

![Gambar 19: Tujuh model konsistensi dalam dua kelompok — Kelompok kiri (Eventual, Monotonic reads, Read your writes, Session) memberi janji bagi satu pembaca; kelompok kanan (Causal, Sequential, Linearizable) menetapkan aturan urutan bagi seluruh pembaca. Semakin kuat janjinya, semakin tinggi biaya koordinasi.](/images/belajar/fundamental-system-design/image19.png)

Janji konsistensi yang lebih kuat membutuhkan koordinasi antar-replika lebih ketat (tulis lebih lambat atau ketersediaan turun saat jaringan putus). Karena itu satu sistem biasanya memilih model berbeda per fitur: saldo bank memakai **linearizability**, sementara *news feed* cukup memakai **eventual consistency**.

## Ringkasan Poin Penting (Key Takeaways)

- **Race condition** (seperti *lost update*) muncul saat beberapa proses memodifikasi data bersamaan tanpa kendali.
- **Concurrency control** melindungi akses data lewat *locking*, *optimistic concurrency control*, dan *transactional memory*.
- **Synchronization** mengatur urutan eksekusi memakai *mutex*, *semaphore*, *condition variable*, dan *barrier*.
- Layanan koordinasi seperti **ZooKeeper**, **etcd**, dan **Consul** menyediakan konfigurasi terpusat, *service discovery*, *leader election*, dan *distributed locking* berbasis **quorum**.
- Pilih **consistency model** berdasarkan kebutuhan tiap operasi—bukan menyamaratakan seluruh sistem.
