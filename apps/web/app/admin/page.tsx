import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "./sign-out-button";
import { DeleteTermButton } from "./terms/delete-term-button";
import { ReEnrichButton } from "./terms/re-enrich-button";

const STATUS_STYLES: Record<string, string> = {
  enriched: "bg-green-500/15 text-green-700 dark:text-green-400",
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-500",
  failed: "bg-destructive/15 text-destructive",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
      title={`Enrichment: ${status}`}
    >
      {status}
    </span>
  );
}

export default async function AdminDashboard() {
  const user = await requireAdmin();
  const terms = await prisma.term.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      publishedAt: true,
      enrichmentStatus: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/categories">Categories</Link>
          </Button>
          <span className="text-muted-foreground text-sm">{user?.email}</span>
          <SignOutButton />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Terms ({terms.length})</h2>
        <Button asChild size="sm">
          <Link href="/admin/terms/new">New term</Link>
        </Button>
      </div>

      <ul className="divide-border divide-y rounded-lg border">
        {terms.map((term) => (
          <li
            key={term.id}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div className="flex items-center gap-2">
              <Link
                href={`/terms/${term.slug}`}
                className="font-medium hover:underline"
              >
                {term.name}
              </Link>
              {!term.publishedAt && (
                <span className="text-muted-foreground text-xs">(draft)</span>
              )}
              <StatusBadge status={term.enrichmentStatus} />
            </div>
            <div className="flex items-center gap-2">
              <ReEnrichButton id={term.id} />
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/terms/${term.id}/edit`}>Edit</Link>
              </Button>
              <DeleteTermButton id={term.id} name={term.name} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
