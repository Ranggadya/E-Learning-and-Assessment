"""Membuat soal paket Paragon: Verbal, Numerik & Aritmatika, Spasial & Logika Gambar.

Kunci jawaban diverifikasi dengan kode. Jalankan: python3 scripts/generate-paragon-questions.py
lalu: npm run db:seed && npm run db:import
"""
import json
import os
import random
from fractions import Fraction

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "db", "questions", "paragon")
os.makedirs(OUT, exist_ok=True)
KEYS = "ABCDE"
INK = 'stroke="currentColor"'


def n(value):
    if isinstance(value, float):
        text = f"{value:.1f}".rstrip("0").rstrip(".")
        return text if text else "0"
    return str(value)


def shuffled_targets(count, seed):
    targets = [i % 5 for i in range(count)]
    random.Random(seed).shuffle(targets)
    return targets


def with_answer(answer, others, target):
    options = list(others)
    options.insert(target, answer)
    assert len(options) == 5 and len(set(options)) == 5, ("pilihan tidak unik", options)
    return options, target


def write(slug, questions, expected_count):
    assert len(questions) == expected_count, (slug, len(questions))
    for item in questions:
        assert 2 <= len(item["options"]) <= 5 and len(set(item["options"])) == len(item["options"])
        assert 0 <= item["correctIndex"] < len(item["options"])
        assert item["explanation"].strip() and item["prompt"].strip()
        if item.get("type") in ("IMAGE", "MEMORY"):
            assert item.get("imageSvg")
    with open(os.path.join(OUT, slug + ".json"), "w", encoding="utf-8") as handle:
        json.dump({"package": "paragon", "subtest": slug, "questions": questions}, handle, ensure_ascii=False, indent=2)
    positions = [item["correctIndex"] for item in questions]
    print(slug, len(questions), "soal; sebaran kunci:", {i: positions.count(i) for i in sorted(set(positions))})


# ======================================================================
# Tes Verbal
# ======================================================================
verbal = []
verbal_targets = shuffled_targets(15, 301)


def text_question(store, targets, prompt, answer, others, explanation):
    options, index = with_answer(answer, others, targets[len(store)])
    store.append({"type": "TEXT", "prompt": prompt, "options": options, "correctIndex": index, "explanation": explanation})


def verbal_question(prompt, answer, others, explanation):
    text_question(verbal, verbal_targets, prompt, answer, others, explanation)


# Antonim
verbal_question("Lawan kata (antonim) dari TRANSPARAN adalah...", "buram", ["jernih", "bening", "tembus", "terang"],
                "Transparan berarti tembus pandang. Lawannya buram, yaitu tidak tembus pandang. Jernih, bening, dan tembus justru searti.")
verbal_question("Lawan kata (antonim) dari EKSPOR adalah...", "impor", ["transaksi", "distribusi", "produksi", "konsumsi"],
                "Ekspor adalah menjual barang ke luar negeri, sedangkan impor adalah memasukkan barang dari luar negeri.")
verbal_question("Lawan kata (antonim) dari OPTIMIS adalah...", "pesimis", ["realistis", "apatis", "ambisius", "antusias"],
                "Optimis berarti selalu berpengharapan baik; lawannya pesimis, yaitu mudah putus harapan.")
verbal_question("Lawan kata (antonim) dari HEMAT adalah...", "boros", ["kikir", "pelit", "cermat", "sederhana"],
                "Hemat berarti tidak berlebihan memakai sesuatu; lawannya boros. Kikir dan pelit dekat artinya dengan hemat yang berlebihan, bukan lawannya.")
# Pengelompokan kata (satu kata tidak sekelompok)
verbal_question("Manakah yang tidak termasuk kelompok yang sama? Mawar, melati, anggrek, jati, tulip", "jati", ["mawar", "melati", "anggrek", "tulip"],
                "Mawar, melati, anggrek, dan tulip adalah bunga, sedangkan jati adalah pohon penghasil kayu.")
verbal_question("Manakah yang tidak termasuk kelompok yang sama? Kuda, sapi, kambing, ayam, kerbau", "ayam", ["kuda", "sapi", "kambing", "kerbau"],
                "Kuda, sapi, kambing, dan kerbau adalah mamalia, sedangkan ayam adalah unggas.")
