import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-xl font-semibold text-ink">
              Only<span className="text-flame">Critics</span>
            </p>
            <p className="mt-1 max-w-md text-sm text-ink-soft">
              Every take here is attributed to a named person and links to the exact source. We
              quote briefly and never reproduce full reviews.
            </p>
            <p className="mt-2 max-w-md text-xs text-ink-soft/80">
              Stocks coverage reflects positions and statements that public figures have publicly
              disclosed. It is not investment advice.
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
          Fan-made discovery project. Not affiliated with any critic featured here.
        </p>
      </div>
    </footer>
  );
}
