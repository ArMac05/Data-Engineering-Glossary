import { NextResponse } from "next/server";
import { keywordSearch } from "@/lib/keyword-search";

// Always live — suggestions must reflect current data, never a cached response.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  // Keyword/prefix only (no semantic/Gemini) — this fires on every keystroke.
  const results = await keywordSearch(q, 6);
  return NextResponse.json(results);
}
