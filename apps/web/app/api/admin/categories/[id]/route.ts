import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categoryInputSchema } from "@/lib/schemas";
import { enforceAdminWriteLimit } from "@/lib/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await enforceAdminWriteLimit(request);
  if (limited) return limited;

  await requireAdmin();
  const { id } = await params;
  const parsed = categoryInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { description, ...rest } = parsed.data;
  await prisma.category.update({
    where: { id },
    data: { ...rest, description: description || null },
  });
  return NextResponse.json({ id });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await enforceAdminWriteLimit(request);
  if (limited) return limited;

  await requireAdmin();
  const { id } = await params;
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
