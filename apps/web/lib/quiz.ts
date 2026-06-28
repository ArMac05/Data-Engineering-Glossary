import { prisma } from "@/lib/prisma";
import type { QuizTerm } from "@/lib/quiz-questions";

// A quiz term plus the categories it belongs to, so the client can filter the
// pool by category without another round-trip to the server.
export type QuizTermWithCategories = QuizTerm & { categorySlugs: string[] };

export type QuizData = {
  terms: QuizTermWithCategories[];
  categories: { slug: string; name: string }[];
};

// One query loads the whole quiz pool: every published term (minimal fields) and
// its category slugs. The payload is small — id/slug/name/definition — so it's
// cheap to ship to the browser and do all the question-building there.
export async function getQuizData(): Promise<QuizData> {
  const rows = await prisma.term.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      shortDefinition: true,
      categories: {
        select: { category: { select: { slug: true, name: true } } },
      },
    },
  });

  const terms: QuizTermWithCategories[] = rows.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    shortDefinition: t.shortDefinition,
    categorySlugs: t.categories.map((c) => c.category.slug),
  }));

  // Only offer categories that actually have a published term, deduped by slug.
  const bySlug = new Map<string, string>();
  for (const t of rows) {
    for (const { category } of t.categories)
      bySlug.set(category.slug, category.name);
  }
  const categories = [...bySlug.entries()]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { terms, categories };
}
