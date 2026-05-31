import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

const getTerm = cache(async (slug: string) => {
  return prisma.term.findFirst({
    where: { slug, publishedAt: { not: null } },
    include: { categories: { include: { category: true } } },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const term = await getTerm(slug);
  if (!term) return {};
  return {
    title: term.name,
    description: term.shortDefinition,
    openGraph: {
      title: term.name,
      description: term.shortDefinition,
      type: "article",
    },
  };
}

export default async function TermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const term = await getTerm(slug);
  if (!term) notFound();

  return (
    <article className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          {term.categories.map(({ category }) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs font-medium hover:underline"
            >
              {category.name}
            </Link>
          ))}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{term.name}</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          {term.shortDefinition}
        </p>
      </div>

      {term.longExplanation && (
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {term.longExplanation}
          </ReactMarkdown>
        </div>
      )}
    </article>
  );
}
