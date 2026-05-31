import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { DeleteCategoryButton } from "./delete-category-button";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { terms: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <Button asChild size="sm">
          <Link href="/admin/categories/new">New category</Link>
        </Button>
      </div>
      <ul className="divide-border divide-y rounded-lg border">
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div>
              <span className="font-medium">{c.name}</span>
              <span className="text-muted-foreground ml-2 text-xs">
                {c._count.terms} terms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/categories/${c.id}/edit`}>Edit</Link>
              </Button>
              <DeleteCategoryButton id={c.id} name={c.name} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
