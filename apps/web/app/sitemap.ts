import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const [terms, categories] = await Promise.all([
    prisma.term.findMany({
      where: { publishedAt: { not: null } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/search`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/categories/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const termRoutes: MetadataRoute.Sitemap = terms.map((t) => ({
    url: `${base}/terms/${t.slug}`,
    lastModified: t.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...termRoutes];
}
