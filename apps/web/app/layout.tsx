import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Data Engineering Glossary",
    template: "%s · Data Engineering Glossary",
  },
  description:
    "Clear definitions of data engineering terms, with examples and related concepts.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <header className="border-b">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-4 px-4 py-3">
            <Link href="/" className="text-lg font-semibold">
              DE Glossary
            </Link>
            <form
              action="/search"
              className="ml-auto flex w-full max-w-sm gap-2"
            >
              <Input
                type="search"
                name="q"
                placeholder="Search terms…"
                aria-label="Search terms"
              />
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
          {children}
        </main>

        <footer className="border-t">
          <div className="text-muted-foreground mx-auto w-full max-w-4xl px-4 py-6 text-sm">
            A learning project.{" "}
            <a
              href="https://github.com/ArMac05/Data-Engineering-Glossary"
              className="underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              View source on GitHub
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
