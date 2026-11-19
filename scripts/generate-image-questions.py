import json, os, random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "db", "questions", "astra")
KEYS = "ABCDE"
INK = 'stroke="currentColor"'


def n(value):
    if isinstance(value, float):
        text = f"{value:.1f}".rstrip("0").rstrip(".")
        return text if text else "0"
    return str(value)


def text_el(x, y, content, size=20, weight=600):
    return (f'<text x="{n(x)}" y="{n(y)}" text-anchor="middle" font-size="{size}" font-weight="{weight}" '
            f'font-family="sans-serif" fill="currentColor">{content}</text>')


def frame(x, y, w, h, dashed=False):
    dash = ' stroke-dasharray="6 5"' if dashed else ""
    return (f'<rect x="{n(x)}" y="{n(y)}" width="{n(w)}" height="{n(h)}" rx="6" fill="none" '
            f'{INK} stroke-width="2"{dash}/>')


# ---------------------------------------------------------------- IR: sel bentuk
DOT_LAYOUTS = {
    1: [(0, 0)],
    2: [(-.6, 0), (.6, 0)],
    3: [(-.7, .5), (.7, .5), (0, -.7)],
    4: [(-.6, -.6), (.6, -.6), (-.6, .6), (.6, .6)],
    5: [(-.6, -.6), (.6, -.6), (-.6, .6), (.6, .6), (0, 0)],
    6: [(-.6, -.9), (.6, -.9), (-.6, 0), (.6, 0), (-.6, .9), (.6, .9)],
    7: [(-.6, -.9), (.6, -.9), (-.6, 0), (.6, 0), (-.6, .9), (.6, .9), (0, 0)],
}
CORNER_OFFSETS = [(-26, -26), (26, -26), (26, 26), (-26, 26)]  # kiri atas, kanan atas, kanan bawah, kiri bawah


def draw_shape(shape, cx, cy, d, rot=0, fill=False):
    fill_value = "currentColor" if fill else "none"
    attrs = f'fill="{fill_value}" {INK} stroke-width="3" stroke-linejoin="round" stroke-linecap="round"'
    half = d / 2
    if shape == "circle":
        return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(half)}" {attrs}/>'
    rotate = f' transform="rotate({rot} {n(cx)} {n(cy)})"' if rot else ""
    if shape == "square":
        return f'<rect x="{n(cx - half)}" y="{n(cy - half)}" width="{n(d)}" height="{n(d)}" {attrs}{rotate}/>'
    if shape == "diamond":
        return (f'<rect x="{n(cx - half)}" y="{n(cy - half)}" width="{n(d)}" height="{n(d)}" {attrs} '
                f'transform="rotate({rot + 45} {n(cx)} {n(cy)})"/>')
    if shape == "triangle":
        points = f"{n(cx)},{n(cy - half)} {n(cx - half)},{n(cy + half * .8)} {n(cx + half)},{n(cy + half * .8)}"
        return f'<polygon points="{points}" {attrs}{rotate}/>'
    if shape == "arrow":
        head = d * .28
        return (f'<g{rotate}><line x1="{n(cx)}" y1="{n(cy + half)}" x2="{n(cx)}" y2="{n(cy - half + head)}" '
                f'{INK} stroke-width="5" stroke-linecap="round"/>'
                f'<polygon points="{n(cx)},{n(cy - half)} {n(cx - head)},{n(cy - half + head * 1.6)} '
                f'{n(cx + head)},{n(cy - half + head * 1.6)}" fill="currentColor"/></g>')
    if shape == "halfsquare":
        outline = f'<rect x="{n(cx - half)}" y="{n(cy - half)}" width="{n(d)}" height="{n(d)}" fill="none" {INK} stroke-width="3"/>'
        shaded = f'<rect x="{n(cx - half)}" y="{n(cy - half)}" width="{n(d)}" height="{n(half)}" fill="currentColor"/>'
        return f"<g{rotate}>{shaded}{outline}</g>"
    raise ValueError(shape)


