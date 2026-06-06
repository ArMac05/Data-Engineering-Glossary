import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
};

/**
 * Fixed-window rate limit, backed by the `rate_limits` table.
 *
 * The whole check is a SINGLE atomic SQL statement: one INSERT ... ON CONFLICT
 * that either (a) starts a fresh window with count=1, or (b) bumps the existing
 * count, or (c) resets the window if it has expired — and RETURNs the new count.
 *
 * Why one statement instead of "SELECT the count, then UPDATE count+1"? Because
 * two requests could both SELECT count=4 at the same instant, both compute 5,
 * and both write 5 — so two requests get counted as one. Doing the increment
 * inside a single statement makes Postgres serialize it, so every request is
 * counted exactly once. (This is the classic read-modify-write race.)
 */
export async function checkRateLimit(
  key: string,
  opts: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start < now() - make_interval(secs => ${opts.windowSeconds}::double precision)
          THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - make_interval(secs => ${opts.windowSeconds}::double precision)
          THEN now()
        ELSE rate_limits.window_start
      END
    RETURNING count
  `;

  const count = Number(rows[0].count);
  return { allowed: count <= opts.limit, count, limit: opts.limit };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

const ADMIN_WRITE = { limit: 30, windowSeconds: 60 };

/**
 * Per-IP rate limit for admin write endpoints. Returns a 429 response if the
 * caller is over the limit, or null if the request may proceed.
 */
export async function enforceAdminWriteLimit(
  request: Request,
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const { allowed } = await checkRateLimit(`admin-write:${ip}`, ADMIN_WRITE);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests — slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(ADMIN_WRITE.windowSeconds) },
      },
    );
  }
  return null;
}
