import { NextResponse } from "next/server";
import { rejectIfNotAdmin } from "@/lib/admin-auth";
import { exportPack } from "@/lib/queries";

interface RouteContext {
  params: Promise<{ packageId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const rejection = await rejectIfNotAdmin();
  if (rejection) {
    return rejection;
  }
  const packageId = Number((await context.params).packageId);
  if (!Number.isInteger(packageId)) {
    return NextResponse.json({ error: "ID paket tidak valid" }, { status: 400 });
  }
  const pack = await exportPack(packageId);
  if (!pack) {
    return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });
  }
  const fileName = `${pack.company.slug}-${pack.package.slug}.json`;
  return new NextResponse(JSON.stringify(pack, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
