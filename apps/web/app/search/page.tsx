import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { semanticSearch } from "@/lib/semantic-search";

type SearchRow = {
  id: string;
  slug: string;
  name: string;
  shortDefinition: string;
};

export const metadata: Metadata = { title: "Search" };

async function keywordSearch(query: string): Promise<SearchRow[]> {
  const tsquery = query
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean)
    .map((token) => `${token}:*`)
    .join(" & ");

  if (!tsquery) return [];

  return prisma.$queryRaw<SearchRow[]>`
    SELECT id, slug, name, short_definition AS "shortDefinition"
    FROM terms
    WHERE published_at IS NOT NULL
      AND search_vector @@ to_tsquery('english', ${tsquery})
    ORDER BY ts_rank_cd(search_vector, to_tsquery('english', ${tsquery})) DESC
    LIMIT 20
  `;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const { q, mode } = await searchParams;
  const query = q?.trim() ?? "";
  const semantic = mode === "semantic";

  let results: SearchRow[] = [];
  if (query) {
    if (semantic) {
      try {
        results = await semanticSearch(query);
      } catch {
        results = await keywordSearch(query);
      }
    } else {
      results = await keywordSearch(query);
    }
  }

  const href = (m: string) =>
    `/search?q=${encodeURIComponent(query)}&mode=${m}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {query ? <>Results for “{query}”</> : "Search"}
      </h1>

      {query && (
        <div className="flex gap-3 text-sm">
          <Link
            href={href("keyword")}
            className={
              !semantic
                ? "font-semibold underline"
                : "text-muted-foreground hover:underline"
            }
          >
            Keyword
          </Link>
          <Link
            href={href("semantic")}
            className={
              semantic
                ? "font-semibold underline"
                : "text-muted-foreground hover:underline"
            }
          >
            Semantic
          </Link>
        </div>
      )}

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
