import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { ProfileMenu } from "@/components/profile-menu";
import { SearchBox } from "@/components/search-box";
import { isAdminEmail } from "@/lib/admin-emails";
import { createClient } from "@/lib/supabase/server";
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Read the session so the profile menu can show the admin's email + the
  // Admin link. Reading cookies makes the layout render per-request (dynamic).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;
  const isAdmin = isAdminEmail(email);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <a
            href="#main-content"
            className="bg-background focus:ring-ring/50 sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:border focus:px-3 focus:py-2 focus:shadow focus:ring-3"
          >
            Skip to content
          </a>
          <header className="border-b">
            <div className="mx-auto flex w-full max-w-4xl items-center gap-4 px-4 py-3">
              <Link href="/" className="text-lg font-semibold">
                DE Glossary
              </Link>
              <Link
                href="/quiz"
                className="text-muted-foreground hover:text-foreground text-sm font-medium"
              >
                Quiz
              </Link>
              <SearchBox />
              <ProfileMenu email={email} isAdmin={isAdmin} />
            </div>
          </header>

          <main
            id="main-content"
            className="mx-auto w-full max-w-4xl flex-1 px-4 py-8"
          >
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
        </ThemeProvider>
      </body>
    </html>
  );
}
