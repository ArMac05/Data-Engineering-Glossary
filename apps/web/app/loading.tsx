export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="bg-muted h-8 w-1/3 animate-pulse rounded" />
      <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
      <div className="bg-muted h-40 w-full animate-pulse rounded-lg" />
    </div>
  );
}
