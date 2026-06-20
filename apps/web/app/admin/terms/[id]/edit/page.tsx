import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TermForm } from "../../term-form";

export default async function EditTermPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [term, categories] = await Promise.all([
    prisma.term.findUnique({
      where: { id },
      include: { categories: { select: { categoryId: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!term) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Edit term</h1>
      <TermForm
        categories={categories}
        term={{
          id: term.id,
          name: term.name,
          slug: term.slug,
          shortDefinition: term.shortDefinition,
          longExplanation: term.longExplanation,
          wikipediaTitle: term.wikipediaTitle,
          published: term.publishedAt !== null,
          categoryIds: term.categories.map((c) => c.categoryId),
        }}
      />
    </div>
  );
}
