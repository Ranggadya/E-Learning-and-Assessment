"""Membuat soal Reading Comprehension, Perceptual Speed, dan Working Memory untuk paket Astra.

Kunci jawaban diverifikasi dengan kode. Jalankan: python3 scripts/generate-astra-questions.py
lalu: npm run db:import
"""
import json
import os
import random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "db", "questions", "astra")
INK = 'stroke="currentColor"'


def n(value):
    if isinstance(value, float):
        text = f"{value:.1f}".rstrip("0").rstrip(".")
        return text if text else "0"
    return str(value)


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
    path = os.path.join(OUT, slug + ".json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump({"package": "astra", "subtest": slug, "questions": questions}, handle, ensure_ascii=False, indent=2)
    positions = [item["correctIndex"] for item in questions]
    print(slug, len(questions), "soal; sebaran kunci:", {i: positions.count(i) for i in sorted(set(positions))})


# ======================================================================
# Reading Comprehension
# ======================================================================
reading = []


def rc(passage, question, answer, others, target, explanation):
    options, index = with_answer(answer, others, target)
    reading.append({"type": "TEXT", "prompt": f"Bacaan:\n{passage}\n\n{question}",
                    "options": options, "correctIndex": index, "explanation": explanation})


rc("Banyak perusahaan kini menerapkan jam kerja fleksibel. Karyawan boleh memilih jam mulai dan selesai selama total jam kerja terpenuhi. Hasil survei internal menunjukkan tingkat absensi menurun dan kepuasan kerja meningkat. Namun, divisi layanan pelanggan tetap harus menjaga jadwal piket agar telepon pelanggan selalu terjawab.",
   "Pernyataan yang sesuai dengan bacaan adalah...",
   "Survei internal menunjukkan absensi menurun setelah jam kerja fleksibel diterapkan",
   ["Semua divisi bebas menentukan jadwalnya tanpa batasan", "Jam kerja fleksibel mengurangi total jam kerja karyawan",
    "Kepuasan kerja menurun walaupun absensi berkurang", "Divisi layanan pelanggan dilarang memakai jam kerja fleksibel"], 1,
   "Bacaan menyebut survei internal menemukan absensi menurun. Pilihan lain bertentangan dengan bacaan (total jam kerja tetap harus terpenuhi, kepuasan justru naik, layanan pelanggan hanya diminta menjaga jadwal piket) atau tidak disebut di bacaan.")

rc("Toko buku kecil di kota itu mulai sepi sejak toko daring menawarkan potongan harga besar. Pemiliknya lalu mengadakan klub baca mingguan dan menyediakan kopi gratis bagi peserta. Dalam tiga bulan, jumlah pengunjung kembali naik, dan sebagian besar peserta klub akhirnya membeli buku di tempat.",
   "Kesimpulan yang paling tepat dari bacaan tersebut adalah...",
   "Pengalaman yang ditawarkan di toko dapat menarik pembeli yang tidak hanya mencari harga murah",
   ["Toko daring pasti akan bangkrut dalam waktu dekat", "Potongan harga tidak berpengaruh pada penjualan buku",
    "Kopi gratis adalah satu-satunya penyebab semua penjualan buku", "Klub baca tidak memberi dampak pada jumlah pengunjung"], 3,
   "Pengunjung naik setelah ada klub baca dan kopi, dan peserta membeli buku di tempat. Ini menunjukkan pengalaman di toko menarik pembeli. Pilihan lain berlebihan, tidak didukung bacaan, atau bertentangan dengannya.")

assert (40 - 24) / 40 == 0.4
rc("Sebuah kantor mencatat penggunaan kertas selama tiga bulan. Pada bulan pertama terpakai 40 rim. Setelah kebijakan dokumen digital diterapkan, bulan kedua turun menjadi 30 rim, dan bulan ketiga turun lagi menjadi 24 rim.",
   "Berapa persen penurunan penggunaan kertas dari bulan pertama ke bulan ketiga?",
   "40%", ["16%", "24%", "30%", "60%"], 3,
   "Penurunan = 40 − 24 = 16 rim. Persentasenya 16 ÷ 40 × 100% = 40%. (24% dan 60% adalah jebakan dari angka yang muncul di bacaan.)")

rc("Kebijakan baru itu menuai pro dan kontra. Sebagian pegawai menyambutnya dengan antusias karena dinilai mempermudah pekerjaan, sedangkan yang lain meragukan efektivitasnya. Pimpinan menegaskan bahwa kebijakan akan dievaluasi setelah tiga bulan dan dapat direvisi bila terbukti menghambat.",
   "Kata \"direvisi\" dalam bacaan paling dekat artinya dengan...",
   "diperbaiki atau diubah",
   ["dihapus sepenuhnya", "dipertahankan tanpa perubahan", "diumumkan kepada publik", "disahkan secara resmi"], 0,
   "Revisi berarti perbaikan atau perubahan. Konteksnya: bila kebijakan terbukti menghambat, isinya diubah, bukan dihapus atau dipertahankan.")

rc("Kopi arabika dan robusta berbeda dalam rasa dan kandungan kafein. Arabika cenderung lebih asam dan harum, sedangkan robusta lebih pahit dengan kandungan kafein yang lebih tinggi. Karena itu, banyak kedai mencampur keduanya untuk mendapatkan keseimbangan rasa.",
   "Pernyataan yang TIDAK sesuai dengan bacaan adalah...",
   "Robusta mengandung kafein lebih rendah daripada arabika",
   ["Arabika cenderung lebih harum daripada robusta", "Robusta cenderung lebih pahit daripada arabika",
    "Banyak kedai mencampur arabika dan robusta", "Pencampuran dilakukan untuk menyeimbangkan rasa"], 4,
   "Bacaan menyatakan robusta berkafein lebih tinggi, jadi pernyataan bahwa kafeinnya lebih rendah bertentangan dengan bacaan. Keempat pilihan lain sesuai bacaan.")

rc("Tidur yang cukup bukan sekadar istirahat. Saat tidur, otak merapikan informasi yang diterima sepanjang hari sehingga lebih mudah diingat. Pelajar yang begadang untuk belajar justru sering mengalami penurunan daya ingat keesokan harinya, meskipun jam belajarnya bertambah.",
   "Gagasan utama bacaan tersebut adalah...",
   "Tidur cukup membantu otak menyimpan informasi, sehingga begadang untuk belajar dapat menurunkan daya ingat",
   ["Pelajar sebaiknya belajar selama mungkin setiap hari", "Otak berhenti bekerja saat seseorang tidur",
    "Menambah jam belajar selalu meningkatkan hasil belajar", "Tidur hanya bermanfaat bagi orang dewasa"], 2,
   "Seluruh paragraf menjelaskan peran tidur dalam mengingat informasi dan dampak buruk begadang. Pilihan lain bertentangan dengan bacaan atau tidak dibahas.")

rc("Pabrik itu menghentikan satu lini produksi selama dua hari karena mesin pendingin rusak. Akibatnya, pengiriman pesanan terlambat dan perusahaan harus memberi potongan harga kepada pelanggan. Sejak itu, perawatan mesin dilakukan setiap minggu, bukan setiap bulan.",
   "Apa penyebab langsung keterlambatan pengiriman pesanan?",
   "Berhentinya satu lini produksi akibat kerusakan mesin pendingin",
   ["Potongan harga yang diberikan kepada pelanggan", "Perawatan mesin yang dilakukan setiap minggu",
    "Permintaan pelanggan yang menurun", "Kekurangan pekerja di pabrik"], 0,
   "Rantai sebab-akibat di bacaan: mesin pendingin rusak, lini produksi berhenti, pengiriman terlambat. Potongan harga dan perawatan mingguan adalah akibat atau tindak lanjut, bukan penyebab.")

assert 90 / 120 == 60 / (200 - 120) == 0.75
rc("Dari 200 peserta pelatihan, 120 orang mengikuti sesi daring dan sisanya mengikuti sesi tatap muka. Pada ujian akhir, 90 peserta sesi daring dan 60 peserta sesi tatap muka dinyatakan lulus.",
   "Kelompok manakah yang tingkat kelulusannya lebih tinggi?",
   "Sama, keduanya 75 persen",
   ["Sesi daring, karena jumlah yang lulus lebih banyak", "Sesi tatap muka, karena jumlah pesertanya lebih sedikit",
    "Sesi daring, sebesar 80 persen", "Tidak dapat dibandingkan karena jumlah pesertanya berbeda"], 1,
   "Peserta tatap muka = 200 − 120 = 80. Tingkat lulus daring = 90 ÷ 120 = 75%, tatap muka = 60 ÷ 80 = 75%. Jumlah yang lulus lebih banyak di daring hanya karena pesertanya lebih banyak.")

rc("Rapat evaluasi proyek dijadwalkan setelah seluruh laporan divisi terkumpul. Hingga Kamis sore, laporan divisi pemasaran dan keuangan sudah masuk, tetapi laporan divisi operasional belum diterima. Rapat tidak akan dimulai sebelum seluruh laporan lengkap.",
   "Kesimpulan yang pasti benar berdasarkan bacaan adalah...",
   "Rapat evaluasi belum dapat dimulai pada Kamis sore",
   ["Rapat evaluasi dibatalkan", "Divisi operasional tidak membuat laporan",
    "Rapat evaluasi akan dimulai pada Jumat pagi", "Laporan divisi pemasaran bermasalah"], 4,
   "Rapat baru dimulai bila semua laporan lengkap, sedangkan laporan operasional belum masuk sampai Kamis sore. Pilihan lain tidak didukung bacaan (pembatalan, hari mulai rapat, dan masalah laporan tidak disebutkan).")

rc("Transportasi umum yang andal mengurangi kemacetan. Di kota yang menyediakan jalur bus khusus, waktu tempuh rata-rata pekerja menurun dan lebih banyak orang memilih meninggalkan kendaraan pribadi. Meski biaya awal pembangunannya besar, manfaat jangka panjangnya dinilai lebih besar daripada biayanya.",
   "Sikap penulis terhadap pembangunan jalur bus khusus adalah...",
   "Mendukung, karena manfaat jangka panjangnya dinilai melebihi biayanya",
   ["Menolak, karena biaya awal pembangunannya besar", "Netral, karena tidak memberi penilaian apa pun",
    "Ragu, karena belum ada bukti manfaatnya", "Menolak, karena penggunaan kendaraan pribadi tetap tinggi"], 2,
   "Penulis menyebut manfaat jangka panjang lebih besar daripada biaya dan memaparkan dampak positifnya, sehingga sikapnya mendukung. Biaya besar disebut sebagai catatan, bukan alasan menolak.")

# ======================================================================
# Perceptual Speed: sama atau berbeda
# ======================================================================
POOL = "ABDEFGHKMNPRSTUWXYZ23456789"


def make_strings(rng):
    length = rng.choice([7, 8, 9])
    first = "".join(rng.choice(POOL) for _ in range(length))
    return first


def perturb(rng, text):
    mode = rng.choice(["replace", "replace", "swap"])
    characters = list(text)
    if mode == "swap":
        candidates = [i for i in range(len(characters) - 1) if characters[i] != characters[i + 1]]
        if candidates:
            i = rng.choice(candidates)
            characters[i], characters[i + 1] = characters[i + 1], characters[i]
            return "".join(characters), i
    i = rng.randrange(len(characters))
    replacement = rng.choice([c for c in POOL if c != characters[i]])
    characters[i] = replacement
    return "".join(characters), i


def speed_svg(top, bottom):
    def line(y, label, content):
        return (f'<text x="20" y="{y}" font-size="14" font-family="sans-serif" fill="currentColor" opacity=".6">{label}</text>'
                f'<text x="60" y="{y}" font-size="30" font-family="ui-monospace,Menlo,Consolas,monospace" letter-spacing="5" fill="currentColor">{content}</text>')
    return (f'<svg viewBox="0 0 400 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dua deret karakter">'
            f'{line(42, "1", top)}{line(88, "2", bottom)}</svg>')


rng = random.Random(2026)
speed_questions = []
is_same_flags = [True] * 15 + [False] * 15
rng.shuffle(is_same_flags)
for is_same in is_same_flags:
    top = make_strings(rng)
    if is_same:
        bottom, explanation = top, "Kedua deret identik, karakter demi karakter."
    else:
        bottom, _ = perturb(rng, top)
        differing = [i + 1 for i, (a, b) in enumerate(zip(top, bottom)) if a != b]
        assert differing, "deret 'berbeda' ternyata identik"
        positions_text = " dan ".join(f"ke-{p}" for p in differing)
        explanation = f"Berbeda pada karakter {positions_text}: {top} dan {bottom}."
    assert (top == bottom) == is_same
    speed_questions.append({"type": "SPEED", "prompt": "Apakah kedua deret berikut sama persis?",
                            "imageSvg": speed_svg(top, bottom), "options": ["Sama", "Berbeda"],
                            "correctIndex": 0 if is_same else 1, "explanation": explanation})

# ======================================================================
# Working Memory
# ======================================================================
SHAPE_NAMES = {"circle": "lingkaran", "square": "persegi", "triangle": "segitiga", "diamond": "belah ketupat", "plus": "tanda plus"}
SHAPES = list(SHAPE_NAMES)
MONO = "ui-monospace,Menlo,Consolas,monospace"


def glyph(shape, cx, cy, size=22):
    if shape == "circle":
        return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(size)}" fill="currentColor"/>'
    if shape == "square":
        return f'<rect x="{n(cx - size)}" y="{n(cy - size)}" width="{n(2 * size)}" height="{n(2 * size)}" fill="currentColor"/>'
    if shape == "triangle":
        return f'<polygon points="{n(cx)},{n(cy - size)} {n(cx - size)},{n(cy + size * .85)} {n(cx + size)},{n(cy + size * .85)}" fill="currentColor"/>'
    if shape == "diamond":
        return f'<polygon points="{n(cx)},{n(cy - size * 1.15)} {n(cx + size * 1.15)},{n(cy)} {n(cx)},{n(cy + size * 1.15)} {n(cx - size * 1.15)},{n(cy)}" fill="currentColor"/>'
    if shape == "plus":
        arm = size * .4
        return (f'<rect x="{n(cx - arm)}" y="{n(cy - size)}" width="{n(2 * arm)}" height="{n(2 * size)}" fill="currentColor"/>'
                f'<rect x="{n(cx - size)}" y="{n(cy - arm)}" width="{n(2 * size)}" height="{n(2 * arm)}" fill="currentColor"/>')
    raise ValueError(shape)


