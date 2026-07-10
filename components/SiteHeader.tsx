import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import { getCategoryStats } from "@/lib/data";

export async function SiteHeader() {
  const stats = await getCategoryStats();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">
            Only<span className="text-flame">Critics</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="hidden items-center gap-1 lg:flex">
            {stats.map((c) => (
              <Link
                key={c.id}
                href={`/${c.slug}`}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition hover:text-ink ${
                  c.criticCount > 0 ? "text-ink-soft" : "text-ink-soft/50"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
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
