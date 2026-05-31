import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "./sign-out-button";
import { DeleteTermButton } from "./terms/delete-term-button";

export default async function AdminDashboard() {
  const user = await requireAdmin();
  const terms = await prisma.term.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, slug: true, publishedAt: true },
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
            <div>
              <Link
                href={`/terms/${term.slug}`}
                className="font-medium hover:underline"
              >
                {term.name}
              </Link>
              {!term.publishedAt && (
                <span className="text-muted-foreground ml-2 text-xs">
                  (draft)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
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
