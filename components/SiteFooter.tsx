import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-xl font-semibold text-ink">
              Jacks<span className="text-flame">list</span>
            </p>
            <p className="mt-1 max-w-md text-sm text-ink-soft">
              Every recommendation on this site comes from{" "}
              <a
                href="https://www.youtube.com/@jacksdiningroom"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-flame/40 underline-offset-2 hover:text-ink"
              >
                Jack&apos;s Dining Room
              </a>
              . One palate, city by city.
            </p>
          </div>
          <nav className="flex gap-5 text-sm text-ink-soft">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <Link href="/requests" className="hover:text-ink">
              Requests
            </Link>
            <Link href="/search" className="hover:text-ink">
              Search
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-xs text-ink-soft/70">
          Fan-made discovery project. Not affiliated with Jack&apos;s Dining Room.
        </p>
      </div>
    </footer>
  );
}