verbal_question("Manakah yang tidak termasuk kelompok yang sama? Senin, Selasa, April, Kamis, Jumat", "April", ["Senin", "Selasa", "Kamis", "Jumat"],
                "Senin, Selasa, Kamis, dan Jumat adalah nama hari, sedangkan April adalah nama bulan.")
verbal_question("Manakah yang tidak termasuk kelompok yang sama? Segitiga, persegi, lingkaran, kubus, jajar genjang", "kubus", ["segitiga", "persegi", "lingkaran", "jajar genjang"],
                "Segitiga, persegi, lingkaran, dan jajar genjang adalah bangun datar, sedangkan kubus adalah bangun ruang.")
# Analogi
verbal_question("Dokter : rumah sakit = guru : ...", "sekolah", ["buku", "murid", "kelas", "ujian"],
                "Dokter bekerja di rumah sakit, seperti guru bekerja di sekolah (hubungan profesi dan tempat kerja).")
verbal_question("Panas : api = dingin : ...", "es", ["matahari", "air", "uap", "angin"],
                "Api bersifat panas, seperti es bersifat dingin (hubungan benda dan sifat khasnya).")
verbal_question("Pensil : menulis = pisau : ...", "memotong", ["tajam", "dapur", "logam", "makan"],
                "Pensil digunakan untuk menulis, seperti pisau digunakan untuk memotong (hubungan alat dan fungsinya).")
verbal_question("Kaki : sepatu = tangan : ...", "sarung tangan", ["jari", "lengan", "cincin", "kuku"],
                "Sepatu dipakai untuk melindungi kaki, seperti sarung tangan dipakai untuk melindungi tangan (hubungan anggota tubuh dan pelindungnya).")
# Ringkasan bacaan (sinopsis)
verbal_question("Bacaan:\nRina bekerja sebagai analis di sebuah bank. Setiap bulan ia menyusun laporan risiko kredit untuk pimpinan. Bulan lalu ia menemukan bahwa sebagian besar kredit macet berasal dari satu sektor usaha, lalu mengusulkan pembatasan pinjaman ke sektor itu. Usulan tersebut disetujui dan diuji coba selama satu kuartal.\n\nRingkasan yang paling tepat dari bacaan tersebut adalah...",
                "Seorang analis bank menemukan sumber utama kredit macet dan usulannya membatasi pinjaman ke sektor itu diuji coba",
                ["Seorang analis bank dipecat karena laporannya salah", "Bank menghentikan seluruh pinjaman usaha",
                 "Rina pindah divisi setelah menyusun laporan", "Kredit macet menurun drastis setelah usulan Rina diterapkan"],
                "Ringkasan memuat temuan Rina, usulannya, dan tindak lanjutnya (diuji coba). Hasil uji coba tidak disebutkan, sehingga penurunan kredit macet tidak dapat disimpulkan.")
verbal_question("Bacaan:\nSebuah desa wisata awalnya hanya dikunjungi pada akhir pekan. Warga lalu membuat paket menginap dan kelas memasak bersama pemandu lokal. Kini kunjungan berlangsung hampir setiap hari, dan banyak warga memiliki penghasilan tambahan dari kegiatan wisata.\n\nRingkasan yang paling tepat dari bacaan tersebut adalah...",
                "Inovasi paket wisata membuat desa lebih ramai dan menambah penghasilan warga",
                ["Warga menolak kedatangan wisatawan", "Desa wisata hanya ramai pada akhir pekan",
                 "Pemandu lokal didatangkan dari luar desa", "Kelas memasak menggantikan seluruh mata pencaharian warga"],
                "Bacaan menceritakan perubahan dari ramai akhir pekan menjadi hampir setiap hari berkat paket baru, serta penghasilan tambahan warga. Pilihan lain bertentangan atau tidak disebutkan.")
verbal_question("Bacaan:\nPenggunaan aplikasi catatan digital meningkat di kalangan mahasiswa. Aplikasi ini memudahkan pencarian materi dan berbagi catatan. Namun, beberapa peneliti menemukan bahwa menulis tangan membantu pemahaman konsep lebih dalam, sehingga sebagian dosen menyarankan memadukan keduanya.\n\nRingkasan yang paling tepat dari bacaan tersebut adalah...",
                "Catatan digital praktis, tetapi menulis tangan membantu pemahaman, sehingga keduanya disarankan dipadukan",
                ["Dosen melarang penggunaan aplikasi catatan digital", "Mahasiswa sudah tidak lagi menulis tangan",
                 "Aplikasi catatan digital terbukti menurunkan pemahaman semua mahasiswa", "Peneliti menyimpulkan catatan digital sepenuhnya lebih unggul"],
                "Ringkasan mencakup kelebihan catatan digital, temuan tentang menulis tangan, dan saran memadukan keduanya. Pilihan lain berlebihan atau bertentangan dengan bacaan.")

