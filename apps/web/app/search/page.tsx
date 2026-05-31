import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type SearchRow = {
  id: string;
  slug: string;
  name: string;
  shortDefinition: string;
};

export const metadata: Metadata = {
  title: "Search",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let results: SearchRow[] = [];
  if (query) {
    results = await prisma.$queryRaw<SearchRow[]>`
      SELECT id, slug, name, short_definition AS "shortDefinition"
      FROM terms
      WHERE published_at IS NOT NULL
        AND search_vector @@ websearch_to_tsquery('english', ${query})
      ORDER BY ts_rank_cd(search_vector, websearch_to_tsquery('english', ${query})) DESC
      LIMIT 20
    `;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {query ? <>Results for “{query}”</> : "Search"}
      </h1>

      {!query && (
        <p className="text-muted-foreground">
          Enter a term in the search box above.
        </p>
      )}

      {query && results.length === 0 && (
        <p className="text-muted-foreground">No terms matched “{query}”.</p>
      )}

      {results.length > 0 && (
        <ul className="divide-border divide-y rounded-lg border">
          {results.map((term) => (
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
      )}
    </div>
  );
}
