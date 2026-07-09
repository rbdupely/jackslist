"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PRICES = ["$", "$$", "$$$", "$$$$"];

export function FilterBar({
  cities,
  categories,
}: {
  cities: string[];
  categories: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/search?${next.toString()}`);
  }

  const selectClass =
    "rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink outline-none transition hover:border-ink/30 focus:border-flame";

  const hasFilters = ["city", "category", "cuisine", "price"].some((k) => params.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selectClass}
        value={params.get("city") ?? ""}
        onChange={(e) => update("city", e.target.value)}
        aria-label="Filter by city"
      >
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={params.get("category") ?? ""}
        onChange={(e) => update("category", e.target.value)}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={params.get("price") ?? ""}
        onChange={(e) => update("price", e.target.value)}
        aria-label="Filter by price"
      >
        <option value="">Any price</option>
        {PRICES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={() => {
            const q = params.get("q");
            router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
          }}
          className="rounded-full px-3 py-2 text-sm font-medium text-flame hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
