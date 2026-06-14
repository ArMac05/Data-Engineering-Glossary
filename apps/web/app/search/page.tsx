import type { Metadata } from "next";
import Link from "next/link";
import { keywordSearch, type SearchResult } from "@/lib/keyword-search";
import { semanticSearch } from "@/lib/semantic-search";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const { q, mode } = await searchParams;
  const query = q?.trim() ?? "";
  const semantic = mode === "semantic";

  let results: SearchResult[] = [];
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
