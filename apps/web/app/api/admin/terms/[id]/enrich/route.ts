import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fireEnrichmentWebhook } from "@/lib/enrichment";
import { enforceAdminWriteLimit } from "@/lib/rate-limit";

// Manually re-run enrichment for a term: reset its status to pending and
// re-fire the webhook. The pipeline flips it to enriched/failed.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await enforceAdminWriteLimit(request);
  if (limited) return limited;

  await requireAdmin();
  const { id } = await params;

  await prisma.term.update({
    where: { id },
    data: { enrichmentStatus: "pending" },
  });
  fireEnrichmentWebhook(id);

  return NextResponse.json({ ok: true });
}