# ======================================================================
# Tes Numerik & Aritmatika
# ======================================================================
numeric = []
numeric_targets = shuffled_targets(15, 302)


def numeric_question(prompt, answer, others, explanation, check):
    assert check(), "verifikasi gagal: " + prompt
    text_question(numeric, numeric_targets, prompt, answer, others, explanation)


numeric_question("Lanjutkan deret: 4, 9, 19, 39, 79, ...", "159", ["149", "157", "161", "169"],
                 "Setiap suku = suku sebelumnya × 2 + 1. Jadi 79 × 2 + 1 = 159.",
                 lambda: all(a * 2 + 1 == b for a, b in zip([4, 9, 19, 39], [9, 19, 39, 79])) and 79 * 2 + 1 == 159)
fibonacci = [1, 1]
while len(fibonacci) < 7:
    fibonacci.append(fibonacci[-1] + fibonacci[-2])
numeric_question("Lanjutkan deret: 1, 1, 2, 3, 5, 8, ...", "13", ["11", "12", "14", "15"],
                 "Setiap suku adalah jumlah dua suku sebelumnya (deret Fibonacci): 5 + 8 = 13.",
                 lambda: fibonacci[:6] == [1, 1, 2, 3, 5, 8] and fibonacci[6] == 13)
numeric_question("Lanjutkan deret: 100, 91, 83, 76, 70, ...", "65", ["60", "62", "64", "66"],
                 "Selisih antar suku: −9, −8, −7, −6, lalu −5. Jadi 70 − 5 = 65.",
                 lambda: [91 - 100, 83 - 91, 76 - 83, 70 - 76] == [-9, -8, -7, -6] and 70 - 5 == 65)
numeric_question("Lanjutkan deret: 2, 3, 5, 9, 17, ...", "33", ["25", "29", "31", "35"],
                 "Selisih antar suku: 1, 2, 4, 8, lalu 16 (selalu dikali 2). Jadi 17 + 16 = 33.",
                 lambda: [3 - 2, 5 - 3, 9 - 5, 17 - 9] == [1, 2, 4, 8] and 17 + 16 == 33)
numeric_question("Lanjutkan deret: 5, 10, 8, 16, 14, 28, ...", "26", ["24", "30", "32", "56"],
                 "Pola berselang-seling: dikali 2, lalu dikurangi 2. Setelah 28 (hasil dikali 2) berikutnya dikurangi 2, yaitu 26.",
                 lambda: [5 * 2, 10 - 2, 8 * 2, 16 - 2, 14 * 2, 28 - 2] == [10, 8, 16, 14, 28, 26])
