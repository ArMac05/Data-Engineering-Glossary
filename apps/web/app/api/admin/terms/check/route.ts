import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { findTermConflict } from "@/lib/term-duplicates";

// Live duplicate check for the admin term form. Admin-only; always live.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireAdmin();

  const params = new URL(request.url).searchParams;
  const name = params.get("name") ?? "";
  const slug = params.get("slug") ?? "";
  const excludeId = params.get("excludeId") ?? undefined;

  const conflict = await findTermConflict({ name, slug, excludeId });
  return NextResponse.json({ conflict });
}