def svg_wrap(width, height, body, label):
    return f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{label}">{body}</svg>'


def mono_text(x, y, content, size=40, spacing=14):
    return (f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}" letter-spacing="{spacing}" '
            f'font-family="{MONO}" fill="currentColor">{content}</text>')


def digits_svg(sequence):
    return svg_wrap(380, 90, mono_text(190, 60, "".join(str(d) for d in sequence)), "Deretan angka untuk diingat")


def grid_svg(cells, size, cell):
    body = []
    total = size * cell
    for index in range(size + 1):
        body.append(f'<line x1="10" y1="{10 + index * cell}" x2="{10 + total}" y2="{10 + index * cell}" {INK} stroke-width="2"/>')
        body.append(f'<line x1="{10 + index * cell}" y1="10" x2="{10 + index * cell}" y2="{10 + total}" {INK} stroke-width="2"/>')
    for (row, column), content in cells.items():
        cx, cy = 10 + column * cell + cell / 2, 10 + row * cell + cell / 2
        if content == "dot":
            body.append(f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(cell * .22)}" fill="currentColor"/>')
        else:
            body.append(glyph(content, cx, cy))
    return svg_wrap(total + 20, total + 20, "".join(body), "Kisi untuk diingat")


def shapes_options(answer, target, rng_local):
    others = [s for s in SHAPES if s != answer]
    rng_local.shuffle(others)
    names = [SHAPE_NAMES[s] for s in others]
    options, index = with_answer(SHAPE_NAMES[answer], names, target)
    return options, index


