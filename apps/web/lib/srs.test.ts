import { describe, it, expect } from "vitest";
import {
  newCard,
  review,
  isDue,
  isMastered,
  dueTermIds,
  summarize,
  MAX_BOX,
  type SrsMap,
} from "./srs";

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_700_000_000_000; // a fixed "now" so tests are deterministic

describe("newCard", () => {
  it("starts in box 1 and is due immediately", () => {
    const card = newCard(T0);
    expect(card.box).toBe(1);
    expect(isDue(card, T0)).toBe(true);
  });
});

describe("review", () => {
  it("promotes one box on a correct answer and pushes the due date out", () => {
    const after = review(newCard(T0), true, T0);
    expect(after.box).toBe(2);
    // box 2 interval is 1 day
    expect(after.due).toBe(T0 + 1 * DAY);
    expect(isDue(after, T0)).toBe(false);
    expect(isDue(after, T0 + 1 * DAY)).toBe(true);
  });

  it("resets to box 1 on a wrong answer", () => {
    const high = { box: 4, due: T0 + 100 * DAY, reviewedAt: T0 };
    const after = review(high, false, T0);
    expect(after.box).toBe(1);
    expect(isDue(after, T0)).toBe(true); // box 1 is due immediately
  });

  it("caps at the top box and marks mastered", () => {
    let card = newCard(T0);
    for (let i = 0; i < 10; i++) card = review(card, true, T0);
    expect(card.box).toBe(MAX_BOX);
    expect(isMastered(card)).toBe(true);
  });
});

describe("dueTermIds", () => {
  it("treats never-seen terms as due and respects saved due dates", () => {
    const map: SrsMap = {
      seen_due: { box: 1, due: T0 - DAY, reviewedAt: T0 - DAY },
      seen_future: { box: 3, due: T0 + 5 * DAY, reviewedAt: T0 },
    };
    const due = dueTermIds(map, ["seen_due", "seen_future", "brand_new"], T0);
    expect(due).toEqual(["seen_due", "brand_new"]);
  });
});

describe("summarize", () => {
  it("counts tracked, due, and mastered correctly", () => {
    const map: SrsMap = {
      a: { box: 1, due: T0 - DAY, reviewedAt: T0 - DAY }, // tracked + due
      b: { box: 5, due: T0 + 16 * DAY, reviewedAt: T0 }, // tracked + mastered
    };
    const summary = summarize(map, ["a", "b", "c"], T0); // c never seen
    expect(summary).toEqual({ tracked: 2, dueNow: 2, mastered: 1 }); // a + c due
  });
});
