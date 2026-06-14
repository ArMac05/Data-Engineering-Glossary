import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Lightweight status read for the Re-enrich button to poll. Admin-only, live.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  const term = await prisma.term.findUnique({
    where: { id },
    select: { enrichmentStatus: true },
  });
  if (!term) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ status: term.enrichmentStatus });
}
