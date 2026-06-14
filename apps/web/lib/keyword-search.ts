import { prisma } from "@/lib/prisma";

export type SearchResult = {
  id: string;
  slug: string;
  name: string;
  shortDefinition: string;
};

// Fast keyword search: prefix full-text match (token:*) ranked by relevance.
// Shared by the /search page and the /api/search/suggest typeahead endpoint.
export async function keywordSearch(
  query: string,
  limit = 20,
): Promise<SearchResult[]> {
  const tsquery = query
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean)
    .map((token) => `${token}:*`)
    .join(" & ");

  if (!tsquery) return [];

  return prisma.$queryRaw<SearchResult[]>`
    SELECT id, slug, name, short_definition AS "shortDefinition"
    FROM terms
    WHERE published_at IS NOT NULL
      AND search_vector @@ to_tsquery('english', ${tsquery})
    ORDER BY ts_rank_cd(search_vector, to_tsquery('english', ${tsquery})) DESC
    LIMIT ${limit}
  `;
}
