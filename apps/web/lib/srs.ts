// Leitner spaced-repetition scheduling. Pure — no DOM, no storage, no React —
// so it unit-tests in isolation. The localStorage binding lives in srs-store.ts.

// Box intervals in DAYS. Box 1 is due immediately (you just missed it, so it
// comes back this session); each correct answer promotes a term to a longer
// interval. Reaching the last box means "mastered".
export const BOX_INTERVALS_DAYS = [0, 1, 3, 7, 16] as const;
export const MAX_BOX = BOX_INTERVALS_DAYS.length; // 5
export const MASTERED_BOX = MAX_BOX;

const DAY_MS = 24 * 60 * 60 * 1000;

export type CardState = {
  box: number; // 1..MAX_BOX
  due: number; // epoch ms when this term is next due
  reviewedAt: number; // epoch ms of the last review (0 = never)
};

export type SrsMap = Record<string, CardState>;

// A brand-new card: box 1, due right now.
export function newCard(now: number = Date.now()): CardState {
  return { box: 1, due: now, reviewedAt: 0 };
}

function intervalMs(box: number): number {
  const clamped = Math.min(Math.max(box, 1), MAX_BOX);
  return BOX_INTERVALS_DAYS[clamped - 1] * DAY_MS;
}

// Apply one review result. Correct → up a box (capped at MAX_BOX); wrong →
// straight back to box 1. Either way we recompute the next-due timestamp.
export function review(
  state: CardState,
  correct: boolean,
  now: number = Date.now(),
): CardState {
  const box = correct ? Math.min(state.box + 1, MAX_BOX) : 1;
  return { box, due: now + intervalMs(box), reviewedAt: now };
}

export function isDue(state: CardState, now: number = Date.now()): boolean {
  return state.due <= now;
}

export function isMastered(state: CardState): boolean {
  return state.box >= MASTERED_BOX;
}

// Which of these term IDs are due now? A term with no saved state has never
// been seen, so it counts as due (it's effectively a new box-1 card).
export function dueTermIds(
  map: SrsMap,
  termIds: string[],
  now: number = Date.now(),
): string[] {
  return termIds.filter((id) => {
    const state = map[id];
    return !state || isDue(state, now);
  });
}

export type SrsSummary = { tracked: number; dueNow: number; mastered: number };

// Counts for the progress widget. `tracked` = terms you've reviewed at least
// once; `dueNow` includes never-seen terms (consistent with dueTermIds).
export function summarize(
  map: SrsMap,
  termIds: string[],
  now: number = Date.now(),
): SrsSummary {
  let tracked = 0;
  let dueNow = 0;
  let mastered = 0;
  for (const id of termIds) {
    const state = map[id];
    if (!state) {
      dueNow++; // never seen → due
      continue;
    }
    tracked++;
    if (isDue(state, now)) dueNow++;
    if (isMastered(state)) mastered++;
  }
  return { tracked, dueNow, mastered };
}
