// Pure quiz logic — no DB, no React. Everything here is a plain function of its
// inputs, which is what lets us unit-test it without spinning up Prisma or a
// browser. The UI (quiz-app.tsx) and the data layer (quiz.ts) both build on it.

export type QuizTerm = {
  id: string;
  slug: string;
  name: string;
  shortDefinition: string;
};

export type QuizMode = "mc" | "flashcards";

// A multiple-choice question: the term being asked, the shuffled answer options
// (other terms' definitions act as distractors), and which option is correct.
export type McQuestion = {
  kind: "mc";
  term: QuizTerm;
  prompt: string;
  options: string[];
  answerIndex: number;
};

// A flashcard: prompt on the front, the definition on the back. Self-graded, so
// there's no "correct option" — the user tells us whether they knew it.
export type FlashcardQuestion = {
  kind: "flashcard";
  term: QuizTerm;
  prompt: string;
  answer: string;
};

export type Question = McQuestion | FlashcardQuestion;

// Multiple choice shows 4 options, so we need at least 4 distinct terms in the
// distractor pool to build even one question. The UI uses this to decide whether
// MC is available for the chosen scope.
export const MIN_MC_POOL = 4;

const DEFAULT_SESSION_LENGTH = 10;

// Fisher–Yates shuffle. Returns a NEW array (never mutates the input) and takes
// an injectable rng so tests can pass a deterministic generator instead of
// Math.random and assert on exact output.
export function shuffle<T>(
  arr: readonly T[],
  rng: () => number = Math.random,
): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Narrow a term list to one category, or pass everything through for "all".
// Generic over anything carrying categorySlugs so this file doesn't depend on
// the DB row type.
export function scopeTerms<T extends { categorySlugs: string[] }>(
  terms: T[],
  categorySlug: string,
): T[] {
  if (categorySlug === "all") return terms;
  return terms.filter((t) => t.categorySlugs.includes(categorySlug));
}

function buildMcQuestion(
  term: QuizTerm,
  distractorPool: QuizTerm[],
  rng: () => number,
): McQuestion {
  // Candidate distractors: any OTHER term, excluding ones whose definition
  // happens to match the correct answer (which would make two options "right").
  const distractors = shuffle(
    distractorPool.filter(
      (t) => t.id !== term.id && t.shortDefinition !== term.shortDefinition,
    ),
    rng,
  )
    // De-dupe by definition text so we never show the same option twice.
    .filter(
      (t, i, arr) =>
        arr.findIndex((x) => x.shortDefinition === t.shortDefinition) === i,
    )
    .slice(0, 3)
    .map((t) => t.shortDefinition);

  const options = shuffle([term.shortDefinition, ...distractors], rng);
  return {
    kind: "mc",
    term,
    prompt: term.name,
    options,
    answerIndex: options.indexOf(term.shortDefinition),
  };
}

// Build a session's worth of questions.
//   questionTerms  — the terms to be quizzed on (the chosen scope)
//   distractorPool — where MC wrong-answers come from; defaults to the same
//                    scope, but the UI passes the WHOLE glossary so a small
//                    category can still produce 4-option questions.
export function buildQuestions(
  mode: QuizMode,
  questionTerms: QuizTerm[],
  distractorPool: QuizTerm[] = questionTerms,
  options: { limit?: number; rng?: () => number } = {},
): Question[] {
  const { limit = DEFAULT_SESSION_LENGTH, rng = Math.random } = options;
  const picked = shuffle(questionTerms, rng).slice(0, limit);

  if (mode === "flashcards") {
    return picked.map((term) => ({
      kind: "flashcard" as const,
      term,
      prompt: term.name,
      answer: term.shortDefinition,
    }));
  }

  return picked.map((term) => buildMcQuestion(term, distractorPool, rng));
}
