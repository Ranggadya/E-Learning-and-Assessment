---
slug: monitoring-dan-observability
title: "Monitoring dan Observability (Metrics, Logs, & Traces)"
track: system-design
chapter: "Fundamental System Design"
level: menengah
order: 12
prerequisites: [concurrency-dan-coordination]
estimated_minutes: 14
status: reviewed
origin: translated
sources:
  - title: "Grokking System Design Fundamentals — Monitoring and Observability"
    url: "https://www.designgurus.io/course-play/grokking-system-design-fundamentals/doc/monitoring-and-observability"
    license: "Educational Reference"
    author: "DesignGurus.io"
    changes: "Diterjemahkan ke Bahasa Indonesia mengikuti struktur Heading 1, 2, 3 asli beserta studi kasus investigasi checkout dan keterangan diagram."
---

# Monitoring dan Observability

## Perbedaan Monitoring dan Observability

Kedua istilah ini sering dianggap sama, padahal berbeda secara mendasar:

- **Monitoring** adalah aktivitas memantau metrik dan ambang batas yang **sudah ditentukan sebelumnya** agar tim tahu *bahwa* ada sesuatu yang salah (misal *error rate* melewati batas atau disk hampir penuh). Monitoring menjawab pertanyaan yang sudah Anda ketahui sejak awal.
- **Observability** adalah sifat yang dimiliki sistem: seberapa jauh keluaran sistem (**metrics**, **logs**, dan **traces**) memungkinkan Anda menjelaskan **mengapa** masalah tak terduga terjadi—tanpa perlu menulis dan men-deploy kode baru terlebih dahulu.

Contoh sederhana: sistem yang *monitored* memberi tahu Anda bahwa **6% transaksi checkout sedang gagal**. Sistem yang *observable* memungkinkan Anda menelusuri satu transaksi gagal langkah demi langkah hingga menemukan akar penyebabnya.

![Gambar 20: Lima bagian utama Monitoring dan Observability — Sistem menghasilkan 3 sinyal utama (Metrics, Traces, Logs), yang kemudian dimanfaatkan oleh 2 perangkat operasional (Alerts dan Dashboards).](/images/belajar/fundamental-system-design/image20.png)

## Metrics

**Metrics** adalah angka numerik yang mengukur performa, kesehatan, dan perilaku sistem dalam bentuk deret waktu (*time series*), misalnya mencatat tingkat error checkout tiap 10 detik untuk melihat tren pasca-rilis.

### Tiga Jenis Metrik Utama
- **Counter:** Angka yang hanya terus naik (misal total request sejak server menyala); laju perubahannya menghasilkan *requests per second*.
- **Gauge:** Angka yang bisa naik-turun (misal pemakaian RAM saat ini atau panjang antrean).
- **Histogram:** Menghitung distribusi nilai ke dalam rentang (*buckets*), misal jumlah request 0–100 ms, 100–250 ms, dst.—digunakan untuk menghitung persentil **p95** dan **p99**.

### Four Golden Signals (Panduan Google SRE)
1. **Latency:** Berapa lama request diproses.
2. **Traffic:** Berapa banyak permintaan masuk per detik.
3. **Errors:** Berapa banyak permintaan gagal.
4. **Saturation:** Seberapa penuh kapasitas sistem (misal CPU 90% atau antrean terus membengkak).

Perangkat populer: **Prometheus**, **Graphite**, dan **InfluxDB**.
*Peringatan penting:* Jangan menempelkan label ber-kardinalitas tinggi (seperti `user_id` dengan 10 juta nilai unik) pada metrik, karena setiap nilai label menciptakan *time series* terpisah yang dapat melumpuhkan server metrik Anda.

## Logging

**Logs** adalah rekaman detail kejadian yang ditulis komponen sistem saat berjalan, lengkap dengan waktu (*timestamp*), level kepentingan (`DEBUG`, `INFO`, `WARN`, `ERROR`), dan pesan.

Gunakan **structured logging** (berformat JSON) agar mudah dicari dan disaring secara otomatis:

```json
{"time": "14:02:17", "level": "ERROR", "service": "payment", "trace_id": "a1b2c3", "message": "card provider timeout", "duration_ms": 5003}
```

Log yang tersebar di 50 server hampir mustahil dicari saat insiden. Karena itu digunakan **Centralized Logging** seperti **ELK Stack** (*Elasticsearch, Logstash, Kibana*) atau **Graylog**. Atur masa simpan (*retention*, misal 14 hari) untuk menghemat biaya penyimpanan, dan **jangan pernah mencatat password, nomor kartu kredit, atau data sensitif ke dalam log**.

## Distributed Tracing

**Distributed tracing** melacak perjalanan **satu request** dari ujung ke ujung melintasi berbagai **microservices**:
1. Saat request masuk ke sistem, ia diberi satu **Trace ID** unik.
2. Setiap layanan meneruskan `trace_id` tersebut ke layanan berikutnya melalui header HTTP/gRPC.
3. Setiap layanan mencatat **span** (satu langkah kerja berdurasi waktu dengan nama layanan, waktu mulai, durasi, serta `span_id` unik).
4. Sistem tracing menggabungkan seluruh span ber-`trace_id` sama menjadi satu pohon jejak utuh.

