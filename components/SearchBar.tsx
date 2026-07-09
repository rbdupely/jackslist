"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({
  variant = "hero",
  defaultValue = "",
  placeholder = "Search a city, cuisine, or dish…",
}: {
  variant?: "hero" | "compact";
  defaultValue?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const hero = variant === "hero";

  return (
    <form
      onSubmit={submit}
      role="search"
      className={
        hero
          ? "flex w-full items-center gap-2 rounded-full border border-line bg-paper p-2 pl-5 shadow-lg shadow-black/5"
          : "flex w-full items-center gap-2 rounded-full border border-line bg-paper py-1.5 pl-4 pr-1.5"
      }
    >
      <svg
        width={hero ? 22 : 18}
        height={hero ? 22 : 18}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="shrink-0 text-ink-soft"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-soft/70 ${
          hero ? "text-lg" : "text-sm"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-full bg-flame font-semibold text-white transition hover:bg-flame-dark ${
          hero ? "px-6 py-3 text-base" : "px-4 py-1.5 text-sm"
        }`}
      >
        Search
      </button>
    </form>
  );
}
