import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans`}>
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Snippets
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-zinc-600 hover:text-foreground dark:text-zinc-400">
              Gallery
            </Link>
            <Link
              href="/new"
              className="rounded-md bg-foreground px-3 py-1.5 font-medium text-background hover:opacity-90"
            >
              New snippet
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
