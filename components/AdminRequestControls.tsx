"use client";

import { useState, useTransition } from "react";
import { setRequestStatus, linkRequestVenue } from "@/app/admin/actions";
import type { RequestRow } from "@/lib/types";

const STATUSES: RequestRow["status"][] = ["Requested", "Planned", "Covered"];

export function AdminRequestControls({ request }: { request: RequestRow }) {
  const [status, setStatus] = useState(request.status);
  const [slug, setSlug] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function changeStatus(next: RequestRow["status"]) {
    setStatus(next);
    start(async () => {
      const res = await setRequestStatus(request.id, next);
      setMsg(res.ok ? "Saved" : res.message ?? "Error");
    });
  }

  function link() {
    start(async () => {
      const res = await linkRequestVenue(request.id, slug);
      if (res.ok) {
        setStatus("Covered");
        setMsg("Linked");
      } else {
        setMsg(res.message ?? "Error");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        disabled={pending}
        onChange={(e) => changeStatus(e.target.value as RequestRow["status"])}
        className="rounded-full border border-line bg-cream px-3 py-1.5 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="link venue slug…"
        className="w-40 rounded-full border border-line bg-cream px-3 py-1.5 text-sm outline-none focus:border-flame"
      />
      <button
        onClick={link}
        disabled={pending || !slug.trim()}
        className="rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-40"
      >
        Link
      </button>
      {msg && <span className="text-xs text-ink-soft">{msg}</span>}
    </div>
  );
}
