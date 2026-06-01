import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { termInputSchema } from "@/lib/schemas";
import { fireEnrichmentWebhook } from "@/lib/enrichment";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  const parsed = termInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { categoryIds, published, longExplanation, ...rest } = parsed.data;

  await prisma.term.update({
    where: { id },
    data: {
      ...rest,
      longExplanation: longExplanation || null,
      publishedAt: published ? new Date() : null,
      categories: {
        deleteMany: {},
        create: categoryIds.map((categoryId) => ({ categoryId })),
      },
    },
  });
  fireEnrichmentWebhook(id);

  return NextResponse.json({ id });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  await prisma.term.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