def draw_cell(cell, x, y, size=100):
    scale = size / 100
    cx, cy = x + size / 2, y + size / 2
    parts = []
    if cell.get("pos") is not None:
        offset_x, offset_y = CORNER_OFFSETS[cell["pos"]]
        parts.append(draw_shape(cell["shape"], cx + offset_x * scale, cy + offset_y * scale, 30 * scale,
                                cell.get("rot", 0), cell.get("fill", False)))
    elif cell.get("shape"):
        parts.append(draw_shape(cell["shape"], cx, cy, cell.get("d", 60) * scale, cell.get("rot", 0), cell.get("fill", False)))
    count = cell.get("count")
    if count:
        spacing = (13 if cell.get("shape") else 20) * scale
        radius = (4 if cell.get("shape") else 5.5) * scale
        for offset_x, offset_y in DOT_LAYOUTS[count]:
            parts.append(f'<circle cx="{n(cx + offset_x * spacing)}" cy="{n(cy + offset_y * spacing)}" r="{n(radius)}" fill="currentColor"/>')
    return "".join(parts)


def signature(cell):
    return tuple(sorted(cell.items(), key=lambda item: item[0]))


def sequence_svg(shown_cells, option_cells):
    parts = []
    for index, cell in enumerate(shown_cells):
        x = 10 + index * 118
        parts.append(frame(x, 10, 100, 100))
        parts.append(draw_cell(cell, x, 10))
    x = 10 + len(shown_cells) * 118
    parts.append(frame(x, 10, 100, 100, dashed=True))
    parts.append(text_el(x + 50, 74, "?", 40, 400))
    for index, cell in enumerate(option_cells):
        x = 10 + index * 118
        parts.append(frame(x, 160, 100, 100))
        parts.append(draw_cell(cell, x, 160))
        parts.append(text_el(x + 50, 288, KEYS[index]))
    return f'<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Soal pola gambar">{"".join(parts)}</svg>'


def matrix_svg(cells, option_cells):
    parts = []
    cell_size, pitch, origin_x = 84, 90, 165
    for index, cell in enumerate(cells):
        row, column = divmod(index, 3)
        x, y = origin_x + column * pitch, 10 + row * pitch
        parts.append(frame(x, y, cell_size, cell_size, dashed=cell is None))
        if cell is None:
            parts.append(text_el(x + cell_size / 2, y + 54, "?", 36, 400))
        else:
            parts.append(draw_cell(cell, x, y, cell_size))
    for index, cell in enumerate(option_cells):
        x = 10 + index * 118
        parts.append(frame(x, 300, 100, 100))
        parts.append(draw_cell(cell, x, 300))
        parts.append(text_el(x + 50, 428, KEYS[index]))
    return f'<svg viewBox="0 0 600 440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Soal matriks gambar">{"".join(parts)}</svg>'


def place(answer, distractors, target):
    options = list(distractors)
    options.insert(target, answer)
    signatures = {signature(option) if isinstance(option, dict) else str(option) for option in options}
    assert len(signatures) == 5, "pilihan tidak unik"
    return options


def image_question(prompt, svg, answer_index, explanation):
    return {"type": "IMAGE", "prompt": prompt, "imageSvg": svg,
            "options": [f"Gambar {key}" for key in KEYS], "correctIndex": answer_index, "explanation": explanation}


SEQ_PROMPT = "Perhatikan pola pada kotak-kotak berikut. Gambar manakah yang menggantikan tanda tanya (?)"
MATRIX_PROMPT = "Setiap baris dan kolom pada matriks mengikuti aturan tertentu. Gambar manakah yang melengkapi kotak bertanda tanya (?)"

ir = []


def add_sequence(rule, answer_cell, distractors, target, explanation):
    shown = [rule(index) for index in range(4)]
    assert rule(4) == answer_cell, "kunci tidak sesuai aturan"
    options = place(answer_cell, distractors, target)
    ir.append(image_question(SEQ_PROMPT, sequence_svg(shown, options), target, explanation))


def add_matrix(cells, answer_cell, distractors, target, explanation, expected_rule):
    assert expected_rule == answer_cell, "kunci tidak sesuai aturan"
    options = place(answer_cell, distractors, target)
    ir.append(image_question(MATRIX_PROMPT, matrix_svg(cells, options), target, explanation))


# 1. panah berputar 45 derajat
def rule_arrow(index):
    return {"shape": "arrow", "rot": (45 * index) % 360, "d": 60}
