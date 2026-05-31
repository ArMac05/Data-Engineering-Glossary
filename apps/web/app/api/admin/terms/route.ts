import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { termInputSchema } from "@/lib/schemas";

export async function POST(request: Request) {
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

  return NextResponse.json({ id: term.id }, { status: 201 });
}
