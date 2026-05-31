import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

const getCategory = cache(async (slug: string) => {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      terms: {
        where: { term: { publishedAt: { not: null } } },
        orderBy: { term: { name: "asc" } },
        include: { term: true },
      },
    },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};
  return {
    title: category.name,
    description:
      category.description ?? `Data engineering terms in ${category.name}.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mt-2">{category.description}</p>
        )}
      </div>
      <ul className="divide-border divide-y rounded-lg border">
        {category.terms.map(({ term }) => (
          <li key={term.id} className="p-4">
            <Link
              href={`/terms/${term.slug}`}
              className="font-medium hover:underline"
            >
              {term.name}
            </Link>
            <p className="text-muted-foreground mt-1 text-sm">
              {term.shortDefinition}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
