import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TermForm } from "../term-form";

export default async function NewTermPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">New term</h1>
      <TermForm categories={categories} />
    </div>
  );
}