add_sequence(rule_arrow, {"shape": "arrow", "rot": 180, "d": 60},
             [{"shape": "arrow", "rot": 225, "d": 60}, {"shape": "arrow", "rot": 90, "d": 60},
              {"shape": "arrow", "rot": 270, "d": 60}, {"shape": "arrow", "rot": 135, "d": 60}], 2,
             "Panah berputar 45° searah jarum jam pada setiap kotak: 0°, 45°, 90°, 135°, lalu 180° (menunjuk ke bawah).")

# 2. jumlah titik bertambah satu
def rule_dots(index):
    return {"count": index + 1}
add_sequence(rule_dots, {"count": 5}, [{"count": 3}, {"count": 4}, {"count": 6}, {"count": 7}], 0,
             "Jumlah titik bertambah 1 pada setiap kotak: 1, 2, 3, 4, lalu 5.")

# 3. segitiga berputar 90 derajat dan isi bergantian
def rule_triangle(index):
    return {"shape": "triangle", "rot": (90 * index) % 360, "fill": index % 2 == 0, "d": 60}
add_sequence(rule_triangle, {"shape": "triangle", "rot": 0, "fill": True, "d": 60},
             [{"shape": "triangle", "rot": 0, "fill": False, "d": 60}, {"shape": "triangle", "rot": 90, "fill": True, "d": 60},
              {"shape": "triangle", "rot": 180, "fill": False, "d": 60}, {"shape": "triangle", "rot": 270, "fill": True, "d": 60}], 4,
             "Dua aturan berjalan bersamaan: segitiga berputar 90° searah jarum jam tiap kotak (kotak ke-5 kembali ke posisi awal), dan isinya bergantian terisi lalu kosong (kotak ke-5 terisi).")

# 4. lingkaran membesar
def rule_circle(index):
    return {"shape": "circle", "d": 20 + 12 * index}
add_sequence(rule_circle, {"shape": "circle", "d": 68},
             [{"shape": "circle", "d": 50}, {"shape": "circle", "d": 62}, {"shape": "circle", "d": 74}, {"shape": "circle", "d": 80}], 1,
             "Diameter lingkaran bertambah dengan selisih tetap (12 satuan) pada setiap kotak, sehingga kotak ke-5 memiliki lingkaran terbesar dengan selisih yang sama dari kotak ke-4.")

# 5. siklus bentuk
CYCLE = ["circle", "square", "triangle"]
def rule_cycle(index):
    return {"shape": CYCLE[index % 3], "d": 56}
add_sequence(rule_cycle, {"shape": "square", "d": 56},
             [{"shape": "triangle", "d": 56}, {"shape": "circle", "d": 56}, {"shape": "diamond", "d": 56},
              {"shape": "square", "d": 56, "fill": True}], 3,
             "Bentuk berulang dalam siklus tiga: lingkaran, persegi, segitiga. Kotak ke-4 mengulang lingkaran, sehingga kotak ke-5 adalah persegi kosong.")

# 6. setengah persegi berputar 135 derajat
def rule_half(index):
    return {"shape": "halfsquare", "rot": (135 * index) % 360, "d": 56}
add_sequence(rule_half, {"shape": "halfsquare", "rot": 180, "d": 56},
             [{"shape": "halfsquare", "rot": 90, "d": 56}, {"shape": "halfsquare", "rot": 225, "d": 56},
              {"shape": "halfsquare", "rot": 315, "d": 56}, {"shape": "halfsquare", "rot": 0, "d": 56}], 0,
             "Bagian yang diarsir berputar 135° searah jarum jam pada setiap kotak: 0°, 135°, 270°, 45°, lalu 180° (arsiran berada di bawah).")

# 7. posisi bergeser searah jarum jam, isi berulang tiap tiga kotak
def rule_corner(index):
    return {"shape": "square", "pos": index % 4, "fill": index % 3 == 0}
