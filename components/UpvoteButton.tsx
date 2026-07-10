"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { upvoteRequestAction } from "@/app/actions";

export function UpvoteButton({
  requestId,
  upvotes,
  voted,
  size = "md",
}: {
  requestId: string;
  upvotes: number;
  voted: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [count, setCount] = useState(upvotes);
  const [hasVoted, setHasVoted] = useState(voted);
  const [pending, start] = useTransition();

  function onClick() {
    if (hasVoted || pending) return;
    start(async () => {
      const res = await upvoteRequestAction(requestId);
      if (res.ok) {
        setCount(res.upvotes);
        setHasVoted(true);
      } else if (res.reason === "auth") {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
    });
  }

  const pad = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5";

  return (
    <button
      onClick={onClick}
      disabled={pending}
      aria-pressed={hasVoted}
      className={`inline-flex items-center gap-2 rounded-full font-semibold transition ${pad} ${
        hasVoted
          ? "bg-ink text-white"
          : "border border-line-strong bg-surface text-ink hover:border-ink disabled:opacity-60"
      }`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 4l7 8h-4v8H9v-8H5l7-8z" fill="currentColor" />
      </svg>
      <span className="tnum">{count}</span>
      <span className="font-medium">{hasVoted ? "Upvoted" : "Upvote"}</span>
    </button>
  );
}
