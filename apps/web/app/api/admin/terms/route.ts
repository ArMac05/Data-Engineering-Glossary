import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { termInputSchema } from "@/lib/schemas";
import { fireEnrichmentWebhook } from "@/lib/enrichment";
import { enforceAdminWriteLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = await enforceAdminWriteLimit(request);
  if (limited) return limited;

  await requireAdmin();

  const parsed = termInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { categoryIds, published, longExplanation, ...rest } = parsed.data;

  const term = await prisma.term.create({
    data: {
      ...rest,
      longExplanation: longExplanation || null,
      publishedAt: published ? new Date() : null,
      categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
    },
  });
  fireEnrichmentWebhook(term.id);

  return NextResponse.json({ id: term.id }, { status: 201 });
}