add_sequence(rule_corner, {"shape": "square", "pos": 0, "fill": False},
             [{"shape": "square", "pos": 0, "fill": True}, {"shape": "square", "pos": 1, "fill": False},
              {"shape": "square", "pos": 2, "fill": True}, {"shape": "square", "pos": 3, "fill": False}], 2,
             "Posisi persegi bergeser satu sudut searah jarum jam (kiri atas, kanan atas, kanan bawah, kiri bawah, lalu kembali ke kiri atas). Isinya berulang tiap tiga kotak: terisi, kosong, kosong, sehingga kotak ke-5 kosong.")

# 8. matriks siklus bentuk (latin square)
shapes_cycle = ["circle", "square", "triangle"]
cells_latin = [{"shape": shapes_cycle[(row + column) % 3], "d": 52} for row in range(3) for column in range(3)]
answer_latin = cells_latin[8]
cells_latin[8] = None
add_matrix(cells_latin, answer_latin,
           [{"shape": "circle", "d": 52}, {"shape": "triangle", "d": 52}, {"shape": "diamond", "d": 52},
            {"shape": "square", "d": 52, "fill": True}], 4,
           "Setiap baris dan setiap kolom memuat tiga bentuk berbeda: lingkaran, persegi, dan segitiga, masing-masing tepat satu kali. Baris terakhir sudah punya segitiga dan lingkaran, sehingga yang hilang adalah persegi kosong.",
           {"shape": shapes_cycle[(2 + 2) % 3], "d": 52})

# 9. matriks bentuk per baris, jumlah titik per kolom
row_shapes = ["circle", "square", "triangle"]
cells_dots = [{"shape": row_shapes[row], "count": column + 1, "d": 62} for row in range(3) for column in range(3)]
answer_dots = cells_dots[8]
cells_dots[8] = None
add_matrix(cells_dots, answer_dots,
           [{"shape": "triangle", "count": 2, "d": 62}, {"shape": "triangle", "count": 3, "d": 62}.copy() | {"count": 4},
            {"shape": "square", "count": 3, "d": 62}, {"shape": "circle", "count": 3, "d": 62}], 1,
           "Bentuk ditentukan oleh baris (baris 1 lingkaran, baris 2 persegi, baris 3 segitiga), sedangkan jumlah titik ditentukan oleh kolom (kolom 1 satu titik, kolom 2 dua titik, kolom 3 tiga titik). Kotak kanan bawah adalah segitiga dengan tiga titik.",
           {"shape": "triangle", "count": 3, "d": 62})

# 10. matriks bentuk per kolom, ukuran per baris
col_shapes = ["circle", "square", "triangle"]
row_sizes = [36, 52, 68]
cells_size = [{"shape": col_shapes[column], "d": row_sizes[row]} for row in range(3) for column in range(3)]
answer_size = cells_size[8]
cells_size[8] = None
add_matrix(cells_size, answer_size,
           [{"shape": "triangle", "d": 52}, {"shape": "triangle", "d": 36}, {"shape": "square", "d": 68}, {"shape": "circle", "d": 68}], 3,
           "Bentuk ditentukan oleh kolom (lingkaran, persegi, segitiga) dan ukuran ditentukan oleh baris (kecil, sedang, besar). Kotak kanan bawah berada di kolom segitiga dan baris besar.",
           {"shape": "triangle", "d": 68})

# ---------------------------------------------------------------- VIZ: transformasi grid
def rot90cw(m):
    size = len(m)
    result = [[m[size - 1 - column][row] for column in range(size)] for row in range(size)]
    assert result == [list(row) for row in zip(*m[::-1])], "rotasi 90 tidak konsisten"
    return result


def hflip(m):
    return [list(reversed(row)) for row in m]


def vflip(m):
    return [list(row) for row in reversed(m)]


def rot180(m):
    result = hflip(vflip(m))
    if len(m) == len(m[0]):
        assert result == rot90cw(rot90cw(m)), "rotasi 180 tidak konsisten"
    return result


def rot270cw(m):
    result = rot90cw(rot180(m))
    size = len(m)
    assert result == [[m[column][size - 1 - row] for column in range(size)] for row in range(size)], "rotasi 270 tidak konsisten"
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
        images.add(str(hflip(rot90cw(matrix))))
        images.add(str(vflip(rot90cw(matrix))))
        if len(images) >= 7:
            return matrix


