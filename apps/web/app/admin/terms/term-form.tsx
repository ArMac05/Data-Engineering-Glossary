"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = { id: string; name: string };
type TermConflict = {
  field: "name" | "slug";
  id: string;
  name: string;
  slug: string;
};
type TermInitial = {
  id: string;
  name: string;
  slug: string;
  shortDefinition: string;
  longExplanation: string | null;
  wikipediaTitle: string | null;
  published: boolean;
  categoryIds: string[];
};

export function TermForm({
  categories,
  term,
}: {
  categories: Category[];
  term?: TermInitial;
}) {
  const router = useRouter();
  const isEdit = Boolean(term);
  const excludeId = term?.id;
  const [name, setName] = useState(term?.name ?? "");
  const [slug, setSlug] = useState(term?.slug ?? "");
  const [shortDefinition, setShortDefinition] = useState(
    term?.shortDefinition ?? "",
  );
  const [longExplanation, setLongExplanation] = useState(
    term?.longExplanation ?? "",
  );
  const [wikipediaTitle, setWikipediaTitle] = useState(
    term?.wikipediaTitle ?? "",
  );
  const [published, setPublished] = useState(term?.published ?? false);
  const [categoryIds, setCategoryIds] = useState<string[]>(
    term?.categoryIds ?? [],
  );
  const [conflict, setConflict] = useState<TermConflict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Debounced live duplicate check as the name/slug change. All setState lives
  // inside the timer so we never call it synchronously during the effect.
  useEffect(() => {
    const n = name.trim();
    const s = slug.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!n && !s) {
        setConflict(null);
        return;
      }
      try {
        const params = new URLSearchParams();
        if (n) params.set("name", n);
        if (s) params.set("slug", s);
        if (excludeId) params.set("excludeId", excludeId);
        const res = await fetch(`/api/admin/terms/check?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data: { conflict: TermConflict | null } = await res.json();
        setConflict(data.conflict);
      } catch {
        // aborted or network error — ignore
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name, slug, excludeId]);

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch(
      isEdit ? `/api/admin/terms/${term!.id}` : "/api/admin/terms",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          shortDefinition,
          longExplanation,
          wikipediaTitle,
          published,
          categoryIds,
        }),
      },
    );

    setSaving(false);
    if (!res.ok) {
      if (res.status === 409) {
        const data = await res.json().catch(() => null);
        if (data?.conflict) setConflict(data.conflict);
        else setError("A term with this name or slug already exists.");
      } else {
        setError("Could not save the term. Check the fields and try again.");
      }
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={conflict?.field === "name"}
          required
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="slug" className="text-sm font-medium">
          Slug
        </label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          aria-invalid={conflict?.field === "slug"}
          required
          placeholder="apache-kafka"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="wikipediaTitle" className="text-sm font-medium">
          Wikipedia title{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          id="wikipediaTitle"
          value={wikipediaTitle}
          onChange={(e) => setWikipediaTitle(e.target.value)}
          placeholder="Leave blank to auto-detect"
        />
        <p className="text-muted-foreground text-xs">
          Exact Wikipedia article title for ambiguous terms (e.g. “Snowflake
          Inc.”). Blank lets the pipeline decide.
        </p>
      </div>
      <div className="space-y-1">
        <label htmlFor="shortDefinition" className="text-sm font-medium">
          Short definition
        </label>
        <Input
          id="shortDefinition"
          value={shortDefinition}
          onChange={(e) => setShortDefinition(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="longExplanation" className="text-sm font-medium">
          Long explanation (Markdown)
        </label>
        <textarea
          id="longExplanation"
          value={longExplanation}
          onChange={(e) => setLongExplanation(e.target.value)}
          rows={8}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Categories</legend>
        {categories.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={categoryIds.includes(c.id)}
              onChange={() => toggleCategory(c.id)}
            />
            {c.name}
          </label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        Published
      </label>

      {conflict && (
        <p className="text-destructive text-sm" role="alert">
          A term with this {conflict.field} already exists:{" "}
          <a
            href={`/terms/${conflict.slug}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            {conflict.name}
          </a>
          . Choose a different {conflict.field}.
        </p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={saving || conflict !== null}>
        {saving ? "Saving…" : isEdit ? "Save changes" : "Create term"}
      </Button>
    </form>
  );
}
