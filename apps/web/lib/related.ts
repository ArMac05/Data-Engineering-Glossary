import { prisma } from "@/lib/prisma";

export type RelatedTerm = {
  id: string;
  slug: string;
  name: string;
  shortDefinition: string;
};

export function getRelatedTerms(termId: string): Promise<RelatedTerm[]> {
  return prisma.$queryRaw<RelatedTerm[]>`
    SELECT t.id, t.slug, t.name, t.short_definition AS "shortDefinition"
    FROM term_embeddings te
    JOIN terms t ON t.id = te.term_id
    WHERE te.term_id != ${termId}
      AND t.published_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM term_embeddings WHERE term_id = ${termId})
    ORDER BY te.embedding <=> (
      SELECT embedding FROM term_embeddings WHERE term_id = ${termId}
    )
    LIMIT 5
  `;
}