def grid_cells(matrix, x, y, cell):
    parts = []
    for row, values in enumerate(matrix):
        for column, value in enumerate(values):
            if value:
                parts.append(f'<rect x="{n(x + column * cell)}" y="{n(y + row * cell)}" width="{n(cell)}" height="{n(cell)}" fill="currentColor"/>')
    return "".join(parts)


def grid_frame(matrix, x, y, cell):
    rows, columns = len(matrix), len(matrix[0])
    lines = []
    for row in range(rows + 1):
        lines.append(f'<line x1="{n(x)}" y1="{n(y + row * cell)}" x2="{n(x + columns * cell)}" y2="{n(y + row * cell)}" {INK} stroke-width="1" opacity=".35"/>')
    for column in range(columns + 1):
        lines.append(f'<line x1="{n(x + column * cell)}" y1="{n(y)}" x2="{n(x + column * cell)}" y2="{n(y + rows * cell)}" {INK} stroke-width="1" opacity=".35"/>')
    outline = f'<rect x="{n(x)}" y="{n(y)}" width="{n(columns * cell)}" height="{n(rows * cell)}" fill="none" {INK} stroke-width="2.5"/>'
    return grid_cells(matrix, x, y, cell) + "".join(lines) + outline


def viz_svg(caption, figure_matrix, option_matrices, cell):
    parts = [text_el(300, 22, caption, 15, 500)]
    figure_width = len(figure_matrix[0]) * cell
    parts.append(grid_frame(figure_matrix, (600 - figure_width) / 2, 36, cell))
    top = 36 + len(figure_matrix) * cell + 26
    for index, matrix in enumerate(option_matrices):
        box_x = 10 + index * 118
        width, height = len(matrix[0]) * cell, len(matrix) * cell
        parts.append(frame(box_x, top, 100, height + 20))
        parts.append(grid_frame(matrix, box_x + (100 - width) / 2, top + 10, cell))
        parts.append(text_el(box_x + 50, top + height + 48, KEYS[index]))
    total_height = top + len(option_matrices[0]) * cell + 60
    return f'<svg viewBox="0 0 600 {n(total_height)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Soal transformasi gambar">{"".join(parts)}</svg>'


viz = []


def add_transform(prompt, caption, matrix, answer, distractors, target, cell, explanation):
    options = [list(map(list, option)) for option in distractors]
    options.insert(target, answer)
    assert len({str(option) for option in options}) == 5, "pilihan tidak unik: " + prompt
    viz.append(image_question(prompt, viz_svg(caption, matrix, options, cell), target, explanation))


pattern_a = asymmetric_pattern(3, 5, 11)
pattern_b = asymmetric_pattern(3, 5, 23)
pattern_c = asymmetric_pattern(3, 6, 37)
pattern_d = asymmetric_pattern(3, 5, 52)
pattern_e = asymmetric_pattern(3, 6, 68)
pattern_f = asymmetric_pattern(3, 5, 81)
pattern_g = asymmetric_pattern(4, 7, 97)

# 1
add_transform("Gambar awal diputar 90° searah jarum jam. Gambar manakah hasilnya?", "Gambar awal", pattern_a,
              rot90cw(pattern_a), [hflip(pattern_a), rot180(pattern_a), rot270cw(pattern_a), transpose(pattern_a)], 1, 30,
              "Putaran 90° searah jarum jam memindahkan setiap sel sudut satu sudut ke kanan: kiri atas menjadi kanan atas, kanan atas menjadi kanan bawah, dan seterusnya. Baris paling atas gambar awal menjadi kolom paling kanan.")
# 2
add_transform("Gambar awal dicerminkan terhadap garis tegak di tengahnya (kiri menjadi kanan). Gambar manakah hasilnya?", "Gambar awal", pattern_b,
              hflip(pattern_b), [identity(pattern_b), vflip(pattern_b), rot90cw(pattern_b), rot270cw(pattern_b)], 3, 30,
              "Pada pencerminan kiri-kanan, setiap baris dibalik urutannya: sel paling kiri bertukar dengan sel paling kanan, sedangkan posisi atas-bawah tidak berubah.")
