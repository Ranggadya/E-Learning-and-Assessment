"""Menggabungkan file soal per subtes (db/questions/<perusahaan>/*.json) menjadi satu file paket
(db/packs/<perusahaan>-paket-1.json) dengan format yang sama seperti yang diterima CMS.

Jalankan: python3 scripts/build-packs.py
"""
import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "db")
SOURCE = os.path.join(ROOT, "questions")
TARGET = os.path.join(ROOT, "packs")
os.makedirs(TARGET, exist_ok=True)

PACKS = [
    {
        "folder": "astra",
        "file": "astra-paket-1.json",
        "company": {"slug": "astra", "name": "Astra Group", "description": "Simulasi psikotes Astra: tes kemampuan kognitif."},
        "package": {"slug": "paket-1", "name": "Paket 1", "description": "7 subtes kognitif. Skor +1 benar, 0 salah atau kosong, tanpa penalti."},
        "subtests": [
            ("quantitative-reasoning", "Quantitative Reasoning (QR)", "Aljabar, deret angka, dan aritmatika.", 11 * 60),
            ("deductive-reasoning", "Deductive Reasoning (DR)", "Penalaran logis: silogisme dan premis.", 5 * 60),
            ("reading-comprehension", "Reading Comprehension (RC)", "Pemahaman bacaan.", 5 * 60),
            ("inductive-reasoning", "Inductive Reasoning (IR)", "Pola gambar atau deret logika.", 6 * 60),
            ("visualization", "Visualization (VIZ)", "Abstraksi non-verbal: rotasi, pencerminan, dan potongan bentuk.", 6 * 60),
            ("perceptual-speed", "Perceptual Speed (PS)", "Ketelitian dan kecepatan membandingkan simbol, angka, dan huruf.", 2 * 60),
            ("working-memory", "Working Memory (WM)", "Mengingat informasi yang ditampilkan sebentar lalu dihilangkan.", 6 * 60),
        ],
    },
    {
        "folder": "paragon",
        "file": "paragon-paket-1.json",
        "company": {"slug": "paragon", "name": "Paragon", "description": "Simulasi tes dasar Paragon: verbal, numerik, dan spasial."},
        "package": {"slug": "paket-1", "name": "Paket 1", "description": "Tes verbal, numerik, dan spasial. Durasi adalah perkiraan untuk latihan."},
        "subtests": [
            ("verbal", "Tes Verbal", "Antonim, pengelompokan kata, analogi, dan ringkasan bacaan.", 10 * 60),
            ("numerik-aritmatika", "Tes Numerik & Aritmatika", "Deret angka, soal cerita, dan hitungan dasar.", 12 * 60),
            ("spasial-logika-gambar", "Tes Spasial & Logika Gambar", "Pola gambar, rotasi, pencerminan, dan menghitung bentuk.", 8 * 60),
        ],
    },
]

for spec in PACKS:
    subtests = []
    for slug, name, description, duration in spec["subtests"]:
        path = os.path.join(SOURCE, spec["folder"], slug + ".json")
        with open(path, encoding="utf-8") as handle:
            questions = json.load(handle)["questions"]
        subtests.append({"slug": slug, "name": name, "description": description, "durationSeconds": duration, "questions": questions})
    pack = {"company": spec["company"], "package": spec["package"], "subtests": subtests}
    with open(os.path.join(TARGET, spec["file"]), "w", encoding="utf-8") as handle:
        json.dump(pack, handle, ensure_ascii=False, indent=2)
    total = sum(len(s["questions"]) for s in subtests)
    print(spec["file"], f"{len(subtests)} subtes, {total} soal")