numeric_question("Harga 3 buku adalah Rp45.000. Berapa harga 7 buku yang sama?", "Rp105.000", ["Rp90.000", "Rp96.000", "Rp112.000", "Rp135.000"],
                 "Harga satu buku = 45.000 ÷ 3 = 15.000. Harga 7 buku = 7 × 15.000 = 105.000.",
                 lambda: 45000 // 3 * 7 == 105000)
numeric_question("Sebuah bus berangkat pukul 08.00 dengan kecepatan 60 km/jam. Pukul 09.00 sebuah mobil berangkat dari titik yang sama, searah, dengan kecepatan 90 km/jam. Pukul berapa mobil menyusul bus?",
                 "11.00", ["10.00", "10.30", "11.30", "12.00"],
                 "Saat mobil berangkat, bus sudah menempuh 60 km. Selisih kecepatan 90 − 60 = 30 km/jam, sehingga mobil menyusul setelah 60 ÷ 30 = 2 jam, yaitu pukul 11.00.",
                 lambda: 60 / (90 - 60) == 2)
numeric_question("Sebanyak 20 liter larutan mengandung 30% garam. Berapa liter air murni yang harus ditambahkan agar kadar garamnya menjadi 20%?",
                 "10 liter", ["6 liter", "8 liter", "12 liter", "14 liter"],
                 "Garam = 30% × 20 = 6 liter. Agar kadarnya 20%, volume total = 6 ÷ 0,2 = 30 liter, sehingga air yang ditambahkan 30 − 20 = 10 liter.",
                 lambda: abs(6 / (20 + 10) - 0.2) < 1e-12)
numeric_question("Enam pekerja menyelesaikan suatu proyek dalam 10 hari. Dengan kecepatan kerja yang sama, berapa hari yang dibutuhkan 4 pekerja?",
                 "15 hari", ["12 hari", "14 hari", "16 hari", "20 hari"],
                 "Total pekerjaan = 6 × 10 = 60 hari-pekerja. Dengan 4 pekerja: 60 ÷ 4 = 15 hari (semakin sedikit pekerja, semakin lama).",
                 lambda: 6 * 10 / 4 == 15)
numeric_question("Sebuah toko membeli barang seharga Rp200.000 dan menjualnya dengan untung 25%. Jika harga jual itu kemudian didiskon 10%, berapa harga akhirnya?",
                 "Rp225.000", ["Rp220.000", "Rp230.000", "Rp237.500", "Rp250.000"],
                 "Harga jual = 200.000 × 1,25 = 250.000. Setelah diskon 10%: 250.000 × 0,9 = 225.000.",
                 lambda: 200000 * 1.25 * 0.9 == 225000)
numeric_question("Hitung: (3/4 + 5/8) ÷ 11/16", "2", ["1", "3/2", "11/8", "4"],
                 "3/4 + 5/8 = 6/8 + 5/8 = 11/8. Lalu 11/8 ÷ 11/16 = 11/8 × 16/11 = 2.",
                 lambda: (Fraction(3, 4) + Fraction(5, 8)) / Fraction(11, 16) == 2)
numeric_question("Hitung: 15% dari 240 ditambah 25% dari 160", "76", ["68", "72", "80", "84"],
                 "15% × 240 = 36 dan 25% × 160 = 40. Jumlahnya 36 + 40 = 76.",
                 lambda: 0.15 * 240 + 0.25 * 160 == 76)
numeric_question("Hitung: √144 + 5² − 3³", "10", ["5", "7", "12", "15"],
                 "√144 = 12, 5² = 25, dan 3³ = 27. Jadi 12 + 25 − 27 = 10.",
                 lambda: 144 ** 0.5 + 5 ** 2 - 3 ** 3 == 10)
numeric_question("Uang Ani dan Budi berbanding 5 : 7. Jika uang Budi lebih banyak Rp60.000 daripada uang Ani, berapa uang Ani?",
                 "Rp150.000", ["Rp120.000", "Rp135.000", "Rp175.000", "Rp210.000"],
                 "Selisih perbandingan 7 − 5 = 2 bagian = Rp60.000, sehingga 1 bagian = Rp30.000. Uang Ani = 5 × 30.000 = Rp150.000 (uang Budi Rp210.000).",
                 lambda: (60000 // 2) * 5 == 150000 and (60000 // 2) * 7 - 150000 == 60000)
average = Fraction(8 * 75 + 90 + 85, 10)
numeric_question("Rata-rata nilai 8 siswa adalah 75. Dua siswa baru bergabung dengan nilai 90 dan 85. Berapa rata-rata nilai seluruh siswa sekarang?",
                 "77,5", ["75", "76", "77", "80"],
                 "Jumlah nilai awal = 8 × 75 = 600. Ditambah 90 + 85 = 175 menjadi 775. Rata-rata = 775 ÷ 10 = 77,5.",
                 lambda: average == Fraction(155, 2))

# ======================================================================
# Tes Spasial & Logika Gambar
# ======================================================================
DOT_LAYOUTS = {
    1: [(0, 0)], 2: [(-.6, 0), (.6, 0)], 3: [(-.7, .5), (.7, .5), (0, -.7)],
    4: [(-.6, -.6), (.6, -.6), (-.6, .6), (.6, .6)], 5: [(-.6, -.6), (.6, -.6), (-.6, .6), (.6, .6), (0, 0)],
    6: [(-.6, -.9), (.6, -.9), (-.6, 0), (.6, 0), (-.6, .9), (.6, .9)],
    7: [(-.6, -.9), (.6, -.9), (-.6, 0), (.6, 0), (-.6, .9), (.6, .9), (0, 0)],
}


def text_el(x, y, content, size=20, weight=600):
    return (f'<text x="{n(x)}" y="{n(y)}" text-anchor="middle" font-size="{size}" font-weight="{weight}" '
            f'font-family="sans-serif" fill="currentColor">{content}</text>')


def frame(x, y, w, h, dashed=False):
    dash = ' stroke-dasharray="6 5"' if dashed else ""
    return f'<rect x="{n(x)}" y="{n(y)}" width="{n(w)}" height="{n(h)}" rx="6" fill="none" {INK} stroke-width="2"{dash}/>'


def draw_cell(cell, x, y, size=100):
    cx, cy = x + size / 2, y + size / 2
    parts = []
    shape = cell.get("shape")
    if shape == "halfsquare":
        half = cell["d"] / 2
        rotate = f' transform="rotate({cell.get("rot", 0)} {n(cx)} {n(cy)})"' if cell.get("rot") else ""
        parts.append(f'<g{rotate}><rect x="{n(cx - half)}" y="{n(cy - half)}" width="{n(cell["d"])}" height="{n(half)}" fill="currentColor"/>'
                     f'<rect x="{n(cx - half)}" y="{n(cy - half)}" width="{n(cell["d"])}" height="{n(cell["d"])}" fill="none" {INK} stroke-width="3"/></g>')
    elif shape == "circle":
        parts.append(f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(cell["d"] / 2)}" fill="none" {INK} stroke-width="3"/>')
    for offset_x, offset_y in DOT_LAYOUTS.get(cell.get("count", 0), []):
        parts.append(f'<circle cx="{n(cx + offset_x * 20)}" cy="{n(cy + offset_y * 20)}" r="5.5" fill="currentColor"/>')
    return "".join(parts)


def signature(cell):
    return tuple(sorted(cell.items(), key=lambda item: item[0]))


def sequence_svg(shown_cells, option_cells):
    parts = []
    for index, cell in enumerate(shown_cells):
        x = 10 + index * 118
        parts.append(frame(x, 10, 100, 100) + draw_cell(cell, x, 10))
    x = 10 + len(shown_cells) * 118
    parts.append(frame(x, 10, 100, 100, dashed=True) + text_el(x + 50, 74, "?", 40, 400))
    for index, cell in enumerate(option_cells):
        x = 10 + index * 118
        parts.append(frame(x, 160, 100, 100) + draw_cell(cell, x, 160) + text_el(x + 50, 288, KEYS[index]))
    return f'<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Soal pola gambar">{"".join(parts)}</svg>'


def rot90cw(m):
    size = len(m)
    result = [[m[size - 1 - column][row] for column in range(size)] for row in range(size)]
    assert result == [list(row) for row in zip(*m[::-1])]
    return result


def hflip(m):
    return [list(reversed(row)) for row in m]


def vflip(m):
    return [list(row) for row in reversed(m)]


def rot180(m):
    result = hflip(vflip(m))
    assert result == rot90cw(rot90cw(m))
    return result


def rot270cw(m):
    size = len(m)
    result = rot90cw(rot180(m))
    assert result == [[m[column][size - 1 - row] for column in range(size)] for row in range(size)]
    return result


def identity(m):
    return [list(row) for row in m]


def transpose(m):
    return [list(row) for row in zip(*m)]


def asymmetric_pattern(size, filled, seed):
    rng = random.Random(seed)
    while True:
        cells = set(rng.sample(range(size * size), filled))
        matrix = [[1 if row * size + column in cells else 0 for column in range(size)] for row in range(size)]
        images = {str(f(matrix)) for f in (identity, rot90cw, rot180, rot270cw, hflip, vflip, transpose)}
        if len(images) == 7:
            return matrix


def grid_frame(matrix, x, y, cell):
    rows, columns = len(matrix), len(matrix[0])
    parts = []
    for row, values in enumerate(matrix):
        for column, value in enumerate(values):
            if value:
                parts.append(f'<rect x="{n(x + column * cell)}" y="{n(y + row * cell)}" width="{n(cell)}" height="{n(cell)}" fill="currentColor"/>')
    for row in range(rows + 1):
        parts.append(f'<line x1="{n(x)}" y1="{n(y + row * cell)}" x2="{n(x + columns * cell)}" y2="{n(y + row * cell)}" {INK} stroke-width="1" opacity=".35"/>')
    for column in range(columns + 1):
        parts.append(f'<line x1="{n(x + column * cell)}" y1="{n(y)}" x2="{n(x + column * cell)}" y2="{n(y + rows * cell)}" {INK} stroke-width="1" opacity=".35"/>')
    parts.append(f'<rect x="{n(x)}" y="{n(y)}" width="{n(columns * cell)}" height="{n(rows * cell)}" fill="none" {INK} stroke-width="2.5"/>')
    return "".join(parts)


def viz_svg(figure_matrix, option_matrices, cell):
    parts = [text_el(300, 22, "Gambar awal", 15, 500)]
    figure_width = len(figure_matrix[0]) * cell
    parts.append(grid_frame(figure_matrix, (600 - figure_width) / 2, 36, cell))
    top = 36 + len(figure_matrix) * cell + 26
    for index, matrix in enumerate(option_matrices):
        box_x = 10 + index * 118
        width, height = len(matrix[0]) * cell, len(matrix) * cell
        parts.append(frame(box_x, top, 100, height + 20))
        parts.append(grid_frame(matrix, box_x + (100 - width) / 2, top + 10, cell))
        parts.append(text_el(box_x + 50, top + height + 48, KEYS[index]))
    total = top + len(option_matrices[0]) * cell + 60
    return f'<svg viewBox="0 0 600 {n(total)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Soal transformasi gambar">{"".join(parts)}</svg>'


def lines_svg(rows, columns, cell):
    parts = []
    for index in range(rows + 1):
        parts.append(f'<line x1="10" y1="{10 + index * cell}" x2="{10 + columns * cell}" y2="{10 + index * cell}" {INK} stroke-width="2.5"/>')
    for index in range(columns + 1):
        parts.append(f'<line x1="{10 + index * cell}" y1="10" x2="{10 + index * cell}" y2="{10 + rows * cell}" {INK} stroke-width="2.5"/>')
    return (f'<svg viewBox="0 0 {columns * cell + 20} {rows * cell + 20}" xmlns="http://www.w3.org/2000/svg" role="img" '
            f'aria-label="Kisi {rows} kali {columns}" style="max-width:260px;margin:auto">{"".join(parts)}</svg>')


spatial = []
spatial_targets = shuffled_targets(10, 303)


def image_question(prompt, svg, options, index, explanation):
    spatial.append({"type": "IMAGE", "prompt": prompt, "imageSvg": svg, "options": options, "correctIndex": index, "explanation": explanation})


def image_labels():
    return [f"Gambar {key}" for key in KEYS]


def add_transform(prompt, size, filled, seed, answer_fn, distractor_fns, explanation, cell=30):
    matrix = asymmetric_pattern(size, filled, seed)
    answer = answer_fn(matrix)
    options = [identity(f(matrix)) for f in distractor_fns]
    target = spatial_targets[len(spatial)]
    options.insert(target, answer)
    assert len({str(option) for option in options}) == 5, "pilihan tidak unik: " + prompt
    image_question(prompt, viz_svg(matrix, options, cell), image_labels(), target, explanation)


add_transform("Gambar awal diputar 90° searah jarum jam. Gambar manakah hasilnya?", 3, 5, 101, rot90cw,
              [hflip, rot180, rot270cw, transpose],
              "Putaran 90° searah jarum jam memindahkan sudut kiri atas ke kanan atas, kanan atas ke kanan bawah, dan seterusnya. Baris paling atas menjadi kolom paling kanan.")
add_transform("Gambar awal diputar 90° berlawanan arah jarum jam. Gambar manakah hasilnya?", 3, 6, 113, rot270cw,
              [identity, rot90cw, rot180, vflip],
              "Putaran 90° berlawanan arah jarum jam memindahkan sudut kiri atas ke kiri bawah dan kanan atas ke kiri atas.")
add_transform("Gambar awal dicerminkan terhadap garis tegak di tengahnya (kiri menjadi kanan). Gambar manakah hasilnya?", 3, 5, 127, hflip,
              [identity, vflip, rot90cw, transpose],
              "Pada pencerminan kiri-kanan, urutan setiap baris dibalik, sedangkan posisi atas-bawah tidak berubah.")
add_transform("Gambar awal dicerminkan terhadap garis mendatar di tengahnya (atas menjadi bawah). Gambar manakah hasilnya?", 3, 6, 139, vflip,
              [identity, hflip, rot270cw, rot90cw],
              "Pada pencerminan atas-bawah, urutan baris dibalik: baris paling atas bertukar dengan baris paling bawah.")
add_transform("Gambar awal (kisi 4 × 4) diputar 180°. Gambar manakah hasilnya?", 4, 7, 151, rot180,
              [identity, hflip, vflip, rot90cw],
              "Putaran 180° membuat gambar terbalik: sel kiri atas pindah ke kanan bawah dan kanan atas pindah ke kiri bawah. Sama dengan pencerminan kiri-kanan sekaligus atas-bawah.",
              cell=24)


def add_sequence(rule, answer_cell, distractors, explanation):
    shown = [rule(index) for index in range(4)]
    assert rule(4) == answer_cell, "kunci tidak sesuai aturan"
    options = list(distractors)
    target = spatial_targets[len(spatial)]
    options.insert(target, answer_cell)
    assert len({signature(option) for option in options}) == 5, "pilihan tidak unik"
    image_question("Perhatikan pola pada kotak-kotak berikut. Gambar manakah yang menggantikan tanda tanya (?)",
                   sequence_svg(shown, options), image_labels(), target, explanation)


add_sequence(lambda i: {"shape": "halfsquare", "rot": (270 * i) % 360, "d": 56}, {"shape": "halfsquare", "rot": 0, "d": 56},
             [{"shape": "halfsquare", "rot": 90, "d": 56}, {"shape": "halfsquare", "rot": 180, "d": 56},
              {"shape": "halfsquare", "rot": 270, "d": 56}, {"shape": "halfsquare", "rot": 45, "d": 56}],
             "Bagian yang diarsir berputar 270° searah jarum jam (sama dengan 90° berlawanan arah jarum jam) pada setiap kotak: 0°, 270°, 180°, 90°, lalu kembali ke 0° (arsiran di atas).")
add_sequence(lambda i: {"count": 6 - i}, {"count": 2}, [{"count": 1}, {"count": 3}, {"count": 4}, {"count": 7}],
             "Jumlah titik berkurang 1 pada setiap kotak: 6, 5, 4, 3, lalu 2.")
add_sequence(lambda i: {"shape": "circle", "d": 68 - 12 * i}, {"shape": "circle", "d": 20},
             [{"shape": "circle", "d": 14}, {"shape": "circle", "d": 26}, {"shape": "circle", "d": 32}, {"shape": "circle", "d": 38}],
             "Diameter lingkaran mengecil 12 satuan pada setiap kotak: 68, 56, 44, 32, lalu 20.")


def count_squares(rows, columns):
    total = 0
    for top in range(rows):
        for left in range(columns):
            for side in range(1, min(rows - top, columns - left) + 1):
                total += 1
    return total


def count_rectangles(rows, columns):
    total = 0
    for top in range(rows):
        for bottom in range(top, rows):
            for left in range(columns):
                for right in range(left, columns):
                    total += 1
    return total


assert count_squares(2, 2) == 5 and count_rectangles(2, 3) == 18
target = spatial_targets[len(spatial)]
options, index = with_answer("5", ["4", "6", "8", "9"], target)
spatial.append({"type": "IMAGE", "prompt": "Berapa banyak persegi (dari semua ukuran) yang dapat ditemukan pada kisi 2 × 2 berikut?",
                "imageSvg": lines_svg(2, 2, 70), "options": options, "correctIndex": index,
                "explanation": "Persegi kecil ada 4 dan persegi besar (seluruh kisi) ada 1, sehingga totalnya 5."})
target = spatial_targets[len(spatial)]
options, index = with_answer("18", ["12", "15", "20", "24"], target)
spatial.append({"type": "IMAGE", "prompt": "Berapa banyak persegi panjang (termasuk persegi) dari semua ukuran yang dapat ditemukan pada kisi 2 baris × 3 kolom berikut?",
                "imageSvg": lines_svg(2, 3, 70), "options": options, "correctIndex": index,
                "explanation": "Pilih 2 dari 3 garis tegak (3 cara) dan 2 dari 4 garis datar... lebih tepatnya: 2 baris dipilih dari 3 garis datar (3 cara) dan 2 kolom dipilih dari 4 garis tegak (6 cara), sehingga 3 × 6 = 18."})
# perbaiki kalimat pembahasan agar tidak membingungkan
spatial[-1]["explanation"] = ("Sebuah persegi panjang ditentukan oleh 2 garis datar dan 2 garis tegak. Pada kisi 2 × 3 ada 3 garis datar "
                              "(3 cara memilih 2) dan 4 garis tegak (6 cara memilih 2), sehingga 3 × 6 = 18.")

write("verbal", verbal, 15)
write("numerik-aritmatika", numeric, 15)
write("spasial-logika-gambar", spatial, 10)
