import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categoryInputSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  await requireAdmin();
  const parsed = categoryInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { description, ...rest } = parsed.data;
  const category = await prisma.category.create({
    data: { ...rest, description: description || null },
  });
  return NextResponse.json({ id: category.id }, { status: 201 });
}
