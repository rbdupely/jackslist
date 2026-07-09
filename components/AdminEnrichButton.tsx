"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AdminEnrichButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function refresh() {
    setMsg(null);
    start(async () => {
      const res = await fetch("/api/admin/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setMsg("Refreshed ✓");
        router.refresh();
      } else {
        setMsg(json.error ?? "Failed");
      }
    });
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        onClick={refresh}
        disabled={pending}
        className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-ink/30 disabled:opacity-50"
      >
        {pending ? "Refreshing…" : "↻ Refresh from Google (admin)"}
      </button>
      {msg && <span className="text-xs text-ink-soft">{msg}</span>}
    </div>
  );
}