def range_options(answer, target):
    start = answer - target
    assert start >= 0, "rentang opsi negatif"
    options = [str(start + i) for i in range(5)]
    assert options[target] == str(answer)
    return options, target


memory = []
rng = random.Random(77)


def memory_question(prompt, svg, options, index, explanation):
    memory.append({"type": "MEMORY", "prompt": prompt, "imageSvg": svg, "options": options, "correctIndex": index, "explanation": explanation})


# 1. angka ke-3
sequence = rng.sample(range(10), 5)
others = [str(d) for d in sequence if d != sequence[2]]
options, index = with_answer(str(sequence[2]), others, 2)
memory_question("Angka yang tadi ditampilkan berjumlah lima. Angka berapa yang berada di urutan ketiga (dari kiri)?",
                digits_svg(sequence), options, index, f"Urutannya {', '.join(map(str, sequence))}. Urutan ketiga adalah {sequence[2]}.")

# 2. jumlah angka pertama dan terakhir
sequence = rng.sample(range(1, 10), 6)
answer = sequence[0] + sequence[-1]
options, index = range_options(answer, 0 if answer < 6 else 1)
memory_question("Angka yang tadi ditampilkan berjumlah enam. Berapa hasil penjumlahan angka pertama dan angka terakhir?",
                digits_svg(sequence), options, index, f"Urutannya {', '.join(map(str, sequence))}. Angka pertama {sequence[0]} + angka terakhir {sequence[-1]} = {answer}.")

