"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { resetSrs } from "@/lib/srs-store";

export function ResetProgressButton() {
  const [open, setOpen] = useState(false);

  function handleReset() {
    resetSrs();
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Reset progress
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Reset quiz progress?</AlertDialogTitle>
        <AlertDialogDescription>
          This clears your spaced-repetition history on this device — every term
          goes back to “new”. It can’t be undone, but it only affects this
          browser.
        </AlertDialogDescription>
        <div className="mt-6 flex justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