# 3
add_transform("Gambar awal diputar 180°. Gambar manakah hasilnya?", "Gambar awal", pattern_c,
              rot180(pattern_c), [identity(pattern_c), hflip(pattern_c), rot90cw(pattern_c), rot270cw(pattern_c)], 0, 30,
              "Putaran 180° membuat gambar terbalik: sel kiri atas pindah ke kanan bawah, dan kanan atas pindah ke kiri bawah. Hasilnya sama dengan pencerminan kiri-kanan sekaligus atas-bawah.")

# 4. melengkapi bentuk simetris
def half_pattern(seed):
    rng = random.Random(seed)
    while True:
        cells = set(rng.sample(range(8), 4))
        matrix = [[1 if row * 2 + column in cells else 0 for column in range(2)] for row in range(4)]
        variants = [str(f(matrix)) for f in (identity, hflip, vflip, rot180)]
        if len(set(variants)) == 4:
            return matrix
left_half = half_pattern(5)
answer_half = hflip(left_half)
toggled = [list(row) for row in answer_half]
toggled[0][0] = 1 - toggled[0][0]
piece_options = [identity(left_half), vflip(left_half), rot180(left_half), toggled]
piece_options.insert(4, answer_half)
assert len({str(option) for option in piece_options}) == 5
# gambar utama: bagian kiri terisi, bagian kanan kosong bertanda tanya
cell_size = 26
figure_x = (600 - 4 * cell_size) / 2
figure_parts = [text_el(300, 22, "Bentuk simetris terhadap garis tengah (garis putus-putus)", 15, 500),
                grid_frame(left_half, figure_x, 36, cell_size),
                f'<rect x="{n(figure_x + 2 * cell_size)}" y="36" width="{n(2 * cell_size)}" height="{n(4 * cell_size)}" fill="none" {INK} stroke-width="2.5" stroke-dasharray="6 5"/>',
                text_el(figure_x + 3 * cell_size, 36 + 2 * cell_size + 12, "?", 34, 400),
                f'<line x1="{n(figure_x + 2 * cell_size)}" y1="30" x2="{n(figure_x + 2 * cell_size)}" y2="{n(36 + 4 * cell_size + 6)}" {INK} stroke-width="2" stroke-dasharray="3 4"/>']
top = 36 + 4 * cell_size + 26
for index, matrix in enumerate(piece_options):
    box_x = 10 + index * 118
    figure_parts.append(frame(box_x, top, 100, 4 * cell_size + 20))
    figure_parts.append(grid_frame(matrix, box_x + (100 - 2 * cell_size) / 2, top + 10, cell_size))
    figure_parts.append(text_el(box_x + 50, top + 4 * cell_size + 48, KEYS[index]))
half_svg = (f'<svg viewBox="0 0 600 {n(top + 4 * cell_size + 60)}" xmlns="http://www.w3.org/2000/svg" role="img" '
            f'aria-label="Soal melengkapi bentuk simetris">{"".join(figure_parts)}</svg>')
viz.append(image_question("Bagian kiri gambar sudah lengkap. Gambar manakah yang mengisi bagian kanan (?) agar seluruh bentuk simetris terhadap garis tengah?",
                          half_svg, 4,
                          "Pada bentuk simetris cermin, bagian kanan adalah bayangan bagian kiri: kolom paling dekat garis tengah tetap paling dekat garis tengah. Jadi urutan kolom bagian kiri dibalik, sedangkan posisi atas-bawah tidak berubah."))

# 5
add_transform("Gambar awal diputar 90° berlawanan arah jarum jam. Gambar manakah hasilnya?", "Gambar awal", pattern_d,
              rot270cw(pattern_d), [identity(pattern_d), rot90cw(pattern_d), rot180(pattern_d), hflip(pattern_d)], 2, 30,
              "Putaran 90° berlawanan arah jarum jam (sama dengan 270° searah jarum jam) memindahkan sudut kiri atas ke kiri bawah, dan kanan atas ke kiri atas.")
# 6
add_transform("Gambar awal dicerminkan terhadap garis mendatar di tengahnya (atas menjadi bawah). Gambar manakah hasilnya?", "Gambar awal", pattern_e,
              vflip(pattern_e), [identity(pattern_e), hflip(pattern_e), rot90cw(pattern_e), transpose(pattern_e)], 1, 30,
              "Pada pencerminan atas-bawah, urutan baris dibalik: baris paling atas bertukar dengan baris paling bawah, sedangkan posisi kiri-kanan tidak berubah.")
