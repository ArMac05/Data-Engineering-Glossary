import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoryForm } from "../../category-form";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Edit category</h1>
      <CategoryForm category={category} />
    </div>
  );
}