![Gambar 21: Satu Trace yang tersusun dari beberapa Span — Total request checkout memakan 2.300 ms: Order service 40 ms, Payment service 2.200 ms (di dalamnya panggilan ke Card provider memakan 2.150 ms), dan Email service 30 ms. Span lambat langsung terlihat seketika.](/images/belajar/fundamental-system-design/image21.png)

Dengan menyertakan `trace_id` dan `span_id` di setiap baris log, engineer bisa langsung melompat dari span yang lambat ke baris log persis yang terjadi di langkah tersebut. Perangkat populer: **Jaeger**, **Zipkin**, dan standar terbuka **OpenTelemetry**. Untuk menghemat biaya pada sistem sibuk, tim biasanya menyimpan sampel trace (misal 1 dari 100 request normal) namun tetap menyimpan **100% trace yang gagal atau sangat lambat**.

## Alerting dan Anomaly Detection

**Alerting** memberi tahu tim yang bertugas (*on-call*) ketika sistem menunjukkan gejala tidak normal, dibuat lewat dua metode:
- **Predefined Thresholds:** Aturan batas manual (misal kirim peringatan jika *error rate* > 2% selama 5 menit berturut-turut) untuk menangkap masalah yang sudah diantisipasi.
- **Anomaly Detection:** Model *machine learning* mempelajari pola normal metrik (misal trafik naik tiap pagi hari kerja) lalu mengirim peringatan bila nilai menyimpang jauh dari pola normal.

![Gambar 22: Dua cara memicu Alert — Threshold alert (atas) memakai batas tetap yang ditentukan manusia (error > 2% selama 5 menit), sedangkan Anomaly detection (bawah) memakai model yang mengenali pola normal lalu memberi peringatan saat terjadi penyimpangan tajam.](/images/belajar/fundamental-system-design/image22.png)

Perangkat populer: **Grafana**, **PagerDuty**, dan **Sensu**. Aturan emas alert yang sehat: **kirim alert pada gejala yang dirasakan pengguna** (error rate & latensi, bukan sekadar CPU sesaat), setiap alert harus membutuhkan tindakan nyata, dan gunakan jendela waktu (*time window*) agar lonjakan sesaat tidak memicu **alert fatigue** (kelelahan notifikasi yang membuat tim mulai mengabaikan peringatan penting).

## Visualization dan Dashboards

**Dashboards** (seperti **Grafana**, **Kibana**, **Datadog**) menyatukan metrik, log, dan trace pada satu layar. Dashboard yang efektif menempatkan dampak ke pengguna di baris teratas (trafik, error rate, latensi), detail infrastruktur/database di baris bawah, serta menandai waktu setiap rilis kode baru (*deployment markers*).

## Menggunakan Semua Sinyal Bersama (Using the Signals Together)

Begini cara kelima komponen bekerja berantai dalam investigasi nyata kegagalan checkout:
1. **Alert:** Tim menerima notifikasi *checkout error rate* melonjak ke **6%** (normalnya 0,2%).
2. **Dashboard:** Terlihat error dimulai tepat pukul `14:00`, hanya berdampak pada checkout, dan latensi p99 melonjak dari 400 ms ke 5 detik.
3. **Traces:** Trace request gagal menunjukkan *payment service* menunggu 5 detik lalu *timeout*.
4. **Logs:** Log *payment service* untuk `trace_id` terkait bertuliskan `"connection pool exhausted"`—ternyata rilis kode pukul `13:58` memperkecil ukuran pool koneksi database.
5. **Fix:** Tim melakukan *rollback* ke versi sebelumnya dan *error rate* kembali turun ke 0,2%.

![Gambar 23: Alur investigasi kegagalan checkout dari deteksi hingga perbaikan — Alert dan Dashboard (Monitoring) memberi tahu bahwa ada masalah, lalu Traces dan Logs (Observability) membongkar penyebab pastinya ("connection pool exhausted" akibat rilis 13:58) sehingga tim bisa segera melakukan rollback.](/images/belajar/fundamental-system-design/image23.png)

| Komponen | Pertanyaan yang Dijawab | Kapan Digunakan |
| :--- | :--- | :--- |
| **Metrics** | *"Bagaimana kondisi sistem secara umum?"* | Memantau tren, total, dan persentil |
| **Logs** | *"Apa persisnya yang terjadi?"* | Membaca detail satu kejadian atau pesan error |
| **Tracing** | *"Apa yang dialami satu request ini?"* | Mencari layanan mana yang membuat request lambat |
| **Alerting** | *"Kapan tim harus turun tangan?"* | Mengetahui gangguan sebelum pengguna melapor |
| **Dashboards** | *"Seperti apa kondisi seluruh sistem sekarang?"* | Melihat gambaran menyeluruh di satu layar |

## Ringkasan Poin Penting (Key Takeaways)

- **Monitoring** memberi tahu *bahwa* ada yang salah; **observability** memungkinkan Anda menjawab *mengapa* hal itu salah.
- Gunakan **metrics** (Four Golden Signals), **structured centralized logs**, dan **distributed tracing** (`trace_id` + `span`) secara terpadu.
- Rancang **alert** pada gejala yang dirasakan pengguna agar terhindar dari *alert fatigue*.
