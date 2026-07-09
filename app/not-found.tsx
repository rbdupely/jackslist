import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <p className="font-display text-6xl font-semibold text-flame">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">
        Jack hasn&apos;t been here.
      </h1>
      <p className="mt-2 text-ink-soft">
        This page doesn&apos;t exist — but maybe the place does. Try a search.
      </p>
      <div className="mx-auto mt-6 max-w-md">
        <SearchBar variant="hero" />
      </div>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-flame hover:underline">
        ← Back home
      </Link>
    </div>
  );
}
