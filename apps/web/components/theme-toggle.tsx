"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // next-themes leaves `theme` undefined on the server AND on the first client
  // render (it reads the stored value in its own effect), so the two agree —
  // no hydration mismatch. The active highlight just appears once it resolves.
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Color theme">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            "focus-visible:ring-ring/50 flex flex-1 flex-col items-center gap-1 rounded-md border px-2 py-1.5 text-xs outline-none focus-visible:ring-2",
            theme === value
              ? "border-foreground"
              : "hover:bg-accent border-transparent",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