# 3. bentuk pada posisi tertentu di kisi 3x3
positions = rng.sample([(r, c) for r in range(3) for c in range(3)], 4)
placed = dict(zip(positions, rng.sample(SHAPES, 4)))
(row, column), shape_name = next(iter(placed.items()))
options, index = shapes_options(shape_name, 3, rng)
memory_question(f"Pada kisi tadi, bentuk apa yang berada di baris ke-{row + 1} dan kolom ke-{column + 1}? (baris dihitung dari atas, kolom dari kiri)",
                grid_svg(placed, 3, 70), options, index, f"Pada baris {row + 1}, kolom {column + 1} terdapat {SHAPE_NAMES[shape_name]}.")

# 4. bentuk tepat setelah bentuk tertentu pada deret
row_shapes = rng.sample(SHAPES, 5)
position = rng.randrange(0, 4)
anchor, follower = row_shapes[position], row_shapes[position + 1]
body = "".join(glyph(shape, 40 + i * 75, 45) for i, shape in enumerate(row_shapes))
options, index = shapes_options(follower, 1, rng)
memory_question(f"Pada deretan bentuk tadi, bentuk apa yang berada tepat setelah {SHAPE_NAMES[anchor]} (ke arah kanan)?",
                svg_wrap(400, 90, body, "Deretan bentuk untuk diingat"), options, index,
                f"Urutan dari kiri: {', '.join(SHAPE_NAMES[s] for s in row_shapes)}. Setelah {SHAPE_NAMES[anchor]} adalah {SHAPE_NAMES[follower]}.")

