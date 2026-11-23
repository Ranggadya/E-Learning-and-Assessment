import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin/auth";
import { validateEnglishWordsJson } from "@/lib/english/logic";
import { upsertEnglishWords } from "@/lib/english/queries";

const MAX_BODY_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { errors: ["File terlalu besar (maksimal 8 MB)."] },
      { status: 413 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "format tidak dikenali";
    return NextResponse.json(
      { errors: [`Bukan JSON yang valid: ${reason}`] },
      { status: 400 },
    );
  }

  const validation = validateEnglishWordsJson(parsed);
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const { upsertedCount } = await upsertEnglishWords(validation.words);
  return NextResponse.json({
    upsertedCount,
    totalInFile: validation.words.length,
  });
}
