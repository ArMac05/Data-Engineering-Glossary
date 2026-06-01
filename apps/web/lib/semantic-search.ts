import { embedQuery } from "@/lib/embedding";
import { prisma } from "@/lib/prisma";

export type SearchResult = {
  id: string;
  slug: string;
  name: string;
  shortDefinition: string;
};

export async function semanticSearch(query: string): Promise<SearchResult[]> {
  const embedding = await embedQuery(query);
  const vectorLiteral = `[${embedding.join(",")}]`;
  return prisma.$queryRaw<SearchResult[]>`
    SELECT t.id, t.slug, t.name, t.short_definition AS "shortDefinition"
    FROM term_embeddings te
    JOIN terms t ON t.id = te.term_id
    WHERE t.published_at IS NOT NULL
    ORDER BY te.embedding <=> ${vectorLiteral}::vector
    LIMIT 20
  `;
}
