import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      terms: {
        where: { term: { publishedAt: { not: null } } },
        orderBy: { term: { name: "asc" } },
        include: { term: true },
      },
    },
  });

  const populated = categories.filter((c) => c.terms.length > 0);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">
          Data Engineering Glossary
        </h1>
        <p className="text-muted-foreground mt-2">
          Clear definitions of the terms, tools, and patterns behind modern data
          engineering.
        </p>
      </section>

      {populated.map((category) => (
        <section key={category.id}>
          <h2 className="mb-3 text-xl font-semibold">
            <Link
              href={`/categories/${category.slug}`}
              className="hover:underline"
            >
              {category.name}
            </Link>
          </h2>
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
        </section>
      ))}
    </div>
  );
}