# 5. kata ke-4
WORDS = ["meja", "buku", "kursi", "lampu", "jendela", "pintu", "sepatu", "gelas", "payung", "tas"]
words = rng.sample(WORDS, 5)
body = "".join(f'<text x="150" y="{34 + i * 36}" text-anchor="middle" font-size="26" font-family="sans-serif" fill="currentColor">{word}</text>' for i, word in enumerate(words))
others = [w for w in words if w != words[3]]
options, index = with_answer(words[3], others, 4)
memory_question("Daftar lima kata tadi disusun dari atas ke bawah. Kata apa yang berada di urutan keempat?",
                svg_wrap(300, 190, body, "Daftar kata untuk diingat"), options, index,
                f"Urutan dari atas: {', '.join(words)}. Urutan keempat adalah {words[3]}.")

# 6. huruf yang muncul dua kali
letters = rng.sample("BCDFGHKLMNPRSTW", 5)
repeated = rng.choice(letters)
sequence = list(letters) + [repeated]
while True:
    rng.shuffle(sequence)
    if all(sequence[i] != sequence[i + 1] for i in range(5)):
        break
assert sequence.count(repeated) == 2 and all(sequence.count(l) == 1 for l in letters if l != repeated)
others = [l for l in letters if l != repeated]
options, index = with_answer(repeated, others, 2)
memory_question("Dari enam huruf yang tadi ditampilkan, huruf manakah yang muncul dua kali?",
                svg_wrap(380, 90, mono_text(190, 60, "".join(sequence)), "Deretan huruf untuk diingat"), options, index,
                f"Urutannya {' '.join(sequence)}. Huruf {repeated} muncul dua kali.")

