"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReEnrichButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    await fetch(`/api/admin/terms/${id}/enrich`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={busy}>
      {busy ? "Queuing…" : "Re-enrich"}
    </Button>
  );
}
