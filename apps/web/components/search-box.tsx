"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SearchResult } from "@/lib/keyword-search";

export function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // highlighted suggestion; -1 = none
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced suggestion fetch. The AbortController cancels an in-flight request
  // when the query changes, so out-of-order responses can't overwrite newer ones.
  useEffect(() => {
    const q = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      // Empty query: clear suggestions. Done inside the timer (not the effect
      // body) so we never call setState synchronously during the effect.
      if (!q) {
        setResults([]);
        setOpen(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data: SearchResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
        setActive(-1);
      } catch {
        // aborted or network error — ignore
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // "/" focuses the search box from anywhere, unless you're already typing.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close the dropdown when clicking outside the component.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && results[active]) {
      router.push(`/terms/${results[active].slug}`);
      setOpen(false);
    } else if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative ml-auto w-full max-w-sm">
      <form
        action="/search"
        onSubmit={onSubmit}
        role="search"
        className="flex gap-2"
      >
        <Input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search terms…  ( / )"
          aria-label="Search terms"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-suggestions"
          aria-activedescendant={
            active >= 0 ? `search-option-${active}` : undefined
          }
          autoComplete="off"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {open && results.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="bg-popover text-popover-foreground absolute z-50 mt-1 w-full overflow-hidden rounded-lg border shadow-md"
        >
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`search-option-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                // mousedown (before the input blurs) so the click isn't lost
                e.preventDefault();
                router.push(`/terms/${r.slug}`);
                setOpen(false);
              }}
              className={`cursor-pointer px-3 py-2 ${
                i === active ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              <div className="text-sm font-medium">{r.name}</div>
              <div className="text-muted-foreground truncate text-xs">
                {r.shortDefinition}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
