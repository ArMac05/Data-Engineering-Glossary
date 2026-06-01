import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { prisma } from "@/lib/prisma";

type Example = { language: string; code: string; explanation?: string };

const getTerm = cache(async (slug: string) => {
  return prisma.term.findFirst({
    where: { slug, publishedAt: { not: null } },
    include: {
      categories: { include: { category: true } },
      enrichment: true,
    },
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

  const examples =
    (term.enrichment?.examples as unknown as Example[] | undefined) ?? [];

  return (
    <article className="space-y-8">
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

      {term.enrichment?.clarification && (
        <section>
          <h2 className="text-xl font-semibold">In plain English</h2>
          <p className="text-muted-foreground mt-2">
            {term.enrichment.clarification}
          </p>
        </section>
      )}

      {examples.length > 0 && (
        <section>
          <h2 className="mb-2 text-xl font-semibold">Examples</h2>
          <div className="space-y-4">
            {examples.map((ex, i) => (
              <div key={`${ex.language}-${i}`}>
                {ex.explanation && (
                  <p className="text-muted-foreground mb-1 text-sm">
                    {ex.explanation}
                  </p>
                )}
                <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">
                  <code>{ex.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}

      {term.enrichment?.wikipediaSummary && (
        <section>
          <h2 className="text-xl font-semibold">From Wikipedia</h2>
          <p className="text-muted-foreground mt-2">
            {term.enrichment.wikipediaSummary}
          </p>
          {term.enrichment.wikipediaUrl && (
            <a
              href={term.enrichment.wikipediaUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm underline underline-offset-4"
            >
              Read more on Wikipedia →
            </a>
          )}
        </section>
      )}
    </article>
  );
}
