"use client";

import { useSyncExternalStore } from "react";
import { newCard, review, type SrsMap } from "@/lib/srs";

// Versioned key: if the stored shape ever changes, bump the suffix instead of
// trying to migrate old data in users' browsers.
const STORAGE_KEY = "deg-quiz-srs-v1";

// Module-level cache: the single source of truth React reads via getSnapshot.
// useSyncExternalStore requires getSnapshot to return a STABLE reference when
// nothing changed (else it re-renders forever), so we only ever replace `cache`
// on an actual write — never rebuild it on every read.
let cache: SrsMap = {};
let hydrated = false;
const listeners = new Set<() => void>();

// A frozen empty object reused for every server render. Same reference each
// time → no hydration loop.
const SERVER_SNAPSHOT: SrsMap = Object.freeze({});

function readStorage(): SrsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SrsMap) : {};
  } catch {
    // Corrupt JSON or storage disabled — start fresh rather than crash.
    return {};
  }
}

function ensureHydrated() {
  if (!hydrated && typeof window !== "undefined") {
    cache = readStorage();
    hydrated = true;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  ensureHydrated();
  listeners.add(listener);
  // Keep multiple tabs in sync: another tab writing fires a `storage` event.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = readStorage();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): SrsMap {
  ensureHydrated();
  return cache;
}

function getServerSnapshot(): SrsMap {
  return SERVER_SNAPSHOT;
}

// React hook: re-renders the component whenever the SRS map changes. On the
// server (and the first client render, for hydration) it sees an empty map;
// useSyncExternalStore then updates to the real localStorage value without a
// hydration mismatch warning.
export function useSrs(): SrsMap {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Record one review result for a term, then notify subscribers. Replaces
// `cache` with a NEW object so React sees a changed snapshot.
export function recordReview(
  termId: string,
  correct: boolean,
  now: number = Date.now(),
) {
  ensureHydrated();
  const prev = cache[termId] ?? newCard(now);
  cache = { ...cache, [termId]: review(prev, correct, now) };
  persist();
  emit();
}

export function resetSrs() {
  cache = {};
  persist();
  emit();
}
