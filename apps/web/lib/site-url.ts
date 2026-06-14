// Absolute base URL for SEO output (sitemap, robots, JSON-LD).
// Override with NEXT_PUBLIC_SITE_URL (e.g. a custom domain); otherwise use
// Vercel's built-in production URL; fall back to localhost for dev.
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
