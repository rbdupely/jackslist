import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import { SearchBar } from "@/components/SearchBar";
import { getCategoryStats } from "@/lib/data";
import { catUI } from "@/lib/ui";

export async function SiteHeader() {
  const stats = await getCategoryStats();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
      {/* Row 1 — brand, search, account */}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-flame font-display text-sm font-extrabold text-white">
            O
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-ink">
            OnlyCritics
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <div className="w-full max-w-md">
            <SearchBar variant="compact" placeholder="Search critics, spots, stocks, books…" />
          </div>
        </div>

        <nav className="ml-auto flex shrink-0 items-center gap-1.5">
          <Link
            href="/requests"
            className="hidden rounded-chip px-3 py-2 text-sm font-medium text-muted transition hover:text-ink sm:block"
          >
            Requests
          </Link>
          <AuthButton />
        </nav>
      </div>

      {/* Row 2 — category ribbon */}
      <div className="border-t border-line/70">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 no-scrollbar sm:px-6">
          <Link
            href="/"
            className="shrink-0 rounded-chip px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-sunk hover:text-ink"
          >
            All
          </Link>
          {stats.map((c) => {
            const ui = catUI(c.slug);
            const live = c.criticCount > 0;
            return (
              <Link
                key={c.id}
                href={`/${c.slug}`}
                className={`group flex shrink-0 items-center gap-1.5 rounded-chip px-3 py-1.5 text-sm font-medium transition hover:bg-sunk ${
                  live ? "text-ink" : "text-faint"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${live ? ui.dot : "bg-line-strong"}`} />
                {c.name}
                {live && <span className="tnum text-xs text-faint">{c.criticCount}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
