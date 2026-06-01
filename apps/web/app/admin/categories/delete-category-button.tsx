"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteCategoryButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  async function handleDelete() {
    if (
      !confirm(`Delete “${name}”? Terms keep existing but lose this category.`)
    )
      return;
    setDeleting(true);
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (res.ok) router.refresh();
    else alert("Could not delete the category.");
  }
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
    >
      {deleting ? "Deleting…" : "Delete"}
    </Button>
  );
}
