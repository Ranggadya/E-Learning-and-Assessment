import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin-auth";

// Contoh paket minimal agar format file mudah dipahami dan diedit.
const TEMPLATE = {
  company: { slug: "contoh-perusahaan", name: "Contoh Perusahaan", description: "Deskripsi singkat perusahaan" },
  package: { slug: "paket-1", name: "Paket 1", description: "Deskripsi singkat paket" },
  subtests: [
    {
      slug: "contoh-subtes",
      name: "Contoh Subtes",
      description: "Deskripsi singkat subtes",
      durationSeconds: 300,
      questions: [
        {
          type: "TEXT",
          prompt: "Berapakah 2 + 3?",
          options: ["4", "5", "6", "7", "8"],
          correctIndex: 1,
          explanation: "2 + 3 = 5.",
        },
        {
          type: "IMAGE",
          prompt: "Gambar berikut menunjukkan bentuk apa?",
          imageSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="currentColor"/></svg>',
          options: ["Persegi", "Lingkaran", "Segitiga"],
          correctIndex: 1,
          explanation: "Bentuknya bulat penuh, yaitu lingkaran.",
        },
      ],
    },
  ],
};

export async function GET() {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }
  return new NextResponse(JSON.stringify(TEMPLATE, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="contoh-paket.json"',
    },
  });
}
