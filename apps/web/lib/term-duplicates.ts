import { prisma } from "@/lib/prisma";

export type TermConflict = {
  field: "name" | "slug";
  id: string;
  name: string;
  slug: string;
};

// Returns the existing term that collides with the given name (case-insensitive)
// or slug (exact), or null. On edits, pass excludeId so a term never conflicts
// with itself.
export async function findTermConflict(input: {
  name: string;
  slug: string;
  excludeId?: string;
}): Promise<TermConflict | null> {
  const name = input.name.trim();
  const slug = input.slug.trim();
  if (!name && !slug) return null;

  const existing = await prisma.term.findFirst({
    where: {
      AND: [
        input.excludeId ? { id: { not: input.excludeId } } : {},
        {
          OR: [
            name ? { name: { equals: name, mode: "insensitive" } } : {},
            slug ? { slug } : {},
          ],
        },
      ],
    },
    select: { id: true, name: true, slug: true },
  });

  if (!existing) return null;
  // Report the slug clash when the slug matches exactly; otherwise the name.
  const field = existing.slug === slug ? "slug" : "name";
  return { field, id: existing.id, name: existing.name, slug: existing.slug };
}
