import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { termInputSchema } from "@/lib/schemas";
import { fireEnrichmentWebhook } from "@/lib/enrichment";
import { enforceAdminWriteLimit } from "@/lib/rate-limit";
import { findTermConflict } from "@/lib/term-duplicates";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await enforceAdminWriteLimit(request);
  if (limited) return limited;

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

  const conflict = await findTermConflict({
    name: parsed.data.name,
    slug: parsed.data.slug,
    excludeId: id,
  });
  if (conflict) {
    return NextResponse.json(
      { error: `A term with this ${conflict.field} already exists.`, conflict },
      { status: 409 },
    );
  }

  try {
    await prisma.term.update({
      where: { id },
      data: {
        ...rest,
        longExplanation: longExplanation || null,
        publishedAt: published ? new Date() : null,
        enrichmentStatus: "pending", // an edit re-fires enrichment
        categories: {
          deleteMany: {},
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
    });
    fireEnrichmentWebhook(id);
    return NextResponse.json({ id });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A term with this name or slug already exists." },
        { status: 409 },
      );
    }
    throw e;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await enforceAdminWriteLimit(request);
  if (limited) return limited;

  await requireAdmin();
  const { id } = await params;
  await prisma.term.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
