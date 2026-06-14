"use client";

import type { ComponentProps } from "react";
import { AlertDialog as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

// Minimal shadcn-style wrappers over Radix AlertDialog. Radix handles the
// focus trap, Escape-to-cancel, and required aria roles for us.
export const AlertDialog = Primitive.Root;
export const AlertDialogTrigger = Primitive.Trigger;
export const AlertDialogCancel = Primitive.Cancel;

export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <Primitive.Content
        className={cn(
          "bg-background fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6 shadow-lg",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      className={cn("text-muted-foreground mt-2 text-sm", className)}
      {...props}
    />
  );
}
