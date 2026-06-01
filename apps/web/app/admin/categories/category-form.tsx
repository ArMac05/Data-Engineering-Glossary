"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CategoryInitial = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export function CategoryForm({ category }: { category?: CategoryInitial }) {
  const router = useRouter();
  const isEdit = Boolean(category);
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch(
      isEdit
        ? `/api/admin/categories/${category!.id}`
        : "/api/admin/categories",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description }),
      },
    );
    setSaving(false);
    if (!res.ok) {
      setError("Could not save the category.");
      return;
    }
    router.push("/admin/categories");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Slug</label>
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          placeholder="streaming"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : isEdit ? "Save changes" : "Create category"}
      </Button>
    </form>
  );
}
