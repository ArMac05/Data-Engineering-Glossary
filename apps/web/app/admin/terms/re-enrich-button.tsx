"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15; // give up after ~30s

export function ReEnrichButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function fetchStatus(): Promise<string | null> {
    try {
      const res = await fetch(`/api/admin/terms/${id}/status`);
      if (!res.ok) return null;
      const data: { status?: string } = await res.json();
      return data.status ?? null;
    } catch {
      return null;
    }
  }

  async function onClick() {
    setBusy(true);
    await fetch(`/api/admin/terms/${id}/enrich`, { method: "POST" });
    router.refresh(); // show the immediate "pending"

    // Enrichment finishes asynchronously on the pipeline, so poll the status
    // until it leaves "pending" (enriched/failed), then refresh the badge.
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const status = await fetchStatus();
      if (status && status !== "pending") {
        router.refresh();
        break;
      }
    }
    setBusy(false);
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={busy}>
      {busy ? "Enriching…" : "Re-enrich"}
    </Button>
  );
}