# 7. selisih angka terbesar dan terkecil
sequence = rng.sample(range(10), 6)
answer = max(sequence) - min(sequence)
options, index = range_options(answer, min(answer, 3) if answer < 5 else 3)
memory_question("Angka yang tadi ditampilkan berjumlah enam. Berapa selisih antara angka terbesar dan angka terkecil?",
                digits_svg(sequence), options, index, f"Urutannya {', '.join(map(str, sequence))}. Terbesar {max(sequence)}, terkecil {min(sequence)}, selisihnya {answer}.")

# 8. jumlah kotak berisi titik pada kisi 4x4
count = rng.choice([6, 7, 8])
filled = rng.sample([(r, c) for r in range(4) for c in range(4)], count)
options, index = range_options(count, 4)
memory_question("Pada kisi 4 × 4 tadi, berapa banyak kotak yang berisi titik?",
                grid_svg({position: "dot" for position in filled}, 4, 56), options, index, f"Terdapat {count} kotak berisi titik.")

# 9. pasangan huruf dan angka
pair_letters = rng.sample("KMPTRSBW", 4)
pair_digits = rng.sample(range(1, 10), 4)
ask = rng.randrange(4)
body = mono_text(200, 60, "  ".join(f"{l}{d}" for l, d in zip(pair_letters, pair_digits)), 36, 4)
extra = next(d for d in range(1, 10) if d not in pair_digits)
others = [str(d) for d in pair_digits if d != pair_digits[ask]] + [str(extra)]
others = others[:4]
options, index = with_answer(str(pair_digits[ask]), others, 0)
memory_question(f"Pada pasangan huruf dan angka tadi, angka berapa yang berpasangan dengan huruf {pair_letters[ask]}?",
                svg_wrap(400, 90, body, "Pasangan huruf dan angka untuk diingat"), options, index,
                f"Pasangannya: {', '.join(f'{l}{d}' for l, d in zip(pair_letters, pair_digits))}. Huruf {pair_letters[ask]} berpasangan dengan {pair_digits[ask]}.")

# 10. bentuk di sebelah kanan lingkaran pada kisi 3x3
while True:
    all_cells = [(r, c) for r in range(3) for c in range(3)]
    chosen = rng.sample(all_cells, 5)
    layout = dict(zip(chosen, rng.sample(SHAPES, 5)))
    circle_cell = next(cell for cell, s in layout.items() if s == "circle")
    right_cell = (circle_cell[0], circle_cell[1] + 1)
    if circle_cell[1] < 2 and right_cell in layout:
        break
neighbor = layout[right_cell]
options, index = shapes_options(neighbor, 4, rng)
memory_question("Pada kisi tadi, bentuk apa yang berada tepat di sebelah kanan lingkaran?",
                grid_svg(layout, 3, 70), options, index, f"Tepat di kanan lingkaran terdapat {SHAPE_NAMES[neighbor]}.")

write("reading-comprehension", reading, 10)
write("perceptual-speed", speed_questions, 30)
write("working-memory", memory, 10)
