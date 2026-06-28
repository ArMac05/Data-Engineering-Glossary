"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildQuestions,
  scopeTerms,
  MIN_MC_POOL,
  type QuizMode,
  type Question,
  type QuizTerm,
} from "@/lib/quiz-questions";
import type { QuizTermWithCategories } from "@/lib/quiz";
import { McCard, FlashcardCard } from "./quiz-cards";

type Props = {
  terms: QuizTermWithCategories[];
  categories: { slug: string; name: string }[];
};

type Phase = "setup" | "playing" | "done";
type Result = { term: QuizTerm; correct: boolean };

export function QuizApp({ terms, categories }: Props) {
  // MC needs 4 distinct definitions for its options; the distractor pool is the
  // whole glossary, so availability depends on the total, not the chosen scope.
  const mcAvailable = terms.length >= MIN_MC_POOL;

  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<QuizMode>(mcAvailable ? "mc" : "flashcards");
  const [categorySlug, setCategorySlug] = useState("all");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  const scopedCount = scopeTerms(terms, categorySlug).length;

  function start() {
    const scoped = scopeTerms(terms, categorySlug);
    // questionTerms = the scope; distractorPool = the whole glossary, so a small
    // category can still yield 4-option questions.
    setQuestions(buildQuestions(mode, scoped, terms));
    setCurrent(0);
    setResults([]);
    setPhase("playing");
  }

  function handleComplete(correct: boolean) {
    const q = questions[current];
    setResults((r) => [...r, { term: q.term, correct }]);
    if (current + 1 < questions.length) setCurrent((c) => c + 1);
    else setPhase("done");
  }

  // Nothing to quiz on yet.
  if (terms.length === 0) {
    return (
      <p className="text-muted-foreground">
        No terms have been published yet — check back soon.
      </p>
    );
  }

  if (phase === "playing") {
    const q = questions[current];
    // key={current} remounts the card per question, resetting its local state.
    return q.kind === "mc" ? (
      <McCard
        key={current}
        question={q}
        index={current}
        total={questions.length}
        onComplete={handleComplete}
      />
    ) : (
      <FlashcardCard
        key={current}
        question={q}
        index={current}
        total={questions.length}
        onComplete={handleComplete}
      />
    );
  }

  if (phase === "done") {
    const correctCount = results.filter((r) => r.correct).length;
    const missed = results.filter((r) => !r.correct).map((r) => r.term);
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            You scored {correctCount} / {results.length}
          </h2>
          {mode === "flashcards" && (
            <p className="text-muted-foreground mt-1 text-sm">
              Based on your own self-assessment.
            </p>
          )}
        </div>

        {missed.length > 0 ? (
          <div>
            <h3 className="font-semibold">Review these</h3>
            <ul className="divide-border mt-2 divide-y rounded-lg border">
              {missed.map((t) => (
                <li key={t.id} className="p-3">
                  <Link
                    href={`/terms/${t.slug}`}
                    className="font-medium hover:underline"
                  >
                    {t.name}
                  </Link>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {t.shortDefinition}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>Perfect score — nicely done.</p>
        )}

        <div className="flex gap-2">
          <Button onClick={start}>Try again</Button>
          <Button variant="outline" onClick={() => setPhase("setup")}>
            Change settings
          </Button>
        </div>
      </div>
    );
  }

  // phase === "setup"
  return (
    <div className="max-w-md space-y-6">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Mode</legend>
        <div className="flex gap-2">
          {(["mc", "flashcards"] as const).map((m) => {
            const disabled = m === "mc" && !mcAvailable;
            return (
              <label
                key={m}
                className={cn(
                  "focus-within:ring-ring/50 cursor-pointer rounded-lg border px-3 py-2 text-sm focus-within:ring-3",
                  mode === m && "border-primary bg-muted",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  disabled={disabled}
                  onChange={() => setMode(m)}
                  className="sr-only"
                />
                {m === "mc" ? "Multiple choice" : "Flashcards"}
              </label>
            );
          })}
        </div>
        {!mcAvailable && (
          <p className="text-muted-foreground text-xs">
            Multiple choice needs at least {MIN_MC_POOL} published terms.
          </p>
        )}
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="quiz-scope" className="block text-sm font-medium">
          Scope
        </label>
        <select
          id="quiz-scope"
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          className="bg-background focus-visible:ring-ring/50 block rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-3"
        >
          <option value="all">All terms ({terms.length})</option>
          {categories.map((c) => {
            const count = terms.filter((t) =>
              t.categorySlugs.includes(c.slug),
            ).length;
            return (
              <option key={c.slug} value={c.slug}>
                {c.name} ({count})
              </option>
            );
          })}
        </select>
      </div>

      <Button onClick={start} disabled={scopedCount === 0}>
        Start quiz
      </Button>
    </div>
  );
}