# 7
composite = hflip(rot90cw(pattern_f))
assert composite == transpose(pattern_f)
add_transform("Gambar awal diputar 90° searah jarum jam, lalu hasilnya dicerminkan kiri-kanan. Gambar manakah hasil akhirnya?", "Gambar awal", pattern_f,
              composite, [rot90cw(pattern_f), hflip(pattern_f), rot180(pattern_f), vflip(pattern_f)], 4, 30,
              "Lakukan dua langkah berurutan. Setelah diputar 90° searah jarum jam, sel kiri atas berada di kanan atas; setelah dicerminkan kiri-kanan, sel itu kembali ke kiri atas. Gabungan keduanya sama dengan pencerminan terhadap diagonal dari kiri atas ke kanan bawah.")

# 8 & 9. menghitung persegi
def grid_lines_svg(size, cell):
    width = size * cell
    parts = []
    for index in range(size + 1):
        parts.append(f'<line x1="10" y1="{10 + index * cell}" x2="{10 + width}" y2="{10 + index * cell}" {INK} stroke-width="2.5"/>')
        parts.append(f'<line x1="{10 + index * cell}" y1="10" x2="{10 + index * cell}" y2="{10 + width}" {INK} stroke-width="2.5"/>')
    total = width + 20
    return f'<svg viewBox="0 0 {total} {total}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kisi {size} kali {size}" style="max-width:260px;margin:auto">{"".join(parts)}</svg>'

def count_squares(size):
    return sum((size - k + 1) ** 2 for k in range(1, size + 1))

assert count_squares(3) == 14 and count_squares(4) == 30
viz.append({"type": "IMAGE", "prompt": "Berapa banyak persegi (dari semua ukuran) yang dapat ditemukan pada gambar kisi 3 × 3 berikut?",
            "imageSvg": grid_lines_svg(3, 60), "options": ["9", "10", "12", "14", "16"], "correctIndex": 3,
            "explanation": "Persegi 1×1 ada 9, persegi 2×2 ada 4, dan persegi 3×3 ada 1. Total 9 + 4 + 1 = 14. Jebakan umum: hanya menghitung 9 persegi kecil."})
viz.append({"type": "IMAGE", "prompt": "Berapa banyak persegi (dari semua ukuran) yang dapat ditemukan pada gambar kisi 4 × 4 berikut?",
            "imageSvg": grid_lines_svg(4, 50), "options": ["16", "25", "30", "32", "36"], "correctIndex": 2,
            "explanation": "Persegi 1×1 ada 16, 2×2 ada 9, 3×3 ada 4, dan 4×4 ada 1. Total 16 + 9 + 4 + 1 = 30."})

# 10. rotasi 4x4
add_transform("Gambar awal (kisi 4 × 4) diputar 90° searah jarum jam. Gambar manakah hasilnya?", "Gambar awal", pattern_g,
              rot90cw(pattern_g), [identity(pattern_g), hflip(pattern_g), rot180(pattern_g), rot270cw(pattern_g)], 0, 24,
              "Lacak sudut-sudut gambar: kiri atas berpindah ke kanan atas, kanan atas ke kanan bawah, kanan bawah ke kiri bawah, dan kiri bawah ke kiri atas. Setiap baris pada gambar awal menjadi kolom pada hasil putaran.")

# ---------------------------------------------------------------- tulis
def write(slug, questions):
    assert len(questions) == 10, (slug, len(questions))
    for item in questions:
        assert len(item["options"]) == 5 and len(set(item["options"])) == 5
        assert 0 <= item["correctIndex"] < 5
    with open(os.path.join(OUT, slug + ".json"), "w", encoding="utf-8") as handle:
        json.dump({"package": "astra", "subtest": slug, "questions": questions}, handle, ensure_ascii=False, indent=2)
    positions = [item["correctIndex"] for item in questions]
    print(slug, "posisi kunci:", positions, "sebaran:", {i: positions.count(i) for i in range(5)})

write("inductive-reasoning", ir)
write("visualization", viz)
