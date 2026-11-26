import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin/auth";
import {
  listAdminBelajarData,
  previewOrImportLessonBatch,
  upsertLearningTrack,
} from "@/lib/belajar/belajar.queries";
import { BELAJAR_CACHE_TAG } from "@/lib/belajar/constants";

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET() {
  const rejection = await rejectIfNotAdmin();
  if (rejection) return rejection;
  const data = await listAdminBelajarData();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) return rejection;

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { errors: ["Ukuran unggahan terlalu besar (maksimal 8 MB)."] },
      { status: 413 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ errors: ["Payload JSON tidak valid."] }, { status: 400 });
  }

  if (!parsed || typeof parsed !== "object") {
    return NextResponse.json({ errors: ["Payload harus berupa objek."] }, { status: 400 });
  }

  const rec = parsed as Record<string, unknown>;

  // Mode tambah/perbarui jalur belajar (learning_tracks).
  if (rec.mode === "track") {
    const slug = typeof rec.slug === "string" ? rec.slug.trim() : "";
    const title = typeof rec.title === "string" ? rec.title.trim() : "";
    const description =
      typeof rec.description === "string" && rec.description.trim()
        ? rec.description.trim()
        : null;
    const sortOrder = Number(rec.sortOrder ?? 1);
    if (!SLUG_RE.test(slug) || !title || !Number.isInteger(sortOrder)) {
      return NextResponse.json(
        { errors: ["Slug, judul, dan urutan jalur wajib diisi dengan benar."] },
        { status: 400 },
      );
    }
    await upsertLearningTrack({ slug, title, description, sortOrder });
    revalidateTag(BELAJAR_CACHE_TAG, { expire: 0 });
    revalidatePath("/belajar", "layout");
    return NextResponse.json({ ok: true });
  }

  // Mode pratinjau / impor banyak file Markdown (.md).
  if (!Array.isArray(rec.files) || rec.files.length === 0) {
    return NextResponse.json(
      { errors: ["Pilih minimal satu file .md untuk diimpor."] },
      { status: 400 },
    );
  }
  if (rec.files.length > 200) {
    return NextResponse.json(
      { errors: ["Maksimal 200 file .md dalam satu unggahan."] },
      { status: 400 },
    );
  }

  const files: Array<{ fileName: string; content: string }> = [];
  for (const item of rec.files) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).fileName === "string" &&
      typeof (item as Record<string, unknown>).content === "string"
    ) {
      files.push({
        fileName: ((item as Record<string, unknown>).fileName as string).trim() || "unnamed.md",
        content: (item as Record<string, unknown>).content as string,
      });
    }
  }

  if (files.length === 0) {
    return NextResponse.json({ errors: ["Tidak ada file .md yang valid."] }, { status: 400 });
  }

  const result = await previewOrImportLessonBatch({ files, dryRun });
  if (!dryRun && result.ok) {
    revalidateTag(BELAJAR_CACHE_TAG, { expire: 0 });
    revalidatePath("/belajar", "layout");
  }

  return NextResponse.json(result, { status: result.ok || dryRun ? 200 : 400 });
}
