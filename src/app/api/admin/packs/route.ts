import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin-auth";
import { importPack } from "@/lib/pack-import";
import { validatePack } from "@/lib/pack-schema";

const MAX_BODY_BYTES = 8 * 1024 * 1024;

// POST /api/admin/packs?dryRun=1 memeriksa dan menampilkan ringkasan tanpa menyimpan apa pun.
export async function POST(request: Request) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ errors: ["File terlalu besar (maksimal 8 MB)"] }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "format tidak dikenali";
    return NextResponse.json({ errors: [`Bukan JSON yang valid: ${reason}`] }, { status: 400 });
  }

  const validation = validatePack(parsed);
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  try {
    const summary = await importPack(validation.pack, { dryRun });
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Impor paket gagal", error);
    return NextResponse.json({ errors: ["Impor gagal di database. Tidak ada data yang berubah."] }, { status: 500 });
  }
}
