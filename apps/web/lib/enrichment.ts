export function fireEnrichmentWebhook(termId: string): void {
  const url = process.env.ENRICHMENT_WEBHOOK_URL;
  const secret = process.env.ENRICHMENT_WEBHOOK_SECRET;
  if (!url || !secret) return;

  // Fire-and-forget: not awaited, errors swallowed — the term save must
  // succeed regardless of whether the pipeline is reachable.
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": secret,
    },
    body: JSON.stringify({ term_id: termId }),
  }).catch(() => {
    // best-effort; the term already saved
  });
}
