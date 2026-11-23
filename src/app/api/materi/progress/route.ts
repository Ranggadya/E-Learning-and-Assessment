import { NextResponse } from "next/server";
import { getEnglishProgressOverview } from "@/lib/english/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const overview = await getEnglishProgressOverview(userId);
  return NextResponse.json({ overview });
}
