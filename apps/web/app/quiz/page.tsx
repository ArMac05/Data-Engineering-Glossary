import type { Metadata } from "next";
import { getQuizData } from "@/lib/quiz";
import { QuizApp } from "./quiz-app";

// DB-backed, like the other public pages: render per request so the quiz pool
// reflects whatever is published right now, and the build never touches the DB.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quiz",
  description:
    "Test your knowledge of data engineering terms with multiple-choice and flashcard practice.",
};

export default async function QuizPage() {
  const { terms, categories } = await getQuizData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quiz</h1>
        <p className="text-muted-foreground mt-2">
          Test yourself on the glossary. Pick a mode and a scope to start a
          short, 10-question session.
        </p>
      </div>
      <QuizApp terms={terms} categories={categories} />
    </div>
  );
}
