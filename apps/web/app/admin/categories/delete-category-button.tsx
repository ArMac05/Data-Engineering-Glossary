"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export function DeleteCategoryButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError("Could not delete the category.");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
        <AlertDialogDescription>
          Terms keep existing but lose this category. This can’t be undone.
        </AlertDialogDescription>
        {error && <p className="text-destructive mt-3 text-sm">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" size="sm" disabled={deleting}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
