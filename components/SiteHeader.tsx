import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">
            Jacks<span className="text-flame">list</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/requests"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
          >
            Requests
          </Link>
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
