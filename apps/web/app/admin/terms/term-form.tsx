"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = { id: string; name: string };
type TermInitial = {
  id: string;
  name: string;
  slug: string;
  shortDefinition: string;
  longExplanation: string | null;
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
  const [name, setName] = useState(term?.name ?? "");
  const [slug, setSlug] = useState(term?.slug ?? "");
  const [shortDefinition, setShortDefinition] = useState(
    term?.shortDefinition ?? "",
  );
  const [longExplanation, setLongExplanation] = useState(
    term?.longExplanation ?? "",
  );
  const [published, setPublished] = useState(term?.published ?? false);
  const [categoryIds, setCategoryIds] = useState<string[]>(
    term?.categoryIds ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
          published,
          categoryIds,
        }),
      },
    );

    setSaving(false);
    if (!res.ok) {
      setError("Could not save the term. Check the fields and try again.");
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
          required
          placeholder="apache-kafka"
        />
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
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : isEdit ? "Save changes" : "Create term"}
      </Button>
    </form>
  );
}
