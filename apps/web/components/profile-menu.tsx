"use client";

import Link from "next/link";
import { User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export function ProfileMenu({
  email,
  isAdmin,
}: {
  email: string | null;
  isAdmin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open profile menu"
        className="bg-secondary text-secondary-foreground hover:bg-accent focus-visible:ring-ring/50 flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent outline-none focus-visible:ring-3"
      >
        <User className="size-4" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        {email && (
          <>
            <DropdownMenuLabel className="font-normal">
              <span className="text-muted-foreground block text-xs">
                Signed in as
              </span>
              <span className="block truncate">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuLabel>Preferences</DropdownMenuLabel>
        <div className="px-1 pb-1">
          <ThemeToggle />
        </div>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">Admin panel</Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
