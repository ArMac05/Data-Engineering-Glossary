import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Health must always reflect live state, never a cached response.
export const dynamic = "force-dynamic";

export async function GET() {
  let dbReachable = false;
  try {
    // Cheapest round-trip that proves the DB answers. If this throws
    // (connection refused, timeout, etc.) we fall into catch and stay false.
    await prisma.$queryRaw`SELECT 1`;
    dbReachable = true;
  } catch {
    dbReachable = false;
  }

  const body = {
    status: dbReachable ? "ok" : "degraded",
    build_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
    db_reachable: dbReachable,
  };

  // 200 when healthy, 503 when the DB is unreachable — so uptime monitors
  // treat it as "not ready to serve real traffic."
  return NextResponse.json(body, { status: dbReachable ? 200 : 503 });
}
