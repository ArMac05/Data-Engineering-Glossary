import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { termInputSchema } from "@/lib/schemas";
import { fireEnrichmentWebhook } from "@/lib/enrichment";
import { enforceAdminWriteLimit } from "@/lib/rate-limit";
import { findTermConflict } from "@/lib/term-duplicates";

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

  const { categoryIds, published, longExplanation, wikipediaTitle, ...rest } =
    parsed.data;

  const conflict = await findTermConflict({
    name: parsed.data.name,
    slug: parsed.data.slug,
  });
  if (conflict) {
    return NextResponse.json(
      { error: `A term with this ${conflict.field} already exists.`, conflict },
      { status: 409 },
    );
  }

  try {
    const term = await prisma.term.create({
      data: {
        ...rest,
        longExplanation: longExplanation || null,
        wikipediaTitle: wikipediaTitle || null,
        publishedAt: published ? new Date() : null,
        categories: {
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
    });
    fireEnrichmentWebhook(term.id);
    return NextResponse.json({ id: term.id }, { status: 201 });
  } catch (e) {
    // Race backstop: a DB unique constraint (slug or lower(name)) caught a
    // duplicate that slipped past the check above between check and write.
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
