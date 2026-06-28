"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { McQuestion, FlashcardQuestion } from "@/lib/quiz-questions";

function QuestionHeader({ index, total }: { index: number; total: number }) {
  return (
    <p className="text-muted-foreground text-sm">
      Question {index + 1} of {total}
    </p>
  );
}

export function McCard({
  question,
  index,
  total,
  onComplete,
}: {
  question: McQuestion;
  index: number;
  total: number;
  onComplete: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = answered && selected === question.answerIndex;
  const nextRef = useRef<HTMLButtonElement>(null);

  // Number keys 1–4 pick an option while unanswered. Once answered, we don't
  // listen for Enter here — instead we move focus to the Next button (below),
  // so the browser's native Enter-on-focused-button advances exactly once.
  useEffect(() => {
    if (answered) return;
    function onKey(e: KeyboardEvent) {
      if (/^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < question.options.length) setSelected(i);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, question.options.length]);

  // After answering, move focus to the advance button for keyboard users.
  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  const isLast = index + 1 === total;

  return (
    <div className="space-y-4">
      <QuestionHeader index={index} total={total} />
      <p className="text-lg">
        Which definition matches{" "}
        <span className="font-semibold">{question.prompt}</span>?
      </p>

      <ul className="space-y-2">
        {question.options.map((opt, i) => {
          const state = !answered
            ? "idle"
            : i === question.answerIndex
              ? "correct"
              : i === selected
                ? "wrong"
                : "muted";
          return (
            <li key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() => setSelected(i)}
                className={cn(
                  "focus-visible:ring-ring/50 w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-3 disabled:opacity-100",
                  state === "idle" && "hover:bg-muted",
                  state === "correct" &&
                    "border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-950/40",
                  state === "wrong" && "border-destructive bg-destructive/10",
                  state === "muted" && "opacity-60",
                )}
              >
                <span className="text-muted-foreground mr-2 font-mono text-xs">
                  {i + 1}
                </span>
                {opt}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Announce the outcome to screen readers; visually it's also conveyed by
          the highlighted options, so colour isn't the only signal. */}
      <div aria-live="polite" className="min-h-6 text-sm">
        {answered &&
          (isCorrect ? (
            <span className="font-medium text-green-700 dark:text-green-400">
              Correct.
            </span>
          ) : (
            <span className="text-destructive font-medium">
              Not quite — the correct definition is highlighted.
            </span>
          ))}
      </div>

      {answered && (
        <Button ref={nextRef} onClick={() => onComplete(isCorrect)}>
          {isLast ? "See results" : "Next question"}
        </Button>
      )}
    </div>
  );
}

export function FlashcardCard({
  question,
  index,
  total,
  onComplete,
}: {
  question: FlashcardQuestion;
  index: number;
  total: number;
  onComplete: (correct: boolean) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const knewRef = useRef<HTMLButtonElement>(null);

  // Once revealed, 1 = "I knew it", 2 = "I didn't". (Reveal itself happens via
  // the focused Show-answer button's native Space/Enter.)
  useEffect(() => {
    if (!revealed) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "1") onComplete(true);
      else if (e.key === "2") onComplete(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, onComplete]);

  useEffect(() => {
    if (revealed) knewRef.current?.focus();
  }, [revealed]);

  return (
    <div className="space-y-4">
      <QuestionHeader index={index} total={total} />

      <div className="rounded-lg border p-6">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          Term
        </p>
        <p className="text-xl font-semibold">{question.prompt}</p>

        {revealed && (
          <>
            <hr className="border-border my-4" />
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Definition
            </p>
            <p className="mt-1">{question.answer}</p>
          </>
        )}
      </div>

      {!revealed ? (
        <Button onClick={() => setRevealed(true)}>Show answer</Button>
      ) : (
        <div className="flex gap-2">
          <Button
            ref={knewRef}
            variant="secondary"
            onClick={() => onComplete(true)}
          >
            I knew it
          </Button>
          <Button variant="outline" onClick={() => onComplete(false)}>
            I didn&apos;t
          </Button>
        </div>
      )}
    </div>
  );
}
