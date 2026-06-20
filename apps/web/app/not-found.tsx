import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground mt-3">
        We couldn’t find what you were looking for. The term may have been
        removed, or the link may be wrong.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button asChild>
          <Link href="/">Back to glossary</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">Search terms</Link>
        </Button>
      </div>
    </div>
  );
}
