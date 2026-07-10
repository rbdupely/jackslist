"use client";

import { useEffect, useRef, useState } from "react";
import { recordRequestAction, type RequestState } from "@/app/actions";
import { requestPrompt, type ParsedQuery } from "@/lib/curate";
import { UpvoteButton } from "@/components/UpvoteButton";

export function RequestZeroState({
  parsed,
  categorySlug = "food",
}: {
  parsed: ParsedQuery;
  categorySlug?: string;
}) {
  const [state, setState] = useState<RequestState | null>(null);
  const [loading, setLoading] = useState(true);
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    recordRequestAction(parsed, categorySlug)
      .then(setState)
      .finally(() => setLoading(false));
  }, [parsed, categorySlug]);

  return (
    <div className="mx-auto max-w-xl rounded-card border border-line bg-paper p-8 text-center sm:p-12">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-flame/10 text-2xl">
        🍽️
      </div>
      <h2 className="font-display text-3xl font-semibold text-ink">
        {requestPrompt(parsed)}.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">
        Nobody&apos;s covered this one. Upvote it and it climbs the list of what the community
        wants reviewed next.
      </p>

      <div className="mt-7 flex flex-col items-center gap-3">
        {loading ? (
          <div className="h-11 w-32 animate-pulse rounded-full bg-line" aria-hidden />
        ) : state ? (
          <UpvoteButton
            requestId={state.id}
            upvotes={state.upvotes}
            voted={state.alreadyVoted}
          />
        ) : (
          <p className="text-sm text-ink-soft">
            Couldn&apos;t save this request right now — try again shortly.
          </p>
        )}
        <a href="/requests" className="text-sm font-medium text-flame hover:underline">
          See what else the community wants →
        </a>
      </div>
    </div>
  );
}
