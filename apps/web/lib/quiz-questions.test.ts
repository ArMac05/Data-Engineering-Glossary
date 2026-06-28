import { describe, it, expect } from "vitest";
import {
  buildQuestions,
  scopeTerms,
  shuffle,
  type McQuestion,
  type QuizTerm,
} from "./quiz-questions";

// A deterministic "rng" so shuffles are reproducible in tests. Always returns 0,
// which makes Fisher–Yates a fixed permutation — we only care about structural
// invariants here, not randomness.
const fixedRng = () => 0;

function makeTerms(n: number): (QuizTerm & { categorySlugs: string[] })[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `id-${i}`,
    slug: `term-${i}`,
    name: `Term ${i}`,
    shortDefinition: `Definition ${i}`,
    categorySlugs: i % 2 === 0 ? ["streaming"] : ["storage"],
  }));
}

describe("shuffle", () => {
  it("returns a new array and preserves every element", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, fixedRng);
    expect(out).not.toBe(input); // new array, input untouched
    expect([...out].sort()).toEqual([...input].sort());
  });
});

describe("scopeTerms", () => {
  const terms = makeTerms(6);

  it("returns everything for 'all'", () => {
    expect(scopeTerms(terms, "all")).toHaveLength(6);
  });

  it("filters to a single category", () => {
    const streaming = scopeTerms(terms, "streaming");
    expect(streaming).toHaveLength(3);
    expect(streaming.every((t) => t.categorySlugs.includes("streaming"))).toBe(
      true,
    );
  });
});

describe("buildQuestions — multiple choice", () => {
  const terms = makeTerms(8);
  const questions = buildQuestions("mc", terms, terms, {
    rng: fixedRng,
  }) as McQuestion[];

  it("produces one question per term (within the session limit)", () => {
    expect(questions).toHaveLength(8);
  });

  it("gives each question exactly 4 options", () => {
    for (const q of questions) expect(q.options).toHaveLength(4);
  });

  it("includes the correct definition, and answerIndex points at it", () => {
    for (const q of questions) {
      expect(q.options[q.answerIndex]).toBe(q.term.shortDefinition);
    }
  });

  it("never repeats an option within a question", () => {
    for (const q of questions) {
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it("respects the session limit", () => {
    const many = makeTerms(50);
    expect(buildQuestions("mc", many, many, { rng: fixedRng })).toHaveLength(
      10,
    );
  });
});

describe("buildQuestions — flashcards", () => {
  const terms = makeTerms(3);
  const questions = buildQuestions("flashcards", terms, terms, {
    rng: fixedRng,
  });

  it("maps each term to a prompt/answer pair", () => {
    expect(questions).toHaveLength(3);
    for (const q of questions) {
      expect(q.kind).toBe("flashcard");
      expect(q.prompt).toBe(q.term.name);
      if (q.kind === "flashcard") {
        expect(q.answer).toBe(q.term.shortDefinition);
      }
    }
  });
});
