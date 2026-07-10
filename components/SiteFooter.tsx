import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-flame font-display text-xs font-extrabold text-white">
                O
              </span>
              <span className="font-display text-lg font-extrabold text-ink">OnlyCritics</span>
            </div>
            <p className="mt-2 max-w-md text-sm text-muted">
              Every take here is attributed to a named person and links to the exact source. We
              quote briefly and never reproduce full reviews.
            </p>
            <p className="mt-2 max-w-md text-xs text-faint">
              Stocks coverage reflects positions public figures have publicly disclosed. Not
              investment advice.
            </p>
          </div>
          <nav className="flex gap-5 text-sm text-muted">
            <Link href="/" className="hover:text-ink">Home</Link>
            <Link href="/requests" className="hover:text-ink">Requests</Link>
            <Link href="/search" className="hover:text-ink">Search</Link>
          </nav>
        </div>
        <p className="mt-8 text-xs text-faint">
          Fan-made discovery project. Not affiliated with any critic featured here.
        </p>
      </div>
    </footer>
  );
}
